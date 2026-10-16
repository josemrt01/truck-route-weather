from dataclasses import asdict

from rest_framework.response import Response
from rest_framework.views import APIView

from trips.clients.graphhopper_client import search_places
from trips.constants import HEALTH_STATUS_OK
from trips.serializers import (
    HeatmapRequestSerializer,
    PlaceSearchRequestSerializer,
    TripPlanRequestSerializer,
    TripRisksRequestSerializer,
)
from trips.services.heatmap_service import create_heatmap
from trips.services.trip_plan_service import create_trip_plan
from trips.services.trip_risk_service import create_trip_risks


class HealthView(APIView):
    def get(self, request):
        return Response({"status": HEALTH_STATUS_OK})


class TripPlanView(APIView):
    def post(self, request):
        # Validate the JSON body; invalid input stops here with a 400 (see exception_handler.py).
        serializer = TripPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # The points are missing unless the user picked a suggestion; .get() gives None then.
        trip_plan = create_trip_plan(
            serializer.validated_data["origin"],
            serializer.validated_data.get("origin_point"),
            serializer.validated_data["destination"],
            serializer.validated_data.get("destination_point"),
            serializer.validated_data["departure"],
            serializer.validated_data["spacing_mi"],
        )

        return Response(trip_plan)


class TripRisksView(APIView):
    def post(self, request):
        # Validate the JSON body; invalid input stops here with a 400 (see exception_handler.py).
        serializer = TripRisksRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trip_risks = create_trip_risks(serializer.validated_data["routes"], serializer.validated_data["weight_lb"])

        return Response(trip_risks)


class HeatmapView(APIView):
    def post(self, request):
        # Validate the JSON body; invalid input stops here with a 400 (see exception_handler.py).
        serializer = HeatmapRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        heatmap = create_heatmap(serializer.validated_data["points"], serializer.validated_data["weight_lb"])

        return Response(heatmap)


class PlaceSearchView(APIView):
    def get(self, request):
        # Validate the query string; a short or missing q stops here with a 400 (see exception_handler.py).
        serializer = PlaceSearchRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        # No service layer: the view only passes the text to GraphHopper and returns what it found.
        places = search_places(serializer.validated_data["q"])

        return Response([asdict(place) for place in places])
