from django import forms
from .models import Category, Item, Location
import os

# GEMINI API - faqat mavjud bo'lsa
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None


class ItemForm(forms.ModelForm):
    category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'}),
        required=False
    )
    city = forms.ModelChoiceField(
        queryset=Location.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'}),
        required=False
    )
    location = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Masalan: Chilonzor, Yunusobod...'}),
        required=False
    )

    class Meta:
        model = Item
        fields = [
            'item_type',
            'name',
            'description',
            'image',
            'category',
            'city',        # yangi ForeignKey
            'location',    # matn maydoni
            'date',
            'contact_info'
        ]

    def clean(self):
        cleaned_data = super().clean()
        description = cleaned_data.get("description")

        # AI yordamida kategoriya va joylashuv aniqlash
        if client and description and (not cleaned_data.get("category") or not cleaned_data.get("location")):
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
                    cat_name = result.split("Kategoriya:")[1].split("\n")[0].strip()
                    category_obj = Category.objects.filter(name__iexact=cat_name).first()
                    if category_obj:
                        cleaned_data["category"] = category_obj

                if "Joylashuv:" in result and not cleaned_data.get("location"):
                    loc_name = result.split("Joylashuv:")[1].split("\n")[0].strip()
                    cleaned_data["location"] = loc_name

            except Exception:
                pass  # AI aniqlash muvaffaqiyatsiz

        return cleaned_data
