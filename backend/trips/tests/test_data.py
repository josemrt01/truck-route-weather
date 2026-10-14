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
