"""Fixtures pytest applies to every test in this folder."""

import pytest


@pytest.fixture(autouse=True)
def fake_graphhopper_api_key(settings):
    """Use a fake key so no test can ever call GraphHopper with the real one."""
    settings.GRAPHHOPPER_API_KEY = "test-key"
