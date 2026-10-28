from django import forms
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme


def _safe_next(request, default="home"):
    """`next` parametrini xavfsiz tekshirib qaytaradi."""
    next_url = request.POST.get("next") or request.GET.get("next")
    if next_url and url_has_allowed_host_and_scheme(
        next_url,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return next_url
    return None


def login_user(request):
    next_url = _safe_next(request)

    if request.user.is_authenticated:
        return redirect(next_url or "home")

    if request.method == "POST":
        username = (request.POST.get("username") or "").strip()
        password = request.POST.get("password") or ""

        if not username or not password:
            messages.error(request, "Username va parolni kiriting.")
            return render(request, "login.html", {"next": next_url or ""})

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            if not request.POST.get("remember"):
                # "Eslab qolish" belgilanmagan bo'lsa sessiya brauzer yopilganda tugaydi.
                request.session.set_expiry(0)
            messages.success(request, "Muvaffaqiyatli kirdingiz!")
            return redirect(next_url or "home")

        messages.error(request, "Parol yoki username noto'g'ri")
        return render(request, "login.html", {"next": next_url or ""})

    return render(request, "login.html", {"next": next_url or ""})


class RegisterForm(UserCreationForm):
    first_name = forms.CharField(max_length=150, required=False, label="Ism")
    last_name = forms.CharField(max_length=150, required=False, label="Familiya")
    email = forms.EmailField(required=False, label="Elektron pochta")

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "first_name", "last_name", "email")


def register_user(request):
    next_url = _safe_next(request)

    if request.user.is_authenticated:
        return redirect(next_url or "home")

    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Ro'yxatdan muvaffaqiyatli o'tdingiz!")
            return redirect(next_url or "home")
    else:
        form = RegisterForm()

    return render(request, "register.html", {"form": form, "next": next_url or ""})


def logout_user(request):
    """Chiqish — GET va POST ikkalasi ham qabul qilinadi, lekin POST tavsiya etiladi."""
    logout(request)
    messages.success(request, "Tizimdan chiqdingiz.")
    return redirect("home")
