from django.urls import path

from trips.views import HealthView, TripPlanView

urlpatterns = [
    path("health", HealthView.as_view()),
    path("trip-plans", TripPlanView.as_view()),
]
