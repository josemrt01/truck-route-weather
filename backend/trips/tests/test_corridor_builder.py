from trips.constants import MAX_CORRIDOR_POINTS
from trips.logic.corridor_builder import build_corridor_points
from trips.tests.test_data import DALLAS_POINT


def test_one_route_point_gives_a_five_by_five_square():
    corridor_grid = build_corridor_points([[(0.1, 0.1)]])
    corridor_points = corridor_grid.points

    assert corridor_grid.cell_size_deg == 0.25

    # The point's own cell runs from 0 to 0.25, so its center is 0.125; two cells further is the corner.
    assert len(corridor_points) == 25
    assert (0.125, 0.125) in corridor_points
    assert (-0.375, -0.375) in corridor_points
    assert (0.625, 0.625) in corridor_points


def test_route_points_in_the_same_cell_count_once():
    assert len(build_corridor_points([[(0.1, 0.1), (0.2, 0.2)]]).points) == 25


def test_overlapping_routes_give_no_duplicate_points():
    corridor_points = build_corridor_points([[(0.1, 0.1)], [(0.1, 0.1), (0.3, 0.1)]]).points

    assert len(corridor_points) == len(set(corridor_points))
    # Two neighboring route cells: a 6 x 5 block.
    assert len(corridor_points) == 30


def test_negative_coordinates_round_down_to_the_cell_on_the_left():
    corridor_points = build_corridor_points([[DALLAS_POINT]]).points

    # Dallas (-96.797, 32.7767) lies in the cell from -97.0 to -96.75, centered at -96.875.
    assert (-96.875, 32.875) in corridor_points


def test_long_route_switches_to_bigger_cells_to_stay_under_the_cap():
    # A straight 15-degree route: 325 points with 0.25-degree cells, too many, so 0.5-degree cells are used.
    long_route = [(index * 0.1, 0.0) for index in range(151)]

    corridor_grid = build_corridor_points([long_route])
    corridor_points = corridor_grid.points

    assert corridor_grid.cell_size_deg == 0.5
    assert len(corridor_points) <= MAX_CORRIDOR_POINTS
    # Centers of 0.5-degree cells end in .25 or .75.
    for lon, lat in corridor_points:
        assert lon % 0.5 == 0.25
        assert lat % 0.5 == 0.25


def test_same_routes_give_the_same_list():
    route = [(0.1, 0.1), (0.6, 0.4)]

    assert build_corridor_points([route]) == build_corridor_points([route])
