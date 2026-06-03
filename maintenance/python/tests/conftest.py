import sys
import unittest.mock as mock
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# --- GLOBAL STREAMLIT MOCK ---
# This prevents services from crashing when they import 'streamlit' in a non-browser environment.
mock_st = mock.MagicMock()
mock_st.session_state = {}
mock_st.secrets = {"CLEANMYMAP_ADMIN_SECRET_CODE": "TEST_SECRET"}

# Mock st.cache_data and st.cache_resource to behave as identity decorators
def identity_decorator(*args, **kwargs):
    def wrapper(func):
        return func
    return wrapper

mock_st.cache_data = identity_decorator
mock_st.cache_resource = identity_decorator

# We patch streamlit before any service is imported by the tests
sys.modules["streamlit"] = mock_st


import pytest

@pytest.fixture(autouse=True)
def clean_st_session():
    """Reset session state before each test."""
    mock_st.session_state.clear()
    yield

@pytest.fixture
def sample_action_row():
    """Returns a representative dictionary of a single cleanup action."""
    return {
        "date": "2024-01-01",
        "nom": "Test User",
        "megots": 100,
        "dechets_kg": 5.5,
        "temps_min": 60,
        "nb_benevoles": 2,
        "type_lieu": "Plage"
    }

@pytest.fixture
def sample_action_df():
    """Returns a small DataFrame for vectorized service testing."""
    return pd.DataFrame([
        {"date": "2024-01-01", "megots": 100, "dechets_kg": 5.0, "temps_min": 60, "nb_benevoles": 2},
        {"date": "2024-01-02", "megots": 200, "dechets_kg": 10.0, "temps_min": 120, "nb_benevoles": 1},
        {"date": pd.NaT, "megots": 0, "dechets_kg": 0.0, "temps_min": 30, "nb_benevoles": 1}
    ])
