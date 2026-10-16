from trips.logic.risk_summary_builder import build_risk_summary
from trips.tests.test_data import DEPARTURE_UTC
from trips.types import (
    AssessedCheckpoint,
    RiskAssessment,
    RiskCause,
    RiskLevel,
    RouteRiskSummary,
    WeatherHour,
)

# Weather and cause don't affect the summary, only mile and level do; used to fill every test checkpoint.
CALM_WEATHER = WeatherHour(wind_gust_mph=0.0, wind_speed_mph=0.0, rain_in=0.0, snow_in=0.0)

LOW = RiskLevel.LOW
MODERATE = RiskLevel.MODERATE
HIGH = RiskLevel.HIGH
SEVERE = RiskLevel.SEVERE
NO_TRAVEL = RiskLevel.NO_TRAVEL


def build_assessed_checkpoints(miles_and_levels: list[tuple[float, RiskLevel]]) -> list[AssessedCheckpoint]:
    """Checkpoints with only the mile and level filled in meaningfully."""
    return [
        AssessedCheckpoint(
            mile=mile,
            forecast_hour_utc=DEPARTURE_UTC,
            weather=CALM_WEATHER,
            risk=RiskAssessment(level=level, cause=RiskCause.NONE),
        )
        for mile, level in miles_and_levels
    ]


def build_miles_by_level(low=0.0, moderate=0.0, high=0.0, severe=0.0, no_travel=0.0) -> dict[RiskLevel, float]:
    return {LOW: low, MODERATE: moderate, HIGH: high, SEVERE: severe, NO_TRAVEL: no_travel}


def test_adds_up_miles_per_level_and_weighted_average():
    checkpoints = build_assessed_checkpoints([(0, LOW), (25, LOW), (50, HIGH), (75, HIGH)])

    # Segments: 0-25 Low, 25-50 High (worse end), 50-75 High. Average (0 x 25 + 2 x 50) / 75 = 1.33.
    assert build_risk_summary(checkpoints) == RouteRiskSummary(
        miles_by_level=build_miles_by_level(low=25.0, high=50.0),
        avg_risk=1.33,
        worst_level=HIGH,
    )


def test_one_bad_checkpoint_marks_both_of_its_segments():
    checkpoints = build_assessed_checkpoints([(0, LOW), (25, NO_TRAVEL), (50, LOW)])

    summary = build_risk_summary(checkpoints)

    assert summary.miles_by_level == build_miles_by_level(no_travel=50.0)
    assert summary.worst_level == NO_TRAVEL


def test_short_last_segment_counts_its_real_miles():
    # The destination is only 12.4 miles after the last regular checkpoint.
    checkpoints = build_assessed_checkpoints([(0, MODERATE), (25, MODERATE), (37.4, SEVERE)])

    summary = build_risk_summary(checkpoints)

    # Average (1 x 25 + 3 x 12.4) / 37.4 = 1.663..., rounded to 1.66.
    assert summary.miles_by_level == build_miles_by_level(moderate=25.0, severe=12.4)
    assert summary.avg_risk == 1.66


def test_calm_route_has_all_levels_and_zero_average():
    checkpoints = build_assessed_checkpoints([(0, LOW), (25, LOW), (50, LOW)])

    assert build_risk_summary(checkpoints) == RouteRiskSummary(
        miles_by_level=build_miles_by_level(low=50.0),
        avg_risk=0.0,
        worst_level=LOW,
    )


def test_zero_length_trip_has_zero_average():
    # Same origin and destination: no miles, so no division by zero.
    checkpoints = build_assessed_checkpoints([(0, LOW), (0, LOW)])

    assert build_risk_summary(checkpoints).avg_risk == 0.0
