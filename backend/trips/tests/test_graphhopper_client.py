import pytest
import responses
from django.conf import settings

from trips.clients.graphhopper_client import get_coordinates_from_text, get_route
from trips.exceptions import GraphHopperError, RoutingError
from trips.tests.test_data import DALLAS_PLACE, DALLAS_POINT, HOUSTON_POINT
from trips.types import Route


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
def test_get_route_returns_geometry_distance_and_time():
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

    route = get_route(DALLAS_POINT, HOUSTON_POINT)

    assert route == Route(
        geometry=[DALLAS_POINT, (-96.0, 31.0), HOUSTON_POINT],
        distance_m=385000.5,
        time_s=13020.0,
    )
    # GraphHopper expects "lat,lon" for each point.
    assert "point=32.7767%2C-96.797" in responses.calls[0].request.url


@responses.activate
def test_get_route_raises_routing_error_when_graphhopper_rejects_points():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/route", status=400, json={"message": "Cannot find point 0"})

    with pytest.raises(RoutingError, match="Cannot find point 0"):
        get_route(DALLAS_POINT, HOUSTON_POINT)


@responses.activate
def test_get_route_raises_graphhopper_error_on_server_failure():
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/route", status=500)

    with pytest.raises(GraphHopperError, match="status 500"):
        get_route(DALLAS_POINT, HOUSTON_POINT)


def test_missing_api_key_raises_graphhopper_error(settings):
    settings.GRAPHHOPPER_API_KEY = ""

    with pytest.raises(GraphHopperError, match="GRAPHHOPPER_API_KEY"):
        get_route(DALLAS_POINT, HOUSTON_POINT)
