from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.urls import reverse_lazy

def login_user(request):
    if request.method == 'POST':

        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user:
            login(request, user)
            messages.success(request, "Muvaffaqiyatli kirdingiz!")
            return redirect(reverse_lazy('home'))
        else:
            messages.error(request, "Parol yoki username noto'g'ri")
            return render(request, 'login.html')
    return render(request, 'login.html')
        

def register_user(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Ro'yxatdan muvaffaqiyatli o'tdingiz!")
            return redirect(reverse_lazy('login'))
        else:
            # Formadagi xatoliklarni ko'rsatish
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    
    else:  # GET request
        form = UserCreationForm()
    
    return render(request, 'register.html', {'form': form})


def logout_user(request):
    logout(request)
    return redirect(reverse_lazy('home'))

