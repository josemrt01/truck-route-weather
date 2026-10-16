"""Constants shared across the trips app."""

from datetime import timedelta

# Only places in this country are accepted; used by graphhopper_client geocoding.
COUNTRY_CODE = "US"

# Fewest characters a place search needs; used by PlaceSearchRequestSerializer (the frontend uses the same number).
PLACE_SEARCH_MIN_CHARACTERS = 3

# Longest place text accepted; used by the trip-plan and place-search request validation.
MAX_PLACE_TEXT_LENGTH = 200

# Seconds to wait for GraphHopper before giving up; used by graphhopper_client.
HTTP_TIMEOUT_SECONDS = 10

# Route options the app offers (the assessment asks for 3); used by graphhopper_client, trip_plan_service and the
# trip-risks request validation.
ROUTE_COUNT = 3

# Most weather points one heatmap may have (the browser fetches their forecasts from Open-Meteo);
# used by corridor_builder and the heatmap request validation.
MAX_CORRIDOR_POINTS = 250

# Names shown for the routes, fastest first; used by trip_plan_service and the trip-risks request validation.
ROUTE_LABELS = ("A", "B", "C")

# Vehicle type GraphHopper routes for; used by graphhopper_client.
ROUTING_PROFILE = "car"

# Meters in one mile; used to convert route distances in trip_plan_service.
METERS_PER_MILE = 1609.344

# Status the health endpoint returns when the backend is up; used by HealthView (the frontend checks it).
HEALTH_STATUS_OK = "ok"

# Mean radius of the Earth in miles; used by geo_math to measure distances between points.
EARTH_RADIUS_MI = 3958.8

# Decimal places kept for miles; used by trip_plan_service and risk_summary_builder.
MILE_DECIMALS = 1

# Allowed miles between checkpoints; the spacing the user picks must be one of these; used by TripPlanRequestSerializer.
CHECKPOINT_SPACING_CHOICES_MI = (10, 25, 50)

# Heaviest truck allowed on US interstates (federal gross weight limit); used by TripPlanRequestSerializer.
MAX_TRUCK_WEIGHT_LB = 80_000

# How far in the past a departure may be (allows for slow form filling); used by TripPlanRequestSerializer.
MAX_DEPARTURE_PAST = timedelta(minutes=15)

# How far ahead a departure may be (weather forecasts only reach so far); used by TripPlanRequestSerializer.
MAX_DEPARTURE_FUTURE = timedelta(days=7)

# Forecast hours the heatmap slider covers, now (hour 0) through 48 hours ahead;
# used by heatmap_service and the heatmap request validation.
HEATMAP_HOURS = 49

# Most hours one forecast sent by the browser may have (Open-Meteo forecasts reach 16 days ahead);
# used by the trip-risks and heatmap request validation.
MAX_FORECAST_HOURS = 16 * 24
