"""Builds a trip plan from two place names."""

from dataclasses import asdict
from datetime import UTC, datetime

from trips.clients.graphhopper_client import get_coordinates_from_text, get_route
from trips.exceptions import PlaceNotFoundError
from trips.logic.checkpoint_builder import build_checkpoints, build_route_progress
from trips.types import Checkpoint, Place

# Decimal places kept for checkpoint coordinates (about 1 meter); keeps the JSON small.
COORDINATE_DECIMALS = 5

# Decimal places kept for miles in the response.
MILE_DECIMALS = 1


def create_trip_plan(origin_text: str, destination_text: str, departure_utc: datetime, spacing_mi: int) -> dict:
    # Turn the typed place names into coordinates.
    origin = _get_place_or_raise(origin_text, field="origin")
    destination = _get_place_or_raise(destination_text, field="destination")

    # Ask GraphHopper for the driving route between both points.
    route = get_route((origin.lon, origin.lat), (destination.lon, destination.lat))

    # Measure the route, then place checkpoints along it with their arrival times.
    progress = build_route_progress(route.geometry, route.time_intervals)
    checkpoints = build_checkpoints(route.geometry, progress, spacing_mi, departure_utc)

    # Shape the JSON the frontend receives; distance is our own measured total, so it matches the last checkpoint.
    return {
        "origin": asdict(origin),
        "destination": asdict(destination),
        "departure_utc": _format_utc(departure_utc),
        "route": {
            "geometry": route.geometry,
            "distance_mi": round(progress.miles_at[-1], MILE_DECIMALS),
            "duration_s": round(progress.seconds_at[-1]),
            # The last checkpoint is the destination, so its ETA is the arrival time.
            "arrival_utc": _format_utc(checkpoints[-1].eta_utc),
            "checkpoints": [_serialize_checkpoint(checkpoint) for checkpoint in checkpoints],
        },
    }


def _get_place_or_raise(text: str, field: str) -> Place:
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
        "eta_utc": _format_utc(checkpoint.eta_utc),
        "previous_point_index": checkpoint.previous_point_index,
    }


def _format_utc(moment: datetime) -> str:
    # ISO 8601 to the second, with "Z" (the usual short form of UTC) instead of "+00:00".
    return moment.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
