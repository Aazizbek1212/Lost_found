from django import forms
from .models import Category, Item, Location
import os

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
    # MODELDA address va district bor, location emas!
    address = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Masalan: Amir Temur ko\'chasi, 15-uy'}),
        required=False
    )
    district = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Masalan: Yunusobod, Chilonzor...'}),
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
            'city',
            'district',      # Tuman
            'address',       # Ko'cha va uy
            'date',
            'contact_info'
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'description': forms.Textarea(attrs={'rows': 4, 'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'contact_info': forms.TextInput(attrs={'class': 'form-control'}),
            'item_type': forms.Select(attrs={'class': 'form-control'}),
        }

    def clean(self):
        cleaned_data = super().clean()
        description = cleaned_data.get("description")
        category = cleaned_data.get("category")
        district = cleaned_data.get("district")
        address = cleaned_data.get("address")

        # AI yordamida kategoriya va manzilni aniqlash
        if client and description:
            # Kategoriya aniqlash
            if not category:
                prompt_cat = f"""
                Foydalanuvchi e'lon matni: "{description}"
                Matndan kategoriya (telefon, hujjat, kalit, sumka, kiyim, elektronika va boshqalar) ni aniqlang.
                Faqat kategoriya nomini qaytaring, masalan: "Telefon"
                """
                try:
                    response = client.models.generate_content(
                        model="models/gemini-2.5-flash",
                        contents=prompt_cat
                    )
                    cat_name = response.text.strip()
                    category_obj = Category.objects.filter(name__iexact=cat_name).first()
                    if category_obj:
                        cleaned_data["category"] = category_obj
                except Exception as e:
                    print(f"AI category error: {e}")
            
            # Joylashuv aniqlash (tuman va ko'cha)
            if not district or not address:
                prompt_loc = f"""
                Foydalanuvchi e'lon matni: "{description}"
                
                Matndan joylashuv ma'lumotlarini aniqlang:
                - Tuman (masalan: Yunusobod, Chilonzor, Mirzo Ulug'bek)
                - Ko'cha va uy raqami (masalan: Amir Temur ko'chasi, 15-uy)
                
                Quyidagi formatda qaytaring:
                Tuman: [tuman nomi]
                Manzil: [ko'cha va uy]
                """
                try:
                    response = client.models.generate_content(
                        model="models/gemini-2.5-flash",
                        contents=prompt_loc
                    )
                    result = response.text
                    
                    if "Tuman:" in result and not district:
                        dist = result.split("Tuman:")[1].split("\n")[0].strip()
                        cleaned_data["district"] = dist
                    
                    if "Manzil:" in result and not address:
                        addr = result.split("Manzil:")[1].split("\n")[0].strip()
                        cleaned_data["address"] = addr
                        
                except Exception as e:
                    print(f"AI location error: {e}")

        return cleaned_data