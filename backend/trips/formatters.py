"""Turns values into the text formats the API sends."""

from datetime import UTC, datetime


def format_utc(moment: datetime) -> str:
    """Return the moment as ISO 8601 text in UTC, to the second, e.g. "2026-10-13T13:00:00Z"."""
    # "Z" is the usual short form of UTC, used instead of "+00:00".
    return moment.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
