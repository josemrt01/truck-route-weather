import pytest
from rest_framework.test import APIClient

from trips.tests.test_data import DALLAS_POINT, HOUSTON_POINT, build_open_meteo_hourly

# 49 hours of 38 mph gusts from 13:00 UTC, as the browser gets them from Open-Meteo.
FORECAST = build_open_meteo_hourly("2026-10-13T13:00", 49, rain_in=0.0)


def build_point(point, forecast=FORECAST):
    lon, lat = point
    return {"lon": lon, "lat": lat, "forecast": forecast}


# A request that passes validation; tests copy it and change one field.
VALID_BODY = {"points": [build_point(DALLAS_POINT), build_point(HOUSTON_POINT)], "weight_lb": 45_000}


def post_heatmap(body):
    return APIClient().post("/api/heatmap", body, format="json")


def test_returns_49_hourly_levels_per_point():
    response = post_heatmap(VALID_BODY)

    assert response.status_code == 200
    heatmap = response.json()
    # Hour 0 is the forecast's first hour.
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


def test_rejects_a_forecast_without_49_hours():
    short_forecast = build_open_meteo_hourly("2026-10-13T13:00", 48)

    response = post_heatmap({**VALID_BODY, "points": [build_point(DALLAS_POINT, short_forecast)]})

    assert response.status_code == 400
    assert response.json() == {"error": "Each heatmap forecast must have 49 hours.", "field": "points"}


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"weight_lb": 45_000}, "points"),
        ({**VALID_BODY, "points": [build_point(DALLAS_POINT)] * 251}, "points"),
        ({**VALID_BODY, "points": [build_point((-96.8, 100.0))]}, "points"),
        ({**VALID_BODY, "points": [{"lon": -96.8, "lat": 32.7}]}, "points"),
        ({**VALID_BODY, "weight_lb": 0}, "weight_lb"),
    ],
)
def test_rejects_invalid_input(body, field):
    response = post_heatmap(body)

    assert response.status_code == 400
    assert response.json()["field"] == field
