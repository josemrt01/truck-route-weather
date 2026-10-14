import pytest

from trips.logic.risk_calculator import calculate_risk
from trips.types import RiskAssessment, RiskCause, RiskLevel, WeatherHour

# A truck below both load limits, so only the weather tables decide; used by the table tests.
LIGHT_TRUCK_LB = 10_000


def build_weather(gust_mph: float = 0.0, rain_in: float = 0.0, snow_in: float = 0.0) -> WeatherHour:
    """Weather with only the given conditions; sustained wind doesn't affect risk, so it stays 0."""
    return WeatherHour(wind_gust_mph=gust_mph, wind_speed_mph=0.0, rain_in=rain_in, snow_in=snow_in)


# --- Wind table: the lower bound of each range belongs to the worse level ---


@pytest.mark.parametrize(
    ("gust_mph", "expected_level"),
    [
        (24.9, RiskLevel.LOW),
        (25, RiskLevel.MODERATE),
        (34.9, RiskLevel.MODERATE),
        (35, RiskLevel.HIGH),
        (45, RiskLevel.SEVERE),
        (55, RiskLevel.NO_TRAVEL),
    ],
)
def test_wind_gust_levels(gust_mph, expected_level):
    risk = calculate_risk(build_weather(gust_mph=gust_mph), LIGHT_TRUCK_LB)

    assert risk.level == expected_level


# --- Rain table: 1.00 in/hr is still Severe; No Travel starts strictly above it ---


@pytest.mark.parametrize(
    ("rain_in", "expected_level"),
    [
        (0.09, RiskLevel.LOW),
        (0.10, RiskLevel.MODERATE),
        (0.25, RiskLevel.HIGH),
        (0.50, RiskLevel.SEVERE),
        (1.00, RiskLevel.SEVERE),
        (1.01, RiskLevel.NO_TRAVEL),
    ],
)
def test_rain_levels(rain_in, expected_level):
    assert calculate_risk(build_weather(rain_in=rain_in), LIGHT_TRUCK_LB) == RiskAssessment(
        level=expected_level, cause=RiskCause.NONE if expected_level == RiskLevel.LOW else RiskCause.RAIN
    )


# --- Snow table: 3.0 in/hr is still Severe; No Travel starts strictly above it ---


@pytest.mark.parametrize(
    ("snow_in", "expected_level"),
    [
        (0.4, RiskLevel.LOW),
        (0.5, RiskLevel.MODERATE),
        (1.0, RiskLevel.HIGH),
        (2.0, RiskLevel.SEVERE),
        (3.0, RiskLevel.SEVERE),
        (3.1, RiskLevel.NO_TRAVEL),
    ],
)
def test_snow_levels(snow_in, expected_level):
    assert calculate_risk(build_weather(snow_in=snow_in), LIGHT_TRUCK_LB) == RiskAssessment(
        level=expected_level, cause=RiskCause.NONE if expected_level == RiskLevel.LOW else RiskCause.SNOW
    )


# --- Load rules: heavy trucks get a worse wind level ---


@pytest.mark.parametrize(
    ("gust_mph", "weight_lb", "expected_risk"),
    [
        # Severe wind and over 30,000 lb: No Travel.
        (45, 30_001, RiskAssessment(RiskLevel.NO_TRAVEL, RiskCause.WIND_LOAD_RULE)),
        # Exactly at the limit doesn't count; the rule says "over".
        (45, 30_000, RiskAssessment(RiskLevel.SEVERE, RiskCause.WIND)),
        # High wind and over 40,000 lb: Severe.
        (35, 40_001, RiskAssessment(RiskLevel.SEVERE, RiskCause.WIND_LOAD_RULE)),
        (35, 40_000, RiskAssessment(RiskLevel.HIGH, RiskCause.WIND)),
        # 55 mph is No Travel from the table itself, for any load.
        (55, LIGHT_TRUCK_LB, RiskAssessment(RiskLevel.NO_TRAVEL, RiskCause.WIND)),
        # No load rule below 35 mph, however heavy the truck.
        (30, 80_000, RiskAssessment(RiskLevel.MODERATE, RiskCause.WIND)),
    ],
)
def test_load_rules(gust_mph, weight_lb, expected_risk):
    assert calculate_risk(build_weather(gust_mph=gust_mph), weight_lb) == expected_risk


# --- Combining: the worst condition wins; ties prefer wind, then rain, then snow ---


@pytest.mark.parametrize(
    ("weather", "expected_risk"),
    [
        # Rain High beats snow Moderate.
        (build_weather(rain_in=0.25, snow_in=0.5), RiskAssessment(RiskLevel.HIGH, RiskCause.RAIN)),
        # Wind High ties with rain High: wind wins.
        (build_weather(gust_mph=35, rain_in=0.25), RiskAssessment(RiskLevel.HIGH, RiskCause.WIND)),
        # Rain Severe ties with snow Severe: rain wins.
        (build_weather(rain_in=0.5, snow_in=2.0), RiskAssessment(RiskLevel.SEVERE, RiskCause.RAIN)),
        # Calm weather: Low with no cause.
        (build_weather(), RiskAssessment(RiskLevel.LOW, RiskCause.NONE)),
    ],
)
def test_worst_condition_wins(weather, expected_risk):
    assert calculate_risk(weather, LIGHT_TRUCK_LB) == expected_risk
