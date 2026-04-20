from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.views.generic.edit import CreateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.db.models import Count

from main.forms import ItemForm
from main.models import ChatMessage, Item
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from dotenv import load_dotenv
from google import genai
from .models import Item  # Item modelini import qilish

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# System prompt (AI konteksti)
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
        try:
            data = json.loads(request.body)
            user_message = data.get("message")          # chat uchun
            description_text = data.get("description")  # e'lon matni uchun

            # Bazadan oxirgi 10 ta e'lonni olish
            items = Item.objects.order_by("-id")[:10]
            items_text = "\n".join([f"{i.category} - {i.location}: {i.description}" for i in items])

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
                        location=location
                    )
                except Exception:
                    pass  # Kategoriya aniqlash muvaffaqiyatsiz

            return JsonResponse({"reply": response.text})

        except Exception:
            return JsonResponse({"reply": "AI ishlamayapti 😔"})

    return JsonResponse({"reply": "Faqat POST ishlaydi"})


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
    by_location = Item.objects.values("location").annotate(count=Count("id")).order_by("-count")

    data = {
        "total_items": total_items,
        "by_category": list(by_category),
        "by_location": list(by_location),
    }
    return JsonResponse(data)


def dashboard_stats(request):
    total_items = Item.objects.count()  # Jami e'lon
    found_items = Item.objects.filter(status="found").count()  # Topildi
    success_rate = 0

    if total_items > 0:
        success_rate = round((found_items / total_items) * 100)

    data = {
        "total_items": total_items,
        "found_items": found_items,
        "success_rate": success_rate,
    }
    return JsonResponse(data)


def home_view(request):
    return render(request, 'index.html')


def items_view(request): # Yo‘qolgan narsalar ro‘yxati
    items = Item.objects.all().order_by('-date')
    last_items = Item.objects.all().order_by('-date')[:3]
    form = ItemForm()
    return render(request, 'items.html', {'items': items, 'last_items': last_items, 'form': form})

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
        
