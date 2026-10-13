"""URL routes for the whole project."""

from django.urls import include, path

urlpatterns = [
    path("api/", include("trips.urls")),
]
