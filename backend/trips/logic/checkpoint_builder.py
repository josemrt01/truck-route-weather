"""Places checkpoints along a route and works out when the truck reaches each one."""

from datetime import datetime, timedelta

from trips.logic.geo_math import calculate_haversine_miles
from trips.types import Checkpoint, LonLat, RouteProgress, TimeInterval


def build_route_progress(geometry: list[LonLat], time_intervals: list[TimeInterval]) -> RouteProgress:
    """Return the miles and driving seconds from the start at every geometry point."""
    segment_miles = _get_segment_miles(geometry)
    segment_seconds = _get_segment_seconds(segment_miles, time_intervals)

    return RouteProgress(
        miles_at=_get_running_totals(segment_miles),
        seconds_at=_get_running_totals(segment_seconds),
    )


def build_checkpoints(
    geometry: list[LonLat],
    progress: RouteProgress,
    spacing_mi: float,
    departure_utc: datetime,
) -> list[Checkpoint]:
    """Return a checkpoint at mile 0, every spacing_mi, and at the destination."""
    checkpoints = []
    segment_index = 0

    for target_mile in _get_target_miles(progress.miles_at[-1], spacing_mi):
        # Targets only grow, so the search continues from the last segment instead of restarting.
        segment_index = _find_segment_index(progress.miles_at, target_mile, segment_index)

        # How far along the segment the target mile is: 0 = its start point, 1 = its end point.
        # Example: target 30 mi on a segment from 25 to 35 mi gives 0.5, halfway between its two points.
        segment_start_mile = progress.miles_at[segment_index]
        segment_length_mi = progress.miles_at[segment_index + 1] - segment_start_mile
        fraction = (target_mile - segment_start_mile) / segment_length_mi if segment_length_mi > 0 else 0.0

        start_lon, start_lat = geometry[segment_index]
        end_lon, end_lat = geometry[segment_index + 1]
        elapsed_seconds = _interpolate(
            progress.seconds_at[segment_index], progress.seconds_at[segment_index + 1], fraction
        )

        checkpoints.append(
            Checkpoint(
                mile=target_mile,
                lat=_interpolate(start_lat, end_lat, fraction),
                lon=_interpolate(start_lon, end_lon, fraction),
                eta_utc=departure_utc + timedelta(seconds=elapsed_seconds),
                previous_point_index=segment_index,
            )
        )

    return checkpoints


def _get_segment_miles(geometry: list[LonLat]) -> list[float]:
    # N points make N-1 segments; segment i runs from point i to point i+1.
    segment_miles = []
    for index in range(len(geometry) - 1):
        segment_miles.append(calculate_haversine_miles(geometry[index], geometry[index + 1]))

    return segment_miles


def _get_segment_seconds(segment_miles: list[float], time_intervals: list[TimeInterval]) -> list[float]:
    # GraphHopper gives one time per interval (several segments of the same road); each segment gets
    # a share of it by length, so a longer segment takes longer to drive.
    segment_seconds = [0.0] * len(segment_miles)

    for interval in time_intervals:
        segment_count = interval.end_index - interval.start_index
        if segment_count <= 0:
            continue

        interval_miles = 0.0
        for index in range(interval.start_index, interval.end_index):
            interval_miles += segment_miles[index]

        for index in range(interval.start_index, interval.end_index):
            if interval_miles > 0:
                share = segment_miles[index] / interval_miles
            else:
                # Repeated points give an interval no length; then its segments share the time equally.
                share = 1 / segment_count
            segment_seconds[index] += interval.seconds * share

    return segment_seconds


def _get_running_totals(values: list[float]) -> list[float]:
    # The total at position N is the sum of all values before it, starting at 0: [2, 3, 5] -> [0, 2, 5, 10].
    totals = [0.0]
    for value in values:
        totals.append(totals[-1] + value)

    return totals


def _find_segment_index(miles_at: list[float], target_mile: float, start_index: int) -> int:
    """Return the index of the segment that contains target_mile, searching forward from start_index."""
    # One mile value per point, and N points make N-1 segments, so the last segment's index is N-2.
    last_segment_index = len(miles_at) - 2

    segment_index = start_index
    # Step forward while the target is past this segment's end point.
    while segment_index < last_segment_index and miles_at[segment_index + 1] < target_mile:
        segment_index += 1

    return segment_index


def _get_target_miles(total_miles: float, spacing_mi: float) -> list[float]:
    # Multiply instead of adding spacing_mi repeatedly, so float rounding errors don't build up.
    spacing_count = 0
    target_miles = []
    while spacing_count * spacing_mi < total_miles:
        target_miles.append(float(spacing_count * spacing_mi))
        spacing_count += 1

    # The destination is always a checkpoint, even when it's closer than spacing_mi to the previous one.
    target_miles.append(total_miles)

    return target_miles


def _interpolate(start: float, end: float, fraction: float) -> float:
    return start + (end - start) * fraction
