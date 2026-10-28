import json
import logging

from django.conf import settings
from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views import View
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.views.generic import DetailView, ListView, TemplateView
from django.views.generic.edit import CreateView

from .forms import ItemForm
from .models import Category, ChatMessage, Comment, Item, Notification, Report, SupportMessage, SupportThread
from .utils import get_address_from_coordinates, get_coordinates, send_notification

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Gemini AI
# ---------------------------------------------------------------------------
def _get_ai_client():
    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if not api_key:
        return None
    try:
        from google import genai

        return genai.Client(api_key=api_key)
    except Exception as error:  # pragma: no cover - tashqi kutubxona
        logger.warning("Gemini klientini yaratib bo'lmadi: %s", error)
        return None


client = _get_ai_client()


SYSTEM_PROMPT = """
Siz Topildi.uz AI yordamchisiz. Sizning vazifangiz:
- Foydalanuvchilarga yo'qolgan va topilgan buyumlar haqida yordam berish.
- Sayt funksiyalari haqida savollarga javob berish.
- Oddiy suhbatlarda samimiy va foydali bo'lish.
- Foydalanuvchilarga e'lon berish tartibini tushuntirish.
- Sayt qoidalari va shartlari haqida ma'lumot berish.

Sayt haqida asosiy ma'lumotlar:
- Bu sayt yo'qolgan va topib olingan buyumlarni e'lon qilish uchun ishlatiladi.
- Saytda barcha turdagi buyumlarni e'lon qilish mumkin (telefon, hujjat, kalit, sumka va boshqalar).
- E'lon berish tekin, hech qanday to'lov talab qilinmaydi.
- E'lon berish uchun foydalanuvchi ro'yxatdan o'tishi zarur, keyin e'lon qo'shishi mumkin.
- Foydalanuvchilar bazadagi yo'qolgan va topilgan buyumlar haqida izohlar qoldirishlari mumkin.
- Har bir e'lon joylashuv va kategoriya bilan birga ko'rsatiladi.
- Admin panel orqali kategoriya va joylashuvlarni boshqarish mumkin.
- Foydalanuvchilar e'lonlarga bog'lanish uchun aloqa ma'lumotlarini ko'rishlari mumkin.
- Saytning asosiy maqsadi — yo'qolgan narsalarni tezroq topishga yordam berish.
"""


def _ensure_session_key(request):
    """Sessiya kaliti mavjudligini kafolatlaydi (anonim foydalanuvchilar uchun)."""
    if not request.session_key:
        request.session.create()
    return request.session_key


@require_POST
def chat_ai(request):
    if not client:
        return JsonResponse(
            {"reply": "AI konfiguratsiya qilinmagan. Iltimos, GEMINI_API_KEY ni sozlang."},
            status=503,
        )

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({"reply": "So'rov formati noto'g'ri."}, status=400)

    user_message = str(data.get("message", "")).strip()
    if not user_message:
        return JsonResponse({"reply": "Iltimos, savolingizni yozing."}, status=400)
    if len(user_message) > 4000:
        return JsonResponse({"reply": "Xabar juda uzun. Iltimos, qisqartiring."}, status=400)

    items = Item.objects.filter(status='active').select_related('category')[:10]
    items_text = "\n".join(
        f"{item.category.name if item.category else 'Kategoriyasiz'} - {item.location}: {item.description}"
        for item in items
    )

    chat_prompt = f"""{SYSTEM_PROMPT}

Oxirgi e'lonlar:
{items_text or "Hozircha e'lon yo'q"}

Foydalanuvchi xabari: {user_message}
"""

    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=chat_prompt
        )
        reply = (response.text or '').strip()
    except Exception as error:
        logger.warning("AI chat error: %s", error)
        try:
            response = client.models.generate_content(
                model="models/gemini-2.5-pro",
                contents=chat_prompt
            )
            reply = (response.text or '').strip()
        except Exception as fallback_error:
            logger.error("AI chat fallback error: %s", fallback_error)
            return JsonResponse({"reply": "Kechirasiz, AI hozir javob bera olmayapti. Keyinroq urinib ko'ring."}, status=502)

    if not reply:
        return JsonResponse({"reply": "Kechirasiz, javob olinmadi. Savolni boshqacha yozib ko'ring."}, status=502)

    session_key = _ensure_session_key(request)
    ChatMessage.objects.create(user_id=session_key, role="user", message=user_message)
    ChatMessage.objects.create(user_id=session_key, role="bot", message=reply)

    return JsonResponse({"reply": reply})


@require_GET
def chat_history(request):
    session_key = getattr(request.session, 'session_key', None)
    if not session_key:
        return JsonResponse({"messages": []})

    messages_qs = ChatMessage.objects.filter(user_id=session_key).order_by("timestamp")

    return JsonResponse({
        "messages": [
            {"role": m.role, "text": m.message, "time": m.timestamp.strftime("%H:%M")}
            for m in messages_qs
        ]
    })


# ---------------------------------------------------------------------------
# Xarita
# ---------------------------------------------------------------------------
@require_GET
def items_api(request):
    items = Item.objects.filter(is_active=True).select_related('city')
    return JsonResponse([
        {
            'id': item.id,
            'name': item.name,
            'address': item.address or '',
            'district': item.district or '',
            'city': item.city.name if item.city else '',
            'location': item.location,
            'location_accuracy': item.location_accuracy,
            'latitude': item.latitude,
            'longitude': item.longitude,
            'item_type': item.item_type,
        }
        for item in items
    ], safe=False)


@require_GET
def geocode_location(request):
    address = request.GET.get('address', '').strip()
    district = request.GET.get('district', '').strip()
    region = request.GET.get('region', '').strip()
    candidates = []

    query_levels = []
    if address:
        query_levels.append(([address, district, region], 'street'))
    if district:
        query_levels.append(([district, region], 'district'))
    if region:
        query_levels.append(([region], 'city'))

    for parts, accuracy in query_levels:
        query_parts = [part for part in parts if part]
        query = ', '.join(query_parts)
        if query and query not in [candidate[0] for candidate in candidates]:
            candidates.append((query, accuracy))

    if not candidates:
        return JsonResponse({'error': 'Joylashuvni kiriting.'}, status=400)

    for query, accuracy in candidates:
        latitude, longitude = get_coordinates(query)
        if latitude is not None and longitude is not None:
            return JsonResponse({
                'lat': latitude,
                'lon': longitude,
                'location': query,
                'accuracy': accuracy,
            })

    return JsonResponse({'error': 'Bu joy xaritadan topilmadi.'}, status=404)


@login_required
@require_GET
def reverse_geocode_location(request):
    try:
        latitude = float(request.GET.get('lat', ''))
        longitude = float(request.GET.get('lon', ''))
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Koordinatalar noto‘g‘ri.'}, status=400)

    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        return JsonResponse({'error': 'Koordinatalar noto‘g‘ri.'}, status=400)

    location = get_address_from_coordinates(latitude, longitude)
    if not location:
        return JsonResponse({'error': 'Bu joy manzili aniqlanmadi.'}, status=404)

    return JsonResponse({
        'latitude': latitude,
        'longitude': longitude,
        **location,
    })


# ---------------------------------------------------------------------------
# Sahifalar
# ---------------------------------------------------------------------------
@require_GET
def stats_view(request):
    total_items = Item.objects.count()
    by_category = (
        Item.objects.values('category__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    by_location = (
        Item.objects.values('city__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    data = {
        "total_items": total_items,
        "by_category": [
            {"category": row['category__name'] or "Kategoriyasiz", "count": row['count']}
            for row in by_category
        ],
        "by_location": [
            {"city": row['city__name'] or "Ko'rsatilmagan", "count": row['count']}
            for row in by_location
        ],
    }
    return JsonResponse(data)


def home_view(request):
    query = request.GET.get('q')
    filter_type = request.GET.get('type')
    filter_category = request.GET.get('category')

    # Bosh sahifada faqat aktiv e'lonlar ko'rsatiladi.
    items = Item.objects.filter(status='active').select_related('category', 'city').order_by('-date', '-id')

    last_items = items[:8]
    last_three_items = items[:3]

    if query:
        items = items.filter(name__icontains=query)

    if filter_type and filter_type != 'all':
        items = items.filter(item_type=filter_type)

    if filter_category:
        items = items.filter(category__name=filter_category)

    total_active = Item.objects.filter(status='active').count()
    total_found = Item.objects.filter(status='found').count()
    total_success = Item.objects.filter(status='success').count()

    total_items = total_active + total_found + total_success

    success_rate = 0
    if total_items > 0:
        success_rate = round((total_success / total_items) * 100)

    return render(request, 'index.html', {
        'items': items[:8],
        'last_items': last_items,
        'last_three_items': last_three_items,
        'categories': Category.objects.order_by('name'),
        'search_query': query,
        'active_type': filter_type,
        'active_category': filter_category,
        'total_active': total_active,
        'total_found': total_found,
        'total_success': total_success,
        'success_rate': success_rate,
    })


def _bar_rows(queryset, key, empty_label, limit=5):
    rows = list(queryset[:limit])
    peak = rows[0]['count'] if rows else 0
    return [
        {
            'name': row[key] or empty_label,
            'count': row['count'],
            'percent': round(row['count'] / peak * 100) if peak else 0,
        }
        for row in rows
    ]
 
 
class AboutView(TemplateView):
    template_name = 'about.html'
 
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        total_active = Item.objects.filter(status='active').count()
        total_success = Item.objects.filter(status='success').count()
        total_items = Item.objects.count()
 
        context.update({
            'total_active': total_active,
            'total_success': total_success,
            'total_items': total_items,
            'total_users': get_user_model().objects.filter(is_active=True).count(),
            'success_rate': round((total_success / total_items) * 100) if total_items else 0,
 
            # Lenta: so'nggi aktiv va qaytarilgan e'lonlar
            'recent_items': (
                Item.objects.filter(status__in=['active', 'success'])
                .select_related('category')
                .order_by('-date', '-id')[:12]
            ),
            'top_categories': _bar_rows(
                Item.objects.values('category__name').annotate(count=Count('id')).order_by('-count'),
                'category__name', "Kategoriyasiz",
            ),
            'top_cities': _bar_rows(
                Item.objects.values('city__name').annotate(count=Count('id')).order_by('-count'),
                'city__name', "Ko'rsatilmagan",
            ),
        })
        return context
 


class ItemListView(ListView):
    model = Item
    template_name = 'items.html'
    context_object_name = 'items'
    paginate_by = 24

    def get_queryset(self):
        query = self.request.GET.get('q')
        item_type = self.request.GET.get('type')
        category = self.request.GET.get('category')

        items = Item.objects.filter(status='active').select_related('category', 'city').order_by('-date', '-id')

        if item_type and item_type != 'all':
            items = items.filter(item_type=item_type)

        if category:
            items = items.filter(category__name=category)

        if query:
            items = items.filter(name__icontains=query)

        return items

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        active_items = Item.objects.filter(status='active')

        context['last_items'] = active_items.order_by('-date', '-id')[:3]
        context['form'] = ItemForm()
        context['categories'] = Category.objects.order_by('name')
        context['active_type'] = self.request.GET.get('type')
        context['active_category'] = self.request.GET.get('category')
        context['search_query'] = self.request.GET.get('q')

        context['total_lost'] = active_items.filter(item_type='lost').count()
        context['total_found'] = active_items.filter(item_type='found').count()
        context['total_returned'] = Item.objects.filter(status='success').count()

        return context


class CreateItemView(LoginRequiredMixin, CreateView):
    model = Item
    template_name = 'items.html'
    form_class = ItemForm
    login_url = 'login'
    success_url = reverse_lazy('items')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        active_items = Item.objects.filter(status='active')
        context['items'] = active_items.select_related('category', 'city').order_by('-date', '-id')
        context['categories'] = Category.objects.order_by('name')
        context['total_lost'] = active_items.filter(item_type='lost').count()
        context['total_found'] = active_items.filter(item_type='found').count()
        context['total_returned'] = Item.objects.filter(status='success').count()
        return context

    def form_valid(self, form):
        form.instance.user = self.request.user
        with transaction.atomic():
            response = super().form_valid(form)
            # Faqat boshqa foydalanuvchilarga xabar yuboramiz (o'ziga emas).
            recipients = (
                get_user_model().objects
                .filter(is_active=True)
                .exclude(pk=self.request.user.pk)
            )
            Notification.objects.bulk_create([
                Notification(
                    title="Yangi e'lon joylandi",
                    message=f"{self.object.get_item_type_display()}: {self.object.name}",
                    notification_type='new_listing',
                    item=self.object,
                    user=recipient,
                    is_for_admin=False,
                )
                for recipient in recipients.iterator()
            ], batch_size=1000)
        messages.success(self.request, "✅ E'lon muvaffaqiyatli qo'shildi!")
        return response

    def form_invalid(self, form):
        messages.error(self.request, "E'lonni saqlab bo'lmadi. Iltimos, kiritilgan ma'lumotlarni tekshiring.")
        return self.render_to_response(self.get_context_data(form=form))


class ItemDetailView(DetailView):
    model = Item
    template_name = 'detail.html'
    context_object_name = 'item'
 
    def get_queryset(self):
        # Aktiv e'lonni hamma ko'radi. Yopilgan e'lonni faqat egasi va adminlar.
        queryset = Item.objects.select_related('category', 'city', 'user')
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return queryset
        if user.is_authenticated:
            return queryset.filter(Q(status='active') | Q(user=user))
        return queryset.filter(status='active')
 
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        item = self.object
        request = self.request
 
        is_closed = item.status != 'active'
        context['is_lost'] = item.item_type == 'lost'
        context['is_closed'] = is_closed
        context['is_returned'] = item.status == 'success'
        context['has_map'] = item.latitude is not None and item.longitude is not None
 
        related = Item.objects.filter(
            item_type=item.item_type,
            status='active',
        ).exclude(pk=item.pk)
        if item.category_id:
            related = related.filter(category=item.category)
        context['related_items'] = related.select_related('category', 'city').order_by('-date', '-id')[:4]
 
        # Shablonda item.comments.count 3 marta chaqirilardi (3 ta SQL). Endi bitta.
        comments = item.comments.select_related('user')
        context['comments_total'] = comments.count()
        context['comments'] = comments[:10]
 
        context['can_report'] = (
            request.user.is_authenticated
            and not is_closed
            and item.user_id != request.user.pk
        )
 
        # Telegram va boshqa tarmoqlarda ulashilganda preview uchun
        context['og_url'] = request.build_absolute_uri(reverse('item_detail', args=[item.pk]))
        context['og_image'] = request.build_absolute_uri(item.image.url) if item.image else ''
 
        return context


# ---------------------------------------------------------------------------
# Bildirishnomalar va admin chat
# ---------------------------------------------------------------------------
@login_required
@require_GET
def notifications_api(request):
    notifications = Notification.objects.filter(
        user=request.user,
        is_for_admin=False,
    ).select_related('item')

    return JsonResponse({
        'unread_count': notifications.filter(is_read=False).count(),
        'notifications': [
            {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.notification_type,
                'item_url': reverse('item_detail', args=[notification.item_id]) if notification.item_id else '',
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat(),
            }
            for notification in notifications[:50]
        ],
    })


@login_required
@require_POST
def notifications_mark_read(request):
    Notification.objects.filter(
        user=request.user,
        is_for_admin=False,
        is_read=False,
    ).update(is_read=True)
    return JsonResponse({'success': True})


@login_required
@require_http_methods(['GET', 'POST'])
def support_chat_api(request):
    thread = SupportThread.objects.filter(user=request.user).first()

    if request.method == 'GET':
        support_messages = thread.messages.select_related('sender') if thread else SupportMessage.objects.none()
        return JsonResponse({
            'thread_id': thread.id if thread else None,
            'status': thread.status if thread else 'open',
            'messages': [
                {
                    'sender': message.sender.username,
                    'body': message.body,
                    'is_from_admin': message.is_from_admin,
                    'created_at': message.created_at.isoformat(),
                }
                for message in support_messages
            ],
        })

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Xabar formati noto‘g‘ri.'}, status=400)

    body = str(data.get('message', '')).strip()
    if not body or len(body) > 3000:
        return JsonResponse({'error': 'Xabar 1 dan 3000 ta belgigacha bo‘lishi kerak.'}, status=400)

    with transaction.atomic():
        if not thread or thread.status == 'closed':
            thread = SupportThread.objects.create(user=request.user)

        support_message = SupportMessage.objects.create(
            thread=thread,
            sender=request.user,
            body=body,
            is_from_admin=False,
        )
        thread.save(update_fields=['updated_at'])

        admin_users = get_user_model().objects.filter(is_active=True, is_staff=True)
        Notification.objects.bulk_create([
            Notification(
                title='Admin chatida yangi xabar',
                message=f'{request.user.username}: {body[:180]}',
                notification_type='system',
                user=admin_user,
                is_for_admin=True,
            )
            for admin_user in admin_users.iterator()
        ], batch_size=1000)

    return JsonResponse({
        'thread_id': thread.id,
        'status': thread.status,
        'message': {
            'sender': support_message.sender.username,
            'body': support_message.body,
            'is_from_admin': False,
            'created_at': support_message.created_at.isoformat(),
        },
    }, status=201)

# ---------------------------------------------------------------------------
# Izohlar va shikoyatlar
# ---------------------------------------------------------------------------
class AddCommentView(LoginRequiredMixin, CreateView):
    model = Comment
    fields = ['text']
    template_name = 'detail.html'
    login_url = 'login'
 
    def form_valid(self, form):
        item = get_object_or_404(Item, pk=self.kwargs['pk'])
        if item.status != 'active':
            messages.error(self.request, "Yopilgan e'longa izoh qoldirib bo'lmaydi.")
            return redirect('item_detail', pk=item.pk)
        form.instance.item = item
        form.instance.user = self.request.user
        messages.success(self.request, "Izohingiz qo'shildi!")
        return super().form_valid(form)
 
    def form_invalid(self, form):
        messages.error(self.request, "Izoh bo'sh bo'lishi mumkin emas.")
        return redirect('item_detail', pk=self.kwargs['pk'])
 
    def get_success_url(self):
        return reverse('item_detail', kwargs={'pk': self.kwargs['pk']}) + '#comments-section'

class DeleteCommentView(LoginRequiredMixin, View):
    login_url = 'login'

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        item_pk = comment.item.pk

        if comment.user != request.user and not request.user.is_staff:
            messages.error(request, "Siz faqat o'z izohlaringizni o'chira olasiz!")
            return redirect('item_detail', pk=item_pk)

        comment.delete()
        messages.success(request, "Izoh o'chirildi!")

        return redirect('item_detail', pk=item_pk)


class ReportItemView(LoginRequiredMixin, View):
    login_url = 'login'

    def post(self, request, pk):
        item = get_object_or_404(Item, pk=pk)

        if item.user == request.user:
            messages.error(request, "O'z e'loningizni report qila olmaysiz!")
            return redirect('item_detail', pk=pk)

        reason = request.POST.get('reason')
        description = request.POST.get('description', '')

        valid_reasons = dict(Report.REASON_CHOICES)
        if reason not in valid_reasons:
            messages.error(request, "Iltimos, to'g'ri sababni tanlang!")
            return redirect('item_detail', pk=pk)

        existing_report = Report.objects.filter(item=item, user=request.user).first()
        if existing_report:
            messages.warning(request, "Siz bu e'lonni avval report qilgansiz!")
            return redirect('item_detail', pk=pk)

        Report.objects.create(
            item=item,
            user=request.user,
            reason=reason,
            description=description
        )

        # Adminlarga xabar yuborish (adminlar topilmasa ham shikoyat saqlanadi).
        admin_users = get_user_model().objects.filter(is_active=True, is_staff=True)
        notification_message = (
            "Shikoyat ma'lumotlari:\n"
            f"Kim yuborgan: {request.user.username} ({request.user.email})\n"
            f"E'lon: {item.name} (ID: {item.pk})\n"
            f"E'lon egasi: {item.user.username}\n"
            f"Sabab: {valid_reasons[reason]}\n"
            f"Tavsif: {description or 'Yo\'q'}\n"
            f"Vaqt: {timezone.now().strftime('%d.%m.%Y %H:%M:%S')}"
        )
        Notification.objects.bulk_create([
            Notification(
                title=f"📢 Yangi shikoyat: {item.name}",
                message=notification_message,
                notification_type='report_received',
                item=item,
                user=admin_user,
                is_for_admin=True,
                is_read=False,
            )
            for admin_user in admin_users.iterator()
        ], batch_size=1000)

        messages.success(request, "Shikoyatingiz qabul qilindi. Tekshiruvchilarimiz tomonidan ko'rib chiqiladi.")
        return redirect('item_detail', pk=pk)


# ---------------------------------------------------------------------------
# Profil va e'lonni yopish
# ---------------------------------------------------------------------------
@login_required
@require_GET
def user_profile(request):
    user = request.user
    items = list(Item.objects.filter(user=user).order_by('-date', '-id'))

    # Adminga yopish so'rovi yuborilgan, lekin hali ko'rilmagan e'lonlar
    pending_ids = set(
        Notification.objects.filter(
            item__user=user,
            is_for_admin=True,
            notification_type='item_closed',
            is_read=False,
        ).values_list('item_id', flat=True)
    )

    items_data = []
    active = closed = 0
    for item in items:
        if item.status != 'active':
            state = 'closed'
            closed += 1
        else:
            state = 'pending' if item.pk in pending_ids else 'active'
            active += 1

        items_data.append({
            'id': item.pk,
            'name': item.name,
            'item_type': item.item_type,
            'state': state,
            'date': item.date.strftime('%d.%m.%Y'),
            'url': reverse('item_detail', args=[item.pk]),
        })

    total = len(items)
    profile = getattr(user, 'profile', None)

    return JsonResponse({
        'phone': getattr(profile, 'phone', '') or '',
        'stats': {
            'active': active,
            'closed': closed,
            'success_rate': round(closed / total * 100) if total else 0,
        },
        'items': items_data,
    })


@login_required
@require_POST
def request_close_item(request, pk):
    """Foydalanuvchi o'z e'lonini yopishni so'raydi (adminga bildirishnoma ketadi)."""
    item = get_object_or_404(Item, pk=pk, user=request.user)

    if item.status != 'active':
        return JsonResponse({'error': "Bu e'lon allaqachon yopilgan."}, status=400)

    already_requested = Notification.objects.filter(
        item=item,
        is_for_admin=True,
        notification_type='item_closed',
        is_read=False,
    ).exists()
    if already_requested:
        return JsonResponse({'status': 'pending'})

    admin_users = get_user_model().objects.filter(is_active=True, is_staff=True)
    if not admin_users.exists():
        return JsonResponse({'error': 'Hozircha admin topilmadi.'}, status=503)

    close_request_message = (
        "E'lon yopish so'rovi:\n"
        f"Foydalanuvchi: {request.user.username} ({request.user.email})\n"
        f"E'lon: {item.name} (ID: {item.pk})\n"
        f"Sana: {item.date}\n"
        f"So'rov vaqti: {timezone.now().strftime('%d.%m.%Y %H:%M:%S')}"
    )
    # Hamma adminlar uchun bitta umumiy so'rov (har bir adminga alohida emas).
    Notification.objects.create(
        title="🔒 E'lonni yopish so'rovi",
        message=close_request_message,
        notification_type='item_closed',
        item=item,
        user=None,
        is_for_admin=True,
        is_read=False,
    )

    Notification.objects.bulk_create([
        Notification(
            title="🔒 E'lonni yopish so'rovi",
            message=close_request_message,
            notification_type='item_closed',
            item=item,
            user=admin_user,
            is_for_admin=True,
            is_read=False,
        )
        for admin_user in admin_users.iterator()
    ], batch_size=1000)

    return JsonResponse({'status': 'pending'}, status=201)


@staff_member_required
@require_POST
def admin_approve_close_item(request, pk):
    """Admin tomonidan e'lonni yopishni tasdiqlash."""
    item = get_object_or_404(Item, pk=pk)
    new_status = request.POST.get('status', 'success')

    if new_status not in dict(Item.STATUS_CHOICES):
        messages.error(request, "Noto'g'ri status!")
        return redirect('admin:main_notification_changelist')

    item.status = new_status
    item.is_active = (new_status == 'active')
    item.save(update_fields=['status', 'is_active'])

    if new_status == 'success':
        send_notification(
            title="✅ E'lon tasdiqlandi",
            message=(
                f"Hurmatli {item.user.username},\n"
                f'Sizning "{item.name}" e\'loningiz administrator tomonidan tasdiqlandi va yopildi.\n'
                f"Yopilgan sana: {timezone.now().strftime('%d.%m.%Y %H:%M:%S')}"
            ),
            notification_type='item_success',
            item=item,
            user=item.user,
            for_admin=False,
        )

    Notification.objects.filter(item=item, notification_type='item_closed').update(is_read=True)
    messages.success(request, f"E'lon statusi '{item.get_status_display()}' ga o'zgartirildi!")
    return redirect('admin:main_notification_changelist')
