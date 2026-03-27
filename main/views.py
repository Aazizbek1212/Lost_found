from django.shortcuts import render

from main.models import FoundItem, LostItem

# Create your views here.

def home_view(request):
    return render(request, 'index.html')


def lostitems_view(request): # Yo‘qolgan narsalar ro‘yxati
    lost_items = LostItem.objects.all().order_by('-date_lost')
    return render(request, 'lostitems.html', {'lost_items': lost_items})


def founditems_view(request): # Topilgan narsalar ro‘yxati
    found_items = FoundItem.objects.all().order_by('-date_found')
    return render(request, 'items.html', {'found_items': found_items})