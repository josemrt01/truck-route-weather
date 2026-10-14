from datetime import timedelta

import pytest

from trips.logic.checkpoint_builder import build_checkpoints, build_route_progress
from trips.logic.geo_math import calculate_haversine_miles
from trips.tests.test_data import DEPARTURE_UTC
from trips.types import RouteProgress, TimeInterval

# Miles in one degree of longitude along the equator; makes equator test routes easy to measure.
ONE_DEGREE_MI = calculate_haversine_miles((0.0, 0.0), (1.0, 0.0))


# --- build_route_progress: miles and seconds from the start at every geometry point ---


def test_route_progress_adds_up_segment_miles():
    geometry = [(0.0, 0.0), (1.0, 0.0), (3.0, 0.0)]
    time_intervals = [TimeInterval(start_index=0, end_index=2, seconds=3000)]

    progress = build_route_progress(geometry, time_intervals)

    assert progress.miles_at == pytest.approx([0, ONE_DEGREE_MI, 3 * ONE_DEGREE_MI])


def test_route_progress_uses_each_interval_time():
    geometry = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]
    # Same distance, but the second stretch is a slower road.
    time_intervals = [
        TimeInterval(start_index=0, end_index=1, seconds=3600),
        TimeInterval(start_index=1, end_index=2, seconds=7200),
    ]

    progress = build_route_progress(geometry, time_intervals)

    assert progress.seconds_at == pytest.approx([0, 3600, 10800])


def test_route_progress_shares_interval_time_by_segment_length():
    # One interval covers a 1-degree segment then a 2-degree segment: they get 1/3 and 2/3 of its time.
    geometry = [(0.0, 0.0), (1.0, 0.0), (3.0, 0.0)]
    time_intervals = [TimeInterval(start_index=0, end_index=2, seconds=3000)]

    progress = build_route_progress(geometry, time_intervals)

    assert progress.seconds_at == pytest.approx([0, 1000, 3000])


def test_route_progress_shares_time_equally_when_interval_has_no_length():
    # A repeated point (zero-length segment) still gets its interval's time, without dividing by zero.
    geometry = [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0)]
    time_intervals = [
        TimeInterval(start_index=0, end_index=1, seconds=10),
        TimeInterval(start_index=1, end_index=2, seconds=100),
    ]

    progress = build_route_progress(geometry, time_intervals)

    assert progress.miles_at == pytest.approx([0, 0, ONE_DEGREE_MI])
    assert progress.seconds_at == pytest.approx([0, 10, 110])


# --- build_checkpoints: points every spacing_mi, plus the destination ---


def test_checkpoints_start_at_mile_zero_and_repeat_every_spacing():
    geometry = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]
    progress = RouteProgress(miles_at=[0, 60, 120], seconds_at=[0, 3600, 7200])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    assert [checkpoint.mile for checkpoint in checkpoints] == pytest.approx([0, 25, 50, 75, 100, 120])


def test_destination_is_added_even_when_close_to_previous_checkpoint():
    geometry = [(0.0, 0.0), (1.0, 0.0)]
    progress = RouteProgress(miles_at=[0, 52], seconds_at=[0, 3600])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    assert [checkpoint.mile for checkpoint in checkpoints] == pytest.approx([0, 25, 50, 52])


def test_destination_on_a_spacing_multiple_is_not_repeated():
    geometry = [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)]
    progress = RouteProgress(miles_at=[0, 25, 50], seconds_at=[0, 1800, 3600])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    assert [checkpoint.mile for checkpoint in checkpoints] == pytest.approx([0, 25, 50])


def test_route_shorter_than_one_spacing_has_start_and_destination_only():
    geometry = [(0.0, 0.0), (0.1, 0.0)]
    progress = RouteProgress(miles_at=[0, 10], seconds_at=[0, 600])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    assert [checkpoint.mile for checkpoint in checkpoints] == pytest.approx([0, 10])


def test_checkpoint_position_and_eta_are_interpolated_between_points():
    # A 100-mile segment taking 2 hours: mile 25 is a quarter of the way, in both place and time.
    geometry = [(0.0, 0.0), (10.0, 4.0)]
    progress = RouteProgress(miles_at=[0, 100], seconds_at=[0, 7200])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    mile_25 = checkpoints[1]
    assert (mile_25.lon, mile_25.lat) == pytest.approx((2.5, 1.0))
    assert mile_25.eta_utc == DEPARTURE_UTC + timedelta(seconds=1800)


def test_first_checkpoint_is_the_origin_at_departure_and_last_is_the_destination_at_arrival():
    geometry = [(0.0, 0.0), (1.0, 0.0), (2.0, 1.0)]
    progress = RouteProgress(miles_at=[0, 40, 90], seconds_at=[0, 2400, 6000])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    origin, destination = checkpoints[0], checkpoints[-1]
    assert (origin.lon, origin.lat, origin.eta_utc) == (0.0, 0.0, DEPARTURE_UTC)
    assert (destination.lon, destination.lat) == pytest.approx((2.0, 1.0))
    assert destination.eta_utc == DEPARTURE_UTC + timedelta(seconds=6000)


def test_checkpoint_on_a_zero_length_segment_does_not_divide_by_zero():
    # The route starts with a repeated point, so the first segment has no length.
    geometry = [(0.0, 0.0), (0.0, 0.0), (1.0, 0.0)]
    progress = RouteProgress(miles_at=[0, 0, 50], seconds_at=[0, 0, 3600])

    checkpoints = build_checkpoints(geometry, progress, spacing_mi=25, departure_utc=DEPARTURE_UTC)

    assert [checkpoint.mile for checkpoint in checkpoints] == pytest.approx([0, 25, 50])
    assert checkpoints[0].eta_utc == DEPARTURE_UTC
