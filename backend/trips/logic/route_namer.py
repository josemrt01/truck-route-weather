"""Names each route after its main road, like Google Maps: "via I-45"."""

from trips.logic.geo_math import calculate_haversine_miles
from trips.types import LonLat, Route


def name_routes(routes: list[Route]) -> list[str]:
    """Return one name per route, in the same order (fastest first).

    Each route is named after its longest road. A later route skips a road an earlier route is already
    named after, so no two names repeat; with no road left it becomes "Route 2", "Route 3".
    """
    names = []
    used_roads = set()

    for index, route in enumerate(routes):
        main_road = _pick_main_road(route, used_roads)
        if main_road is None:
            names.append(f"Route {index + 1}")
            continue

        used_roads.add(main_road)
        names.append(f"via {_format_road(main_road)}")

    return names


def _pick_main_road(route: Route, used_roads: set[str]) -> str | None:
    best_road = None
    best_miles = 0.0

    for road, miles in _get_miles_by_road(route).items():
        if road in used_roads:
            continue
        if miles > best_miles:
            best_road = road
            best_miles = miles

    return best_road


def _get_miles_by_road(route: Route) -> dict[str, float]:
    # e.g. {"I 45": 180.2, "US 287": 12.5}; a stretch shared by two highways counts for both.
    miles_by_road = {}

    for road_interval in route.road_intervals:
        miles = _get_stretch_miles(route.geometry, road_interval.start_index, road_interval.end_index)
        for road in road_interval.road_refs:
            miles_by_road[road] = miles_by_road.get(road, 0.0) + miles

    return miles_by_road


def _get_stretch_miles(geometry: list[LonLat], start_index: int, end_index: int) -> float:
    miles = 0.0
    for index in range(start_index, end_index):
        miles += calculate_haversine_miles(geometry[index], geometry[index + 1])

    return miles


def _format_road(road: str) -> str:
    # Road signs write "I 45" as "I-45"; longer names like "US Highway 175 West" stay as GraphHopper writes them.
    parts = road.split(" ")
    if len(parts) == 2:
        return f"{parts[0]}-{parts[1]}"

    return road
