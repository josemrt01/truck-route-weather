from django.urls import path

from trips.views import HealthView, HeatmapView, PlaceSearchView, TripPlanView

urlpatterns = [
    path("health", HealthView.as_view()),
    path("trip-plans", TripPlanView.as_view()),
    path("heatmap", HeatmapView.as_view()),
    path("places", PlaceSearchView.as_view()),
]
