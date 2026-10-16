from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from trips.exceptions import GraphHopperError, RoutingError
from trips.services import trip_plan_service
from trips.tests.test_data import DALLAS_PLACE, DALLAS_POINT, DEPARTURE_ISO, FIXED_NOW, HOUSTON_PLACE
from trips.types import Route, TimeInterval

# Text typed in the form mapped to the place geocoding returns; used by the fake geocoder below.
PLACES_BY_TEXT = {"Dallas, TX": DALLAS_PLACE, "Houston, TX": HOUSTON_PLACE}

# A request that passes validation; tests copy it and change one field.
VALID_BODY = {
    "origin": "Dallas, TX",
    "destination": "Houston, TX",
    "departure": DEPARTURE_ISO,
    "spacing_mi": 25,
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


def post_trip_plan(body):
    return APIClient().post("/api/trip-plans", body, format="json")


def test_returns_places_route_and_checkpoints():
    response = post_trip_plan(VALID_BODY)

    assert response.status_code == 200
    trip_plan = response.json()
    route = trip_plan["routes"][0]

    assert trip_plan["origin"] == {"label": "Dallas, Texas", "lat": 32.7767, "lon": -96.797}
    assert trip_plan["destination"] == {"label": "Houston, Texas", "lat": 29.7604, "lon": -95.3698}
    assert trip_plan["departure_utc"] == "2026-10-13T13:00:00Z"
    assert route["id"] == "A"
    assert route["geometry"] == [[-96.797, 32.7767], [-95.3698, 29.7604]]
    # Our own measured total for the fake straight line, not GraphHopper's distance.
    assert route["distance_mi"] == 224.8
    assert route["duration_s"] == 12420
    # 13:00 + 12,420.4 seconds (3 h 27 min 0.4 s).
    assert route["arrival_utc"] == "2026-10-13T16:27:00Z"
    # Weather and risk come later, from /api/trip-risks.
    assert "miles_by_level" not in route

    checkpoints = route["checkpoints"]
    assert [checkpoint["mile"] for checkpoint in checkpoints] == [0, 25, 50, 75, 100, 125, 150, 175, 200, 224.8]
    # The fake route has only two points, so every checkpoint comes after point 0.
    assert checkpoints[0] == {
        "mile": 0.0,
        "lat": 32.7767,
        "lon": -96.797,
        "eta_utc": "2026-10-13T13:00:00Z",
        "previous_point_index": 0,
    }
    assert checkpoints[-1] == {
        "mile": 224.8,
        "lat": 29.7604,
        "lon": -95.3698,
        "eta_utc": "2026-10-13T16:27:00Z",
        "previous_point_index": 0,
    }


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
        "error": "Couldn't find 'Atlantis'. Try a city and state.",
        "field": "destination",
    }


def test_uses_a_sent_point_instead_of_geocoding_its_text(monkeypatch):
    geocoded_texts = []

    def get_fake_coordinates(text):
        geocoded_texts.append(text)
        return PLACES_BY_TEXT.get(text)

    monkeypatch.setattr(trip_plan_service, "get_coordinates_from_text", get_fake_coordinates)

    response = post_trip_plan({**VALID_BODY, "origin": "Downtown Dallas", "origin_point": list(DALLAS_POINT)})

    assert response.status_code == 200
    # Only the destination had no point, so only it was geocoded.
    assert geocoded_texts == ["Houston, TX"]
    # The typed text becomes the label of the sent point.
    assert response.json()["origin"] == {"label": "Downtown Dallas", "lat": 32.7767, "lon": -96.797}


@pytest.mark.parametrize(
    ("body", "error", "field"),
    [
        ({**VALID_BODY, "origin_point": [-96.8, 100.0]}, "Point must be [lon, lat] in degrees.", "origin_point"),
        (
            {**VALID_BODY, "destination_point": [200.0, 29.7]},
            "Point must be [lon, lat] in degrees.",
            "destination_point",
        ),
        ({**VALID_BODY, "origin_point": [1.0]}, "Ensure this field has at least 2 elements.", "origin_point"),
    ],
)
def test_rejects_a_bad_point_on_its_field(body, error, field):
    response = post_trip_plan(body)

    assert response.status_code == 400
    assert response.json() == {"error": error, "field": field}


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


def fake_routes_with_times(monkeypatch, route_seconds):
    """Make the fake GraphHopper return one straight route per entry in route_seconds, in that order."""

    def get_fake_routes(origin, destination):
        return [build_straight_route(origin, destination, seconds) for seconds in route_seconds]

    monkeypatch.setattr(trip_plan_service, "get_routes", get_fake_routes)


def test_labels_routes_from_fastest_to_slowest(monkeypatch):
    # GraphHopper's order: 4 h, 3 h 27 min, 5 h.
    fake_routes_with_times(monkeypatch, [14_400, 12_420, 18_000])

    routes = post_trip_plan(VALID_BODY).json()["routes"]

    assert [route["id"] for route in routes] == ["A", "B", "C"]
    assert [route["duration_s"] for route in routes] == [12_420, 14_400, 18_000]


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


def test_sends_corridor_points_for_the_heatmap():
    trip_plan = post_trip_plan(VALID_BODY).json()
    corridor_points = trip_plan["corridor_points"]

    assert trip_plan["corridor_cell_size_deg"] == 0.25
    assert len(corridor_points) > 0
    # Each point is [lon, lat], like the route geometry; Dallas lies in the cell centered at (-96.875, 32.875).
    assert [-96.875, 32.875] in corridor_points
