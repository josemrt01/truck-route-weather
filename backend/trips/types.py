"""Data types shared across the trips app."""

from dataclasses import dataclass

# A point as (longitude, latitude), the order GeoJSON and MapLibre use; used for all coordinates.
LonLat = tuple[float, float]


@dataclass(frozen=True)
class Place:
    """A geocoded place; returned by graphhopper_client, used by trip_plan_service."""

    label: str
    lat: float
    lon: float


@dataclass(frozen=True)
class Route:
    """A driving route; returned by graphhopper_client, used by trip_plan_service."""

    geometry: list[LonLat]
    distance_m: float
    time_s: float
