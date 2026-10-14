from datetime import UTC, datetime

import pytest

from trips.logic.weather_lookup import get_forecast_hour_index, get_weather_at, round_to_nearest_hour
from trips.types import HourlyForecast, WeatherHour


def at(day: int, hour: int, minute: int = 0, second: int = 0) -> datetime:
    """A UTC time in October 2026; keeps the test tables short."""
    return datetime(2026, 10, day, hour, minute, second, tzinfo=UTC)


# --- round_to_nearest_hour: the full hour closest to a time ---


@pytest.mark.parametrize(
    ("moment", "expected_hour"),
    [
        (at(14, 14, 20), at(14, 14)),
        (at(14, 14, 47), at(14, 15)),
        # Exactly half past is a tie and rounds up.
        (at(14, 14, 30), at(14, 15)),
        (at(14, 14, 29, 59), at(14, 14)),
        (at(14, 14), at(14, 14)),
        # Rounding can cross midnight into the next day.
        (at(14, 23, 40), at(15, 0)),
    ],
)
def test_round_to_nearest_hour(moment, expected_hour):
    assert round_to_nearest_hour(moment) == expected_hour


# --- get_forecast_hour_index: position of the nearest hour in the forecast lists ---


def test_get_forecast_hour_index_counts_hours_from_forecast_start():
    assert get_forecast_hour_index(at(14, 14, 47), first_hour_utc=at(14, 12)) == 3


def test_get_forecast_hour_index_counts_across_midnight():
    assert get_forecast_hour_index(at(14, 23, 40), first_hour_utc=at(14, 22)) == 2


# --- get_weather_at: the weather values for the hour nearest an ETA ---

# Three hours of weather starting at 12:00, with a different value per hour so the index is easy to check.
THREE_HOUR_FORECAST = HourlyForecast(
    first_hour_utc=at(14, 12),
    wind_gust_mph=[10.0, 20.0, 30.0],
    wind_speed_mph=[5.0, 8.0, 12.0],
    rain_in=[0.0, 0.1, 0.2],
    snow_in=[0.0, 0.5, 1.0],
)


def test_get_weather_at_returns_values_of_nearest_hour():
    # 13:10 rounds to 13:00, the second hour.
    weather = get_weather_at(THREE_HOUR_FORECAST, at(14, 13, 10))

    assert weather == WeatherHour(wind_gust_mph=20.0, wind_speed_mph=8.0, rain_in=0.1, snow_in=0.5)


def test_get_weather_at_raises_when_eta_is_before_forecast_window():
    # 11:20 rounds to 11:00, one hour before the forecast starts.
    with pytest.raises(ValueError, match="outside the forecast window"):
        get_weather_at(THREE_HOUR_FORECAST, at(14, 11, 20))


def test_get_weather_at_raises_when_eta_is_after_forecast_window():
    # 14:40 rounds to 15:00, one hour after the last forecast hour (14:00).
    with pytest.raises(ValueError, match="outside the forecast window"):
        get_weather_at(THREE_HOUR_FORECAST, at(14, 14, 40))
