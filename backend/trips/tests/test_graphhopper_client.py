import pytest
import responses
from django.conf import settings

from trips.clients.graphhopper_client import get_coordinates_from_text, get_routes, search_places
from trips.exceptions import GraphHopperError, RoutingError
from trips.tests.test_data import DALLAS_PLACE, DALLAS_POINT, HOUSTON_POINT
from trips.types import Place, Route, TimeInterval


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


def build_geocode_hit(name: str, countrycode: str = "US", **fields) -> dict:
    """A minimal GraphHopper geocoding hit in Dallas; tests add street, city and state as needed."""
    return {"name": name, "countrycode": countrycode, "point": {"lat": 32.7767, "lng": -96.797}, **fields}


@responses.activate
def test_search_places_keeps_only_us_results_in_order():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/geocode",
        json={
            "hits": [
                build_geocode_hit("Dallas", state="Texas"),
                build_geocode_hit("Dallas", countrycode="GB"),
                build_geocode_hit("Dallas", state="Georgia"),
            ]
        },
    )

    places = search_places("Dallas")

    assert [place.label for place in places] == ["Dallas, Texas", "Dallas, Georgia"]
    assert places[0] == Place(label="Dallas, Texas", lat=32.7767, lon=-96.797)


@responses.activate
def test_search_places_returns_at_most_five_places():
    hits = []
    for number in range(8):
        hits.append(build_geocode_hit(f"Place {number}", state="Texas"))
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/geocode", json={"hits": hits})

    assert len(search_places("Place")) == 5


@responses.activate
def test_search_places_skips_repeated_labels():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/geocode",
        json={"hits": [build_geocode_hit("Dallas", state="Texas"), build_geocode_hit("Dallas", state="Texas")]},
    )

    assert [place.label for place in search_places("Dallas")] == ["Dallas, Texas"]


@responses.activate
def test_search_places_returns_empty_list_without_us_results():
    responses.get(
        f"{settings.GRAPHHOPPER_BASE_URL}/geocode",
        json={"hits": [build_geocode_hit("Paris", countrycode="FR")]},
    )

    assert search_places("Paris") == []


@pytest.mark.parametrize(
    ("hit", "label"),
    [
        # A house address: number and street, then city and state.
        (
            build_geocode_hit("", street="Main Street", housenumber="1200", city="Dallas", state="Texas"),
            "1200 Main Street, Dallas, Texas",
        ),
        # A street without a house number.
        (
            build_geocode_hit("Main Street", street="Main Street", city="Dallas", state="Texas"),
            "Main Street, Dallas, Texas",
        ),
        # A business: its name, then city and state.
        (
            build_geocode_hit("Pilot Travel Center", street="Interstate 40", city="Amarillo", state="Texas"),
            "Pilot Travel Center, Amarillo, Texas",
        ),
        # A city: its city field repeats the name, so it appears once.
        (build_geocode_hit("Dallas", city="Dallas", state="Texas"), "Dallas, Texas"),
        # A state on its own.
        (build_geocode_hit("Texas", state="Texas"), "Texas"),
    ],
)
@responses.activate
def test_search_places_builds_readable_labels(hit, label):
    responses.get(f"{settings.GRAPHHOPPER_BASE_URL}/geocode", json={"hits": [hit]})

    assert search_places("anything")[0].label == label


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
