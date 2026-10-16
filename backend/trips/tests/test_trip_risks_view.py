import pytest
from rest_framework.test import APIClient

from trips.services import trip_risk_service
from trips.tests.test_data import build_open_meteo_hourly
from trips.types import Recommendation

# Forecast the browser would send for a trip from 13:00 to 16:27 UTC: 13:00 through 17:00 (5 hours), 38 mph gusts.
FORECAST = build_open_meteo_hourly("2026-10-13T13:00", 5)


def build_route(route_id="A", duration_s=12_420, forecast=FORECAST):
    """A route as the browser sends it: two checkpoints, departure at 13:00 and arrival at 16:27."""
    return {
        "id": route_id,
        "duration_s": duration_s,
        "checkpoints": [
            {"mile": 0.0, "eta_utc": "2026-10-13T13:00:00Z", "forecast": forecast},
            {"mile": 224.8, "eta_utc": "2026-10-13T16:27:00Z", "forecast": forecast},
        ],
    }


# A request that passes validation; tests copy it and change one field.
VALID_BODY = {"routes": [build_route()], "weight_lb": 45_000}


def post_trip_risks(body):
    return APIClient().post("/api/trip-risks", body, format="json")


def test_returns_risk_per_checkpoint_and_route_totals():
    response = post_trip_risks(VALID_BODY)

    assert response.status_code == 200
    trip_risks = response.json()
    route = trip_risks["routes"][0]

    # One route: it is the recommended one.
    assert trip_risks["recommended_route_id"] == "A"
    assert trip_risks["warning"] is None
    assert route["id"] == "A"
    assert route["rank"] == 1
    # The fake weather makes every checkpoint Severe, so the whole route is Severe.
    assert route["miles_by_level"] == {"low": 0.0, "moderate": 0.0, "high": 0.0, "severe": 224.8, "no_travel": 0.0}
    assert route["avg_risk"] == 3.0
    assert route["worst_level"] == 3
    assert route["checkpoints"] == [
        {
            "forecast_hour_utc": "2026-10-13T13:00:00Z",
            "wind_gust_mph": 38.0,
            "wind_speed_mph": 20.0,
            "rain_in_hr": 0.05,
            "snow_in_hr": 0.0,
            # 38 mph gusts alone are High; a 45,000 lb truck is over 40,000 lb, so the load rule makes it Severe.
            "level": 3,
            "cause": "wind_load_rule",
        },
        {
            # 16:27 is nearest to 16:00.
            "forecast_hour_utc": "2026-10-13T16:00:00Z",
            "wind_gust_mph": 38.0,
            "wind_speed_mph": 20.0,
            "rain_in_hr": 0.05,
            "snow_in_hr": 0.0,
            "level": 3,
            "cause": "wind_load_rule",
        },
    ]


def test_load_rule_needs_weight_over_the_limit():
    response = post_trip_risks({**VALID_BODY, "weight_lb": 40_000})

    # At exactly 40,000 lb the load rule doesn't apply, so 38 mph gusts stay High.
    checkpoint = response.json()["routes"][0]["checkpoints"][0]
    assert (checkpoint["level"], checkpoint["cause"]) == (2, "wind")


def test_recommends_fastest_route_when_risk_is_equal():
    routes = [build_route("A", 12_420), build_route("B", 14_400), build_route("C", 18_000)]

    trip_risks = post_trip_risks({**VALID_BODY, "routes": routes}).json()

    assert trip_risks["recommended_route_id"] == "A"
    assert trip_risks["reason"] == "Same risk as the next best route, and faster."


def test_ranks_come_from_the_recommendation(monkeypatch):
    def recommend_slowest_first(assessed_routes):
        # Rank C, B, A, the reverse of the A, B, C order the request sent.
        ranked_routes = [assessed_routes[2], assessed_routes[1], assessed_routes[0]]
        return Recommendation(ranked_routes=ranked_routes, reason="Fake reason.", warning=None)

    monkeypatch.setattr(trip_risk_service, "recommend_route", recommend_slowest_first)
    routes = [build_route("A"), build_route("B"), build_route("C")]

    trip_risks = post_trip_risks({**VALID_BODY, "routes": routes}).json()

    assert trip_risks["recommended_route_id"] == "C"
    assert [(route["id"], route["rank"]) for route in trip_risks["routes"]] == [("A", 3), ("B", 2), ("C", 1)]


def test_rejects_forecast_that_misses_a_checkpoint_eta():
    # Ends at 14:00, but the arrival at 16:27 needs the 16:00 hour.
    short_forecast = build_open_meteo_hourly("2026-10-13T13:00", 2)

    response = post_trip_risks({**VALID_BODY, "routes": [build_route(forecast=short_forecast)]})

    assert response.status_code == 400
    assert response.json() == {"error": "The forecast doesn't cover this checkpoint's arrival time.", "field": "routes"}


def test_rejects_forecast_lists_of_different_lengths():
    uneven_forecast = {**FORECAST, "rain": [0.0]}

    response = post_trip_risks({**VALID_BODY, "routes": [build_route(forecast=uneven_forecast)]})

    assert response.status_code == 400
    assert response.json() == {"error": "Every forecast list must have one value per hour.", "field": "routes"}


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"weight_lb": 45_000}, "routes"),
        ({**VALID_BODY, "routes": []}, "routes"),
        ({**VALID_BODY, "routes": [build_route("D")]}, "routes"),
        ({**VALID_BODY, "routes": [build_route()] * 4}, "routes"),
        ({"routes": [build_route()]}, "weight_lb"),
        ({**VALID_BODY, "weight_lb": "heavy"}, "weight_lb"),
    ],
)
def test_rejects_invalid_input(body, field):
    response = post_trip_risks(body)

    assert response.status_code == 400
    assert response.json()["field"] == field


@pytest.mark.parametrize(
    ("weight_lb", "error"),
    [
        (0, "Weight must be more than 0 lb."),
        (80_001, "Weight can't be more than 80,000 lb."),
    ],
)
def test_rejects_weight_outside_allowed_range(weight_lb, error):
    response = post_trip_risks({**VALID_BODY, "weight_lb": weight_lb})

    assert response.status_code == 400
    assert response.json() == {"error": error, "field": "weight_lb"}


@pytest.mark.parametrize("weight_lb", [1, 80_000])
def test_accepts_weight_on_range_edges(weight_lb):
    response = post_trip_risks({**VALID_BODY, "weight_lb": weight_lb})

    assert response.status_code == 200
