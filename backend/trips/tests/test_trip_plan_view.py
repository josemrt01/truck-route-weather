from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from trips.error_messages import (
    DEPARTURE_NEEDS_TIMEZONE,
    DEPARTURE_TOO_EARLY,
    DEPARTURE_TOO_LATE,
    NO_DRIVABLE_ROUTE,
    PLACE_NOT_FOUND,
)
from trips.exceptions import GraphHopperError, RoutingError
from trips.services import trip_plan_service
from trips.tests.test_data import DALLAS_PLACE, DEPARTURE_ISO, FIXED_NOW, HOUSTON_PLACE
from trips.types import Route, TimeInterval

# Text typed in the form mapped to the place geocoding returns; used by the fake geocoder below.
PLACES_BY_TEXT = {"Dallas, TX": DALLAS_PLACE, "Houston, TX": HOUSTON_PLACE}

# A request that passes validation; tests copy it and change one field.
VALID_BODY = {"origin": "Dallas, TX", "destination": "Houston, TX", "departure": DEPARTURE_ISO, "spacing_mi": 25}


@pytest.fixture(autouse=True)
def fixed_now(monkeypatch):
    """Freeze the clock one hour before DEPARTURE_ISO, so the departure-window checks are predictable."""
    monkeypatch.setattr(timezone, "now", lambda: FIXED_NOW)


@pytest.fixture(autouse=True)
def fake_graphhopper(monkeypatch):
    monkeypatch.setattr(trip_plan_service, "get_coordinates_from_text", PLACES_BY_TEXT.get)
    monkeypatch.setattr(
        trip_plan_service,
        "get_route",
        lambda origin, destination: Route(
            geometry=[origin, destination],
            distance_m=385_000,
            time_s=12_420.4,
            time_intervals=[TimeInterval(start_index=0, end_index=1, seconds=12_420.4)],
        ),
    )


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

    checkpoints = route["checkpoints"]
    assert [checkpoint["mile"] for checkpoint in checkpoints] == [0, 25, 50, 75, 100, 125, 150, 175, 200, 224.8]
    assert checkpoints[0] == {"mile": 0.0, "lat": 32.7767, "lon": -96.797, "eta_utc": "2026-10-13T13:00:00Z"}
    assert checkpoints[-1] == {"mile": 224.8, "lat": 29.7604, "lon": -95.3698, "eta_utc": "2026-10-13T16:27:00Z"}


def test_converts_departure_offset_to_utc():
    response = post_trip_plan({**VALID_BODY, "departure": "2026-10-13T08:00:00-05:00"})

    assert response.status_code == 200
    assert response.json()["departure_utc"] == "2026-10-13T13:00:00Z"


def test_rejects_departure_without_timezone():
    response = post_trip_plan({**VALID_BODY, "departure": "2026-10-13T08:00:00"})

    assert response.status_code == 400
    assert response.json() == {"error": DEPARTURE_NEEDS_TIMEZONE, "field": "departure"}


@pytest.mark.parametrize(
    ("departure", "error"),
    [
        (FIXED_NOW - timedelta(minutes=16), DEPARTURE_TOO_EARLY),
        (FIXED_NOW + timedelta(days=7, minutes=1), DEPARTURE_TOO_LATE),
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
    ],
)
def test_rejects_invalid_input(body, field):
    response = post_trip_plan(body)

    assert response.status_code == 400
    assert response.json()["field"] == field


def test_reports_unknown_place_on_its_field():
    response = post_trip_plan({**VALID_BODY, "destination": "Atlantis"})

    assert response.status_code == 400
    assert response.json() == {
        "error": PLACE_NOT_FOUND.format(place="Atlantis"),
        "field": "destination",
    }


def test_reports_routing_error_as_bad_request(monkeypatch):
    def raise_routing_error(origin, destination):
        raise RoutingError("Cannot find point 0")

    monkeypatch.setattr(trip_plan_service, "get_route", raise_routing_error)

    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 400
    assert response.json()["error"] == NO_DRIVABLE_ROUTE


def test_reports_graphhopper_failure_as_service_unavailable(monkeypatch):
    def raise_graphhopper_error(text):
        raise GraphHopperError("GraphHopper answered with status 500.")

    monkeypatch.setattr(trip_plan_service, "get_coordinates_from_text", raise_graphhopper_error)

    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 503
    assert response.json()["field"] is None
