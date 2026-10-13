"""User-facing error messages returned by the API."""

# Geocoding found no US match for the typed text; used by PlaceNotFoundError.
PLACE_NOT_FOUND = "Couldn't find '{place}'. Try a city and state."

# GraphHopper can't connect the two places by road; used by the exception handler.
NO_DRIVABLE_ROUTE = "No drivable route found between these places."

# GraphHopper is down, failing, or not configured; used by the exception handler.
ROUTING_SERVICE_UNAVAILABLE = "The routing service is unavailable. Please try again in a minute."

# Fallback when an error has no message of its own; used by the exception handler.
REQUEST_FAILED = "Request failed."
