from django import forms
from .models import LostItem

class LostItemForm(forms.ModelForm):
    class Meta:
        model = LostItem
        fields = [
            'name',
            'description',
            'image',
            'category',
            'location',
            'date_lost',
            'contact_info',
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nomi'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Tavsif'
            }),
            'image': forms.ClearableFileInput(attrs={
                'class': 'form-control'
            }),
            'category': forms.Select(attrs={
                'class': 'form-control'
            }),
            'location': forms.Select(attrs={
                'class': 'form-control'
            }),
            'date_lost': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'contact_info': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': "Bog'lanish ma'lumoti"
            }),
        }


class SearchForm(forms.Form):
    query = forms.CharField(label='Qidiruv', max_length=100)
