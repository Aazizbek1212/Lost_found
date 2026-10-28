from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .models import Category, ChatMessage, Comment, Item, Location, Notification, Profile, Report, SupportMessage, SupportThread

import logging
import os


logger = logging.getLogger(__name__)


def get_ai_client():
    """Gemini klientini faqat kerak bo'lganda yaratadi."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai

        return genai.Client(api_key=api_key)
    except Exception as error:  # pragma: no cover - tashqi kutubxona
        logger.warning("Gemini klientini yaratib bo'lmadi: %s", error)
        return None


client = get_ai_client()

# Oddiy modellarni ro'yxatdan o'tkazish
admin.site.register(Location)
admin.site.register(Category)
admin.site.register(Comment)
admin.site.register(Report)
admin.site.register(ChatMessage)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone']
    search_fields = ['user__username', 'phone']


class SupportMessageInline(admin.TabularInline):
    model = SupportMessage
    fields = ['sender', 'body', 'created_at']
    readonly_fields = ['sender', 'created_at']
    extra = 1
    can_delete = False


@admin.register(SupportThread)
class SupportThreadAdmin(admin.ModelAdmin):
    list_display = ['subject', 'user', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['subject', 'user__username', 'messages__body']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [SupportMessageInline]

    def save_formset(self, request, form, formset, change):
        if formset.model is not SupportMessage:
            return super().save_formset(request, form, formset, change)

        new_messages = formset.save(commit=False)
        for deleted_message in formset.deleted_objects:
            deleted_message.delete()

        for message in new_messages:
            is_new = message.pk is None
            if is_new:
                message.sender = request.user
                message.is_from_admin = True
            message.save()
            if is_new:
                Notification.objects.create(
                    title='Admin javob berdi',
                    message=f'{form.instance.subject} chatida yangi javob bor.',
                    notification_type='system',
                    user=form.instance.user,
                    is_for_admin=False,
                )

        formset.save_m2m()
        form.instance.save(update_fields=['updated_at'])


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'item_type', 'status', 'date', 'is_active']
    list_filter = ['status', 'item_type', 'is_active']
    search_fields = ['name', 'description', 'user__username']
    readonly_fields = ['latitude', 'longitude']
    fields = ['name', 'description', 'item_type', 'status', 'category',
              'address', 'district', 'city', 'latitude', 'longitude',
              'date', 'user', 'contact_info', 'image', 'is_active']

    def save_model(self, request, obj, form, change):
        # AI yordamida kategoriya va joylashuvni aniqlash — faqat maydonlar
        # bo'sh bo'lganda. Yangi (dublikat) kategoriya yaratilmaydi.
        if client and (not obj.category or not obj.address):
            prompt = f"""
            Foydalanuvchi e'lon matni: "{obj.description}"

            Vazifa:
            - Matndan kategoriya (telefon, hujjat, kalit, sumka va boshqalar) ni aniqlang.
            - Matndan joylashuv (masalan: Yunusobod, Chilonzor, Samarqand va hokazo) ni aniqlang.
            - Faqat kategoriya va joylashuvni qaytaring.
            """
            try:
                response = client.models.generate_content(
                    model="models/gemini-2.5-flash",
                    contents=prompt
                )
                result = response.text or ''

                if "Kategoriya:" in result and not obj.category:
                    cat_name = result.split("Kategoriya:")[1].split("\n")[0].strip().strip('"').strip('.')
                    category_obj = (
                        Category.objects.filter(name__iexact=cat_name).first()
                        or Category.objects.filter(name__icontains=cat_name).first()
                    )
                    obj.category = category_obj

                if "Joylashuv:" in result and not obj.address:
                    location_name = result.split("Joylashuv:")[1].split("\n")[0].strip().strip('"').strip('.')
                    if location_name and location_name != '-':
                        obj.address = location_name

            except Exception as error:
                logger.warning("AI xatolik: %s", error)

        super().save_model(request, obj, form, change)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'item_info', 'notification_type', 'is_read', 'created_at', 'action_buttons']
    list_filter = ['is_read', 'notification_type', 'created_at']
    search_fields = ['title', 'message', 'user__username']
    readonly_fields = ['created_at']
    fields = ['title', 'message', 'notification_type', 'user', 'item', 'is_for_admin', 'is_read', 'created_at']
    actions = ['mark_as_read']

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        initial.setdefault('is_for_admin', False)
        return initial

    def save_model(self, request, obj, form, change):
        if obj.user and not obj.user.is_staff:
            obj.is_for_admin = False
        super().save_model(request, obj, form, change)

    def item_info(self, obj):
        if obj.item:
            return format_html("<strong>{}</strong> (ID: {})", obj.item.name, obj.item.pk)
        return "-"

    item_info.short_description = "E'lon ma'lumoti"

    def action_buttons(self, obj):
        """
        'E'lonni yopish' tugmasi.

        Tugma admin ro'yxatining o'zidagi #changelist-form ga ulanadi
        (form="..." atributi). Shuning uchun CSRF token o'sha formadan
        o'zi ketadi va self.request kerak emas. Ichma-ich <form> ham yo'q.
        """
        if obj.notification_type == "item_closed" and obj.item and obj.item.status == "active":
            return format_html(
                '<button type="submit" form="changelist-form" formmethod="post" '
                'formaction="{}" class="button" '
                'style="background:#28a745;padding:5px 10px;color:#fff;border:0;'
                'border-radius:3px;cursor:pointer" '
                'onclick="return confirm(\'E\\\'lon yopilsinmi?\');">E\'lonni yopish</button>',
                reverse("admin_approve_close_item", args=[obj.item.pk]),
            )
        return "-"

    action_buttons.short_description = "Harakat"

    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} ta notification o'qilgan deb belgilandi")

    mark_as_read.short_description = "O'qilgan deb belgilash"