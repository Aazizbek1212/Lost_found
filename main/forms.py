from django import forms
from .models import Category, Item, Location
from django import forms
from .models import Item
from google import genai
import os
from dotenv import load_dotenv


class ItemForm(forms.ModelForm):
    category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    location = forms.ModelChoiceField(
        queryset=Location.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    class Meta:
        model = Item
        fields = [
            'item_type',
            'name',
            'description',
            'image',
            'category',
            'location',
            'date',
            'contact_info'
        ]


load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class ItemForm(forms.ModelForm):
    class Meta:
        model = Item
        fields = ["description", "category", "location"]

    def clean(self):
        cleaned_data = super().clean()
        description = cleaned_data.get("description")

        if description and (not cleaned_data.get("category") or not cleaned_data.get("location")):
            prompt = f"""
            Foydalanuvchi e'lon matni: "{description}"

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

                if "Kategoriya:" in result and not cleaned_data.get("category"):
                    cleaned_data["category"] = result.split("Kategoriya:")[1].split("\n")[0].strip()
                if "Joylashuv:" in result and not cleaned_data.get("location"):
                    cleaned_data["location"] = result.split("Joylashuv:")[1].split("\n")[0].strip()

            except Exception:
                pass  # AI aniqlash muvaffaqiyatsiz

        return cleaned_data
