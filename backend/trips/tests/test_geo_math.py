import math

import pytest

from trips.constants import EARTH_RADIUS_MI
from trips.logic.geo_math import calculate_haversine_miles
from trips.tests.test_data import DALLAS_POINT, HOUSTON_POINT

# One degree of arc on a great circle, in miles; the expected value for the 1-degree tests below.
ONE_DEGREE_MI = 2 * math.pi * EARTH_RADIUS_MI / 360


def test_same_point_is_zero_miles():
    assert calculate_haversine_miles(DALLAS_POINT, DALLAS_POINT) == 0


def test_one_degree_of_latitude_is_one_degree_of_arc():
    assert calculate_haversine_miles((-96.0, 30.0), (-96.0, 31.0)) == pytest.approx(ONE_DEGREE_MI)


def test_one_degree_of_longitude_at_the_equator_is_one_degree_of_arc():
    assert calculate_haversine_miles((0.0, 0.0), (1.0, 0.0)) == pytest.approx(ONE_DEGREE_MI)


def test_one_degree_of_longitude_shrinks_away_from_the_equator():
    # Lines of longitude get closer together toward the poles: at 60° north they are half as far apart.
    assert calculate_haversine_miles((0.0, 60.0), (1.0, 60.0)) == pytest.approx(ONE_DEGREE_MI / 2, rel=1e-3)


def test_dallas_to_houston_matches_known_straight_line_distance():
    # Published straight-line distance is about 225 miles.
    assert calculate_haversine_miles(DALLAS_POINT, HOUSTON_POINT) == pytest.approx(225, abs=2)


def test_distance_is_the_same_in_both_directions():
    assert calculate_haversine_miles(DALLAS_POINT, HOUSTON_POINT) == calculate_haversine_miles(
        HOUSTON_POINT, DALLAS_POINT
    )
