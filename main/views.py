from django.shortcuts import redirect, render
from django.views.generic.edit import CreateView
from django.contrib.auth.mixins import PermissionRequiredMixin

from main.forms import LostItemForm
from main.models import FoundItem, LostItem
import os
import json
import google.generativeai as genai
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv
from .models import LostItem  # Modelingiz nomini tekshiring (masalan: E'lon, Post, Item)

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@csrf_exempt
def ask_gemini(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_text = data.get("text", "").lower().strip()

            # 1. STATIK FILTR (Tezkor va tejamkor)
            static_responses = {
                "salom": "Assalomu alaykum! Topildi.uz yordamchisiman. Sizga qanday yordam bera olaman?",
                "qalaysiz": "Rahmat, men yaxshiman! Sayt bo'yicha savollaringiz bo'lsa, yordam berishga tayyorman.",
                "rahmat": "Arziydi! Yana savollaringiz bo'lsa, bemalol murojaat qiling.",
                "kimisan": "Men Topildi.uz loyihasining aqlli chatbotiman."
            }

            if user_text in static_responses:
                return JsonResponse({"reply": static_responses[user_text]})

            # 2. BAZADAN MA'LUMOTLARNI YIG'ISH
            # Oxirgi 10 ta e'lonни olamiz
            latest_items = LostItem.objects.all().order_by('-date_lost')[:10]
            items_list = ""
            for item in latest_items:
                # Bazadagi maydon nomlariga qarab o'zgartiring (title, location, type va h.k.)
                status = "Topilgan" if item.type == 'found' else "Yo'qolgan"
                items_list += f"- {status}: {item.title}, Joyi: {item.location}\n"

            # AI uchun ko'rsatma va baza ma'lumotlari
            context = f"""
            Sen Topildi.uz sayti yordamchisisan. 
            Saytdagi oxirgi e'lonlar:
            {items_list}

            Foydalanuvchi savoli: {user_text}
            
            Javobing qisqa, aniq va faqat o'zbek tilida bo'lsin.
            """

            # 3. AI BOG'LANISH (Flash model)
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(context)
                return JsonResponse({"reply": response.text})
            except:
                # Zaxira: Agar flash ishlamasa, Pro modelga o'tish
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(context)
                return JsonResponse({"reply": response.text})

        except Exception as e:
            return JsonResponse({"reply": "Hozircha javob berishda qiyinchilik bo'lyapti, birozdan so'ng urinib ko'ring."})

    return JsonResponse({"error": "Method not allowed"}, status=405)

def home_view(request):
    return render(request, 'index.html')


def chat_view(request):
    return render(request, "chat.html")


def lostitems_view(request): # Yo‘qolgan narsalar ro‘yxati
    lost_items = LostItem.objects.all().order_by('-date_lost')
    return render(request, 'lostitems.html', {'lost_items': lost_items})

class CreateLostItemView(PermissionRequiredMixin, CreateView):
    model = LostItem
    template_name = 'lost_item_add.html'
    form_class = LostItemForm
    permission_required = 'app.add_lostitem'  # app nomini o‘z loyihangga mos yoz

    def post(self, request, *args, **kwargs):
        form = LostItemForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
        else:
            print(form.errors)  # xatolarni konsolga chiqaradi
        return redirect('lost_item_add')  # url name mos yozilishi kerak