"""Ranks the planned routes and explains which one to take (spec section 5.7).

Order of what counts, most important first: No Travel miles, Severe miles, High miles, average risk,
duration. The assessment's list starts at Severe miles; No Travel goes in front because it is worse.
"""

from trips.types import PlannedRoute, Recommendation, RiskLevel


def recommend_route(planned_routes: list[PlannedRoute]) -> Recommendation:
    """Return the routes ranked best first, the reason the first one wins, and a warning if needed."""
    # Copy first, so the caller's list keeps its A, B, C order.
    ranked_routes = list(planned_routes)
    ranked_routes.sort(key=_get_ranking_values)

    return Recommendation(
        ranked_routes=ranked_routes,
        reason=_build_reason(ranked_routes),
        warning=_build_warning(ranked_routes),
    )


def _get_ranking_values(planned_route: PlannedRoute) -> list[float]:
    # Python compares these lists item by item and the first item that differs decides, like
    # Comparator.comparing(noTravel).thenComparing(severe)... in Java. Lower is better for every item.
    miles = planned_route.risk_summary.miles_by_level
    return [
        miles[RiskLevel.NO_TRAVEL],
        miles[RiskLevel.SEVERE],
        miles[RiskLevel.HIGH],
        planned_route.risk_summary.avg_risk,
        _get_duration_seconds(planned_route),
    ]


def _get_duration_seconds(planned_route: PlannedRoute) -> int:
    # Whole seconds, the same value the response shows as duration_s.
    return round(planned_route.progress.seconds_at[-1])


def _build_reason(ranked_routes: list[PlannedRoute]) -> str:
    best = ranked_routes[0]
    if len(ranked_routes) == 1:
        return f"Route {best.label} is the only route found."

    # Compare with the runner-up and name the first thing that separated them, in ranking order.
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
            f"Route {best.label} has a lower average risk "
            f"({best.risk_summary.avg_risk} vs {runner_up.risk_summary.avg_risk} on Route {runner_up.label})."
        )

    # Same risk on every count, so the shorter duration decided.
    return f"Routes {best.label} and {runner_up.label} have equal risk; Route {best.label} is faster."


def _build_miles_reason(best: PlannedRoute, runner_up: PlannedRoute, level: RiskLevel, level_name: str) -> str:
    # e.g. "Route B has 0.0 Severe miles vs 40.0 on Route A."
    best_miles = best.risk_summary.miles_by_level[level]
    runner_up_miles = runner_up.risk_summary.miles_by_level[level]

    return f"Route {best.label} has {best_miles} {level_name} miles vs {runner_up_miles} on Route {runner_up.label}."


def _build_warning(ranked_routes: list[PlannedRoute]) -> str | None:
    # Routes are ranked by No Travel miles first, so if even the best route has some, every route does.
    if ranked_routes[0].risk_summary.miles_by_level[RiskLevel.NO_TRAVEL] > 0:
        return "Every route crosses No Travel conditions. Consider delaying departure."

    return None
