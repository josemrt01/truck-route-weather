import pytest
from rest_framework.test import APIClient

from trips.error_messages import NO_DRIVABLE_ROUTE, PLACE_NOT_FOUND
from trips.exceptions import GraphHopperError, RoutingError
from trips.services import trip_plan_service
from trips.tests.test_data import DALLAS_PLACE, HOUSTON_PLACE
from trips.types import Route, TimeInterval

# Text typed in the form mapped to the place geocoding returns; used by the fake geocoder below.
PLACES_BY_TEXT = {"Dallas, TX": DALLAS_PLACE, "Houston, TX": HOUSTON_PLACE}


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


def test_returns_places_and_route():
    response = post_trip_plan({"origin": "Dallas, TX", "destination": "Houston, TX"})

    assert response.status_code == 200
    assert response.json() == {
        "origin": {"label": "Dallas, Texas", "lat": 32.7767, "lon": -96.797},
        "destination": {"label": "Houston, Texas", "lat": 29.7604, "lon": -95.3698},
        "route": {
            "geometry": [[-96.797, 32.7767], [-95.3698, 29.7604]],
            "distance_mi": 239.2,
            "duration_s": 12420,
        },
    }


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"origin": "", "destination": "Houston, TX"}, "origin"),
        ({"origin": "Dallas, TX"}, "destination"),
    ],
)
def test_rejects_invalid_input(body, field):
    response = post_trip_plan(body)

    assert response.status_code == 400
    assert response.json()["field"] == field


def test_reports_unknown_place_on_its_field():
    response = post_trip_plan({"origin": "Dallas, TX", "destination": "Atlantis"})

    assert response.status_code == 400
    assert response.json() == {
        "error": PLACE_NOT_FOUND.format(place="Atlantis"),
        "field": "destination",
    }


def test_reports_routing_error_as_bad_request(monkeypatch):
    def raise_routing_error(origin, destination):
        raise RoutingError("Cannot find point 0")

    monkeypatch.setattr(trip_plan_service, "get_route", raise_routing_error)

    response = post_trip_plan({"origin": "Dallas, TX", "destination": "Houston, TX"})

    assert response.status_code == 400
    assert response.json()["error"] == NO_DRIVABLE_ROUTE


def test_reports_graphhopper_failure_as_service_unavailable(monkeypatch):
    def raise_graphhopper_error(text):
        raise GraphHopperError("GraphHopper answered with status 500.")

    monkeypatch.setattr(trip_plan_service, "get_coordinates_from_text", raise_graphhopper_error)

    response = post_trip_plan({"origin": "Dallas, TX", "destination": "Houston, TX"})

    assert response.status_code == 503
    assert response.json()["field"] is None
