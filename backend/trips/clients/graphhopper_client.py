"""Client for the GraphHopper Geocoding and Routing APIs."""

import requests
from django.conf import settings

from trips.constants import COUNTRY_CODE, HTTP_TIMEOUT_SECONDS, ROUTING_PROFILE
from trips.exceptions import GraphHopperError, RoutingError
from trips.types import LonLat, Place, Route

# Language of place names in geocoding results; used by get_coordinates_from_text.
GEOCODING_LOCALE = "en"

# Matches requested before keeping the first one in COUNTRY_CODE; used by get_coordinates_from_text.
GEOCODING_RESULT_LIMIT = 10


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


def get_route(origin: LonLat, destination: LonLat) -> Route:
    """Return the fastest driving route between two points."""
    data = _get_json(
        "/route",
        [
            ("point", _format_point(origin)),
            ("point", _format_point(destination)),
            ("profile", ROUTING_PROFILE),
            # Plain [lon, lat] coordinates instead of GraphHopper's compressed format.
            ("points_encoded", "false"),
            # Turn-by-turn directions aren't needed, only the line.
            ("instructions", "false"),
        ],
    )

    paths = data.get("paths") or []
    if not paths:
        raise RoutingError("GraphHopper returned no paths.")

    # The first path is the fastest one.
    path = paths[0]

    return Route(
        # Keep only lon and lat; some responses add elevation as a third value.
        geometry=[(lon, lat) for lon, lat, *_ in path["points"]["coordinates"]],
        distance_m=path["distance"],
        # GraphHopper gives milliseconds.
        time_s=path["time"] / 1000,
    )


def _get_json(path: str, params: list[tuple[str, str]]) -> dict:
    api_key = settings.GRAPHHOPPER_API_KEY
    if not api_key:
        raise GraphHopperError("GRAPHHOPPER_API_KEY is not set.")

    try:
        response = requests.get(
            f"{settings.GRAPHHOPPER_BASE_URL}{path}",
            params=[*params, ("key", api_key)],
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
