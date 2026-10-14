from datetime import UTC

from django.utils import timezone
from rest_framework import serializers

from trips.constants import CHECKPOINT_SPACING_CHOICES_MI, MAX_DEPARTURE_FUTURE, MAX_DEPARTURE_PAST
from trips.error_messages import DEPARTURE_NEEDS_TIMEZONE, DEPARTURE_TOO_EARLY, DEPARTURE_TOO_LATE


class TimezoneAwareDateTimeField(serializers.DateTimeField):
    """A date-time that must include a timezone offset; returned in UTC."""

    def enforce_timezone(self, value):
        # DRF would quietly treat a time without an offset as UTC, which is wrong for a user in Texas.
        if timezone.is_naive(value):
            raise serializers.ValidationError(DEPARTURE_NEEDS_TIMEZONE)

        return value.astimezone(UTC)


class TripPlanRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=200)
    destination = serializers.CharField(max_length=200)
    departure = TimezoneAwareDateTimeField()
    spacing_mi = serializers.ChoiceField(choices=CHECKPOINT_SPACING_CHOICES_MI)

    def validate_departure(self, departure):
        now = timezone.now()

        if departure < now - MAX_DEPARTURE_PAST:
            raise serializers.ValidationError(DEPARTURE_TOO_EARLY)

        if departure > now + MAX_DEPARTURE_FUTURE:
            raise serializers.ValidationError(DEPARTURE_TOO_LATE)

        return departure
