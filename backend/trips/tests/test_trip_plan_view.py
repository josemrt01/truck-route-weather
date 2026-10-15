from datetime import UTC, datetime, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from trips.exceptions import GraphHopperError, RoutingError, WeatherServiceError
from trips.services import trip_plan_service
from trips.tests.test_data import DALLAS_PLACE, DEPARTURE_ISO, FIXED_NOW, HOUSTON_PLACE
from trips.types import HourlyForecast, Route, TimeInterval

# Text typed in the form mapped to the place geocoding returns; used by the fake geocoder below.
PLACES_BY_TEXT = {"Dallas, TX": DALLAS_PLACE, "Houston, TX": HOUSTON_PLACE}

# A request that passes validation; tests copy it and change one field.
VALID_BODY = {
    "origin": "Dallas, TX",
    "destination": "Houston, TX",
    "departure": DEPARTURE_ISO,
    "spacing_mi": 25,
    "weight_lb": 45_000,
}


@pytest.fixture(autouse=True)
def fixed_now(monkeypatch):
    """Freeze the clock one hour before DEPARTURE_ISO, so the departure-window checks are predictable."""
    monkeypatch.setattr(timezone, "now", lambda: FIXED_NOW)


def build_straight_route(origin, destination, time_s):
    """A fake two-point route between origin and destination that takes time_s seconds."""
    return Route(
        geometry=[origin, destination],
        distance_m=385_000,
        time_s=time_s,
        time_intervals=[TimeInterval(start_index=0, end_index=1, seconds=time_s)],
    )


@pytest.fixture(autouse=True)
def fake_graphhopper(monkeypatch):
    monkeypatch.setattr(trip_plan_service, "get_coordinates_from_text", PLACES_BY_TEXT.get)
    monkeypatch.setattr(
        trip_plan_service,
        "get_routes",
        lambda origin, destination: [build_straight_route(origin, destination, 12_420.4)],
    )


@pytest.fixture(autouse=True)
def fake_open_meteo(monkeypatch):
    """Return the same weather (38 mph gusts) at every point and hour; the list records each requested window."""
    requested_windows = []

    def get_fake_forecasts(points, start_hour_utc, end_hour_utc):
        requested_windows.append((start_hour_utc, end_hour_utc))
        # Both ends are included, like Open-Meteo: 13:00 to 16:00 is 4 hours.
        hour_count = (end_hour_utc - start_hour_utc) // timedelta(hours=1) + 1
        forecast = HourlyForecast(
            first_hour_utc=start_hour_utc,
            wind_gust_mph=[38.0] * hour_count,
            wind_speed_mph=[20.0] * hour_count,
            rain_in=[0.05] * hour_count,
            snow_in=[0.0] * hour_count,
        )
        return [forecast] * len(points)

    monkeypatch.setattr(trip_plan_service, "get_hourly_forecasts", get_fake_forecasts)
    return requested_windows


def post_trip_plan(body):
    return APIClient().post("/api/trip-plans", body, format="json")


def test_returns_places_route_and_checkpoints():
    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 200
    trip_plan = response.json()
    route = trip_plan["route"]

    assert trip_plan["origin"] == {"label": "Dallas, Texas", "lat": 32.7767, "lon": -96.797}
    assert trip_plan["destination"] == {"label": "Houston, Texas", "lat": 29.7604, "lon": -95.3698}
    assert trip_plan["departure_utc"] == "2026-10-13T13:00:00Z"
    assert route["geometry"] == [[-96.797, 32.7767], [-95.3698, 29.7604]]
    # Our own measured total for the fake straight line, not GraphHopper's distance.
    assert route["distance_mi"] == 224.8
    assert route["duration_s"] == 12420
    # 13:00 + 12,420.4 seconds (3 h 27 min 0.4 s).
    assert route["arrival_utc"] == "2026-10-13T16:27:00Z"
    # The fake weather makes every checkpoint Severe, so the whole route is Severe.
    assert route["miles_by_level"] == {"low": 0.0, "moderate": 0.0, "high": 0.0, "severe": 224.8, "no_travel": 0.0}
    assert route["avg_risk"] == 3.0
    assert route["worst_level"] == 3

    checkpoints = route["checkpoints"]
    assert [checkpoint["mile"] for checkpoint in checkpoints] == [0, 25, 50, 75, 100, 125, 150, 175, 200, 224.8]
    # The fake route has only two points, so every checkpoint comes after point 0.
    assert checkpoints[0] == {
        "mile": 0.0,
        "lat": 32.7767,
        "lon": -96.797,
        "eta_utc": "2026-10-13T13:00:00Z",
        "previous_point_index": 0,
        "forecast_hour_utc": "2026-10-13T13:00:00Z",
        "wind_gust_mph": 38.0,
        "wind_speed_mph": 20.0,
        "rain_in_hr": 0.05,
        "snow_in_hr": 0.0,
        # 38 mph gusts alone are High; a 45,000 lb truck is over 40,000 lb, so the load rule makes it Severe.
        "level": 3,
        "cause": "wind_load_rule",
    }
    assert checkpoints[-1] == {
        "mile": 224.8,
        "lat": 29.7604,
        "lon": -95.3698,
        "eta_utc": "2026-10-13T16:27:00Z",
        "previous_point_index": 0,
        # 16:27 is nearest to 16:00.
        "forecast_hour_utc": "2026-10-13T16:00:00Z",
        "wind_gust_mph": 38.0,
        "wind_speed_mph": 20.0,
        "rain_in_hr": 0.05,
        "snow_in_hr": 0.0,
        "level": 3,
        "cause": "wind_load_rule",
    }


def test_asks_for_weather_from_departure_to_arrival_hour(fake_open_meteo):
    post_trip_plan(VALID_BODY)

    # Departure 13:00 and arrival 16:27, which rounds to 16:00.
    assert fake_open_meteo == [
        (datetime(2026, 10, 13, 13, tzinfo=UTC), datetime(2026, 10, 13, 16, tzinfo=UTC)),
    ]


def test_load_rule_needs_weight_over_the_limit():
    response = post_trip_plan({**VALID_BODY, "weight_lb": 40_000})

    # At exactly 40,000 lb the load rule doesn't apply, so 38 mph gusts stay High.
    checkpoint = response.json()["route"]["checkpoints"][0]
    assert (checkpoint["level"], checkpoint["cause"]) == (2, "wind")


def test_converts_departure_offset_to_utc():
    response = post_trip_plan({**VALID_BODY, "departure": "2026-10-13T08:00:00-05:00"})

    assert response.status_code == 200
    assert response.json()["departure_utc"] == "2026-10-13T13:00:00Z"


def test_rejects_departure_without_timezone():
    response = post_trip_plan({**VALID_BODY, "departure": "2026-10-13T08:00:00"})

    assert response.status_code == 400
    assert response.json() == {"error": "Departure time must include a timezone.", "field": "departure"}


@pytest.mark.parametrize(
    ("departure", "error"),
    [
        (FIXED_NOW - timedelta(minutes=16), "Departure can't be more than 15 minutes in the past."),
        (FIXED_NOW + timedelta(days=7, minutes=1), "Departure must be within the next 7 days."),
    ],
)
def test_rejects_departure_outside_allowed_window(departure, error):
    response = post_trip_plan({**VALID_BODY, "departure": departure.isoformat()})

    assert response.status_code == 400
    assert response.json() == {"error": error, "field": "departure"}


@pytest.mark.parametrize(
    "departure",
    [FIXED_NOW - timedelta(minutes=15), FIXED_NOW + timedelta(days=7)],
)
def test_accepts_departure_on_window_edges(departure):
    response = post_trip_plan({**VALID_BODY, "departure": departure.isoformat()})

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({**VALID_BODY, "origin": ""}, "origin"),
        ({key: value for key, value in VALID_BODY.items() if key != "destination"}, "destination"),
        ({key: value for key, value in VALID_BODY.items() if key != "departure"}, "departure"),
        ({key: value for key, value in VALID_BODY.items() if key != "spacing_mi"}, "spacing_mi"),
        ({**VALID_BODY, "spacing_mi": 30}, "spacing_mi"),
        ({key: value for key, value in VALID_BODY.items() if key != "weight_lb"}, "weight_lb"),
        ({**VALID_BODY, "weight_lb": "heavy"}, "weight_lb"),
    ],
)
def test_rejects_invalid_input(body, field):
    response = post_trip_plan(body)

    assert response.status_code == 400
    assert response.json()["field"] == field


@pytest.mark.parametrize(
    ("weight_lb", "error"),
    [
        (0, "Weight must be more than 0 lb."),
        (80_001, "Weight can't be more than 80,000 lb."),
    ],
)
def test_rejects_weight_outside_allowed_range(weight_lb, error):
    response = post_trip_plan({**VALID_BODY, "weight_lb": weight_lb})

    assert response.status_code == 400
    assert response.json() == {"error": error, "field": "weight_lb"}


@pytest.mark.parametrize("weight_lb", [1, 80_000])
def test_accepts_weight_on_range_edges(weight_lb):
    response = post_trip_plan({**VALID_BODY, "weight_lb": weight_lb})

    assert response.status_code == 200


def test_reports_unknown_place_on_its_field():
    response = post_trip_plan({**VALID_BODY, "destination": "Atlantis"})

    assert response.status_code == 400
    assert response.json() == {
        "error": "Couldn't find 'Atlantis'. Try a city and state.",
        "field": "destination",
    }


def test_reports_routing_error_as_bad_request(monkeypatch):
    def raise_routing_error(origin, destination):
        raise RoutingError("Cannot find point 0")

    monkeypatch.setattr(trip_plan_service, "get_routes", raise_routing_error)

    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 400
    assert response.json()["error"] == "No drivable route found between these places."


def test_reports_graphhopper_failure_as_service_unavailable(monkeypatch):
    def raise_graphhopper_error(text):
        raise GraphHopperError("GraphHopper answered with status 500.")

    monkeypatch.setattr(trip_plan_service, "get_coordinates_from_text", raise_graphhopper_error)

    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 503
    assert response.json()["field"] is None


def test_reports_weather_failure_as_service_unavailable(monkeypatch):
    def raise_weather_error(points, start_hour_utc, end_hour_utc):
        raise WeatherServiceError("Open-Meteo answered with status 500.")

    monkeypatch.setattr(trip_plan_service, "get_hourly_forecasts", raise_weather_error)

    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 503
    assert response.json() == {
        "error": "The weather service is unavailable. Please try again in a minute.",
        "field": None,
    }


def fake_routes_with_times(monkeypatch, route_seconds):
    """Make the fake GraphHopper return one straight route per entry in route_seconds, in that order."""

    def get_fake_routes(origin, destination):
        return [build_straight_route(origin, destination, seconds) for seconds in route_seconds]

    monkeypatch.setattr(trip_plan_service, "get_routes", get_fake_routes)


def test_sends_the_fastest_route_first(monkeypatch):
    # GraphHopper's order: 4 h, 3 h 27 min, 5 h.
    fake_routes_with_times(monkeypatch, [14_400, 12_420, 18_000])

    response = post_trip_plan(VALID_BODY)

    assert response.json()["route"]["duration_s"] == 12_420


def test_asks_for_weather_once_per_route(monkeypatch, fake_open_meteo):
    fake_routes_with_times(monkeypatch, [14_400, 12_420, 18_000])

    post_trip_plan(VALID_BODY)

    assert len(fake_open_meteo) == 3


@pytest.mark.parametrize(
    ("route_seconds", "expected_notes"),
    [
        ([12_420, 14_400, 18_000], []),
        ([12_420, 14_400], ["Only 2 routes found between these places."]),
        ([12_420], ["Only 1 route found between these places."]),
    ],
)
def test_notes_when_fewer_than_three_routes(monkeypatch, route_seconds, expected_notes):
    fake_routes_with_times(monkeypatch, route_seconds)

    response = post_trip_plan(VALID_BODY)

    assert response.json()["notes"] == expected_notes
