from django.urls import path
from .views import founditems_view, home_view, lostitems_view

urlpatterns = [
    path('', home_view, name='home'),
    path('lost-items/', lostitems_view, name='lost_items'),
    path('found-items/', founditems_view, name='found_items'),
]
