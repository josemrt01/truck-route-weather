"""Picks the forecast hour that matches a checkpoint's arrival time."""

from datetime import datetime, timedelta

from trips.types import HourlyForecast, WeatherHour

# Seconds in one hour; used to turn a time difference into a number of hours.
SECONDS_PER_HOUR = 3600

# Added before cutting minutes so times round to the nearest hour; used by round_to_nearest_hour.
HALF_HOUR = timedelta(minutes=30)


def round_to_nearest_hour(moment: datetime) -> datetime:
    """Return the full hour closest to moment; exactly half past rounds up."""
    # Adding 30 minutes and then dropping the minutes gives the nearest hour: 14:20 -> 14:00, 14:30 -> 15:00.
    shifted = moment + HALF_HOUR
    return shifted.replace(minute=0, second=0, microsecond=0)


def get_forecast_hour_index(eta_utc: datetime, first_hour_utc: datetime) -> int:
    """Return the position in the forecast lists of the hour nearest eta_utc."""
    rounded_eta = round_to_nearest_hour(eta_utc)

    seconds_from_start = (rounded_eta - first_hour_utc).total_seconds()

    # Both times are full hours, so the division always gives a whole number.
    return int(seconds_from_start / SECONDS_PER_HOUR)


def get_weather_at(forecast: HourlyForecast, eta_utc: datetime) -> WeatherHour:
    """Return the forecast weather for the hour nearest eta_utc."""
    index = get_forecast_hour_index(eta_utc, forecast.first_hour_utc)

    # Outside the window means we asked Open-Meteo for the wrong hours; fail loudly instead of guessing.
    if index < 0 or index >= len(forecast.wind_gust_mph):
        raise ValueError(f"ETA {eta_utc.isoformat()} is outside the forecast window.")

    return WeatherHour(
        wind_gust_mph=forecast.wind_gust_mph[index],
        wind_speed_mph=forecast.wind_speed_mph[index],
        rain_in=forecast.rain_in[index],
        snow_in=forecast.snow_in[index],
    )
