from django.urls import path
from .views import  AddCommentView, DeleteCommentView, ReportItemView, admin_approve_close_item, chat_ai, chat_history, home_view, items_api, CreateItemView, request_close_item, stats_view, ItemDetailView, ItemListView, user_profile

urlpatterns = [
    path('', home_view, name='home'),
    path('items/', ItemListView.as_view(), name='items'),
    path('chat-ai/', chat_ai, name='chat_ai'),
    path('add-item/', CreateItemView.as_view(), name='add_item'),
    path('chat-history/', chat_history, name='chat_history'),
    path('stats/', stats_view, name='stats'),
    path('item/<int:pk>/', ItemDetailView.as_view(), name='item_detail'),
    path('api/items/', items_api, name='items_api'),
    path('item/<int:pk>/comment/', AddCommentView.as_view(), name='add_comment'),
    path('item/<int:pk>/report/', ReportItemView.as_view(), name='report_item'),
    path('comment/<int:pk>/delete/', DeleteCommentView.as_view(), name='delete_comment'),
    path('profile/', user_profile, name='user_profile'),
    path('item/<int:pk>/close-request/', request_close_item, name='request_close_item'),
    path('admin/item/<int:pk>/approve-close/', admin_approve_close_item, name='admin_approve_close_item'),
    
]
