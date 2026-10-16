"""Sample values shared by the tests."""

from datetime import UTC, datetime, timedelta

from trips.types import Place

# Downtown Dallas as (lon, lat); used as a route origin in tests.
DALLAS_POINT = (-96.797, 32.7767)

# Downtown Houston as (lon, lat); used as a route destination in tests.
HOUSTON_POINT = (-95.3698, 29.7604)

# Dallas as geocoding returns it; used where tests fake geocoding.
DALLAS_PLACE = Place(label="Dallas, Texas", lat=32.7767, lon=-96.797)

# Houston as geocoding returns it; used where tests fake geocoding.
HOUSTON_PLACE = Place(label="Houston, Texas", lat=29.7604, lon=-95.3698)

# A fixed departure in UTC; used by checkpoint tests so ETAs are predictable.
DEPARTURE_UTC = datetime(2026, 10, 13, 13, 0, tzinfo=UTC)

# DEPARTURE_UTC as the API receives it (ISO text); used by trip-plan endpoint tests.
DEPARTURE_ISO = "2026-10-13T13:00:00Z"

# "Now" during endpoint tests, one hour before DEPARTURE_UTC; used to freeze the clock.
FIXED_NOW = DEPARTURE_UTC - timedelta(hours=1)


def build_open_meteo_hourly(first_hour: str, hour_count: int, gust_mph: float = 38.0, rain_in: float = 0.05) -> dict:
    """One location's "hourly" object as Open-Meteo sends it, with the same weather every hour.

    first_hour is Open-Meteo's GMT hour text, e.g. "2026-10-13T13:00"; used by the trip-risks and heatmap tests.
    """
    first_hour_utc = datetime.fromisoformat(first_hour).replace(tzinfo=UTC)

    times = []
    for hour_index in range(hour_count):
        times.append((first_hour_utc + timedelta(hours=hour_index)).strftime("%Y-%m-%dT%H:00"))

    return {
        "time": times,
        "wind_gusts_10m": [gust_mph] * hour_count,
        "wind_speed_10m": [20.0] * hour_count,
        "rain": [rain_in] * hour_count,
        "showers": [0.0] * hour_count,
        "snowfall": [0.0] * hour_count,
    }
