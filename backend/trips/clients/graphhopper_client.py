"""Client for the GraphHopper Geocoding and Routing APIs."""

import requests
from django.conf import settings

from trips.constants import COUNTRY_CODE, HTTP_TIMEOUT_SECONDS, ROUTE_COUNT, ROUTING_PROFILE
from trips.exceptions import GraphHopperError, RoutingError
from trips.types import LonLat, Place, RoadInterval, Route, TimeInterval

# Language of place names in geocoding results; used by search_places.
GEOCODING_LOCALE = "en"

# Matches requested from GraphHopper before keeping the ones in COUNTRY_CODE; used by search_places.
GEOCODING_RESULT_LIMIT = 10

# Most places one search returns (the autocomplete list length); used by search_places.
PLACE_SUGGESTION_LIMIT = 5

# GraphHopper reports durations in milliseconds; used by _build_route to convert to seconds.
MILLISECONDS_PER_SECOND = 1000

# Alternatives may take up to 2x the best route's time; GraphHopper's default (1.4) often gave only 1 route;
# used by get_routes.
ALTERNATIVE_MAX_WEIGHT_FACTOR = 2.0

# Alternatives may share up to 80% of their road with the best route (GraphHopper's default is 0.6);
# used by get_routes.
ALTERNATIVE_MAX_SHARE_FACTOR = 0.8


def search_places(text: str) -> list[Place]:
    """Return up to PLACE_SUGGESTION_LIMIT places in COUNTRY_CODE matching the text, best match first."""
    data = _get_json(
        "/geocode",
        [("q", text), ("locale", GEOCODING_LOCALE), ("limit", str(GEOCODING_RESULT_LIMIT))],
    )

    places = []
    labels = set()
    for hit in data.get("hits", []):
        # Results can come from any country; keep only ours.
        if hit.get("countrycode", "").upper() != COUNTRY_CODE:
            continue

        # The same place can come back twice (e.g. as a city and as a town); list it once.
        label = _build_place_label(hit)
        if label in labels:
            continue

        labels.add(label)
        places.append(Place(label=label, lat=hit["point"]["lat"], lon=hit["point"]["lng"]))
        if len(places) == PLACE_SUGGESTION_LIMIT:
            break

    return places


def get_coordinates_from_text(text: str) -> Place | None:
    """Return the best match in COUNTRY_CODE for a place name, or None."""
    places = search_places(text)
    if not places:
        return None

    return places[0]


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
            # Road numbers per stretch ("I 45"), used to name each route.
            ("details", "street_ref"),
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
        road_intervals=_get_road_intervals(path),
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


def _get_road_intervals(path: dict) -> list[RoadInterval]:
    road_intervals = []

    for start_index, end_index, road_refs_text in path.get("details", {}).get("street_ref", []):
        # Local streets have no road number.
        if not road_refs_text:
            continue

        # Where highways run together GraphHopper lists them all: "I 45, US 287".
        road_refs = []
        for road_ref in road_refs_text.split(","):
            road_refs.append(road_ref.strip())

        road_intervals.append(RoadInterval(start_index=start_index, end_index=end_index, road_refs=road_refs))

    return road_intervals


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
    street = hit.get("street", "")
    house_number = hit.get("housenumber", "")
    city = hit.get("city", "")
    state = hit.get("state", "")

    parts = []

    # A named place (city, business) leads with its name; an address leads with its house number and street.
    if name and name != street:
        parts.append(name)
    elif street and house_number:
        parts.append(f"{house_number} {street}")
    elif street:
        parts.append(street)

    # Skip the city or state when it is the place itself: "Dallas, Texas", not "Dallas, Dallas, Texas".
    if city and city != name:
        parts.append(city)
    if state and state != name:
        parts.append(state)

    return ", ".join(parts)
