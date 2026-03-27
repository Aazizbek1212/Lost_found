from django.contrib import admin
from .models import Category, Location, LostItem, FoundItem

admin.site.register(Category)
admin.site.register(Location)
admin.site.register(LostItem)
admin.site.register(FoundItem)

