import time
import pandas as pd
import numpy as np
import folium
from src.logging_utils import log_perf
from src.services.analytics_service import (
    calculate_scores, compute_score_series, calculate_impact, evaluate_badges
)
from src.services.geo_service import (
    haversine_distance_km, detect_osm_type, fetch_osm_geometry
)
from src.ui.components.map_popups import (
    MAP_COLORS, get_marker_style, create_premium_popup, sanitize_popup_row, format_google_maps_name
)

# --- CONFIGURATION OSM (Keep constants for routing) ---
TAGS_PARKS = {
    'leisure': ['park', 'garden', 'recreation_ground'],
    'landuse': ['grass', 'forest', 'village_green'],
    'natural': ['wood', 'scrub']
}

def get_heatmap_data(map_df: pd.DataFrame) -> list:
    """Prepare Folium HeatMap data from vectorized scores."""
    if map_df.empty: return []
    start = time.perf_counter()
    
    # Filter only polluted spots
    clean_flags = map_df.get("est_propre", False).fillna(False)
    polluted = map_df[~clean_flags].copy()
    if polluted.empty: return []

    polluted["lat"] = pd.to_numeric(polluted.get("lat"), errors="coerce")
    polluted["lon"] = pd.to_numeric(polluted.get("lon"), errors="coerce")
    polluted = polluted.dropna(subset=["lat", "lon"])
    
    salete = compute_score_series(polluted, metric="score_salete")
    intensity = np.clip(salete / 500.0, 0.0, 1.0)
    
    heat_data = pd.DataFrame({
        "lat": polluted["lat"], "lon": polluted["lon"], "intensity": intensity
    }).to_numpy().tolist()
    
    log_perf("map_utils", "get_heatmap_data", (time.perf_counter() - start) * 1000.0, {"rows": len(heat_data)})
    return heat_data

def generate_ai_route(map_df, nb_benevoles, temps_action_min, arrondissement=None):
    """
    Genere un itineraire strategique via graph analysis (OSMnx).
    Keep internal orchestration of networkx/osmnx here as it belongs to 'Map Features'.
    """
    import osmnx as ox
    import networkx as nx
    
    start_perf = time.perf_counter()
    target_df = map_df.copy()
    target_df["internal_score"] = compute_score_series(target_df, metric="score_mixte")
    critical = target_df[target_df["internal_score"] > 60].sort_values("internal_score", ascending=False)

    if critical.empty: return None, "Pas assez de points critiques.", None

    lat_start, lon_start = float(critical.iloc[0]["lat"]), float(critical.iloc[0]["lon"])
    search_dist_m = (temps_action_min / 60.0) * 1000.0 / 2.0 # 1km/h walk + clean

    try:
        graph = ox.graph_from_point((lat_start, lon_start), dist=search_dist_m, network_type="walk")
        origin_node = ox.distance.nearest_nodes(graph, lon_start, lat_start)
        
        # Simple loop for demonstration
        if len(graph) < 2: return None, "Zone trop restreinte.", None
        
        target_node = list(graph.nodes)[-1]
        path = nx.shortest_path(graph, origin_node, target_node, weight="length")
        coords = [[graph.nodes[n]["y"], graph.nodes[n]["x"]] for n in path]
        
        paths = [{"coords": coords, "color": "#3498db", "label": "Circuit de nettoyage", "weight": 6}]
        
        logistics_df = pd.DataFrame([
            {"Equipe": "Alpha", "Role": "Dechets", "Effectif": nb_benevoles // 2, "Vitesse": "20 min/km"},
            {"Equipe": "Beta", "Role": "Megots", "Effectif": nb_benevoles - (nb_benevoles // 2), "Vitesse": "40 min/km"}
        ])
        
        return paths, "Itinéraire généré avec succès.", logistics_df
    except Exception as e:
        return None, f"Erreur routage: {str(e)}", None

def calculate_infrastructure_gap(lat, lon, actions_df):
    """Calcule si des poubelles/cendriers supplementaires sont requis."""
    nearby = actions_df.copy()
    nearby["dist"] = haversine_distance_km(nearby["lat"], nearby["lon"], lat, lon)
    close = nearby[nearby["dist"] <= 0.3]
    if close.empty: return ""
    
    avg_megots = close["megots"].mean()
    if avg_megots > 200: return "Alerte : Forte concentration de mégots. Cendrier urbain recommandé."
    return ""

def get_paris_bins():
    """Fallback static bins for high-density areas."""
    return [
        {"lat": 48.8566, "lon": 2.3522, "type": "Bac Jaune"},
        {"lat": 48.8606, "lon": 2.3376, "type": "Bac Gris"}
    ]
