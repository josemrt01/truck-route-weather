"""Adds up a route's risk from its checkpoints (spec section 5.6)."""

from trips.constants import MILE_DECIMALS
from trips.types import AssessedCheckpoint, RiskLevel, RouteRiskSummary

# Decimal places kept for the average risk; used by build_risk_summary.
AVG_RISK_DECIMALS = 2


def build_risk_summary(assessed_checkpoints: list[AssessedCheckpoint]) -> RouteRiskSummary:
    """Return the miles at each risk level, the mileage-weighted average level and the worst level."""
    # Start every level at 0 miles, so the frontend always gets all five.
    miles_by_level = {level: 0.0 for level in RiskLevel}
    # Sum of (segment level x segment miles); divided by the total miles at the end for the average.
    weighted_level_total = 0.0
    worst_level = RiskLevel.LOW

    # A segment is the road between checkpoint [index - 1] and checkpoint [index].
    for index in range(1, len(assessed_checkpoints)):
        start = assessed_checkpoints[index - 1]
        end = assessed_checkpoints[index]

        # Conservative: the segment is as risky as its worse end.
        segment_level = max(start.risk.level, end.risk.level)
        segment_miles = end.checkpoint.mile - start.checkpoint.mile

        miles_by_level[segment_level] += segment_miles
        weighted_level_total += segment_level * segment_miles
        worst_level = max(worst_level, segment_level)

    total_miles = sum(miles_by_level.values())

    # A zero-length trip (same origin and destination) has no miles to average over.
    avg_risk = weighted_level_total / total_miles if total_miles > 0 else 0.0

    # Rounded here, not when building JSON, because route ranking compares these rounded values (spec 5.7).
    return RouteRiskSummary(
        miles_by_level={level: round(miles, MILE_DECIMALS) for level, miles in miles_by_level.items()},
        avg_risk=round(avg_risk, AVG_RISK_DECIMALS),
        worst_level=worst_level,
    )
