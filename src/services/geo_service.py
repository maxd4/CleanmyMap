import re
import os
import io
import requests
import unicodedata
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np
import osmnx as ox
import networkx as nx
from shapely.ops import unary_union
from shapely.geometry import Point
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError, GeocoderUnavailable

from src.logging_utils import log_event, log_exception

# --- Configuration for Geo Operations ---
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
GEO_USER_AGENT = "cleanmymap_app_v2"
EARTH_RADIUS_KM = 6371.0088

TAGS_PARKS = {
    'leisure': ['park', 'garden', 'recreation_ground'],
    'landuse': ['grass', 'forest', 'village_green'],
    'natural': ['wood', 'scrub']
}

def parse_coords(value: str):
    """Tente de parser des coordonnées GPS (Décimal ou DMS)."""
    if not value or pd.isna(value): return None, None
    text = str(value).strip()
    decimal = re.search(r"(-?\d+\.?\d*)\s*[,;\s]+\s*(-?\d+\.?\d*)", text)
    if decimal:
        lat, lon = float(decimal.group(1)), float(decimal.group(2))
        if -90 <= lat <= 90 and -180 <= lon <= 180: return lat, lon
    dms = re.search(r"(\d+)[°\s]+(\d+)[\'\s]+(\d+(?:\.\d+)?)[\"\s]*([NS])\s*(\d+)[°\s]+(\d+)[\'\s]+(\d+(?:\.\d+)?)[\"\s]*([EW])", text.upper())
    if dms:
        lat = float(dms.group(1)) + float(dms.group(2))/60 + float(dms.group(3))/3600
        if dms.group(4) == "S": lat *= -1
        lon = float(dms.group(5)) + float(dms.group(6))/60 + float(dms.group(7))/3600
        if dms.group(8) == "W": lon *= -1
        return lat, lon
    return None, None

def geocode_and_resolve(location_input: str, timeout: int = 5):
    """Résout un emplacement en (lat, lon, adresse)."""
    if not location_input or len(location_input.strip()) < 3: return None, None, location_input
    lat, lon = parse_coords(location_input)
    geolocator = Nominatim(user_agent=GEO_USER_AGENT)
    if lat is not None and lon is not None:
        try:
            location = geolocator.reverse((lat, lon), timeout=timeout)
            return lat, lon, location.address if location else f"{lat}, {lon}"
        except Exception: return lat, lon, f"{lat}, {lon}"
    try:
        location = geolocator.geocode(location_input, timeout=timeout)
        if location: return location.latitude, location.longitude, location.address
    except Exception: pass
    return None, None, location_input

def haversine_distance_km(lat1: float | pd.Series, lon1: float | pd.Series, lat2: float | pd.Series, lon2: float | pd.Series) -> float | pd.Series:
    """Calcul de la distance de Haversine (supporte scalaires et Series)."""
    is_series = isinstance(lat1, pd.Series) or isinstance(lat2, pd.Series)
    l1, r1 = np.radians(lat1), np.radians(lon1)
    l2, r2 = np.radians(lat2), np.radians(lon2)
    a = np.sin((l1 - l2)/2)**2 + np.cos(l1) * np.cos(l2) * np.sin((r1 - r2)/2)**2
    d = EARTH_RADIUS_KM * 2 * np.arctan2(np.sqrt(np.clip(a,0,1)), np.sqrt(1-np.clip(a,0,1)))
    return pd.Series(d, index=lat1.index) if is_series and hasattr(lat1, 'index') else float(d)

def detect_osm_type(row):
    """Détecte si un lieu est un parc ou une rue pour le rendu OSM."""
    lieu = (str(row.get('adresse', '')) + " " + str(row.get('type_lieu', ''))).lower()
    lieu = ''.join(c for c in unicodedata.normalize('NFD', lieu) if unicodedata.category(c) != 'Mn')
    if any(kw in lieu for kw in ['jardin', 'parc', 'square', 'bois', 'forest', 'garden', 'park']): return 'park'
    if any(kw in lieu for kw in ['rue', 'boulevard', 'avenue', 'quai', 'place', 'voie', 'route', 'chemin']): return 'street'
    return 'point'

def fetch_osm_geometry(lat, lon, osm_type, dist=1000):
    """Récupère la géométrie OSM (Polygone/Ligne) pour un point donné."""
    try:
        if osm_type == 'park':
            features = ox.features_from_point((lat, lon), tags=TAGS_PARKS, dist=dist)
            if not features.empty:
                gdf = features[features.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()
                if not gdf.empty: return unary_union(gdf.geometry), 'park'
        elif osm_type == 'street':
            graph = ox.graph_from_point((lat, lon), dist=dist, network_type='walk')
            if len(graph) > 0:
                edges = ox.graph_to_gdfs(graph, nodes=False)
                if not edges.empty: return unary_union(edges.geometry), 'street'
    except Exception as e:
        log_exception(component="geo_service", action="fetch_osm_geometry", exc=e, message="OSM lookup failed")
    return None, 'point'

def save_uploaded_image(uploaded_file, prefix="upload"):
    """Sauvegarde localement une image uploadée."""
    if not uploaded_file: return None
    uploads_dir = os.path.join(os.getcwd(), "data", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    safe_name = f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{re.sub(r'[^A-Za-z0-9._-]', '_', uploaded_file.name)}"
    save_path = os.path.join(uploads_dir, safe_name)
    with open(save_path, "wb") as f: f.write(uploaded_file.getbuffer())
    return save_path
