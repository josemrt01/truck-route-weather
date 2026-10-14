"""Geometry helpers for points on the Earth's surface; points are (lon, lat) in degrees."""

import math

from trips.constants import EARTH_RADIUS_MI
from trips.types import LonLat


def calculate_haversine_miles(point_a: LonLat, point_b: LonLat) -> float:
    """Return the straight-line distance over the Earth's surface between two points."""
    lon_a, lat_a = point_a
    lon_b, lat_b = point_b

    # The trigonometry functions work in radians, not degrees.
    lat_a_rad = math.radians(lat_a)
    lat_b_rad = math.radians(lat_b)
    lat_delta_rad = math.radians(lat_b - lat_a)
    lon_delta_rad = math.radians(lon_b - lon_a)

    # Haversine formula: square of half the straight chord through the Earth between the points
    # (0 = same point, 1 = opposite sides of the globe).
    half_chord_squared = (
        math.sin(lat_delta_rad / 2) ** 2
        + math.cos(lat_a_rad) * math.cos(lat_b_rad) * math.sin(lon_delta_rad / 2) ** 2
    )
    central_angle_rad = 2 * math.asin(math.sqrt(half_chord_squared))

    return EARTH_RADIUS_MI * central_angle_rad
