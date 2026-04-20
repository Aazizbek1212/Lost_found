from django.urls import path
from .views import  chat_ai, chat_history, dashboard_stats, home_view, items_view, CreateItemView, stats_view

urlpatterns = [
    path('', home_view, name='home'),
    path('items/', items_view, name='items'),
    path('chat-ai/', chat_ai, name='chat_ai'),
    path('add-item/', CreateItemView.as_view(), name='add_item'),
    path('chat-history/', chat_history, name='chat_history'),
    path('stats/', stats_view, name='stats'),
    path('dashboard-stats/', dashboard_stats, name='dashboard_stats'),
]
