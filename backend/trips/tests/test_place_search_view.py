import pytest
from rest_framework.test import APIClient

from trips import views
from trips.exceptions import GraphHopperError
from trips.tests.test_data import DALLAS_PLACE, HOUSTON_PLACE


@pytest.fixture(autouse=True)
def fake_search_places(monkeypatch):
    """Return Dallas and Houston for any text; the list records each searched text."""
    searched_texts = []

    def search_fake_places(text):
        searched_texts.append(text)
        return [DALLAS_PLACE, HOUSTON_PLACE]

    monkeypatch.setattr(views, "search_places", search_fake_places)
    return searched_texts


def get_places(params):
    return APIClient().get("/api/places", params)


def test_returns_matching_places(fake_search_places):
    response = get_places({"q": "Dal"})

    assert response.status_code == 200
    assert response.json() == [
        {"label": "Dallas, Texas", "lat": 32.7767, "lon": -96.797},
        {"label": "Houston, Texas", "lat": 29.7604, "lon": -95.3698},
    ]
    assert fake_search_places == ["Dal"]


def test_trims_spaces_before_searching(fake_search_places):
    get_places({"q": "  Dallas  "})

    assert fake_search_places == ["Dallas"]


@pytest.mark.parametrize("params", [{"q": "Da"}, {"q": "  Da  "}])
def test_rejects_text_shorter_than_three_characters(params):
    response = get_places(params)

    assert response.status_code == 400
    assert response.json() == {"error": "Type at least 3 characters.", "field": "q"}


def test_rejects_a_missing_query():
    response = get_places({})

    assert response.status_code == 400
    assert response.json()["field"] == "q"


def test_reports_graphhopper_failure_as_service_unavailable(monkeypatch):
    def raise_graphhopper_error(text):
        raise GraphHopperError("GraphHopper answered with status 500.")

    monkeypatch.setattr(views, "search_places", raise_graphhopper_error)

    response = get_places({"q": "Dallas"})

    assert response.status_code == 503
    assert response.json()["error"] == "The routing service is unavailable. Please try again in a minute."
