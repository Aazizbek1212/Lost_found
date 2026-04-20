from django.db import models
from django.contrib.auth.models import User

class Category(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}"


class Location(models.Model):
    name = models.CharField(max_length=150)

    def __str__(self):
        return self.name


class Item(models.Model):
    ITEM_TYPE_CHOICES = [
        ('lost', "Yo'qolgan"),
        ('found', "Topilgan"),
    ]

    item_type = models.CharField(
        max_length=10,
        choices=ITEM_TYPE_CHOICES,
        default='lost'
    )
    status = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, default="lost")
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='items/', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField()  # yo'qolgan yoki topilgan sanasi
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # kim e'lon qilgan
    contact_info = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.name} ({self.get_item_type_display()})"

class Comment(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user} on {self.item}"


class Report(models.Model):
    REASON_CHOICES = [
        ('spam', "Spam yoki reklama"),
        ('fake', "Soxta e'lon"),
        ('duplicate', "Takroriy e'lon"),
        ('inappropriate', "Nomaqbul kontent"),
        ('other', "Boshqa sabab"),
    ]

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # kim shikoyat qilgan
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='other')
    description = models.TextField(blank=True, null=True)  # qo‘shimcha izoh
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report on {self.item.name} by {self.user.username}"
    

from django.db import models

class ChatMessage(models.Model):
    user_id = models.CharField(max_length=100)  # yoki foydalanuvchi session ID
    role = models.CharField(max_length=10)  # "user" yoki "bot"
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_id} - {self.role}: {self.message[:30]}"

