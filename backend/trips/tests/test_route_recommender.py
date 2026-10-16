from trips.logic.route_recommender import recommend_route
from trips.types import PlannedRoute, RiskLevel, Route, RouteProgress, RouteRiskSummary

# Driving times in seconds; Route A is always the faster one in these tests.
ROUTE_A_SECONDS = 10_000
ROUTE_B_SECONDS = 12_000


def build_planned_route(
    label: str,
    seconds: float,
    no_travel: float = 0.0,
    severe: float = 0.0,
    high: float = 0.0,
    avg_risk: float = 0.0,
) -> PlannedRoute:
    """A planned route with only what the recommender reads: label, risk totals and duration."""
    miles_by_level = {
        RiskLevel.LOW: 0.0,
        RiskLevel.MODERATE: 0.0,
        RiskLevel.HIGH: high,
        RiskLevel.SEVERE: severe,
        RiskLevel.NO_TRAVEL: no_travel,
    }
    return PlannedRoute(
        label=label,
        name=f"Route {label}",
        route=Route(geometry=[], distance_m=0.0, time_s=seconds, time_intervals=[]),
        progress=RouteProgress(miles_at=[0.0], seconds_at=[0.0, seconds]),
        assessed_checkpoints=[],
        risk_summary=RouteRiskSummary(miles_by_level=miles_by_level, avg_risk=avg_risk, worst_level=RiskLevel.LOW),
    )


def get_ranked_labels(planned_routes: list[PlannedRoute]) -> list[str]:
    return [planned_route.label for planned_route in recommend_route(planned_routes).ranked_routes]


def test_no_travel_miles_decide_first():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, no_travel=10.0)
    route_b = build_planned_route("B", ROUTE_B_SECONDS)

    recommendation = recommend_route([route_a, route_b])

    assert recommendation.ranked_routes[0].label == "B"
    assert recommendation.reason == "Fewest No Travel miles: 0.0 vs 10.0 on the next best route."


def test_severe_miles_beat_high_miles():
    # The assessment's order: fewest Severe miles first, even if the route has many more High miles.
    route_a = build_planned_route("A", ROUTE_A_SECONDS, severe=10.0)
    route_b = build_planned_route("B", ROUTE_B_SECONDS, high=100.0)

    recommendation = recommend_route([route_a, route_b])

    assert recommendation.ranked_routes[0].label == "B"
    assert recommendation.reason == "Fewest Severe miles: 0.0 vs 10.0 on the next best route."


def test_high_miles_decide_when_severe_miles_are_equal():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, severe=5.0, high=30.0)
    route_b = build_planned_route("B", ROUTE_B_SECONDS, severe=5.0, high=5.0)

    recommendation = recommend_route([route_a, route_b])

    assert recommendation.ranked_routes[0].label == "B"
    assert recommendation.reason == "Fewest High miles: 5.0 vs 30.0 on the next best route."


def test_average_risk_decides_when_miles_are_equal():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, avg_risk=1.2)
    route_b = build_planned_route("B", ROUTE_B_SECONDS, avg_risk=0.8)

    recommendation = recommend_route([route_a, route_b])

    assert recommendation.ranked_routes[0].label == "B"
    assert recommendation.reason == "Lowest average risk: 0.8 vs 1.2 on the next best route."


def test_faster_route_wins_when_risk_is_equal():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, high=20.0, avg_risk=0.5)
    route_b = build_planned_route("B", ROUTE_B_SECONDS, high=20.0, avg_risk=0.5)

    recommendation = recommend_route([route_b, route_a])

    assert recommendation.ranked_routes[0].label == "A"
    assert recommendation.reason == "Same risk as the next best route, and faster."


def test_ranks_all_three_routes():
    route_a = build_planned_route("A", 10_000, severe=40.0)
    route_b = build_planned_route("B", 11_000, high=10.0)
    route_c = build_planned_route("C", 12_000)

    assert get_ranked_labels([route_a, route_b, route_c]) == ["C", "B", "A"]


def test_single_route_is_recommended():
    recommendation = recommend_route([build_planned_route("A", ROUTE_A_SECONDS, severe=40.0)])

    assert recommendation.ranked_routes[0].label == "A"
    assert recommendation.reason == "The only route found."


def test_warns_when_every_route_crosses_no_travel():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, no_travel=10.0)
    route_b = build_planned_route("B", ROUTE_B_SECONDS, no_travel=5.0)

    recommendation = recommend_route([route_a, route_b])

    assert recommendation.warning == "Every route crosses No Travel conditions. Consider delaying departure."


def test_no_warning_when_one_route_avoids_no_travel():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, no_travel=10.0)
    route_b = build_planned_route("B", ROUTE_B_SECONDS)

    assert recommend_route([route_a, route_b]).warning is None


def test_keeps_the_callers_route_order():
    route_a = build_planned_route("A", ROUTE_A_SECONDS, severe=40.0)
    route_b = build_planned_route("B", ROUTE_B_SECONDS)
    planned_routes = [route_a, route_b]

    recommend_route(planned_routes)

    assert [planned_route.label for planned_route in planned_routes] == ["A", "B"]
