import json
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .admin import SupportThreadAdmin
from .forms import ItemForm
from .models import Item, Location, Notification, SupportMessage, SupportThread


class UserNotificationTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(
            username="listing-author", password="test-pass-123"
        )
        self.recipient = user_model.objects.create_user(
            username="listing-reader", password="test-pass-123"
        )
        self.other_recipient = user_model.objects.create_user(
            username="listing-reader-2", password="test-pass-123"
        )
        user_model.objects.create_user(
            username="inactive-reader", password="test-pass-123", is_active=False
        )

    @patch("main.forms.client", None)
    def test_new_listing_notifies_other_active_users(self):
        self.client.force_login(self.author)

        response = self.client.post(
            reverse("add_item"),
            {
                "item_type": "lost",
                "name": "Black wallet",
                "description": "A black wallet with a silver mark",
                "date": "2026-10-23",
                "contact_info": "+998901234567",
            },
        )

        self.assertEqual(response.status_code, 302)
        notifications = Notification.objects.filter(notification_type="new_listing")
        # O'ziga xabar yuborilmaydi, faqat boshqa aktiv foydalanuvchilarga.
        self.assertEqual(notifications.count(), 2)
        self.assertSetEqual(
            set(notifications.values_list("user_id", flat=True)),
            {self.recipient.pk, self.other_recipient.pk},
        )

    def test_notification_list_and_mark_read_are_user_scoped(self):
        own_notification = Notification.objects.create(
            title="Yangi e’lon",
            message="For reader",
            user=self.recipient,
            is_for_admin=False,
        )
        other_notification = Notification.objects.create(
            title="Yangi e’lon",
            message="For other",
            user=self.other_recipient,
            is_for_admin=False,
        )
        self.client.force_login(self.recipient)

        response = self.client.get(reverse("notifications_api"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["unread_count"], 1)
        self.assertEqual(len(response.json()["notifications"]), 1)

        response = self.client.post(reverse("notifications_mark_read"))
        self.assertEqual(response.status_code, 200)
        own_notification.refresh_from_db()
        other_notification.refresh_from_db()
        self.assertTrue(own_notification.is_read)
        self.assertFalse(other_notification.is_read)


class SupportChatTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="support-member", password="test-pass-123"
        )
        self.admin = user_model.objects.create_user(
            username="support-admin", password="test-pass-123", is_staff=True
        )

    def test_user_message_creates_thread_and_notifies_admin(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("support_chat_api"),
            data=json.dumps({"message": "Salom, yordam kerak."}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        thread = SupportThread.objects.get(user=self.user)
        self.assertEqual(
            SupportMessage.objects.filter(thread=thread, sender=self.user).count(), 1
        )
        self.assertTrue(
            Notification.objects.filter(user=self.admin, is_for_admin=True).exists()
        )

    def test_support_chat_is_private_to_its_owner(self):
        SupportThread.objects.create(user=self.user)
        outsider = get_user_model().objects.create_user(
            username="support-outsider", password="test-pass-123"
        )
        self.client.force_login(outsider)

        response = self.client.get(reverse("support_chat_api"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["thread_id"])
        self.assertEqual(response.json()["messages"], [])

    def test_admin_reply_creates_user_notification(self):
        thread = SupportThread.objects.create(user=self.user)
        reply = SupportMessage(thread=thread, body="Sizga yordam beramiz.")
        formset = SimpleNamespace(
            model=SupportMessage,
            save=lambda commit=False: [reply],
            deleted_objects=[],
            save_m2m=lambda: None,
        )
        form = SimpleNamespace(instance=thread)
        request = SimpleNamespace(user=self.admin)

        SupportThreadAdmin(SupportThread, admin.site).save_formset(
            request, form, formset, True
        )

        reply.refresh_from_db()
        self.assertEqual(reply.sender, self.admin)
        self.assertTrue(reply.is_from_admin)
        self.assertTrue(
            Notification.objects.filter(
                user=self.user, title="Admin javob berdi", is_for_admin=False
            ).exists()
        )

    def test_authenticated_pages_render_communication_controls(self):
        self.client.force_login(self.user)
        item = Item.objects.create(
            item_type="lost",
            name="Test item",
            description="Test description",
            date=date(2026, 10, 23),
            user=self.user,
            contact_info="+998901234567",
        )

        for url in (
            reverse("home"),
            reverse("items"),
            reverse("item_detail", args=[item.pk]),
            reverse("about"),
        ):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, "notifications-open")
                self.assertContains(response, "data-open-support")
                self.assertContains(response, "data-profile-toggle")
                self.assertContains(response, "notifications-overlay")
                self.assertContains(response, "support-overlay")

        # Login/register sahifalari faqat anonim foydalanuvchilar uchun.
        public_client = self.client_class()
        for url in (reverse("login"), reverse("register")):
            with self.subTest(url=url):
                response = public_client.get(url)
                self.assertEqual(response.status_code, 200)


class MapLocationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="map-user", password="test-pass-123"
        )

    @patch("main.views.get_coordinates", side_effect=[(None, None), (40.12, 67.8)])
    def test_geocoding_falls_back_to_district_when_street_is_not_found(self, geocode):
        response = self.client.get(
            reverse("geocode_location"),
            {
                "address": "No such street 99",
                "district": "Sergeli",
                "region": "Toshkent shahri",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["accuracy"], "district")
        self.assertEqual(response.json()["location"], "Sergeli, Toshkent shahri")
        self.assertEqual(geocode.call_count, 2)

    @patch("main.views.get_coordinates", return_value=(39.73, 66.13))
    def test_region_only_geocoding_is_labeled_as_city_level(self, geocode):
        response = self.client.get(
            reverse("geocode_location"), {"region": "Samarqand viloyati"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["accuracy"], "city")
        self.assertEqual(response.json()["location"], "Samarqand viloyati")
        geocode.assert_called_once_with("Samarqand viloyati")

    @patch(
        "main.views.get_address_from_coordinates",
        return_value={
            "city": "Samarqand",
            "district": "Samarqand tumani",
            "road": "Registon ko‘chasi",
            "house_number": "1",
            "display_name": "Registon, Samarqand",
        },
    )
    def test_authenticated_reverse_geocode_returns_address_parts(self, reverse_geocode):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("reverse_geocode_location"), {"lat": "39.65", "lon": "66.96"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["city"], "Samarqand")
        self.assertEqual(response.json()["district"], "Samarqand tumani")
        self.assertEqual(response.json()["road"], "Registon ko‘chasi")
        reverse_geocode.assert_called_once_with(39.65, 66.96)

    def test_reverse_geocode_requires_login(self):
        response = self.client.get(
            reverse("reverse_geocode_location"), {"lat": "39.65", "lon": "66.96"}
        )

        self.assertEqual(response.status_code, 302)

    @patch("main.utils.get_coordinates", return_value=(39.65, 66.96))
    def test_found_listing_saves_city_center_without_street_address(self, geocode):
        city = Location.objects.create(name="Samarqand")
        item = Item.objects.create(
            item_type="found",
            name="Topilgan kalit",
            description="Kalitlar to‘plami",
            date="2026-10-23",
            user=self.user,
            contact_info="+998901234567",
            city=city,
        )

        self.assertEqual((item.latitude, item.longitude), (39.65, 66.96))
        self.assertEqual(item.location_accuracy, "city")
        geocode.assert_called_once_with("Samarqand")

    @patch("main.utils.get_coordinates", return_value=(39.65, 66.96))
    def test_saving_without_address_change_does_not_geocode_again(self, geocode):
        city = Location.objects.create(name="Samarqand")
        item = Item.objects.create(
            item_type="found",
            name="Topilgan kalit",
            description="Kalitlar to‘plami",
            date="2026-10-23",
            user=self.user,
            contact_info="+998901234567",
            city=city,
        )
        self.assertEqual(geocode.call_count, 1)

        item.name = "Yangilangan nom"
        item.save()

        # Manzil o'zgarmagan — geocoding qayta chaqirilmaydi.
        self.assertEqual(geocode.call_count, 1)

    def test_location_property_is_rendered_when_no_address(self):
        item = Item(
            item_type="lost", name="Hamyon", address=None, district=None, city=None
        )
        self.assertEqual(item.location, "Ko'rsatilmagan")

        district_item = Item(item_type="lost", name="Hamyon", district="Yunusobod")
        self.assertEqual(district_item.location, "Yunusobod")

    @patch("main.forms.client", None)
    def test_found_listing_form_accepts_city_without_street_address(self):
        city = Location.objects.create(name="Samarqand")
        form = ItemForm(
            data={
                "item_type": "found",
                "name": "Topilgan telefon",
                "description": "Qora telefon",
                "date": "2026-10-23",
                "contact_info": "+998901234567",
                "city": city.pk,
                "district": "",
                "address": "",
            }
        )

        self.assertTrue(form.is_valid(), form.errors)


class CommentAndReportTests(TestCase):
    def setUp(self):
        self.author = get_user_model().objects.create_user(
            username="item-owner", password="test-pass-123"
        )
        self.other = get_user_model().objects.create_user(
            username="item-viewer", password="test-pass-123"
        )
        self.item = Item.objects.create(
            item_type="lost",
            name="Kalit",
            description="Kichik kalit",
            date=date(2026, 10, 23),
            user=self.author,
            contact_info="+998901234567",
        )

    def test_comment_requires_login(self):
        response = self.client.post(
            reverse("add_comment", args=[self.item.pk]), {"text": "Salom"}
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)

    def test_logged_in_user_can_comment(self):
        self.client.force_login(self.other)
        response = self.client.post(
            reverse("add_comment", args=[self.item.pk]),
            {"text": "Meniki bo‘lishi mumkin"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.item.comments.count(), 1)

    def test_report_accepts_wrong_info_reason(self):
        self.client.force_login(self.other)
        response = self.client.post(
            reverse("report_item", args=[self.item.pk]),
            {
                "reason": "wrong_info",
                "description": "Manzil xato",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.item.reports.count(), 1)

    def test_report_rejects_unknown_reason(self):
        self.client.force_login(self.other)
        response = self.client.post(
            reverse("report_item", args=[self.item.pk]), {"reason": "not-a-reason"}
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.item.reports.count(), 0)

    def test_owner_cannot_report_own_item(self):
        self.client.force_login(self.author)
        self.client.post(
            reverse("report_item", args=[self.item.pk]), {"reason": "spam"}
        )
        self.assertEqual(self.item.reports.count(), 0)

    def test_closed_item_visible_to_owner_only(self):
        self.item.status = "success"
        self.item.is_active = False
        self.item.save(update_fields=["status", "is_active"])

        anonymous_client = self.client_class()
        self.assertEqual(
            anonymous_client.get(
                reverse("item_detail", args=[self.item.pk])
            ).status_code,
            404,
        )

        self.client.force_login(self.other)
        self.assertEqual(
            self.client.get(reverse("item_detail", args=[self.item.pk])).status_code,
            404,
        )

        self.client.force_login(self.author)
        self.assertEqual(
            self.client.get(reverse("item_detail", args=[self.item.pk])).status_code,
            200,
        )


class AuthFlowTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="auth-user", password="strong-pass-123"
        )

    def test_login_redirects_to_next_page(self):
        response = self.client.post(
            reverse("login") + "?next=/items/",
            {
                "username": "auth-user",
                "password": "strong-pass-123",
            },
        )
        self.assertRedirects(response, "/items/")

    def test_login_ignores_external_next(self):
        response = self.client.post(
            reverse("login") + "?next=https://evil.example.com/",
            {
                "username": "auth-user",
                "password": "strong-pass-123",
            },
        )
        self.assertRedirects(response, reverse("home"))

    def test_logout_url_uses_correct_path(self):
        self.assertEqual(reverse("logout"), "/accounts/logout/")

    def test_authenticated_user_redirected_away_from_login(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("login"))
        self.assertRedirects(response, reverse("home"))
