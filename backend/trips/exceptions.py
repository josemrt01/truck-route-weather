"""Custom exceptions for the trips app; turned into HTTP errors by exception_handler.py."""

from trips.error_messages import PLACE_NOT_FOUND


class GraphHopperError(Exception):
    """GraphHopper is not configured, unreachable, or failing."""


class RoutingError(Exception):
    """GraphHopper could not find a drivable route for the given points."""


class PlaceNotFoundError(Exception):
    """Geocoding found no match for the text typed in a form field."""

    def __init__(self, field: str, text: str):
        super().__init__(PLACE_NOT_FOUND.format(place=text))
        self.field = field
