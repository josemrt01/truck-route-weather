"""Constants shared across the trips app."""

from datetime import timedelta

# Only places in this country are accepted; used by graphhopper_client geocoding.
COUNTRY_CODE = "US"

# Seconds to wait for an outside API before giving up; used by the API clients.
HTTP_TIMEOUT_SECONDS = 10

# Vehicle type GraphHopper routes for; used by graphhopper_client.
ROUTING_PROFILE = "car"

# Meters in one mile; used to convert route distances in trip_plan_service.
METERS_PER_MILE = 1609.344

# Status the health endpoint returns when the backend is up; used by HealthView (the frontend checks it).
HEALTH_STATUS_OK = "ok"

# Mean radius of the Earth in miles; used by geo_math to measure distances between points.
EARTH_RADIUS_MI = 3958.8

# Allowed miles between checkpoints; the spacing the user picks must be one of these; used by TripPlanRequestSerializer.
CHECKPOINT_SPACING_CHOICES_MI = (10, 25, 50)

# Heaviest truck allowed on US interstates (federal gross weight limit); used by TripPlanRequestSerializer.
MAX_TRUCK_WEIGHT_LB = 80_000

# How far in the past a departure may be (allows for slow form filling); used by TripPlanRequestSerializer.
MAX_DEPARTURE_PAST = timedelta(minutes=15)

# How far ahead a departure may be (weather forecasts only reach so far); used by TripPlanRequestSerializer.
MAX_DEPARTURE_FUTURE = timedelta(days=7)
