import requests
from django.conf import settings
from main.models import Notification
import time
from django.core.cache import cache


def get_coordinates(address):
    """
    Nominatim (OSM) orqali manzildan koordinata olish
    """
    # Cache tekshirish (takroriy so'rovlarni oldini olish)
    cache_key = f"geocode_{address}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    # So'rovlar orasida 1 sekund kutish (Nominatim qoidalari)
    time.sleep(1)
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': f"{address}, Toshkent, O'zbekiston",
        'format': 'json',
        'limit': 1
    }
    
    try:
        response = requests.get(url, params=params, headers={'User-Agent': 'YourAppName/1.0'})
        data = response.json()
        
        if data and len(data) > 0:
            lat = float(data[0]['lat'])
            lon = float(data[0]['lon'])
            result = (lat, lon)
            cache.set(cache_key, result, timeout=86400)  # 24 soat cache
            return result
    except Exception as e:
        print(f"Geocoding xatosi: {e}")
    
    return None, None


def send_notification(title, message, notification_type='system', item=None, user=None, for_admin=True):
    """Xabar yaratish"""
    notification = Notification.objects.create(
        title=title,
        message=message,
        notification_type=notification_type,
        item=item,
        user=user,
        is_for_admin=for_admin,
        is_read=False
    )
    return notification
