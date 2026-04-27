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

    STATUS_CHOICES = [
        ('active', "Aktiv"),
        ('found', "Topildi"),
        ('success', "Muvaffaqiyatli")
    ]

    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, default='lost')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='items/', null=True, blank=True)
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, blank=True)
    address = models.CharField(max_length=150, null=True, blank=True)  # Ko'cha, uy
    district = models.CharField(max_length=100, null=True, blank=True)  # 🆕 Tuman (Yunusobod, Chilonzor...)
    city = models.ForeignKey(Location,on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    date = models.DateField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    contact_info = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.status == 'success':
            self.is_active = False
        
        if not (self.latitude and self.longitude):
            full_address = ""
            
            # Faqat tuman va address (ko'cha/uy) ni qo'shamiz
            if self.district:
                full_address += f"{self.district} tumani"
            if self.address:
                if full_address:
                    full_address += f", {self.address}"
                else:
                    full_address += self.address
            
            # City ni QO'SHMAYMIZ (faqat tuman + ko'cha/uy)
            
            if full_address:
                from .utils import get_coordinates
                lat, lng = get_coordinates(full_address)
                if lat and lng:
                    self.latitude = lat
                    self.longitude = lng
                
        super().save(*args, **kwargs)

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


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('item_closed', "🔒 E'lon yopildi"),
        ('report_received', "📢 Shikoyat keldi"),
        ('item_found', "🟢 Buyum topildi"),
        ('item_success', "✅ Muvaffaqiyatli"),
        ('system', "⚙️ Tizim xabari"),
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='system')
    item = models.ForeignKey('Item', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    is_for_admin = models.BooleanField(default=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.created_at.strftime('%d.%m.%Y %H:%M')}"