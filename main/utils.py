import hashlib
import json
import time

import requests
from django.core.cache import cache

from main.models import Notification

COUNTY_ALIASES = ("uzbekistan", "o'zbekiston", "oʻzbekiston", "o‘zbekiston")


def get_coordinates(address):
    """
    Nominatim (OSM) orqali manzildan koordinata olish.

    Qaytaradi: (latitude, longitude) yoki (None, None).
    """
    if not address:
        return None, None

    # Cache tekshirish (takroriy so'rovlarni oldini olish)
    address = ", ".join(part.strip() for part in address.split(",") if part.strip())
    address_hash = hashlib.sha256(address.casefold().encode("utf-8")).hexdigest()
    cache_key = f"geocode_{address_hash}"
    cached = cache.get(cache_key)
    if cached:
        return tuple(cached)

    # So'rovlar orasida 1 sekund kutish (Nominatim qoidalari)
    time.sleep(1)

    url = "https://nominatim.openstreetmap.org/search"
    country_is_present = any(
        country in address.casefold() for country in COUNTY_ALIASES
    )
    query = address if country_is_present else f"{address}, Uzbekistan"
    params = {"q": query, "format": "json", "limit": 1}

    try:
        response = requests.get(
            url,
            params=params,
            headers={"User-Agent": "TopildiUz/1.0 (lost and found service)"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            result = (lat, lon)
            cache.set(cache_key, result, timeout=86400)  # 24 soat cache
            return result
    except Exception as e:
        print(f"Geocoding xatosi: {e}")

    return None, None


def get_address_from_coordinates(latitude, longitude):
    coordinate_key = f"{latitude:.5f},{longitude:.5f}"
    address_hash = hashlib.sha256(coordinate_key.encode("utf-8")).hexdigest()
    cache_key = f"reverse_geocode_{address_hash}"
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    time.sleep(1)
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": latitude,
                "lon": longitude,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 18,
            },
            headers={"User-Agent": "TopildiUz/1.0 (lost and found service)"},
            timeout=8,
        )
        response.raise_for_status()
        result = response.json()
        address = result.get("address", {})
        place = {
            "city": address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or "",
            "district": address.get("city_district")
            or address.get("district")
            or address.get("county")
            or address.get("suburb")
            or "",
            "road": address.get("road")
            or address.get("pedestrian")
            or address.get("footway")
            or "",
            "house_number": address.get("house_number") or "",
            "display_name": result.get("display_name", ""),
        }
        cache.set(cache_key, json.dumps(place, ensure_ascii=False), timeout=86400)
        return place
    except Exception as error:
        print(f"Reverse geocoding error: {error}")
        return None


def send_notification(
    title, message, notification_type="system", item=None, user=None, for_admin=True
):
    """Xabar yaratish (barcha view'lar shu funksiyadan foydalanadi)."""
    notification = Notification.objects.create(
        title=title,
        message=message,
        notification_type=notification_type,
        item=item,
        user=user,
        is_for_admin=for_admin,
        is_read=False,
    )
    return notification
