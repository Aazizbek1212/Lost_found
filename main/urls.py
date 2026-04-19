from django.urls import path
from .views import ask_gemini, chat_view, home_view, lostitems_view
from main import views

urlpatterns = [
    path('', home_view, name='home'),
    path('lost-items/', lostitems_view, name='lost_items'),
    path('chat/', chat_view, name='chat_page'),
    path('ask-ai/', ask_gemini, name='ask_gemini'),
]
