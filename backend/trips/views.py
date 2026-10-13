from rest_framework.response import Response
from rest_framework.views import APIView

from trips.constants import HEALTH_STATUS_OK
from trips.serializers import TripPlanRequestSerializer
from trips.services.trip_plan_service import create_trip_plan


class HealthView(APIView):
    def get(self, request):
        return Response({"status": HEALTH_STATUS_OK})


class TripPlanView(APIView):
    def post(self, request):
        # Validate the JSON body; invalid input stops here with a 400 (see exception_handler.py).
        serializer = TripPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trip_plan = create_trip_plan(
            serializer.validated_data["origin"],
            serializer.validated_data["destination"],
        )

        return Response(trip_plan)
