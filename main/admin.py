from django.contrib import admin
from .models import Category, Location, Item, Comment, Notification, Report, ChatMessage
import os

admin.site.register(Location)
admin.site.register(Category)
admin.site.register(Comment)
admin.site.register(Report)
admin.site.register(ChatMessage)

# GEMINI API - faqat admin uchun kerak bo'lsa
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "location", "description", "date", "status")

    def save_model(self, request, obj, form, change):
        if client and (not obj.category or not obj.location):
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

                if "Kategoriya:" in result:
                    obj.category = result.split("Kategoriya:")[1].split("\n")[0].strip()
                if "Joylashuv:" in result:
                    obj.location = result.split("Joylashuv:")[1].split("\n")[0].strip()

            except Exception:
                pass  # AI aniqlash muvaffaqiyatsiz

        super().save_model(request, obj, form, change)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'notification_type', 'is_read', 'created_at', 'user']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'user__username', 'item__name']
    readonly_fields = ['created_at']
    list_per_page = 20
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        count = queryset.update(is_read=True)
        self.message_user(request, f"{count} ta xabar o'qilgan deb belgilandi")
    mark_as_read.short_description = "✅ O'qilgan deb belgilash"
    
    def mark_as_unread(self, request, queryset):
        count = queryset.update(is_read=False)
        self.message_user(request, f"{count} ta xabar o'qilmagan deb belgilandi")
    mark_as_unread.short_description = "❌ O'qilmagan deb belgilash"
