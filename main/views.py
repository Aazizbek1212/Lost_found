from time import timezone

from django.shortcuts import redirect, render, get_object_or_404
from django.urls import reverse, reverse_lazy
from django.views.generic.edit import CreateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.db.models import Count
from django.views.generic import DetailView
from django.db.models import Q
from django.views.generic import ListView
from django.views import View
from django.core.mail import send_mail
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.utils.html import strip_tags
from .models import Item, Report, Notification
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required, user_passes_test
from django.utils import timezone


from django.contrib.admin.views.decorators import staff_member_required

from .utils import get_coordinates


from main.forms import ItemForm
from main.models import ChatMessage, Item, Comment
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from .models import Category, Item, Notification, Notification, Report
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
else:
    client = None


system_prompt = """
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

Oxirgi e'lonlar:
{items_text}
Foydalanuvchi so'rovi: {message}
Vazifa: foydalanuvchi so'roviga mos e'lonlarni tanlab, javob qaytar.
"""
@csrf_exempt
def chat_ai(request):
    if request.method == "POST":
        if not client:
            return JsonResponse({"reply": "AI konfiguratsiya qilinmagan. Iltimos, GEMINI_API_KEY ni sozlang."})
        
        try:
            data = json.loads(request.body)
            user_message = data.get("message")          # chat uchun
            description_text = data.get("description")  # e'lon matni uchun

            # Bazadan oxirgi 10 ta e'lonni olish
            items = Item.objects.order_by("-id")[:10]
            items_text = "\n".join([f"{i.category} - {i.address}: {i.description}" for i in items])

            # Chat prompt
            chat_prompt = f"""
            {system_prompt}

            Oxirgi e'lonlar:
            {items_text}

            Foydalanuvchi xabari: {user_message}
            """

            # Modelni chaqirish (fallback bilan)
            try:
                response = client.models.generate_content(
                    model="models/gemini-2.5-flash",
                    contents=chat_prompt
                )
            except Exception:
                response = client.models.generate_content(
                    model="models/gemini-2.5-pro",
                    contents=chat_prompt
                )

            # Chat xabarlarini bazaga saqlash
            ChatMessage.objects.create(
                user_id=request.session.session_key,
                role="user",
                message=user_message
            )
            ChatMessage.objects.create(
                user_id=request.session.session_key,
                role="bot",
                message=response.text
            )

            # Agar description_text bo'lsa, kategoriya va joylashuvni aniqlash
            category, location = None, None
            if description_text:
                cat_prompt = f"""
                Foydalanuvchi e'lon matni: "{description_text}"

                Vazifa:
                - Matndan kategoriya (telefon, hujjat, kalit, sumka va boshqalar) ni aniqlang.
                - Matndan joylashuv (masalan: Yunusobod, Chilonzor, Samarqand va hokazo) ni aniqlang.
                - Faqat kategoriya va joylashuvni qaytaring.
                """
                try:
                    cat_response = client.models.generate_content(
                        model="models/gemini-2.5-flash",
                        contents=cat_prompt
                    )
                    result = cat_response.text
                    if "Kategoriya:" in result:
                        category = result.split("Kategoriya:")[1].split("\n")[0].strip()
                    if "Joylashuv:" in result:
                        location = result.split("Joylashuv:")[1].split("\n")[0].strip()

                    # Bazaga saqlash
                    Item.objects.create(
                        description=description_text,
                        category=category,
                        address=location
                    )
                except Exception:
                    pass  # Kategoriya aniqlash muvaffaqiyatsiz

            return JsonResponse({"reply": response.text})

        except Exception:
            return JsonResponse({"reply": "AI ishlamayapti 😔"})

    return JsonResponse({"reply": "Faqat POST ishlaydi"})


def items_map(request):
    items = Item.objects.filter(is_active=True)
    data = [
        {
            "id": i.id,
            "name": i.name,
            "category": i.category.name if i.category else "",
            "location": i.city.name if i.city else "",
            "latitude": i.latitude,
            "longitude": i.longitude,
            "status": i.get_status_display(),
            "item_type": i.item_type,
        }
        for i in items if i.latitude and i.longitude
    ]
    return JsonResponse(data, safe=False)


def save(self, *args, **kwargs):
    if (not self.latitude or not self.longitude) and self.city:
        from .utils import get_coordinates
        lat, lng = get_coordinates(self.city.name)
        if lat and lng:
            self.latitude = lat
            self.longitude = lng
    super().save(*args, **kwargs)


def chat_history(request):
    messages = ChatMessage.objects.filter(
        user_id=request.session.session_key
    ).order_by("timestamp")

    return JsonResponse({
        "messages": [
            {"role": m.role, "text": m.message, "time": m.timestamp.strftime("%H:%M")}
            for m in messages
        ]
    })


def stats_view(request):
    total_items = Item.objects.count()
    by_category = Item.objects.values("category").annotate(count=Count("id")).order_by("-count")
    by_location = Item.objects.values("city").annotate(count=Count("id")).order_by("-count")

    data = {
        "total_items": total_items,
        "by_category": list(by_category),
        "by_location": list(by_location),
    }
    return JsonResponse(data)

def home_view(request):
    query = request.GET.get('q')
    filter_type = request.GET.get('type')
    filter_category = request.GET.get('category')

    # Asosiy queryset
    items = Item.objects.all().order_by('-date')

    # Oxirgi 8 ta e'lon
    last_items = Item.objects.order_by('-date')[:8]

    # Oxirgi 3 ta e'lon
    last_three_items = Item.objects.order_by('-date')[:3]

    # Qidiruv
    if query:
        items = items.filter(name__icontains=query)

    # Type filter
    if filter_type and filter_type != 'all':
        items = items.filter(item_type=filter_type)

    # Category filter
    if filter_category:
        items = items.filter(category__name=filter_category)

    # Statistikalar
    total_active = Item.objects.filter(status='active').count()
    total_found = Item.objects.filter(status='found').count()
    total_success = Item.objects.filter(status='success').count()

    total_items = total_active + total_found + total_success

    success_rate = 0
    if total_items > 0:
        success_rate = round((total_success / total_items) * 100)

    return render(request, 'index.html', {
        'items': items[:8],              # faqat oxirgi 8 ta e'lon
        'last_items': last_items,        # alohida oxirgi 8 ta
        'last_three_items': last_three_items,
        'search_query': query,
        'active_type': filter_type,
        'active_category': filter_category,
        'total_active': total_active,
        'total_found': total_found,
        'total_success': total_success,
        'success_rate': success_rate,
    })


class ItemListView(ListView):
    model = Item
    template_name = 'items.html'
    context_object_name = 'items'

    def get_queryset(self):
        query = self.request.GET.get('q')
        item_type = self.request.GET.get('type')
        category = self.request.GET.get('category')

        items = Item.objects.filter(status='active').order_by('-date')

        # type bo‘yicha filter
        if item_type and item_type != 'all':
            items = items.filter(item_type=item_type)

        # category bo‘yicha filter
        if category:
            items = items.filter(category__name=category)

        # faqat nomi bo‘yicha qidiruv
        if query:
            items = items.filter(name__icontains=query)

        return items

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # oxirgi 3 ta e’lon
        context['last_items'] = Item.objects.filter(status='active').order_by('-date')[:3]

        # form
        context['form'] = ItemForm()

        # aktiv filterlar
        context['active_type'] = self.request.GET.get('type')
        context['active_category'] = self.request.GET.get('category')
        context['search_query'] = self.request.GET.get('q')

        # statistikalar
        context['total_lost'] = Item.objects.filter(item_type='lost', status='active').count()
        context['total_found'] = Item.objects.filter(item_type='found', status='active').count()
        context['total_returned'] = Item.objects.filter(status='success').count()

        return context

class CreateItemView(LoginRequiredMixin, CreateView):
    model = Item
    template_name = 'items.html'
    form_class = ItemForm
    login_url = 'login'
    success_url = reverse_lazy('items')  # ✅ muvaffaqiyatdan keyin yo‘naltirish

    def form_valid(self, form):
        form.instance.user = self.request.user
        messages.success(self.request, "✅ E'lon muvaffaqiyatli qo'shildi!")
        return super().form_valid(form)

    def form_invalid(self, form):
        items = Item.objects.all().order_by('-date')
        messages.error(self.request, "Xatolik yuz berdi. Qaytadan urinib ko'ring.")
        return render(self.request, 'items.html', {'form': form, 'items': items})
        
class ItemDetailView(DetailView):
    model = Item
    template_name = 'detail.html'
    context_object_name = 'item'

    def get_queryset(self):
        # faqat aktiv e’lonlarni ko‘rsatamiz
        return Item.objects.select_related(
            'category', 'city', 'user'
        ).filter(status='active')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        item = self.object

        # Badge rangi uchun
        context['is_lost'] = item.item_type == 'lost'

        # O'xshash e'lonlar (bir xil kategoriya va aktiv holatda)
        context['related_items'] = Item.objects.filter(
            category=item.category,
            item_type=item.item_type,
            status='active'
        ).exclude(pk=item.pk)[:4]

        context['comments'] = Comment.objects.filter(
            item=item
        ).order_by('-created_at')[:5]

        return context


def items_api(request):
    items = Item.objects.filter(is_active=True).values('id', 'name', 'address', 'city', 'latitude', 'longitude', 'item_type')
    return JsonResponse(list(items), safe=False)

class AddCommentView(CreateView):
    model = Comment
    fields = ['text']
    template_name = 'detail.html'

    def form_valid(self, form):
        form.instance.item_id = self.kwargs['pk']
        form.instance.user = self.request.user  # ← MUHIM! USER QO'SHISH
        return super().form_valid(form)
    
    def get_success_url(self):
        return reverse('item_detail', kwargs={'pk': self.kwargs['pk']})


class DeleteCommentView(LoginRequiredMixin, View):
    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        item_pk = comment.item.pk
        
        if comment.user != request.user:
            messages.error(request, "Siz faqat o'z izohlaringizni o'chira olasiz!")
            return redirect('item_detail', pk=item_pk)
        
        comment.delete()
        messages.success(request, "Izoh o'chirildi!")
        
        return redirect('item_detail', pk=item_pk)


class ReportItemView(LoginRequiredMixin, View):
    def post(self, request, pk):
        print("=== REPORT VIEW ISHLADI ===")
        item = get_object_or_404(Item, pk=pk)
        
        # O'z e'lonini report qilmaslik
        if item.user == request.user:
            messages.error(request, "O'z e'loningizni report qila olmaysiz!")
            return redirect('item_detail', pk=pk)
        
        reason = request.POST.get('reason')
        description = request.POST.get('description', '')
        
        # Sababni tekshirish
        if not reason:
            messages.error(request, "Iltimos, sababni tanlang!")
            return redirect('item_detail', pk=pk)
        
        # Takroriy report tekshiruvi
        existing_report = Report.objects.filter(item=item, user=request.user).first()
        if existing_report:
            messages.warning(request, "Siz bu e'lonni avval report qilgansiz!")
            return redirect('item_detail', pk=pk)
        
        # Report yaratish
        report = Report.objects.create(
            item=item,
            user=request.user,
            reason=reason,
            description=description
        )
        
        # ✅ ADMINGA XABAR (NOTIFICATION)
        try:
            Notification.objects.create(
                title=f"📢 Yangi shikoyat: {item.name}",
                message=f"""
📋 Shikoyat ma'lumotlari:
👤 Kim yuborgan: {request.user.username} ({request.user.email})
📦 E'lon: {item.name}
👨‍💼 E'lon egasi: {item.user.username}
🏷️ Sabab: {dict(Report.REASON_CHOICES).get(reason, reason)}
📝 Tavsif: {description if description else 'Yo\'q'}
🔗 E'lon ID: {item.pk}
🕐 Vaqt: {timezone.now().strftime('%d.%m.%Y %H:%M:%S')}
                """,
                notification_type='report_received',
                item=item,
                user=request.user,
                is_for_admin=True,
                is_read=False
            )
            print(f"✅ Notification saved for report on {item.name}")
        except Exception as e:
            print(f"❌ Notification error: {e}")
        
        messages.success(request, "Shikoyatingiz qabul qilindi. Tekshiruvchilarimiz tomonidan ko'rib chiqiladi.")
        return redirect('item_detail', pk=pk)



@login_required
def user_profile(request):
    user = request.user
    items = Item.objects.filter(user=user).order_by('-date')
    
    items_data = []
    for item in items:
        # JOYLASHUVNI TO'G'RI OLISH
        location_text = ""
        if item.address:
            location_text = item.address
        elif item.city:
            location_text = str(item.city)
        else:
            location_text = "Ko'rsatilmagan"
        
        items_data.append({
            'id': item.id,
            'name': item.name,
            'item_type': item.item_type,
            'item_type_display': item.get_item_type_display(),
            'status': item.status,
            'status_display': item.get_status_display(),
            'date': item.date.strftime('%d.%m.%Y'),
            'location': location_text,
            'image': item.image.url if item.image else None,
        })
    
    data = {
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name or "",
        'last_name': user.last_name or "",
        'date_joined': user.date_joined.strftime('%d.%m.%Y'),
        'items_count': items.count(),
        'items': items_data,
    }
    
    return JsonResponse(data)


@login_required
def request_close_item(request, pk):
    """Foydalanuvchi o'z e'lonini yopishni so'rash"""
    item = get_object_or_404(Item, pk=pk, user=request.user)
    
    if item.status == 'active':
        # Admin uchun notification yaratish
        try:
            Notification.objects.create(
                title=f"🔒 E'lonni yopish so'rovi",
                message=f"""
📋 E'lon yopish so'rovi:
👤 Foydalanuvchi: {request.user.username} ({request.user.email})
📦 E'lon: {item.name}
🔗 E'lon ID: {item.pk}
📅 Sana: {item.date}
🕐 So'rov vaqti: {timezone.now().strftime('%d.%m.%Y %H:%M:%S')}
                """,
                notification_type='item_closed',
                item=item,
                user=request.user,
                is_for_admin=True,
                is_read=False
            )
            messages.success(request, f"E'lonni yopish so'rovingiz adminga yuborildi!")
        except Exception as e:
            messages.error(request, f"Xatolik: {e}")
    else:
        messages.warning(request, "Bu e'lon allaqachon yopilgan!")
    
    return redirect('profile')


@user_passes_test(lambda u: u.is_staff)
def admin_approve_close_item(request, pk):
    """Admin tomonidan e'lonni yopishni tasdiqlash"""
    item = get_object_or_404(Item, pk=pk)
    
    if request.method == 'POST':
        new_status = request.POST.get('status', 'success')
        
        if new_status in dict(Item.STATUS_CHOICES):
            # Eski statusni eslab qolish
            old_status = item.status
            
            # E'lon statusini o'zgartirish
            item.status = new_status
            item.is_active = (new_status == 'active')
            item.save()
            
            # Foydalanuvchiga xabar yuborish
            if new_status == 'success':
                Notification.objects.create(
                    title="✅ E'lon tasdiqlandi",
                    message=f"""
📋 Hurmatli {item.user.username},
Sizning "{item.name}" e'loningiz administrator tomonidan tasdiqlandi va yopildi.

📅 Yopilgan sana: {timezone.now().strftime('%d.%m.%Y %H:%M:%S')}
                    """,
                    notification_type='item_success',
                    item=item,
                    user=item.user,
                    is_for_admin=False,
                    is_read=False
                )
            
            # Notificationni o'qilgan deb belgilash
            Notification.objects.filter(item=item, notification_type='item_closed').update(is_read=True)
            
            messages.success(request, f"E'lon statusi '{item.get_status_display()}' ga o'zgartirildi!")
        else:
            messages.error(request, "Noto'g'ri status!")
        
        return redirect('admin:main_notification_changelist')
    
    return JsonResponse({'success': False, 'message': 'Noto\'g\'ri so\'rov'}, status=400)