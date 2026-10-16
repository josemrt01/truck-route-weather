"""Builds a trip plan from two places, typed or picked."""

from dataclasses import asdict
from datetime import datetime

from trips.clients.graphhopper_client import get_coordinates_from_text, get_routes
from trips.clients.open_meteo_client import get_hourly_forecasts
from trips.constants import MILE_DECIMALS, ROUTE_COUNT, ROUTE_LABELS
from trips.exceptions import PlaceNotFoundError
from trips.formatters import format_utc
from trips.logic.checkpoint_builder import build_checkpoints, build_route_progress
from trips.logic.corridor_builder import build_corridor_points
from trips.logic.risk_calculator import calculate_risk
from trips.logic.risk_summary_builder import build_risk_summary
from trips.logic.route_recommender import recommend_route
from trips.logic.weather_lookup import get_weather_at, round_to_nearest_hour
from trips.types import AssessedCheckpoint, Checkpoint, LonLat, Place, PlannedRoute, RiskLevel, Route

# Decimal places kept for checkpoint coordinates (about 1 meter); keeps the JSON small.
COORDINATE_DECIMALS = 5


def create_trip_plan(
    origin_text: str,
    origin_point: LonLat | None,
    destination_text: str,
    destination_point: LonLat | None,
    departure_utc: datetime,
    spacing_mi: int,
    weight_lb: int,
) -> dict:
    # Use the picked coordinates, or turn the typed place names into coordinates.
    origin = _get_place_or_raise(origin_text, origin_point, field="origin")
    destination = _get_place_or_raise(destination_text, destination_point, field="destination")

    # Ask GraphHopper for up to 3 driving routes between both points.
    routes = get_routes((origin.lon, origin.lat), (destination.lon, destination.lat))

    # Fastest first, so the labels go A, B, C from fastest to slowest.
    routes.sort(key=_get_driving_seconds)

    planned_routes = []
    for index, route in enumerate(routes):
        planned_routes.append(_plan_route(ROUTE_LABELS[index], route, departure_utc, spacing_mi, weight_lb))

    # The assessment asks for 3 options; say so when GraphHopper found fewer.
    notes = []
    if len(planned_routes) < ROUTE_COUNT:
        notes.append(_build_route_count_note(len(planned_routes)))

    recommendation = recommend_route(planned_routes)
    corridor_grid = build_corridor_points(_get_route_geometries(planned_routes))

    # Position of each route in the ranking, 1 = recommended; e.g. {"B": 1, "A": 2, "C": 3}.
    rank_by_label = {}
    for index, planned_route in enumerate(recommendation.ranked_routes):
        rank_by_label[planned_route.label] = index + 1

    # Routes stay in A, B, C order (fastest first); the rank says which one to take.
    serialized_routes = []
    for planned_route in planned_routes:
        serialized_routes.append(_serialize_route(planned_route, rank_by_label[planned_route.label]))

    return {
        "origin": asdict(origin),
        "destination": asdict(destination),
        "departure_utc": format_utc(departure_utc),
        "recommended_route_id": recommendation.ranked_routes[0].label,
        "reason": recommendation.reason,
        "warning": recommendation.warning,
        "notes": notes,
        "routes": serialized_routes,
        # Weather points around all routes for the heatmap; the frontend sends them back to /api/heatmap.
        "corridor_points": corridor_grid.points,
        # Grid cell size of those points, so the frontend can size the heatmap circles to fill one cell.
        "corridor_cell_size_deg": corridor_grid.cell_size_deg,
    }


def _get_route_geometries(planned_routes: list[PlannedRoute]) -> list[list[LonLat]]:
    route_geometries = []
    for planned_route in planned_routes:
        route_geometries.append(planned_route.route.geometry)

    return route_geometries


def _get_driving_seconds(route: Route) -> float:
    # The value routes are sorted by: GraphHopper's total driving time.
    return route.time_s


def _plan_route(label: str, route: Route, departure_utc: datetime, spacing_mi: int, weight_lb: int) -> PlannedRoute:
    # Measure the route, then place checkpoints along it with their arrival times.
    progress = build_route_progress(route.geometry, route.time_intervals)
    checkpoints = build_checkpoints(route.geometry, progress, spacing_mi, departure_utc)

    # Look up the weather at each checkpoint's arrival time (one Open-Meteo call per route) and rate the risk.
    assessed_checkpoints = _assess_checkpoints(checkpoints, weight_lb)

    return PlannedRoute(
        label=label,
        route=route,
        progress=progress,
        assessed_checkpoints=assessed_checkpoints,
        risk_summary=build_risk_summary(assessed_checkpoints),
    )


def _build_route_count_note(route_count: int) -> str:
    if route_count == 1:
        return "Only 1 route found between these places."

    return f"Only {route_count} routes found between these places."


def _serialize_route(planned_route: PlannedRoute, rank: int) -> dict:
    progress = planned_route.progress
    risk_summary = planned_route.risk_summary
    assessed_checkpoints = planned_route.assessed_checkpoints

    # Distance is our own measured total, so it matches the last checkpoint.
    return {
        "id": planned_route.label,
        "rank": rank,
        "geometry": planned_route.route.geometry,
        "distance_mi": round(progress.miles_at[-1], MILE_DECIMALS),
        "duration_s": round(progress.seconds_at[-1]),
        # The last checkpoint is the destination, so its ETA is the arrival time.
        "arrival_utc": format_utc(assessed_checkpoints[-1].checkpoint.eta_utc),
        "miles_by_level": _serialize_miles_by_level(risk_summary.miles_by_level),
        "avg_risk": risk_summary.avg_risk,
        "worst_level": risk_summary.worst_level.value,
        "checkpoints": [_serialize_checkpoint(assessed_checkpoint) for assessed_checkpoint in assessed_checkpoints],
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
        "eta_utc": format_utc(checkpoint.eta_utc),
        "previous_point_index": checkpoint.previous_point_index,
        "forecast_hour_utc": format_utc(assessed_checkpoint.forecast_hour_utc),
        "wind_gust_mph": weather.wind_gust_mph,
        "wind_speed_mph": weather.wind_speed_mph,
        "rain_in_hr": weather.rain_in,
        "snow_in_hr": weather.snow_in,
        # Plain values for JSON: 0-4 and text like "wind_load_rule".
        "level": assessed_checkpoint.risk.level.value,
        "cause": assessed_checkpoint.risk.cause.value,
    }


def _serialize_miles_by_level(miles_by_level: dict[RiskLevel, float]) -> dict[str, float]:
    # Level names as JSON keys: RiskLevel.NO_TRAVEL -> "no_travel".
    return {level.name.lower(): miles for level, miles in miles_by_level.items()}
