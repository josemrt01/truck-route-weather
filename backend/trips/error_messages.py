"""User-facing error messages returned by the API."""

from trips.constants import MAX_DEPARTURE_FUTURE, MAX_DEPARTURE_PAST

# Seconds in a minute; turns MAX_DEPARTURE_PAST into minutes for the message below.
SECONDS_PER_MINUTE = 60

# Geocoding found no US match for the typed text; used by PlaceNotFoundError.
PLACE_NOT_FOUND = "Couldn't find '{place}'. Try a city and state."

# GraphHopper can't connect the two places by road; used by the exception handler.
NO_DRIVABLE_ROUTE = "No drivable route found between these places."

# GraphHopper is down, failing, or not configured; used by the exception handler.
ROUTING_SERVICE_UNAVAILABLE = "The routing service is unavailable. Please try again in a minute."

# Fallback when an error has no message of its own; used by the exception handler.
REQUEST_FAILED = "Request failed."

# Departure was sent without a timezone offset, so we can't tell when it is; used by TripPlanRequestSerializer.
DEPARTURE_NEEDS_TIMEZONE = "Departure time must include a timezone."

# Departure is too far in the past; used by TripPlanRequestSerializer.
DEPARTURE_TOO_EARLY = (
    f"Departure can't be more than {MAX_DEPARTURE_PAST.total_seconds() / SECONDS_PER_MINUTE:.0f} minutes in the past."
)

# Departure is beyond the forecast window; used by TripPlanRequestSerializer.
DEPARTURE_TOO_LATE = f"Departure must be within the next {MAX_DEPARTURE_FUTURE.days} days."
