# Lost_found — Topildi.uz

Yo'qolgan va topilgan buyumlar uchun Django platformasi.

## O'rnatish

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # va qiymatlarni to'ldiring
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

`.env` faylida quyidagilar bo'lishi kerak:

```
DJANGO_SECRET_KEY=...
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=lostfound
DB_USER=postgres
DB_PASSWORD=...
DB_HOST=localhost
DB_PORT=5432
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

> `.env` hech qachon git'ga qo'shilmaydi. API kalitlar faqat muhit
> o'zgaruvchilaridan o'qiladi.

## Testlar

Testlar uchun PostgreSQL shart emas — SQLite ishlatiladi:

```powershell
$env:DJANGO_TEST_DB='sqlite'
python -m pytest
```

## Asosiy sahifalar

| URL | Tavsif |
|---|---|
| `/` | Bosh sahifa: qidiruv, e'lonlar, xarita |
| `/items/` | E'lonlar ro'yxati va e'lon qo'shish |
| `/item/<id>/` | E'lon tafsiloti, izohlar, shikoyat |
| `/accounts/login/`, `/accounts/register/` | Kirish / ro'yxatdan o'tish |
| `/profile/` | Profil (JSON API) |
| `/api/items/`, `/api/geocode/` | Xarita uchun API |
| `/api/notifications/`, `/api/support-chat/` | Bildirishnoma va admin chat |
| `/chat-ai/`, `/chat-history/` | AI yordamchi |
