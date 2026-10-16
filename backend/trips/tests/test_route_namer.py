from trips.logic.route_namer import name_routes
from trips.types import RoadInterval, Route, TimeInterval

# Four points along the equator, one degree (about 69 miles) apart; tests mark parts of it with road numbers.
EQUATOR_LINE = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0), (3.0, 0.0)]


def build_route(road_intervals: list[RoadInterval]) -> Route:
    """A route along EQUATOR_LINE; only its road numbers change between tests."""
    return Route(
        geometry=EQUATOR_LINE,
        distance_m=333_000,
        time_s=10_800,
        time_intervals=[TimeInterval(start_index=0, end_index=3, seconds=10_800)],
        road_intervals=road_intervals,
    )


def test_names_a_route_after_its_longest_road():
    route = build_route(
        [
            RoadInterval(start_index=0, end_index=1, road_refs=["US 287"]),
            RoadInterval(start_index=1, end_index=3, road_refs=["I 45"]),
        ]
    )

    assert name_routes([route]) == ["via I-45"]


def test_adds_up_every_stretch_of_the_same_road():
    route = build_route(
        [
            RoadInterval(start_index=0, end_index=1, road_refs=["I 45"]),
            RoadInterval(start_index=1, end_index=2, road_refs=["US 287"]),
            RoadInterval(start_index=2, end_index=3, road_refs=["I 45"]),
        ]
    )

    assert name_routes([route]) == ["via I-45"]


def test_a_shared_stretch_counts_for_each_road_on_it():
    # GraphHopper lists both numbers where two highways run together, e.g. "I 45, US 287".
    route = build_route(
        [
            RoadInterval(start_index=0, end_index=2, road_refs=["I 45", "US 287"]),
            RoadInterval(start_index=2, end_index=3, road_refs=["US 287"]),
        ]
    )

    assert name_routes([route]) == ["via US-287"]


def test_a_later_route_skips_a_road_an_earlier_route_is_named_after():
    fastest_route = build_route([RoadInterval(start_index=0, end_index=3, road_refs=["I 45"])])
    slower_route = build_route(
        [
            RoadInterval(start_index=0, end_index=2, road_refs=["I 45"]),
            RoadInterval(start_index=2, end_index=3, road_refs=["US 175"]),
        ]
    )

    assert name_routes([fastest_route, slower_route]) == ["via I-45", "via US-175"]


def test_falls_back_to_a_number_when_no_road_is_left():
    fastest_route = build_route([RoadInterval(start_index=0, end_index=3, road_refs=["I 45"])])
    same_road_route = build_route([RoadInterval(start_index=0, end_index=3, road_refs=["I 45"])])
    unnamed_route = build_route([])

    assert name_routes([fastest_route, same_road_route, unnamed_route]) == ["via I-45", "Route 2", "Route 3"]


def test_keeps_longer_road_numbers_as_graphhopper_writes_them():
    route = build_route([RoadInterval(start_index=0, end_index=3, road_refs=["US Highway 175 West"])])

    assert name_routes([route]) == ["via US Highway 175 West"]
