"""Client for the Open-Meteo hourly weather forecast API."""

from datetime import UTC, datetime
from itertools import batched

import requests
from django.conf import settings

from trips.constants import HTTP_TIMEOUT_SECONDS
from trips.exceptions import WeatherServiceError
from trips.types import HourlyForecast, LonLat

# Most points Open-Meteo accepts in one request; used by get_hourly_forecasts to split big lists.
MAX_POINTS_PER_REQUEST = 100

# Weather values requested for every hour; used by get_hourly_forecasts.
HOURLY_VARIABLES = "wind_gusts_10m,wind_speed_10m,rain,showers,snowfall"

# Hour format Open-Meteo uses for start_hour and end_hour; used by get_hourly_forecasts.
HOUR_FORMAT = "%Y-%m-%dT%H:00"

# Decimal places kept when adding rain and showers (Open-Meteo's own precision in inches); used by _build_hourly_forecast.
RAIN_DECIMALS = 3


def get_hourly_forecasts(points: list[LonLat], start_hour_utc: datetime, end_hour_utc: datetime) -> list[HourlyForecast]:
    """Return one HourlyForecast per point, in the same order, covering start_hour_utc to end_hour_utc."""
    forecasts = []

    for batch in batched(points, MAX_POINTS_PER_REQUEST):
        data = _get_json(
            {
                # Open-Meteo takes comma-separated lists; position N in both lists is point N.
                "latitude": ",".join(str(lat) for _, lat in batch),
                "longitude": ",".join(str(lon) for lon, _ in batch),
                "hourly": HOURLY_VARIABLES,
                "wind_speed_unit": "mph",
                # Also converts snowfall from centimeters to inches.
                "precipitation_unit": "inch",
                "timezone": "GMT",
                "start_hour": start_hour_utc.astimezone(UTC).strftime(HOUR_FORMAT),
                "end_hour": end_hour_utc.astimezone(UTC).strftime(HOUR_FORMAT),
            }
        )

        # With a single point Open-Meteo returns one object instead of a list.
        locations = data if isinstance(data, list) else [data]

        forecasts.extend(_build_hourly_forecast(location["hourly"]) for location in locations)

    return forecasts


def _build_hourly_forecast(hourly: dict) -> HourlyForecast:
    # Times come as "2026-10-14T14:00" with no zone; we asked for GMT, so mark them as UTC.
    first_hour_utc = datetime.fromisoformat(hourly["time"][0]).replace(tzinfo=UTC)

    rain = _replace_missing_with_zero(hourly["rain"])
    showers = _replace_missing_with_zero(hourly["showers"])

    return HourlyForecast(
        first_hour_utc=first_hour_utc,
        wind_gust_mph=_replace_missing_with_zero(hourly["wind_gusts_10m"]),
        wind_speed_mph=_replace_missing_with_zero(hourly["wind_speed_10m"]),
        # Open-Meteo splits rain into steady rain and showers; the risk rules count both.
        # Rounded so float noise (0.07 + 0.03 = 0.0999...) can't drop a value below a risk threshold.
        rain_in=[
            round(rain_hour + showers_hour, RAIN_DECIMALS) for rain_hour, showers_hour in zip(rain, showers, strict=True)
        ],
        snow_in=_replace_missing_with_zero(hourly["snowfall"]),
    )


def _replace_missing_with_zero(values: list[float | None]) -> list[float]:
    # Open-Meteo sends null when a model has no value for that hour.
    return [value if value is not None else 0.0 for value in values]


def _get_json(params: dict[str, str]) -> dict | list:
    try:
        response = requests.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", params=params, timeout=HTTP_TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        raise WeatherServiceError(f"Could not reach Open-Meteo ({type(exc).__name__}).") from exc

    if not response.ok:
        raise WeatherServiceError(f"Open-Meteo answered with status {response.status_code}.")

    return response.json()
