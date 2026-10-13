"""Constants shared across the trips app."""

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
