from django.contrib import admin
from django.urls import path
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.utils.html import format_html
from .models import Category, Item, Comment, Location, Notification, Report, ChatMessage
import os

# GEMINI API - faqat admin uchun kerak bo'lsa
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
    except ImportError:
        client = None
else:
    client = None

# Oddiy modellarni ro'yxatdan o'tkazish
admin.site.register(Location)
admin.site.register(Category)
admin.site.register(Comment)
admin.site.register(Report)
admin.site.register(ChatMessage)


# GEMINI bilan ItemAdmin (AI yordamida)
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
        # AI yordamida kategoriya va joylashuvni aniqlash
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
                result = response.text

                if "Kategoriya:" in result and not obj.category:
                    # Kategoriyani topish
                    cat_name = result.split("Kategoriya:")[1].split("\n")[0].strip()
                    category, _ = Category.objects.get_or_create(name=cat_name)
                    obj.category = category
                    
                if "Joylashuv:" in result and not obj.address:
                    obj.address = result.split("Joylashuv:")[1].split("\n")[0].strip()

            except Exception as e:
                print(f"AI xatolik: {e}")
                pass

        super().save_model(request, obj, form, change)


# NotificationAdmin
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'item_info', 'notification_type', 'is_read', 'created_at', 'action_buttons']
    list_filter = ['is_read', 'notification_type', 'created_at']
    search_fields = ['title', 'message', 'user__username']
    readonly_fields = ['created_at']
    
    def item_info(self, obj):
        if obj.item:
            return format_html('<strong>{}</strong> (ID: {})', obj.item.name, obj.item.pk)
        return '-'
    item_info.short_description = "E'lon ma'lumoti"
    
    def action_buttons(self, obj):
        if obj.notification_type == 'item_closed' and obj.item and obj.item.status == 'active':
            return format_html(
                '<a class="button" href="/admin/close-item/{}/" style="background: #28a745; padding: 5px 10px; color: white; text-decoration: none; border-radius: 3px;">✅ E\'lonni yopish</a>',
                obj.item.pk
            )
        return '-'
    action_buttons.short_description = "Harakat"
    
    actions = ['mark_as_read']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} ta notification o'qilgan deb belgilandi")
    mark_as_read.short_description = "O'qilgan deb belgilash"


# Admin tomonidan e'lonni yopish funksiyasi
def admin_close_item(request, item_id):
    """Admin tomonidan e'lonni yopish"""
    item = get_object_or_404(Item, pk=item_id)
    
    if item.status == 'active':
        # E'lon statusini o'zgartirish
        item.status = 'success'
        item.is_active = False
        item.save()
        
        # Tegishli notificationlarni o'qilgan deb belgilash
        Notification.objects.filter(item=item, notification_type='item_closed').update(is_read=True)
        
        # Foydalanuvchiga xabar yuborish
        Notification.objects.create(
            title="✅ E'lon yopildi",
            message=f"Sizning '{item.name}' e'loningiz administrator tomonidan yopildi",
            notification_type='item_success',
            item=item,
            user=item.user,
            is_for_admin=False,
            is_read=False
        )
        
        messages.success(request, f"'{item.name}' e'loni muvaffaqiyatli yopildi!")
    else:
        messages.warning(request, f"Bu e'lon allaqachon yopilgan!")
    
    return redirect('admin:main_notification_changelist')


# Admin panelga qo'shimcha URL qo'shish (Item modeli uchun)
original_get_urls = admin.site.get_urls

def custom_get_urls():
    urls = original_get_urls()
    custom_urls = [
        path('close-item/<int:item_id>/', admin_close_item, name='admin_close_item'),
    ]
    return custom_urls + urls

admin.site.get_urls = custom_get_urls