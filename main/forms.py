import logging

from django import forms
from django.conf import settings

from .models import Category, Item, Location

logger = logging.getLogger(__name__)


def get_ai_client():
    """Gemini klientini faqat kerak bo'lganda va settings orqali yaratadi."""
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        return None
    try:
        from google import genai

        return genai.Client(api_key=api_key)
    except Exception as error:  # pragma: no cover - tashqi kutubxona
        logger.warning("Gemini klientini yaratib bo'lmadi: %s", error)
        return None


# Testlar `main.forms.client` ni patch qiladi — shu nomni saqlab qolamiz.
client = get_ai_client()


class ItemForm(forms.ModelForm):
    category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        widget=forms.Select(attrs={"class": "form-control"}),
        required=False,
    )
    city = forms.ModelChoiceField(
        queryset=Location.objects.all(),
        widget=forms.Select(attrs={"class": "form-control"}),
        required=False,
    )
    # MODELDA address va district bor, location emas!
    address = forms.CharField(
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Masalan: Amir Temur ko'chasi, 15-uy",
            }
        ),
        required=False,
    )
    district = forms.CharField(
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Masalan: Yunusobod, Chilonzor...",
            }
        ),
        required=False,
    )
    latitude = forms.FloatField(required=False, widget=forms.HiddenInput())
    longitude = forms.FloatField(required=False, widget=forms.HiddenInput())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["address"].required = False

    class Meta:
        model = Item
        fields = [
            "item_type",
            "name",
            "description",
            "image",
            "category",
            "city",
            "district",  # Tuman
            "address",  # Ko'cha va uy
            "latitude",
            "longitude",
            "date",
            "contact_info",
        ]
        widgets = {
            "date": forms.DateInput(attrs={"type": "date", "class": "form-control"}),
            "description": forms.Textarea(attrs={"rows": 4, "class": "form-control"}),
            "name": forms.TextInput(attrs={"class": "form-control"}),
            "contact_info": forms.TextInput(attrs={"class": "form-control"}),
            "item_type": forms.Select(attrs={"class": "form-control"}),
        }

    def clean(self):
        cleaned_data = super().clean()
        description = cleaned_data.get("description")
        category = cleaned_data.get("category")
        district = cleaned_data.get("district")
        address = cleaned_data.get("address")

        if cleaned_data.get("item_type") == "lost":
            # Yo'qolgan buyum uchun manzil so'ralmaydi.
            cleaned_data["district"] = ""
            cleaned_data["address"] = ""
            cleaned_data["latitude"] = None
            cleaned_data["longitude"] = None
        elif not any(
            (
                cleaned_data.get("city"),
                district,
                address,
                cleaned_data.get("latitude") is not None
                and cleaned_data.get("longitude") is not None,
            )
        ):
            raise forms.ValidationError(
                "Topilgan buyum uchun viloyat, tuman yoki manzil kiriting."
            )

        # AI yordamida kategoriyani aniqlash (agar foydalanuvchi tanlamagan bo'lsa)
        if client and description and not category:
            prompt_cat = f"""
            Foydalanuvchi e'lon matni: "{description}"
            Matndan kategoriya (telefon, hujjat, kalit, sumka, kiyim, elektronika va boshqalar) ni aniqlang.
            Faqat kategoriya nomini qaytaring, masalan: "Telefon"
            """
            try:
                response = client.models.generate_content(
                    model="models/gemini-2.5-flash", contents=prompt_cat
                )
                cat_name = (response.text or "").strip().strip('"').strip(".")
                if cat_name:
                    # Avval aniq mos kelishini, keyin qisman mos kelishini qidiramiz —
                    # shunda har safar yangi kategoriya yaratilib ketmaydi.
                    category_obj = (
                        Category.objects.filter(name__iexact=cat_name).first()
                        or Category.objects.filter(name__icontains=cat_name).first()
                    )
                    if category_obj:
                        cleaned_data["category"] = category_obj
                        self.instance.category = category_obj
            except Exception as error:
                logger.warning("AI category error: %s", error)

            # Joylashuvni AI orqali aniqlash: faqat topilgan buyum va manzil bo'sh bo'lsa.
            if (
                cleaned_data.get("item_type") == "found"
                and not cleaned_data.get("address")
                and not cleaned_data.get("district")
                and not cleaned_data.get("city")
            ):
                prompt_loc = f"""
                Foydalanuvchi e'lon matni: "{description}"
                Matndan buyum topilgan joylashuvni (tuman, shahar yoki ko'cha) aniqlang.
                Faqat joylashuvni qaytaring. Agar matnda joylashuv bo'lmasa "-" qaytaring.
                """
                try:
                    response = client.models.generate_content(
                        model="models/gemini-2.5-flash", contents=prompt_loc
                    )
                    location_name = (response.text or "").strip().strip('"').strip(".")
                    if location_name and location_name != "-":
                        cleaned_data["district"] = location_name
                        self.instance.district = location_name
                except Exception as error:
                    logger.warning("AI location error: %s", error)

        return cleaned_data
