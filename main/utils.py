# main/utils.py
import requests
from django.conf import settings

from main.models import Notification

def get_coordinates(address):
    url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={settings.GOOGLE_MAPS_API_KEY}"
    response = requests.get(url)
    data = response.json()
    if data['status'] == 'OK':
        loc = data['results'][0]['geometry']['location']
        return loc['lat'], loc['lng']
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
