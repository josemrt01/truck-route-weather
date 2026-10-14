import pytest
import requests
import responses
from django.conf import settings

from trips.clients.open_meteo_client import get_hourly_forecasts
from trips.exceptions import WeatherServiceError
from trips.tests.test_data import DALLAS_POINT, DEPARTURE_UTC, HOUSTON_POINT
from trips.types import HourlyForecast


def build_location(gusts=(10.0, 20.0), wind=(5.0, 8.0), rain=(0.0, 0.1), showers=(0.0, 0.05), snow=(0.0, 0.0)):
    """One location as Open-Meteo returns it, with two hours starting at DEPARTURE_UTC."""
    return {
        "hourly": {
            "time": ["2026-10-13T13:00", "2026-10-13T14:00"],
            "wind_gusts_10m": list(gusts),
            "wind_speed_10m": list(wind),
            "rain": list(rain),
            "showers": list(showers),
            "snowfall": list(snow),
        }
    }


def get_forecasts(points):
    return get_hourly_forecasts(points, DEPARTURE_UTC, DEPARTURE_UTC.replace(hour=14))


@responses.activate
def test_get_hourly_forecasts_returns_one_forecast_per_point_in_order():
    responses.get(
        f"{settings.OPEN_METEO_BASE_URL}/forecast",
        json=[build_location(gusts=(10.0, 20.0)), build_location(gusts=(30.0, 40.0))],
    )

    forecasts = get_forecasts([DALLAS_POINT, HOUSTON_POINT])

    assert [forecast.wind_gust_mph for forecast in forecasts] == [[10.0, 20.0], [30.0, 40.0]]
    params = responses.calls[0].request.params
    assert params["latitude"] == "32.7767,29.7604"
    assert params["longitude"] == "-96.797,-95.3698"
    assert params["start_hour"] == "2026-10-13T13:00"
    assert params["end_hour"] == "2026-10-13T14:00"


@responses.activate
def test_get_hourly_forecasts_builds_forecast_from_single_location_response():
    # With one point Open-Meteo returns an object, not a list.
    responses.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", json=build_location())

    forecasts = get_forecasts([DALLAS_POINT])

    assert forecasts == [
        HourlyForecast(
            first_hour_utc=DEPARTURE_UTC,
            wind_gust_mph=[10.0, 20.0],
            wind_speed_mph=[5.0, 8.0],
            rain_in=[0.0, 0.15],
            snow_in=[0.0, 0.0],
        )
    ]


@responses.activate
def test_get_hourly_forecasts_splits_points_into_batches_of_100():
    points = [DALLAS_POINT] * 150
    responses.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", json=[build_location()] * 100)
    responses.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", json=[build_location()] * 50)

    forecasts = get_forecasts(points)

    assert len(responses.calls) == 2
    assert len(responses.calls[0].request.params["latitude"].split(",")) == 100
    assert len(responses.calls[1].request.params["latitude"].split(",")) == 50
    assert len(forecasts) == 150


@responses.activate
def test_get_hourly_forecasts_treats_missing_values_as_zero():
    responses.get(
        f"{settings.OPEN_METEO_BASE_URL}/forecast",
        json=build_location(gusts=(None, 20.0), rain=(None, 0.1), showers=(0.2, None), snow=(None, None)),
    )

    forecast = get_forecasts([DALLAS_POINT])[0]

    assert forecast.wind_gust_mph == [0.0, 20.0]
    assert forecast.rain_in == [0.2, 0.1]
    assert forecast.snow_in == [0.0, 0.0]


@responses.activate
def test_get_hourly_forecasts_rounds_rain_sum_so_it_stays_on_threshold():
    # Without rounding, 0.07 + 0.03 is 0.0999..., just under the 0.10 in/hr Moderate threshold.
    responses.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", json=build_location(rain=(0.07, 0.0), showers=(0.03, 0.0)))

    forecast = get_forecasts([DALLAS_POINT])[0]

    assert forecast.rain_in == [0.1, 0.0]


@responses.activate
def test_get_hourly_forecasts_raises_weather_service_error_on_server_failure():
    responses.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", status=500)

    with pytest.raises(WeatherServiceError, match="status 500"):
        get_forecasts([DALLAS_POINT])


@responses.activate
def test_get_hourly_forecasts_raises_weather_service_error_when_unreachable():
    responses.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", body=requests.ConnectionError())

    with pytest.raises(WeatherServiceError, match="Could not reach Open-Meteo"):
        get_forecasts([DALLAS_POINT])
