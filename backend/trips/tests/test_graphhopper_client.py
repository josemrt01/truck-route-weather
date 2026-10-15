import pytest
import responses
from django.conf import settings

from trips.clients.graphhopper_client import get_coordinates_from_text, get_routes
from trips.exceptions import GraphHopperError, RoutingError
from trips.tests.test_data import DALLAS_PLACE, DALLAS_POINT, HOUSTON_POINT
from trips.types import Route, TimeInterval


@responses.activate
def test_get_coordinates_from_text_returns_first_us_result():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/geocode",
        json={
            "hits": [
                {"name": "Dallas", "countrycode": "GB", "point": {"lat": 54.6, "lng": -3.0}},
                {"name": "Dallas", "state": "Texas", "countrycode": "US", "point": {"lat": 32.7767, "lng": -96.797}},
            ]
        },
    )

    place = get_coordinates_from_text("Dallas")

    assert place == DALLAS_PLACE
    assert responses.calls[0].request.params["q"] == "Dallas"
    assert responses.calls[0].request.params["key"] == "test-key"


@responses.activate
def test_get_coordinates_from_text_returns_none_without_us_results():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/geocode", json={"hits": []})

    assert get_coordinates_from_text("Nowhere") is None


@responses.activate
def test_get_routes_returns_geometry_distance_time_and_time_intervals():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/route",
        json={
            "paths": [
                {
                    "distance": 385000.5,
                    "time": 13020000,
                    "points": {"coordinates": [list(DALLAS_POINT), [-96.0, 31.0], list(HOUSTON_POINT)]},
                    # GraphHopper time details: [from_index, to_index, milliseconds].
                    "details": {"time": [[0, 1, 7020000], [1, 2, 6000000]]},
                }
            ]
        },
    )

    route = get_routes(DALLAS_POINT, HOUSTON_POINT)[0]

    assert route == Route(
        geometry=[DALLAS_POINT, (-96.0, 31.0), HOUSTON_POINT],
        distance_m=385000.5,
        time_s=13020.0,
        time_intervals=[
            TimeInterval(start_index=0, end_index=1, seconds=7020.0),
            TimeInterval(start_index=1, end_index=2, seconds=6000.0),
        ],
    )
    # GraphHopper expects "lat,lon" for each point.
    assert "point=32.7767%2C-96.797" in responses.calls[0].request.url
    assert responses.calls[0].request.params["details"] == "time"


@responses.activate
def test_get_routes_uses_one_time_interval_when_details_are_missing():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/route",
        json={
            "paths": [
                {
                    "distance": 385000.5,
                    "time": 13020000,
                    "points": {"coordinates": [list(DALLAS_POINT), [-96.0, 31.0], list(HOUSTON_POINT)]},
                }
            ]
        },
    )

    route = get_routes(DALLAS_POINT, HOUSTON_POINT)[0]

    assert route.time_intervals == [TimeInterval(start_index=0, end_index=2, seconds=13020.0)]


@responses.activate
def test_get_routes_raises_routing_error_when_graphhopper_rejects_points():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/route", status=400, json={"message": "Cannot find point 0"})

    with pytest.raises(RoutingError, match="Cannot find point 0"):
        get_routes(DALLAS_POINT, HOUSTON_POINT)


@responses.activate
def test_get_routes_raises_graphhopper_error_on_server_failure():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/route", status=500)

    with pytest.raises(GraphHopperError, match="status 500"):
        get_routes(DALLAS_POINT, HOUSTON_POINT)


def test_missing_api_key_raises_graphhopper_error(settings):
    settings.GRAPHHOPPER_API_KEY = ""

    with pytest.raises(GraphHopperError, match="GRAPHHOPPER_API_KEY"):
        get_routes(DALLAS_POINT, HOUSTON_POINT)


def build_path(distance_m: float, time_ms: int) -> dict:
    """A minimal GraphHopper path from Dallas to Houston; tests change only distance and time."""
    return {
        "distance": distance_m,
        "time": time_ms,
        "points": {"coordinates": [list(DALLAS_POINT), list(HOUSTON_POINT)]},
    }


@responses.activate
def test_get_routes_returns_every_path_in_graphhopper_order():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/route",
        json={
            "paths": [
                build_path(385_000, 12_000_000),
                build_path(434_000, 15_800_000),
                build_path(452_000, 16_500_000),
            ]
        },
    )

    routes = get_routes(DALLAS_POINT, HOUSTON_POINT)

    assert [route.distance_m for route in routes] == [385_000, 434_000, 452_000]


@responses.activate
def test_get_routes_asks_for_relaxed_alternative_routes():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/route", json={"paths": [build_path(385_000, 12_000_000)]})

    get_routes(DALLAS_POINT, HOUSTON_POINT)

    params = responses.calls[0].request.params
    assert params["algorithm"] == "alternative_route"
    assert params["alternative_route.max_paths"] == "3"
    assert params["alternative_route.max_weight_factor"] == "2.0"
    assert params["alternative_route.max_share_factor"] == "0.8"


@responses.activate
def test_get_routes_returns_a_single_route_when_graphhopper_finds_no_alternatives():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/route", json={"paths": [build_path(385_000, 12_000_000)]})

    assert len(get_routes(DALLAS_POINT, HOUSTON_POINT)) == 1
