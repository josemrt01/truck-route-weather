from datetime import UTC, datetime

from django.utils import timezone
from rest_framework import serializers
from rest_framework.fields import empty

from trips.constants import (
    CHECKPOINT_SPACING_CHOICES_MI,
    HEATMAP_HOURS,
    MAX_CORRIDOR_POINTS,
    MAX_DEPARTURE_FUTURE,
    MAX_DEPARTURE_PAST,
    MAX_FORECAST_HOURS,
    MAX_PLACE_TEXT_LENGTH,
    MAX_TRUCK_WEIGHT_LB,
    PLACE_SEARCH_MIN_CHARACTERS,
    ROUTE_COUNT,
    ROUTE_LABELS,
)
from trips.logic.hourly_forecast_builder import build_hourly_forecast
from trips.logic.weather_lookup import get_forecast_hour_index


class TimezoneAwareDateTimeField(serializers.DateTimeField):
    """A date-time that must include a timezone offset; returned in UTC."""

    def enforce_timezone(self, value):
        # DRF would quietly treat a time without an offset as UTC, which is wrong for a user in Texas.
        if timezone.is_naive(value):
            raise serializers.ValidationError("Departure time must include a timezone.")

        return value.astimezone(UTC)


class TruckWeightField(serializers.IntegerField):
    """Truck weight in whole pounds, from 1 to MAX_TRUCK_WEIGHT_LB; shared by the trip-risks and heatmap requests."""

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


class LonLatField(serializers.ListField):
    """A point as [lon, lat] in degrees, returned as a (lon, lat) tuple; used for the picked origin and destination."""

    def __init__(self, **kwargs):
        super().__init__(child=serializers.FloatField(), min_length=2, max_length=2, **kwargs)

    def run_validation(self, data=empty):
        # The parent checks the numbers and the length first, so there are exactly two values here.
        # (to_internal_value would run before the length check and crash on [1.0].)
        lon, lat = super().run_validation(data)

        if lon < -180 or lon > 180 or lat < -90 or lat > 90:
            raise serializers.ValidationError("Point must be [lon, lat] in degrees.")

        return (lon, lat)


class TripPlanRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=MAX_PLACE_TEXT_LENGTH)
    # Coordinates of a picked suggestion; when sent, the backend skips geocoding the origin text.
    origin_point = LonLatField(required=False)
    destination = serializers.CharField(max_length=MAX_PLACE_TEXT_LENGTH)
    # Same as origin_point, for the destination.
    destination_point = LonLatField(required=False)
    departure = TimezoneAwareDateTimeField()
    spacing_mi = serializers.ChoiceField(choices=CHECKPOINT_SPACING_CHOICES_MI)

    def validate_departure(self, departure):
        now = timezone.now()

        if departure < now - MAX_DEPARTURE_PAST:
            # 60 seconds per minute: turns the allowed window into a whole number of minutes.
            past_minutes = int(MAX_DEPARTURE_PAST.total_seconds() / 60)
            raise serializers.ValidationError(f"Departure can't be more than {past_minutes} minutes in the past.")

        if departure > now + MAX_DEPARTURE_FUTURE:
            raise serializers.ValidationError(f"Departure must be within the next {MAX_DEPARTURE_FUTURE.days} days.")

        return departure


class OpenMeteoHourlySerializer(serializers.Serializer):
    """One location's "hourly" object from Open-Meteo, as the browser forwards it (GMT times, mph, inches)."""

    # Hours like "2026-10-14T14:00"; position N in every list below is hour N.
    time = serializers.ListField(child=serializers.CharField(), min_length=1, max_length=MAX_FORECAST_HOURS)
    # Open-Meteo sends null when a model has no value for an hour.
    wind_gusts_10m = serializers.ListField(child=serializers.FloatField(allow_null=True))
    wind_speed_10m = serializers.ListField(child=serializers.FloatField(allow_null=True))
    rain = serializers.ListField(child=serializers.FloatField(allow_null=True))
    showers = serializers.ListField(child=serializers.FloatField(allow_null=True))
    snowfall = serializers.ListField(child=serializers.FloatField(allow_null=True))

    def validate(self, hourly):
        hour_count = len(hourly["time"])
        for name in ("wind_gusts_10m", "wind_speed_10m", "rain", "showers", "snowfall"):
            if len(hourly[name]) != hour_count:
                raise serializers.ValidationError("Every forecast list must have one value per hour.")

        # The first hour is where every list starts, so it must be a real time.
        try:
            datetime.fromisoformat(hourly["time"][0])
        except ValueError:
            raise serializers.ValidationError("Forecast hours must look like 2026-10-14T14:00.") from None

        return hourly


class RiskCheckpointSerializer(serializers.Serializer):
    mile = serializers.FloatField(min_value=0)
    # The ETA the trip plan sent ("...Z"); returned as a UTC date-time.
    eta_utc = serializers.DateTimeField(default_timezone=UTC)
    forecast = OpenMeteoHourlySerializer()

    def validate(self, checkpoint):
        # The weather is read at the hour nearest the ETA, so that hour must be inside the forecast.
        first_hour_utc = build_hourly_forecast(checkpoint["forecast"]).first_hour_utc
        hour_index = get_forecast_hour_index(checkpoint["eta_utc"], first_hour_utc)
        if hour_index < 0 or hour_index >= len(checkpoint["forecast"]["time"]):
            raise serializers.ValidationError("The forecast doesn't cover this checkpoint's arrival time.")

        return checkpoint


class RouteRisksSerializer(serializers.Serializer):
    id = serializers.ChoiceField(choices=ROUTE_LABELS)
    duration_s = serializers.IntegerField(min_value=0)
    # At least the start and the destination.
    checkpoints = serializers.ListField(child=RiskCheckpointSerializer(), min_length=2)


class TripRisksRequestSerializer(serializers.Serializer):
    # The trip plan's routes, each checkpoint with the forecast the browser got for it.
    routes = serializers.ListField(child=RouteRisksSerializer(), min_length=1, max_length=ROUTE_COUNT)
    weight_lb = TruckWeightField()


class HeatmapPointSerializer(serializers.Serializer):
    lon = serializers.FloatField(min_value=-180, max_value=180)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    forecast = OpenMeteoHourlySerializer()

    def validate(self, point):
        if len(point["forecast"]["time"]) != HEATMAP_HOURS:
            raise serializers.ValidationError(f"Each heatmap forecast must have {HEATMAP_HOURS} hours.")

        return point


class HeatmapRequestSerializer(serializers.Serializer):
    # The trip plan's corridor_points, each with the forecast the browser got for it.
    points = serializers.ListField(child=HeatmapPointSerializer(), min_length=1, max_length=MAX_CORRIDOR_POINTS)
    weight_lb = TruckWeightField()


class PlaceSearchRequestSerializer(serializers.Serializer):
    # Text typed in the origin or destination input; spaces around it are trimmed before the length check.
    q = serializers.CharField(
        min_length=PLACE_SEARCH_MIN_CHARACTERS,
        max_length=MAX_PLACE_TEXT_LENGTH,
        error_messages={"min_length": f"Type at least {PLACE_SEARCH_MIN_CHARACTERS} characters."},
    )
