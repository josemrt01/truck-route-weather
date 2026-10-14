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
class TimeInterval:
    """Driving time for the stretch of route between two geometry indexes; returned inside Route."""

    start_index: int
    end_index: int
    seconds: float


@dataclass(frozen=True)
class Route:
    """A driving route; returned by graphhopper_client, used by trip_plan_service."""

    geometry: list[LonLat]
    distance_m: float
    time_s: float
    # Time per stretch of road, so slow roads get more time than highways; used to build checkpoint ETAs.
    time_intervals: list[TimeInterval]
