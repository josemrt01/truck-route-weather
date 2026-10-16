"""Rates the risk along each planned route from the forecasts the browser sends, then ranks the routes."""

from trips.formatters import format_utc
from trips.logic.hourly_forecast_builder import build_hourly_forecast
from trips.logic.risk_calculator import calculate_risk
from trips.logic.risk_summary_builder import build_risk_summary
from trips.logic.route_recommender import recommend_route
from trips.logic.weather_lookup import get_weather_at, round_to_nearest_hour
from trips.types import AssessedCheckpoint, AssessedRoute, RiskLevel


def create_trip_risks(routes: list[dict], weight_lb: int) -> dict:
    # Each route as validated by TripRisksRequestSerializer: id, duration_s and checkpoints with their forecast.
    assessed_routes = []
    for route in routes:
        assessed_checkpoints = _assess_checkpoints(route["checkpoints"], weight_lb)
        assessed_routes.append(
            AssessedRoute(
                label=route["id"],
                duration_s=route["duration_s"],
                assessed_checkpoints=assessed_checkpoints,
                risk_summary=build_risk_summary(assessed_checkpoints),
            )
        )

    recommendation = recommend_route(assessed_routes)

    # Position of each route in the ranking, 1 = recommended; e.g. {"B": 1, "A": 2, "C": 3}.
    rank_by_label = {}
    for index, assessed_route in enumerate(recommendation.ranked_routes):
        rank_by_label[assessed_route.label] = index + 1

    # Routes stay in the order they were sent (A, B, C); the rank says which one to take.
    serialized_routes = []
    for assessed_route in assessed_routes:
        serialized_routes.append(_serialize_route(assessed_route, rank_by_label[assessed_route.label]))

    return {
        "recommended_route_id": recommendation.ranked_routes[0].label,
        "reason": recommendation.reason,
        "warning": recommendation.warning,
        "routes": serialized_routes,
    }


def _assess_checkpoints(checkpoints: list[dict], weight_lb: int) -> list[AssessedCheckpoint]:
    assessed_checkpoints = []

    for checkpoint in checkpoints:
        forecast = build_hourly_forecast(checkpoint["forecast"])
        weather = get_weather_at(forecast, checkpoint["eta_utc"])

        assessed_checkpoints.append(
            AssessedCheckpoint(
                mile=checkpoint["mile"],
                forecast_hour_utc=round_to_nearest_hour(checkpoint["eta_utc"]),
                weather=weather,
                risk=calculate_risk(weather, weight_lb),
            )
        )

    return assessed_checkpoints


def _serialize_route(assessed_route: AssessedRoute, rank: int) -> dict:
    risk_summary = assessed_route.risk_summary

    return {
        "id": assessed_route.label,
        "rank": rank,
        "miles_by_level": _serialize_miles_by_level(risk_summary.miles_by_level),
        "avg_risk": risk_summary.avg_risk,
        "worst_level": risk_summary.worst_level.value,
        # Same order as the checkpoints that were sent.
        "checkpoints": [_serialize_checkpoint(checkpoint) for checkpoint in assessed_route.assessed_checkpoints],
    }


def _serialize_checkpoint(assessed_checkpoint: AssessedCheckpoint) -> dict:
    weather = assessed_checkpoint.weather

    return {
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
