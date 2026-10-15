"""Turns the weather at a point and the truck's weight into a risk level (spec section 5.5).

Where two ranges touch, the boundary value belongs to the worse level, except No Travel for
rain and snow, which starts strictly above the Severe limit.
"""

from trips.types import RiskAssessment, RiskCause, RiskLevel, WeatherHour

# Trucks heavier than this can't travel in Severe wind (45-55 mph gusts); used by _get_wind_risk.
SEVERE_WIND_LOAD_LIMIT_LB = 30_000

# Trucks heavier than this face Severe risk in High wind (35-45 mph gusts); used by _get_wind_risk.
HIGH_WIND_LOAD_LIMIT_LB = 40_000


def calculate_risk(weather: WeatherHour, weight_lb: float) -> RiskAssessment:
    """Return the worst risk level among wind, rain and snow, and which one caused it."""
    risk = _get_wind_risk(weather.wind_gust_mph, weight_lb)
    rain_level = _get_rain_level(weather.rain_in)
    snow_level = _get_snow_level(weather.snow_in)

    # Strictly greater: on a tie the condition checked first keeps it (wind, then rain, then snow).
    if rain_level > risk.level:
        risk = RiskAssessment(level=rain_level, cause=RiskCause.RAIN)
    if snow_level > risk.level:
        risk = RiskAssessment(level=snow_level, cause=RiskCause.SNOW)

    # Calm weather has no cause to report.
    if risk.level == RiskLevel.LOW:
        return RiskAssessment(level=RiskLevel.LOW, cause=RiskCause.NONE)

    return risk


def _get_wind_risk(gust_mph: float, weight_lb: float) -> RiskAssessment:
    table_level = _get_wind_table_level(gust_mph)

    # Load rules: 45-55 mph gusts are exactly the Severe wind row, and 35-45 mph the High row.
    if table_level == RiskLevel.SEVERE and weight_lb > SEVERE_WIND_LOAD_LIMIT_LB:
        return RiskAssessment(level=RiskLevel.NO_TRAVEL, cause=RiskCause.WIND_LOAD_RULE)
    if table_level == RiskLevel.HIGH and weight_lb > HIGH_WIND_LOAD_LIMIT_LB:
        return RiskAssessment(level=RiskLevel.SEVERE, cause=RiskCause.WIND_LOAD_RULE)

    return RiskAssessment(level=table_level, cause=RiskCause.WIND)


def _get_wind_table_level(gust_mph: float) -> RiskLevel:
    if gust_mph >= 55:
        return RiskLevel.NO_TRAVEL
    if gust_mph >= 45:
        return RiskLevel.SEVERE
    if gust_mph >= 35:
        return RiskLevel.HIGH
    if gust_mph >= 25:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def _get_rain_level(rain_in: float) -> RiskLevel:
    # Strictly greater: 1.00 in/hr itself is still Severe.
    if rain_in > 1.00:
        return RiskLevel.NO_TRAVEL
    if rain_in >= 0.50:
        return RiskLevel.SEVERE
    if rain_in >= 0.25:
        return RiskLevel.HIGH
    if rain_in >= 0.10:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def _get_snow_level(snow_in: float) -> RiskLevel:
    # Strictly greater: 3.0 in/hr itself is still Severe.
    if snow_in > 3.0:
        return RiskLevel.NO_TRAVEL
    if snow_in >= 2.0:
        return RiskLevel.SEVERE
    if snow_in >= 1.0:
        return RiskLevel.HIGH
    if snow_in >= 0.5:
        return RiskLevel.MODERATE
    return RiskLevel.LOW
