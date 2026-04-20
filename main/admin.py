from django.contrib import admin
from .models import Category, Location, Item
from google import genai
import os
from dotenv import load_dotenv

admin.site.register(Location)
admin.site.register(Category)

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("category", "location", "description")

    def save_model(self, request, obj, form, change):
        if not obj.category or not obj.location:
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
