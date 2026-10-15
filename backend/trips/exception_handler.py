"""Turns exceptions into JSON error responses: {"error": "...", "field": "..."}."""

import logging

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from trips.exceptions import GraphHopperError, PlaceNotFoundError, RoutingError, WeatherServiceError

logger = logging.getLogger(__name__)


def handle_api_exception(exc, context):
    # Invalid input from the serializer: report the first problem and its field.
    if isinstance(exc, ValidationError):
        field, message = _get_first_validation_error(exc.detail)
        return _build_error_response(message, status.HTTP_400_BAD_REQUEST, field)

    # A typed place wasn't found: point at the field it came from.
    if isinstance(exc, PlaceNotFoundError):
        return _build_error_response(str(exc), status.HTTP_400_BAD_REQUEST, exc.field)

    # The places exist but no road connects them.
    if isinstance(exc, RoutingError):
        return _build_error_response("No drivable route found between these places.", status.HTTP_400_BAD_REQUEST)

    # GraphHopper failed: log the details for us, show a generic message to the user.
    if isinstance(exc, GraphHopperError):
        logger.error("GraphHopper failure: %s", exc)
        return _build_error_response(
            "The routing service is unavailable. Please try again in a minute.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Open-Meteo failed: same idea as GraphHopper, details in the log, generic message to the user.
    if isinstance(exc, WeatherServiceError):
        logger.error("Open-Meteo failure: %s", exc)
        return _build_error_response(
            "The weather service is unavailable. Please try again in a minute.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Anything else (e.g. 405 method not allowed): let DRF build it, then reshape it to our format.
    response = drf_exception_handler(exc, context)
    if response is not None:
        response.data = {"error": str(response.data.get("detail", "Request failed.")), "field": None}

    return response


def _get_first_validation_error(detail) -> tuple[str | None, str]:
    # Errors per field: {"origin": ["This field may not be blank."]}
    if isinstance(detail, dict):
        # Report only the first field with a problem.
        field = list(detail.keys())[0]
        messages = detail[field]
        message = messages[0] if isinstance(messages, list) else messages

        # "non_field_errors" means the problem isn't tied to a single field.
        return (None if field == "non_field_errors" else field), str(message)

    if isinstance(detail, list):
        return None, str(detail[0])

    return None, str(detail)


def _build_error_response(message: str, status_code: int, field: str | None = None) -> Response:
    return Response({"error": message, "field": field}, status=status_code)
