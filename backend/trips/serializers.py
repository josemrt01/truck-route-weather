from datetime import UTC

from django.utils import timezone
from rest_framework import serializers

from trips.constants import (
    CHECKPOINT_SPACING_CHOICES_MI,
    MAX_CORRIDOR_POINTS,
    MAX_DEPARTURE_FUTURE,
    MAX_DEPARTURE_PAST,
    MAX_TRUCK_WEIGHT_LB,
)


class TimezoneAwareDateTimeField(serializers.DateTimeField):
    """A date-time that must include a timezone offset; returned in UTC."""

    def enforce_timezone(self, value):
        # DRF would quietly treat a time without an offset as UTC, which is wrong for a user in Texas.
        if timezone.is_naive(value):
            raise serializers.ValidationError("Departure time must include a timezone.")

        return value.astimezone(UTC)


class TruckWeightField(serializers.IntegerField):
    """Truck weight in whole pounds, from 1 to MAX_TRUCK_WEIGHT_LB; shared by the trip and heatmap requests."""

    def __init__(self):
        # A minimum of 1 means "more than 0".
        super().__init__(
            min_value=1,
            max_value=MAX_TRUCK_WEIGHT_LB,
            error_messages={
                "min_value": "Weight must be more than 0 lb.",
                # ":," adds thousands separators: 80000 -> "80,000".
                "max_value": f"Weight can't be more than {MAX_TRUCK_WEIGHT_LB:,} lb.",
            },
        )


class TripPlanRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=200)
    destination = serializers.CharField(max_length=200)
    departure = TimezoneAwareDateTimeField()
    spacing_mi = serializers.ChoiceField(choices=CHECKPOINT_SPACING_CHOICES_MI)
    weight_lb = TruckWeightField()

    def validate_departure(self, departure):
        now = timezone.now()

        if departure < now - MAX_DEPARTURE_PAST:
            # 60 seconds per minute: turns the allowed window into a whole number of minutes.
            past_minutes = int(MAX_DEPARTURE_PAST.total_seconds() / 60)
            raise serializers.ValidationError(f"Departure can't be more than {past_minutes} minutes in the past.")

        if departure > now + MAX_DEPARTURE_FUTURE:
            raise serializers.ValidationError(f"Departure must be within the next {MAX_DEPARTURE_FUTURE.days} days.")

        return departure


class HeatmapRequestSerializer(serializers.Serializer):
    # [[lon, lat], ...] as the trip plan sent them in corridor_points.
    points = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField(), min_length=2, max_length=2),
        min_length=1,
        max_length=MAX_CORRIDOR_POINTS,
    )
    weight_lb = TruckWeightField()

    def validate_points(self, points):
        for lon, lat in points:
            if lon < -180 or lon > 180 or lat < -90 or lat > 90:
                raise serializers.ValidationError("Each point must be [lon, lat] in degrees.")

        return points
