from datetime import UTC, timedelta

from django.utils import timezone
from rest_framework import serializers

from trips.constants import CHECKPOINT_SPACING_CHOICES_MI, MAX_DEPARTURE_FUTURE, MAX_DEPARTURE_PAST


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

    def validate_departure(self, departure):
        now = timezone.now()

        if departure < now - MAX_DEPARTURE_PAST:
            # Dividing by one minute turns the allowed window into a whole number of minutes.
            past_minutes = MAX_DEPARTURE_PAST // timedelta(minutes=1)
            raise serializers.ValidationError(f"Departure can't be more than {past_minutes} minutes in the past.")

        if departure > now + MAX_DEPARTURE_FUTURE:
            raise serializers.ValidationError(f"Departure must be within the next {MAX_DEPARTURE_FUTURE.days} days.")

        return departure
