import pytest
import pandas as pd
from src.services.geo_service import parse_coords, haversine_distance_km

def test_parse_coords_valid():
    """Test standard coordinate parsing."""
    res = parse_coords("48.8566, 2.3522")
    assert res == (48.8566, 2.3522)
    
    res = parse_coords("48.8566 ; 2.3522")
    assert res == (48.8566, 2.3522)

def test_parse_coords_invalid():
    """Test coordinate parsing with malformed input."""
    assert parse_coords(None) == (None, None)
    assert parse_coords("Invalid") == (None, None)
    assert parse_coords("123") == (None, None)

def test_haversine_distance_scalar():
    """Test scalar distance calculation between two known points (Paris and Versailles)."""
    p1 = (48.8566, 2.3522)
    p2 = (48.8049, 2.1204)
    # haversine_distance_km(lat1, lon1, lat2, lon2)
    dist = haversine_distance_km(p1[0], p1[1], p2[0], p2[1])
    # ~17.9 km
    assert 17.8 <= dist <= 18.0

def test_haversine_distance_vectorized():
    """Test vectorized distance calculation."""
    lats = pd.Series([48.8566, 48.8049])
    lons = pd.Series([2.3522, 2.1204])
    ref_lat, ref_lon = 48.8566, 2.3522
    
    distances = haversine_distance_km(lats, lons, ref_lat, ref_lon)
    assert isinstance(distances, pd.Series)
    assert len(distances) == 2
    assert distances.iloc[0] == 0.0
    assert 17.8 <= distances.iloc[1] <= 18.0

def test_haversine_same_point():
    """Test distance calculation between the same point."""
    p1 = (48.8566, 2.3522)
    assert haversine_distance_km(p1[0], p1[1], p1[0], p1[1]) == 0.0
