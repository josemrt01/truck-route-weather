from trips.logic.hourly_forecast_builder import build_hourly_forecast
from trips.tests.test_data import DEPARTURE_UTC
from trips.types import HourlyForecast


def build_hourly(gusts=(10.0, 20.0), wind=(5.0, 8.0), rain=(0.0, 0.1), showers=(0.0, 0.05), snow=(0.0, 0.0)):
    """One location's "hourly" object as Open-Meteo sends it, with two hours starting at DEPARTURE_UTC."""
    return {
        "time": ["2026-10-13T13:00", "2026-10-13T14:00"],
        "wind_gusts_10m": list(gusts),
        "wind_speed_10m": list(wind),
        "rain": list(rain),
        "showers": list(showers),
        "snowfall": list(snow),
    }


def test_builds_forecast_from_open_meteo_hourly_lists():
    forecast = build_hourly_forecast(build_hourly())

    assert forecast == HourlyForecast(
        first_hour_utc=DEPARTURE_UTC,
        wind_gust_mph=[10.0, 20.0],
        wind_speed_mph=[5.0, 8.0],
        # Rain plus showers: 0.1 + 0.05 in the second hour.
        rain_in=[0.0, 0.15],
        snow_in=[0.0, 0.0],
    )


def test_treats_missing_values_as_zero():
    forecast = build_hourly_forecast(
        build_hourly(gusts=(None, 20.0), rain=(None, 0.1), showers=(0.2, None), snow=(None, None))
    )

    assert forecast.wind_gust_mph == [0.0, 20.0]
    assert forecast.rain_in == [0.2, 0.1]
    assert forecast.snow_in == [0.0, 0.0]


def test_rounds_rain_sum_so_it_stays_on_threshold():
    # Without rounding, 0.07 + 0.03 is 0.0999..., just under the 0.10 in/hr Moderate threshold.
    forecast = build_hourly_forecast(build_hourly(rain=(0.07, 0.0), showers=(0.03, 0.0)))

    assert forecast.rain_in == [0.1, 0.0]
