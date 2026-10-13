"""Builds a trip plan from two place names."""

from dataclasses import asdict

from trips.clients.graphhopper_client import get_coordinates_from_text, get_route
from trips.constants import METERS_PER_MILE
from trips.exceptions import PlaceNotFoundError
from trips.types import Place


def create_trip_plan(origin_text: str, destination_text: str) -> dict:
    # Turn the typed place names into coordinates.
    origin = _get_place_or_raise(origin_text, field="origin")
    destination = _get_place_or_raise(destination_text, field="destination")

    # Ask GraphHopper for the driving route between both points.
    route = get_route((origin.lon, origin.lat), (destination.lon, destination.lat))

    # Shape the JSON the frontend receives; distance in miles, duration in whole seconds.
    return {
        "origin": asdict(origin),
        "destination": asdict(destination),
        "route": {
            "geometry": route.geometry,
            "distance_mi": round(route.distance_m / METERS_PER_MILE, 1),
            "duration_s": round(route.time_s),
        },
    }


def _get_place_or_raise(text: str, field: str) -> Place:
    place = get_coordinates_from_text(text)

    # Report which form field had the unknown place, so the frontend can show the error there.
    if place is None:
        raise PlaceNotFoundError(field, text)

    return place
