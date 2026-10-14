"""Places checkpoints along a route and works out when the truck reaches each one."""

from datetime import datetime, timedelta
from itertools import accumulate

from trips.logic.geo_math import calculate_haversine_miles
from trips.types import Checkpoint, LonLat, RouteProgress, TimeInterval


def build_route_progress(geometry: list[LonLat], time_intervals: list[TimeInterval]) -> RouteProgress:
    """Return the miles and driving seconds from the start at every geometry point."""
    segment_miles = [
        calculate_haversine_miles(geometry[index], geometry[index + 1]) for index in range(len(geometry) - 1)
    ]

    # Each interval's time is shared among its segments by length, so a longer segment takes longer to drive.
    segment_seconds = [0.0] * len(segment_miles)
    for interval in time_intervals:
        segment_indexes = range(interval.start_index, interval.end_index)
        if not segment_indexes:
            continue

        interval_miles = sum(segment_miles[index] for index in segment_indexes)
        for index in segment_indexes:
            # Repeated points give an interval no length; then its segments share the time equally.
            share = segment_miles[index] / interval_miles if interval_miles > 0 else 1 / len(segment_indexes)
            segment_seconds[index] += interval.seconds * share

    # Running totals: the value at point N is the sum of all segments before it.
    return RouteProgress(
        miles_at=list(accumulate(segment_miles, initial=0.0)),
        seconds_at=list(accumulate(segment_seconds, initial=0.0)),
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
    last_segment_index = len(geometry) - 2

    for target_mile in _get_target_miles(progress.miles_at[-1], spacing_mi):
        # Move forward to the segment that contains the target mile; targets only grow, so never restart.
        while segment_index < last_segment_index and progress.miles_at[segment_index + 1] < target_mile:
            segment_index += 1

        # How far along the segment the target mile is: 0 = its start point, 1 = its end point.
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
