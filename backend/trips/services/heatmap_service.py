"""Builds the weather heatmap: the risk level at every corridor point for each of the next 49 hours.

The browser gets the forecasts from Open-Meteo and sends each point with its "hourly" data.
"""

from datetime import timedelta

from trips.constants import HEATMAP_HOURS
from trips.formatters import format_utc
from trips.logic.hourly_forecast_builder import build_hourly_forecast
from trips.logic.risk_calculator import calculate_risk
from trips.logic.weather_lookup import get_weather_at
from trips.types import HourlyForecast


def create_heatmap(points: list[dict], weight_lb: int) -> dict:
    # Each point as validated by HeatmapRequestSerializer: lon, lat and its forecast for HEATMAP_HOURS hours.
    heatmap_points = []
    first_hour_utc = None

    for point in points:
        forecast = build_hourly_forecast(point["forecast"])
        # Every forecast starts at the same hour (the browser asks for one window); hour 0 is that hour.
        first_hour_utc = forecast.first_hour_utc

        heatmap_points.append(
            {
                "lon": point["lon"],
                "lat": point["lat"],
                "levels": _get_levels_by_hour(forecast, weight_lb),
            }
        )

    return {
        "start_hour_utc": format_utc(first_hour_utc),
        "hours": HEATMAP_HOURS,
        "points": heatmap_points,
    }


def _get_levels_by_hour(forecast: HourlyForecast, weight_lb: int) -> list[int]:
    # One risk level per hour, 0 to 48, with the same rules as the route checkpoints, for this truck.
    levels = []
    for hour_index in range(HEATMAP_HOURS):
        hour_utc = forecast.first_hour_utc + timedelta(hours=hour_index)
        weather = get_weather_at(forecast, hour_utc)
        levels.append(calculate_risk(weather, weight_lb).level.value)

    return levels
