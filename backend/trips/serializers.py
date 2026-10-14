from datetime import UTC, timedelta

from django.utils import timezone
from rest_framework import serializers

from trips.constants import (
    CHECKPOINT_SPACING_CHOICES_MI,
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


class TripPlanRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=200)
    destination = serializers.CharField(max_length=200)
    departure = TimezoneAwareDateTimeField()
    spacing_mi = serializers.ChoiceField(choices=CHECKPOINT_SPACING_CHOICES_MI)
    # Whole pounds; a minimum of 1 means "more than 0".
    weight_lb = serializers.IntegerField(
        min_value=1,
        max_value=MAX_TRUCK_WEIGHT_LB,
        error_messages={
            "min_value": "Weight must be more than 0 lb.",
            # ":," adds thousands separators: 80000 -> "80,000".
            "max_value": f"Weight can't be more than {MAX_TRUCK_WEIGHT_LB:,} lb.",
        },
    )

    def validate_departure(self, departure):
        now = timezone.now()

        if departure < now - MAX_DEPARTURE_PAST:
            # Dividing by one minute turns the allowed window into a whole number of minutes.
            past_minutes = MAX_DEPARTURE_PAST // timedelta(minutes=1)
            raise serializers.ValidationError(f"Departure can't be more than {past_minutes} minutes in the past.")

        if departure > now + MAX_DEPARTURE_FUTURE:
            raise serializers.ValidationError(f"Departure must be within the next {MAX_DEPARTURE_FUTURE.days} days.")

        return departure
