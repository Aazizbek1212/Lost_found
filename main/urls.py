from django.urls import path

from .views import (
    AboutView,
    AddCommentView,
    CreateItemView,
    DeleteCommentView,
    ItemDetailView,
    ItemListView,
    ReportItemView,
    admin_approve_close_item,
    chat_ai,
    chat_history,
    geocode_location,
    home_view,
    items_api,
    notifications_api,
    notifications_mark_read,
    request_close_item,
    reverse_geocode_location,
    stats_view,
    support_chat_api,
    user_profile,
)

urlpatterns = [
    path("", home_view, name="home"),
    path("about/", AboutView.as_view(), name="about"),
    path("items/", ItemListView.as_view(), name="items"),
    path("chat-ai/", chat_ai, name="chat_ai"),
    path("add-item/", CreateItemView.as_view(), name="add_item"),
    path("chat-history/", chat_history, name="chat_history"),
    path("stats/", stats_view, name="stats"),
    path("item/<int:pk>/", ItemDetailView.as_view(), name="item_detail"),
    path("api/items/", items_api, name="items_api"),
    path("api/geocode/", geocode_location, name="geocode_location"),
    path(
        "api/geocode/reverse/",
        reverse_geocode_location,
        name="reverse_geocode_location",
    ),
    path("api/notifications/", notifications_api, name="notifications_api"),
    path(
        "api/notifications/read/",
        notifications_mark_read,
        name="notifications_mark_read",
    ),
    path("api/support-chat/", support_chat_api, name="support_chat_api"),
    path("item/<int:pk>/comment/", AddCommentView.as_view(), name="add_comment"),
    path("item/<int:pk>/report/", ReportItemView.as_view(), name="report_item"),
    path(
        "comment/<int:pk>/delete/", DeleteCommentView.as_view(), name="delete_comment"
    ),
    path("api/profile/", user_profile, name="user_profile"),
    path("api/items/<int:pk>/close-request/", request_close_item, name="request_close_item"),
    path(
        "manage/item/<int:pk>/approve-close/",
        admin_approve_close_item,
        name="admin_approve_close_item",
    ),
]
