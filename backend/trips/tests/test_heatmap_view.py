from datetime import UTC, datetime, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from trips.exceptions import WeatherServiceError
from trips.services import heatmap_service
from trips.tests.test_data import DALLAS_POINT, HOUSTON_POINT
from trips.types import HourlyForecast

# "Now" during these tests: 13:20 UTC, so hour 0 of the heatmap is 13:00.
HEATMAP_NOW = datetime(2026, 10, 13, 13, 20, tzinfo=UTC)

# A request that passes validation; tests copy it and change one field.
VALID_BODY = {"points": [list(DALLAS_POINT), list(HOUSTON_POINT)], "weight_lb": 45_000}


@pytest.fixture(autouse=True)
def fixed_now(monkeypatch):
    monkeypatch.setattr(timezone, "now", lambda: HEATMAP_NOW)


@pytest.fixture(autouse=True)
def fake_open_meteo(monkeypatch):
    """Return 38 mph gusts at every point and hour; the list records each requested window."""
    requested_windows = []

    def get_fake_forecasts(points, start_hour_utc, end_hour_utc):
        requested_windows.append((start_hour_utc, end_hour_utc))
        # Both ends are included, like Open-Meteo.
        hour_count = int((end_hour_utc - start_hour_utc).total_seconds() / 3600) + 1
        forecast = HourlyForecast(
            first_hour_utc=start_hour_utc,
            wind_gust_mph=[38.0] * hour_count,
            wind_speed_mph=[20.0] * hour_count,
            rain_in=[0.0] * hour_count,
            snow_in=[0.0] * hour_count,
        )
        return [forecast] * len(points)

    monkeypatch.setattr(heatmap_service, "get_hourly_forecasts", get_fake_forecasts)
    return requested_windows


def post_heatmap(body):
    return APIClient().post("/api/heatmap", body, format="json")


def test_returns_49_hourly_levels_per_point():
    response = post_heatmap(VALID_BODY)

    assert response.status_code == 200
    heatmap = response.json()
    assert heatmap["start_hour_utc"] == "2026-10-13T13:00:00Z"
    assert heatmap["hours"] == 49
    # 38 mph gusts alone are High (2); a 45,000 lb truck is over 40,000 lb, so the load rule makes them Severe (3).
    for point in heatmap["points"]:
        assert point["levels"] == [3] * 49


def test_levels_depend_on_the_truck_weight():
    response = post_heatmap({**VALID_BODY, "weight_lb": 40_000})

    # At exactly 40,000 lb the load rule doesn't apply, so 38 mph gusts stay High.
    assert response.json()["points"][0]["levels"] == [2] * 49


def test_keeps_the_order_of_the_points():
    points = post_heatmap(VALID_BODY).json()["points"]

    assert [(point["lon"], point["lat"]) for point in points] == [DALLAS_POINT, HOUSTON_POINT]


def test_asks_for_weather_from_this_hour_to_48_hours_later(fake_open_meteo):
    post_heatmap(VALID_BODY)

    start_hour_utc = datetime(2026, 10, 13, 13, tzinfo=UTC)
    assert fake_open_meteo == [(start_hour_utc, start_hour_utc + timedelta(hours=48))]


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"weight_lb": 45_000}, "points"),
        ({**VALID_BODY, "points": [list(DALLAS_POINT)] * 251}, "points"),
        ({**VALID_BODY, "points": [[1.0]]}, "points"),
        ({**VALID_BODY, "weight_lb": 0}, "weight_lb"),
    ],
)
def test_rejects_invalid_input(body, field):
    response = post_heatmap(body)

    assert response.status_code == 400
    assert response.json()["field"] == field


@pytest.mark.parametrize(
    ("points", "error"),
    [
        ([[1.0]], "Ensure this field has at least 2 elements."),
        ([["a", "b"]], "A valid number is required."),
    ],
)
def test_reports_a_readable_message_for_a_bad_point(points, error):
    # DRF nests errors of list items one level deeper; the user still gets plain text.
    response = post_heatmap({**VALID_BODY, "points": points})

    assert response.json() == {"error": error, "field": "points"}


def test_rejects_points_outside_the_globe():
    response = post_heatmap({**VALID_BODY, "points": [[-96.8, 100.0]]})

    assert response.status_code == 400
    assert response.json() == {"error": "Each point must be [lon, lat] in degrees.", "field": "points"}


def test_reports_weather_failure_as_service_unavailable(monkeypatch):
    def raise_weather_error(points, start_hour_utc, end_hour_utc):
        raise WeatherServiceError("Open-Meteo answered with status 500.")

    monkeypatch.setattr(heatmap_service, "get_hourly_forecasts", raise_weather_error)

    response = post_heatmap(VALID_BODY)

    assert response.status_code == 503
    assert response.json()["error"] == "The weather service is unavailable. Please try again in a minute."
