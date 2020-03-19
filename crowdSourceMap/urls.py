from django.urls import path
from . import views

urlpatterns = [
    path('',views.indexpage),
    path('saveData',views.saveData),
    path('getData',views.getData)
]
