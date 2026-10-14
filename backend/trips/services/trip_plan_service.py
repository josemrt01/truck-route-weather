"""Builds a trip plan from two place names."""

from dataclasses import asdict
from datetime import UTC, datetime

from trips.clients.graphhopper_client import get_coordinates_from_text, get_route
from trips.clients.open_meteo_client import get_hourly_forecasts
from trips.exceptions import PlaceNotFoundError
from trips.logic.checkpoint_builder import build_checkpoints, build_route_progress
from trips.logic.risk_calculator import calculate_risk
from trips.logic.weather_lookup import get_weather_at, round_to_nearest_hour
from trips.types import AssessedCheckpoint, Checkpoint, Place

# Decimal places kept for checkpoint coordinates (about 1 meter); keeps the JSON small.
COORDINATE_DECIMALS = 5

# Decimal places kept for miles in the response.
MILE_DECIMALS = 1


def create_trip_plan(
    origin_text: str, destination_text: str, departure_utc: datetime, spacing_mi: int, weight_lb: int
) -> dict:
    # Turn the typed place names into coordinates.
    origin = _get_place_or_raise(origin_text, field="origin")
    destination = _get_place_or_raise(destination_text, field="destination")

    # Ask GraphHopper for the driving route between both points.
    route = get_route((origin.lon, origin.lat), (destination.lon, destination.lat))

    # Measure the route, then place checkpoints along it with their arrival times.
    progress = build_route_progress(route.geometry, route.time_intervals)
    checkpoints = build_checkpoints(route.geometry, progress, spacing_mi, departure_utc)

    # Look up the weather at each checkpoint's arrival time and rate the risk for this truck.
    assessed_checkpoints = _assess_checkpoints(checkpoints, weight_lb)

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
            "checkpoints": [_serialize_checkpoint(assessed_checkpoint) for assessed_checkpoint in assessed_checkpoints],
        },
    }


def _get_place_or_raise(text: str, field: str) -> Place:
    place = get_coordinates_from_text(text)

    # Report which form field had the unknown place, so the frontend can show the error there.
    if place is None:
        raise PlaceNotFoundError(field, text)

    return place


def _assess_checkpoints(checkpoints: list[Checkpoint], weight_lb: int) -> list[AssessedCheckpoint]:
    # ETAs only grow along the route, so the first and last rounded ETAs bound every hour we need.
    first_hour_utc = round_to_nearest_hour(checkpoints[0].eta_utc)
    last_hour_utc = round_to_nearest_hour(checkpoints[-1].eta_utc)

    points = [(checkpoint.lon, checkpoint.lat) for checkpoint in checkpoints]
    forecasts = get_hourly_forecasts(points, first_hour_utc, last_hour_utc)

    assessed_checkpoints = []

    # Forecasts come back in the same order as the points, so forecasts[index] belongs to checkpoints[index].
    for index, checkpoint in enumerate(checkpoints):
        weather = get_weather_at(forecasts[index], checkpoint.eta_utc)

        assessed_checkpoints.append(
            AssessedCheckpoint(
                checkpoint=checkpoint,
                forecast_hour_utc=round_to_nearest_hour(checkpoint.eta_utc),
                weather=weather,
                risk=calculate_risk(weather, weight_lb),
            )
        )

    return assessed_checkpoints


def _serialize_checkpoint(assessed_checkpoint: AssessedCheckpoint) -> dict:
    checkpoint = assessed_checkpoint.checkpoint
    weather = assessed_checkpoint.weather

    return {
        "mile": round(checkpoint.mile, MILE_DECIMALS),
        "lat": round(checkpoint.lat, COORDINATE_DECIMALS),
        "lon": round(checkpoint.lon, COORDINATE_DECIMALS),
        "eta_utc": _format_utc(checkpoint.eta_utc),
        "previous_point_index": checkpoint.previous_point_index,
        "forecast_hour_utc": _format_utc(assessed_checkpoint.forecast_hour_utc),
        "wind_gust_mph": weather.wind_gust_mph,
        "wind_speed_mph": weather.wind_speed_mph,
        "rain_in_hr": weather.rain_in,
        "snow_in_hr": weather.snow_in,
        # Plain values for JSON: 0-4 and text like "wind_load_rule".
        "level": assessed_checkpoint.risk.level.value,
        "cause": assessed_checkpoint.risk.cause.value,
    }


def _format_utc(moment: datetime) -> str:
    # ISO 8601 to the second, with "Z" (the usual short form of UTC) instead of "+00:00".
    return moment.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
