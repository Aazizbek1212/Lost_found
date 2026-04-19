from django.db import models
from django.contrib.auth.models import User

class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Location(models.Model):
    name = models.CharField(max_length=150)

    def __str__(self):
        return self.name


class LostItem(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='lost_items/', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    date_lost = models.DateField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE)  # kim yo‘qotgan
    contact_info = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.name} (yo'qolgan)"


class FoundItem(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='found_items/', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    date_found = models.DateField()
    finder = models.ForeignKey(User, on_delete=models.CASCADE)  # kim topgan
    contact_info = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.name} (topilgan)"

