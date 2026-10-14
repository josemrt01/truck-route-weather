"""Turns the weather at a point and the truck's weight into a risk level (spec section 5.5).

Where two ranges touch, the boundary value belongs to the worse level, except No Travel for
rain and snow, which starts strictly above the Severe limit.
"""

from trips.types import RiskAssessment, RiskCause, RiskLevel, WeatherHour

# Trucks heavier than this can't travel in Severe wind (45-55 mph gusts); used by _get_load_rule_level.
SEVERE_WIND_LOAD_LIMIT_LB = 30_000

# Trucks heavier than this face Severe risk in High wind (35-45 mph gusts); used by _get_load_rule_level.
HIGH_WIND_LOAD_LIMIT_LB = 40_000


def calculate_risk(weather: WeatherHour, weight_lb: float) -> RiskAssessment:
    """Return the worst risk level among wind, rain and snow, and which one caused it."""
    wind_level, wind_cause = _get_wind_level(weather.wind_gust_mph, weight_lb)

    # The order of this list settles ties: wind first, then rain, then snow.
    candidates = [
        (wind_level, wind_cause),
        (_get_rain_level(weather.rain_in), RiskCause.RAIN),
        (_get_snow_level(weather.snow_in), RiskCause.SNOW),
    ]

    # max() keeps the first of equal items, so the list order above decides ties.
    level, cause = max(candidates, key=lambda candidate: candidate[0])

    # Calm weather has no cause to report.
    if level == RiskLevel.LOW:
        cause = RiskCause.NONE

    return RiskAssessment(level=level, cause=cause)


def _get_wind_level(gust_mph: float, weight_lb: float) -> tuple[RiskLevel, RiskCause]:
    table_level = _get_wind_table_level(gust_mph)
    rule_level = _get_load_rule_level(table_level, weight_lb)

    # Report the load rule only when it made the level worse than the table alone.
    if rule_level > table_level:
        return rule_level, RiskCause.WIND_LOAD_RULE

    return table_level, RiskCause.WIND


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


def _get_load_rule_level(wind_table_level: RiskLevel, weight_lb: float) -> RiskLevel:
    # 45-55 mph gusts are exactly the Severe wind row, and 35-45 mph the High row.
    if wind_table_level == RiskLevel.SEVERE and weight_lb > SEVERE_WIND_LOAD_LIMIT_LB:
        return RiskLevel.NO_TRAVEL
    if wind_table_level == RiskLevel.HIGH and weight_lb > HIGH_WIND_LOAD_LIMIT_LB:
        return RiskLevel.SEVERE

    # No load rule applies.
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
