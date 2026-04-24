from django.urls import path
from .views import  AddCommentView, DeleteCommentView, ReportItemView, admin_close_item, chat_ai, chat_history, close_item, home_view, items_map, CreateItemView, stats_view, ItemDetailView, ItemListView, user_profile

urlpatterns = [
    path('', home_view, name='home'),
    path('items/', ItemListView.as_view(), name='items'),
    path('chat-ai/', chat_ai, name='chat_ai'),
    path('add-item/', CreateItemView.as_view(), name='add_item'),
    path('chat-history/', chat_history, name='chat_history'),
    path('stats/', stats_view, name='stats'),
    path('item/<int:pk>/', ItemDetailView.as_view(), name='item_detail'),
    path('items-map/', items_map, name='items_map'),
    path('item/<int:pk>/comment/', AddCommentView.as_view(), name='add_comment'),
    path('item/<int:pk>/report/', ReportItemView.as_view(), name='report_item'),
    path('comment/<int:pk>/delete/', DeleteCommentView.as_view(), name='delete_comment'),
    path('profile/', user_profile, name='user_profile'),
    path('item/<int:pk>/close/', close_item, name='close_item'),
    path('admin/item/<int:pk>/close/', admin_close_item, name='admin_close_item'),
    
]
