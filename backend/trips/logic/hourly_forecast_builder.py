"""Turns one location's "hourly" data from Open-Meteo into an HourlyForecast.

The browser asks Open-Meteo for the forecasts (so the free daily limit counts per visitor, not per server) and
sends each location's "hourly" object here unchanged.
"""

from datetime import UTC, datetime

from trips.types import HourlyForecast

# Decimal places kept when adding rain and showers (Open-Meteo's own precision in inches); used by build_hourly_forecast.
RAIN_DECIMALS = 3


def build_hourly_forecast(hourly: dict) -> HourlyForecast:
    """Return the forecast for one location from Open-Meteo's hourly lists (requested in GMT, inches and mph)."""
    # Times come as "2026-10-14T14:00" with no zone; the browser asks for GMT, so mark them as UTC.
    first_hour_utc = datetime.fromisoformat(hourly["time"][0]).replace(tzinfo=UTC)

    rain = _replace_missing_with_zero(hourly["rain"])
    showers = _replace_missing_with_zero(hourly["showers"])

    return HourlyForecast(
        first_hour_utc=first_hour_utc,
        wind_gust_mph=_replace_missing_with_zero(hourly["wind_gusts_10m"]),
        wind_speed_mph=_replace_missing_with_zero(hourly["wind_speed_10m"]),
        # Open-Meteo splits rain into steady rain and showers; the risk rules count both.
        # Rounded so float noise (0.07 + 0.03 = 0.0999...) can't drop a value below a risk threshold.
        rain_in=[round(rain[index] + showers[index], RAIN_DECIMALS) for index in range(len(rain))],
        snow_in=_replace_missing_with_zero(hourly["snowfall"]),
    )


def _replace_missing_with_zero(values: list[float | None]) -> list[float]:
    # Open-Meteo sends null when a model has no value for that hour.
    return [value if value is not None else 0.0 for value in values]
