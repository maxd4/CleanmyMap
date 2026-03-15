from src.geocoder import geocode_location


def test_decimal_coords():
    lat, lon = geocode_location("48.8566, 2.3522")
    assert round(lat, 4) == 48.8566
    assert round(lon, 4) == 2.3522


def test_invalid_coords():
    lat, lon = geocode_location("adresse inconnue")
    assert lat is None and lon is None
