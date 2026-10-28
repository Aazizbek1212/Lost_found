from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = 'Categories'

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
    district = models.CharField(max_length=100, null=True, blank=True)  # Tuman (Yunusobod, Chilonzor...)
    city = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    date = models.DateField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    contact_info = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date', '-id']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Geocoding faqat manzil maydonlari o'zgarganda ishga tushishi uchun
        # dastlabki qiymatlarni eslab qolamiz.
        self._geo_snapshot = self._build_address_string()

    def _build_address_string(self):
        location_parts = [self.address, self.district]
        if self.city_id:
            location_parts.append(self.city.name)
        return ', '.join(part.strip() for part in location_parts if part and part.strip())

    @property
    def location(self):
        """Template'lar uchun yagona joylashuv matni."""
        parts = [self.district, self.address]
        if self.city_id:
            parts.append(self.city.name)
        text = ', '.join(part.strip() for part in parts if part and part.strip())
        return text or "Ko'rsatilmagan"

    @property
    def location_accuracy(self):
        if self.address:
            return 'street'
        if self.district:
            return 'district'
        if self.city_id:
            return 'city'
        return 'unknown'

    def save(self, *args, **kwargs):
        if self.status == 'success':
            self.is_active = False

        # Koordinatalar yo'q bo'lsa YOKI manzil o'zgargan bo'lsa geocoding qilamiz.
        # (0.0 ham to'g'ri koordinata — shuning uchun `is None` tekshiruvi.)
        address_changed = self._build_address_string() != getattr(self, '_geo_snapshot', '')
        has_coordinates = self.latitude is not None and self.longitude is not None
        needs_geocode = not has_coordinates or address_changed

        # update_fields bilan saqlanayotgan bo'lsa faqat shu maydonlar yoziladi.
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            update_fields = set(update_fields)
            can_update_geo = 'latitude' in update_fields and 'longitude' in update_fields
            if not can_update_geo:
                needs_geocode = False

        if needs_geocode:
            full_address = self._build_address_string()
            if full_address:
                from .utils import get_coordinates
                lat, lng = get_coordinates(full_address)
                if lat is not None and lng is not None:
                    self.latitude = lat
                    self.longitude = lng

        super().save(*args, **kwargs)
        self._geo_snapshot = self._build_address_string()

    def __str__(self):
        return f"{self.name} ({self.get_item_type_display()})"


class Comment(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user} on {self.item}"


class Report(models.Model):
    REASON_CHOICES = [
        ('spam', "Spam yoki reklama"),
        ('fake', "Soxta e'lon"),
        ('duplicate', "Takroriy e'lon"),
        ('inappropriate', "Nomaqbul kontent"),
        ('wrong_info', "Noto'g'ri ma'lumot"),
        ('other', "Boshqa sabab"),
    ]

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # kim shikoyat qilgan
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='other')
    description = models.TextField(blank=True, null=True)  # qo'shimcha izoh
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report on {self.item.name} by {self.user.username}"


class ChatMessage(models.Model):
    user_id = models.CharField(max_length=100)  # yoki foydalanuvchi session ID
    role = models.CharField(max_length=10)  # "user" yoki "bot"
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user_id} - {self.role}: {self.message[:30]}"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('new_listing', "📦 Yangi e'lon"),
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
        indexes = [
            models.Index(fields=['user', 'is_for_admin', 'is_read']),
        ]

    def __str__(self):
        return f"{self.title} - {self.created_at.strftime('%d.%m.%Y %H:%M')}"


class SupportThread(models.Model):
    STATUS_CHOICES = [
        ('open', 'Ochiq'),
        ('closed', 'Yopilgan'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_threads')
    subject = models.CharField(max_length=160, default='Admin bilan bog‘lanish')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.subject} — {self.user.username}'


class SupportMessage(models.Model):
    thread = models.ForeignKey(SupportThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_messages')
    body = models.TextField(max_length=3000)
    is_from_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.username}: {self.body[:50]}'


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return f'{self.user.username} profili'