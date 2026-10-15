"""Builds the weather heatmap: the risk level at every corridor point for each of the next 49 hours."""

from datetime import datetime, timedelta

from django.utils import timezone

from trips.clients.open_meteo_client import get_hourly_forecasts
from trips.formatters import format_utc
from trips.logic.risk_calculator import calculate_risk
from trips.logic.weather_lookup import get_weather_at
from trips.types import HourlyForecast, LonLat

# Forecast hours the slider covers, now (hour 0) through 48 hours ahead; used by create_heatmap.
HEATMAP_HOURS = 49


def create_heatmap(points: list[LonLat], weight_lb: int) -> dict:
    # Hour 0 is the current UTC hour, rounded down: 14:37 -> 14:00.
    start_hour_utc = timezone.now().replace(minute=0, second=0, microsecond=0)
    end_hour_utc = start_hour_utc + timedelta(hours=HEATMAP_HOURS - 1)

    forecasts = get_hourly_forecasts(points, start_hour_utc, end_hour_utc)

    heatmap_points = []

    # Forecasts come back in the same order as the points, so forecasts[index] belongs to points[index].
    for index, point in enumerate(points):
        lon, lat = point
        heatmap_points.append(
            {
                "lon": lon,
                "lat": lat,
                "levels": _get_levels_by_hour(forecasts[index], start_hour_utc, weight_lb),
            }
        )

    return {
        "start_hour_utc": format_utc(start_hour_utc),
        "hours": HEATMAP_HOURS,
        "points": heatmap_points,
    }


def _get_levels_by_hour(forecast: HourlyForecast, start_hour_utc: datetime, weight_lb: int) -> list[int]:
    # One risk level per hour, 0 to 48, with the same rules as the route checkpoints, for this truck.
    levels = []
    for hour_index in range(HEATMAP_HOURS):
        hour_utc = start_hour_utc + timedelta(hours=hour_index)
        weather = get_weather_at(forecast, hour_utc)
        levels.append(calculate_risk(weather, weight_lb).level.value)

    return levels
