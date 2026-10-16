"""Ranks the planned routes and explains which one to take (spec section 5.7).

Order of what counts, most important first: No Travel miles, Severe miles, High miles, average risk,
duration. The assessment's list starts at Severe miles; No Travel goes in front because it is worse.
"""

from trips.types import AssessedRoute, Recommendation, RiskLevel


def recommend_route(assessed_routes: list[AssessedRoute]) -> Recommendation:
    """Return the routes ranked best first, the reason the first one wins, and a warning if needed."""
    # Copy first, so the caller's list keeps its A, B, C order.
    ranked_routes = list(assessed_routes)
    ranked_routes.sort(key=_get_ranking_values)

    return Recommendation(
        ranked_routes=ranked_routes,
        reason=_build_reason(ranked_routes),
        warning=_build_warning(ranked_routes),
    )


def _get_ranking_values(assessed_route: AssessedRoute) -> list[float]:
    # Python compares these lists item by item and the first item that differs decides, like
    # Comparator.comparing(noTravel).thenComparing(severe)... in Java. Lower is better for every item.
    miles = assessed_route.risk_summary.miles_by_level
    return [
        miles[RiskLevel.NO_TRAVEL],
        miles[RiskLevel.SEVERE],
        miles[RiskLevel.HIGH],
        assessed_route.risk_summary.avg_risk,
        assessed_route.duration_s,
    ]


def _build_reason(ranked_routes: list[AssessedRoute]) -> str:
    best = ranked_routes[0]
    if len(ranked_routes) == 1:
        return "The only route found."

    # Compare with the runner-up and name the first thing that separated them, in ranking order.
    # The reason shows on the recommended route's card, so it doesn't need to name that route.
    runner_up = ranked_routes[1]
    best_miles = best.risk_summary.miles_by_level
    runner_up_miles = runner_up.risk_summary.miles_by_level

    if best_miles[RiskLevel.NO_TRAVEL] != runner_up_miles[RiskLevel.NO_TRAVEL]:
        return _build_miles_reason(best, runner_up, RiskLevel.NO_TRAVEL, "No Travel")
    if best_miles[RiskLevel.SEVERE] != runner_up_miles[RiskLevel.SEVERE]:
        return _build_miles_reason(best, runner_up, RiskLevel.SEVERE, "Severe")
    if best_miles[RiskLevel.HIGH] != runner_up_miles[RiskLevel.HIGH]:
        return _build_miles_reason(best, runner_up, RiskLevel.HIGH, "High")
    if best.risk_summary.avg_risk != runner_up.risk_summary.avg_risk:
        return (
            f"Lowest average risk: {best.risk_summary.avg_risk} vs {runner_up.risk_summary.avg_risk} "
            "on the next best route."
        )

    # Same risk on every count, so the shorter duration decided.
    return "Same risk as the next best route, and faster."


def _build_miles_reason(best: AssessedRoute, runner_up: AssessedRoute, level: RiskLevel, level_name: str) -> str:
    # e.g. "Fewest Severe miles: 0.0 vs 40.0 on the next best route."
    best_miles = best.risk_summary.miles_by_level[level]
    runner_up_miles = runner_up.risk_summary.miles_by_level[level]

    return f"Fewest {level_name} miles: {best_miles} vs {runner_up_miles} on the next best route."


def _build_warning(ranked_routes: list[AssessedRoute]) -> str | None:
    # Routes are ranked by No Travel miles first, so if even the best route has some, every route does.
    if ranked_routes[0].risk_summary.miles_by_level[RiskLevel.NO_TRAVEL] > 0:
        return "Every route crosses No Travel conditions. Consider delaying departure."

    return None
