"""Data types shared across the trips app."""

from dataclasses import dataclass
from datetime import datetime
from enum import IntEnum, StrEnum

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


@dataclass(frozen=True)
class RouteProgress:
    """Miles and driving seconds from the start at each geometry point; built and used by checkpoint_builder."""

    miles_at: list[float]
    seconds_at: list[float]


@dataclass(frozen=True)
class Checkpoint:
    """A point along the route where the weather is checked; built by checkpoint_builder."""

    mile: float
    lat: float
    lon: float
    eta_utc: datetime
    # Index of the last route geometry point before this checkpoint; lets the frontend cut the route line
    # into stretches between checkpoints.
    previous_point_index: int


@dataclass(frozen=True)
class HourlyForecast:
    """Hour-by-hour weather for one point; returned by open_meteo_client.

    Every list holds one value per hour, and index 0 is first_hour_utc.
    """

    first_hour_utc: datetime
    wind_gust_mph: list[float]
    wind_speed_mph: list[float]
    # Rain plus showers, in inches per hour.
    rain_in: list[float]
    # Snowfall in inches per hour.
    snow_in: list[float]


@dataclass(frozen=True)
class WeatherHour:
    """Weather for one point at one hour; returned by weather_lookup, used by the risk calculator."""

    wind_gust_mph: float
    wind_speed_mph: float
    # Rain plus showers, in inches per hour.
    rain_in: float
    # Snowfall in inches per hour.
    snow_in: float


class RiskLevel(IntEnum):
    """How dangerous the weather is for the truck; numbers so levels can be compared and averaged."""

    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4


class RiskCause(StrEnum):
    """Which condition produced a risk level; sent to the frontend as plain text."""

    NONE = "none"
    WIND = "wind"
    # Wind made worse because the truck is heavy.
    WIND_LOAD_RULE = "wind_load_rule"
    RAIN = "rain"
    SNOW = "snow"


@dataclass(frozen=True)
class RiskAssessment:
    """Risk level and its cause for one point at one hour; returned by risk_calculator."""

    level: RiskLevel
    cause: RiskCause


@dataclass(frozen=True)
class AssessedCheckpoint:
    """A checkpoint with the weather the truck meets there and its risk; built by trip_plan_service."""

    checkpoint: Checkpoint
    # The forecast hour whose weather was used (the full hour nearest the ETA).
    forecast_hour_utc: datetime
    weather: WeatherHour
    risk: RiskAssessment


@dataclass(frozen=True)
class RouteRiskSummary:
    """Risk totals for a whole route; returned by risk_summary_builder."""

    # Miles driven at each level; every level is present, 0.0 when unused.
    miles_by_level: dict[RiskLevel, float]
    # Mileage-weighted average level, from 0.00 (all Low) to 4.00 (all No Travel).
    avg_risk: float
    worst_level: RiskLevel
