"""Client for the GraphHopper Geocoding and Routing APIs."""

import requests
from django.conf import settings

from trips.constants import COUNTRY_CODE, HTTP_TIMEOUT_SECONDS, ROUTE_COUNT, ROUTING_PROFILE
from trips.exceptions import GraphHopperError, RoutingError
from trips.types import LonLat, Place, Route, TimeInterval

# Language of place names in geocoding results; used by get_coordinates_from_text.
GEOCODING_LOCALE = "en"

# Matches requested before keeping the first one in COUNTRY_CODE; used by get_coordinates_from_text.
GEOCODING_RESULT_LIMIT = 10

# GraphHopper reports durations in milliseconds; used by _build_route to convert to seconds.
MILLISECONDS_PER_SECOND = 1000

# Alternatives may take up to 2x the best route's time; GraphHopper's default (1.4) often gave only 1 route;
# used by get_routes.
ALTERNATIVE_MAX_WEIGHT_FACTOR = 2.0

# Alternatives may share up to 80% of their road with the best route (GraphHopper's default is 0.6);
# used by get_routes.
ALTERNATIVE_MAX_SHARE_FACTOR = 0.8


def get_coordinates_from_text(text: str) -> Place | None:
    """Return the first match in COUNTRY_CODE for a place name, or None."""
    data = _get_json(
        "/geocode",
        [("q", text), ("locale", GEOCODING_LOCALE), ("limit", str(GEOCODING_RESULT_LIMIT))],
    )

    # Results can come from any country; keep the first one in ours.
    for hit in data.get("hits", []):
        if hit.get("countrycode", "").upper() == COUNTRY_CODE:
            return Place(label=_build_place_label(hit), lat=hit["point"]["lat"], lon=hit["point"]["lng"])

    return None


def get_routes(origin: LonLat, destination: LonLat) -> list[Route]:
    """Return up to ROUTE_COUNT driving routes between two points, best first."""
    data = _get_json(
        "/route",
        # A list of pairs instead of a dict, because "point" is sent twice and a dict can't repeat a key.
        [
            ("point", _format_point(origin)),
            ("point", _format_point(destination)),
            ("profile", ROUTING_PROFILE),
            # Plain [lon, lat] coordinates instead of GraphHopper's compressed format.
            ("points_encoded", "false"),
            # Turn-by-turn directions aren't needed, only the line.
            ("instructions", "false"),
            # Driving time per stretch of road, used to time each checkpoint.
            ("details", "time"),
            # Ask for alternative routes, not just the best one.
            ("algorithm", "alternative_route"),
            ("alternative_route.max_paths", str(ROUTE_COUNT)),
            ("alternative_route.max_weight_factor", str(ALTERNATIVE_MAX_WEIGHT_FACTOR)),
            ("alternative_route.max_share_factor", str(ALTERNATIVE_MAX_SHARE_FACTOR)),
        ],
    )

    paths = data.get("paths") or []
    if not paths:
        raise RoutingError("GraphHopper returned no paths.")

    routes = []
    for path in paths:
        routes.append(_build_route(path))

    return routes


def _build_route(path: dict) -> Route:
    # Keep only lon and lat (positions 0 and 1); some responses add elevation as a third value.
    geometry = [(coordinate[0], coordinate[1]) for coordinate in path["points"]["coordinates"]]
    time_s = path["time"] / MILLISECONDS_PER_SECOND

    return Route(
        geometry=geometry,
        distance_m=path["distance"],
        time_s=time_s,
        time_intervals=_get_time_intervals(path, geometry, time_s),
    )


def _get_time_intervals(path: dict, geometry: list[LonLat], time_s: float) -> list[TimeInterval]:
    time_details = path.get("details", {}).get("time", [])

    # Without details, treat the whole route as one stretch at its average speed.
    if not time_details:
        return [TimeInterval(start_index=0, end_index=len(geometry) - 1, seconds=time_s)]

    return [
        TimeInterval(start_index=start_index, end_index=end_index, seconds=milliseconds / MILLISECONDS_PER_SECOND)
        for start_index, end_index, milliseconds in time_details
    ]


def _get_json(path: str, params: list[tuple[str, str]]) -> dict:
    api_key = settings.GRAPHHOPPER_API_KEY
    if not api_key:
        raise GraphHopperError("GRAPHHOPPER_API_KEY is not set.")

    try:
        response = requests.get(
            f"{settings.GRAPHHOPPER_BASE_URL}{path}",
            params=params + [("key", api_key)],
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        # `from None`: the original error text contains the request URL, which includes the API key.
        raise GraphHopperError(f"Could not reach GraphHopper ({type(exc).__name__}).") from None

    # 400 means GraphHopper understood us but can't route these points (e.g. a point in the sea).
    if response.status_code == requests.codes.bad_request:
        raise RoutingError(response.json().get("message", "GraphHopper rejected the request."))

    # Any other failure (bad key, quota exceeded, server down) is a service problem.
    if not response.ok:
        raise GraphHopperError(f"GraphHopper answered with status {response.status_code}.")

    return response.json()


def _format_point(point: LonLat) -> str:
    # GraphHopper expects "lat,lon", the reverse of our (lon, lat) tuples.
    lon, lat = point
    return f"{lat},{lon}"


def _build_place_label(hit: dict) -> str:
    name = hit.get("name", "")
    state = hit.get("state", "")

    # "Dallas, Texas"; just "Texas" when the place is the state itself.
    return f"{name}, {state}" if state and state != name else name
