"""Builds a trip plan from two places, typed or picked: the routes and their checkpoints, without weather.

The browser then gets the forecasts for the checkpoints from Open-Meteo and sends them to trip_risk_service.
"""

from dataclasses import asdict
from datetime import datetime

from trips.clients.graphhopper_client import get_coordinates_from_text, get_routes
from trips.constants import MILE_DECIMALS, ROUTE_COUNT, ROUTE_LABELS
from trips.exceptions import PlaceNotFoundError
from trips.formatters import format_utc
from trips.logic.checkpoint_builder import build_checkpoints, build_route_progress
from trips.logic.corridor_builder import build_corridor_points
from trips.types import Checkpoint, LonLat, Place, Route

# Decimal places kept for checkpoint coordinates (about 1 meter); keeps the JSON small.
COORDINATE_DECIMALS = 5


def create_trip_plan(
    origin_text: str,
    origin_point: LonLat | None,
    destination_text: str,
    destination_point: LonLat | None,
    departure_utc: datetime,
    spacing_mi: int,
) -> dict:
    # Use the picked coordinates, or turn the typed place names into coordinates.
    origin = _get_place_or_raise(origin_text, origin_point, field="origin")
    destination = _get_place_or_raise(destination_text, destination_point, field="destination")

    # Ask GraphHopper for up to 3 driving routes between both points.
    routes = get_routes((origin.lon, origin.lat), (destination.lon, destination.lat))

    # Fastest first, so the labels go A, B, C from fastest to slowest.
    routes.sort(key=_get_driving_seconds)

    serialized_routes = []
    route_geometries = []
    for index, route in enumerate(routes):
        serialized_routes.append(_serialize_route(ROUTE_LABELS[index], route, departure_utc, spacing_mi))
        route_geometries.append(route.geometry)

    # The assessment asks for 3 options; say so when GraphHopper found fewer.
    notes = []
    if len(routes) < ROUTE_COUNT:
        notes.append(_build_route_count_note(len(routes)))

    corridor_grid = build_corridor_points(route_geometries)

    return {
        "origin": asdict(origin),
        "destination": asdict(destination),
        "departure_utc": format_utc(departure_utc),
        "notes": notes,
        # In A, B, C order (fastest first); the trip-risks answer adds each route's rank.
        "routes": serialized_routes,
        # Weather points around all routes for the heatmap.
        "corridor_points": corridor_grid.points,
        # Grid cell size of those points, so the frontend can size the heatmap circles to fill one cell.
        "corridor_cell_size_deg": corridor_grid.cell_size_deg,
    }


def _get_driving_seconds(route: Route) -> float:
    # The value routes are sorted by: GraphHopper's total driving time.
    return route.time_s


def _build_route_count_note(route_count: int) -> str:
    if route_count == 1:
        return "Only 1 route found between these places."

    return f"Only {route_count} routes found between these places."


def _serialize_route(label: str, route: Route, departure_utc: datetime, spacing_mi: int) -> dict:
    # Measure the route, then place checkpoints along it with their arrival times.
    progress = build_route_progress(route.geometry, route.time_intervals)
    checkpoints = build_checkpoints(route.geometry, progress, spacing_mi, departure_utc)

    # Distance is our own measured total, so it matches the last checkpoint.
    return {
        "id": label,
        "geometry": route.geometry,
        "distance_mi": round(progress.miles_at[-1], MILE_DECIMALS),
        "duration_s": round(progress.seconds_at[-1]),
        # The last checkpoint is the destination, so its ETA is the arrival time.
        "arrival_utc": format_utc(checkpoints[-1].eta_utc),
        "checkpoints": [_serialize_checkpoint(checkpoint) for checkpoint in checkpoints],
    }


def _get_place_or_raise(text: str, point: LonLat | None, field: str) -> Place:
    # A picked suggestion already has its coordinates, so there is nothing to look up.
    if point is not None:
        lon, lat = point
        return Place(label=text, lat=lat, lon=lon)

    place = get_coordinates_from_text(text)

    # Report which form field had the unknown place, so the frontend can show the error there.
    if place is None:
        raise PlaceNotFoundError(field, text)

    return place


def _serialize_checkpoint(checkpoint: Checkpoint) -> dict:
    return {
        "mile": round(checkpoint.mile, MILE_DECIMALS),
        "lat": round(checkpoint.lat, COORDINATE_DECIMALS),
        "lon": round(checkpoint.lon, COORDINATE_DECIMALS),
        "eta_utc": format_utc(checkpoint.eta_utc),
        "previous_point_index": checkpoint.previous_point_index,
    }
