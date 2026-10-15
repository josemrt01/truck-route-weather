"""Client for the Open-Meteo hourly weather forecast API."""

from datetime import UTC, datetime

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

    # Open-Meteo accepts at most MAX_POINTS_PER_REQUEST points per request, so take them in batches.
    for batch_start in range(0, len(points), MAX_POINTS_PER_REQUEST):
        # A slice past the end of the list just stops at the last point.
        batch = points[batch_start : batch_start + MAX_POINTS_PER_REQUEST]

        latitudes = []
        longitudes = []
        for lon, lat in batch:
            latitudes.append(str(lat))
            longitudes.append(str(lon))

        data = _get_json(
            {
                # Open-Meteo takes comma-separated lists; position N in both lists is point N.
                "latitude": ",".join(latitudes),
                "longitude": ",".join(longitudes),
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
        if isinstance(data, list):
            locations = data
        else:
            locations = [data]

        for location in locations:
            forecasts.append(_build_hourly_forecast(location["hourly"]))

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
        rain_in=[round(rain[index] + showers[index], RAIN_DECIMALS) for index in range(len(rain))],
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

    # Open-Meteo sometimes reports its own timeouts as status 200 with a plain-text body.
    try:
        return response.json()
    except ValueError:
        raise WeatherServiceError(f"Open-Meteo sent a response that isn't JSON: {response.text[:100]}") from None
