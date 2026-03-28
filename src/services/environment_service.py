import os
import requests
import osmnx as ox
import networkx as nx
from requests import RequestException
from src.logging_utils import log_event, log_exception

def get_osmnx_graph(center_lat, center_lon, dist):
    """
    Récupère le graphe routier (pour piétons) depuis OSMNX pour une zone donnée.
    """
    try:
        return ox.graph_from_point((center_lat, center_lon), dist=dist, network_type="walk", simplify=True)
    except Exception as exc:
        log_exception(
            component="environment_service",
            action="get_osmnx_graph",
            exc=exc,
            message="Failed to fetch graphs from OSMNx",
            context={"lat": center_lat, "lon": center_lon, "dist": dist},
            severity="error",
        )
        return None

def add_elevations_to_graph(G):
    """
    Enrichit le graphe avec des données d'altitude via l'API Open-Elevation.
    """
    if G is None:
        return None
        
    try:
        nodes = list(G.nodes(data=True))
        coords = [{"latitude": data["y"], "longitude": data["x"]} for _, data in nodes]
        
        # Open-Elevation API (Public)
        # On fragmente par paquets de 100 pour éviter les timeouts
        batch_size = 100
        elevations = []
        
        for i in range(0, len(coords), batch_size):
            batch = coords[i:i+batch_size]
            resp = requests.post("https://api.open-elevation.com/api/v1/lookup", json={"locations": batch}, timeout=10)
            if resp.status_code == 200:
                elevations.extend([loc["elevation"] for loc in resp.json()["results"]])
            else:
                return G # Fallback sans altitude
        
        for (node_id, data), elev in zip(nodes, elevations):
            data["elevation"] = elev
            
        return G
    except (RequestException, ValueError, TypeError, KeyError) as exc:
        log_exception(
            component="environment_service",
            action="add_elevations_to_graph",
            exc=exc,
            message="Failed to enrich graph with elevations",
            severity="warning",
        )
        return G

def calculate_flow_sinks(G, threshold_slope=0.03):
    """
    Identifie les points bas (sinks) où les déchets convergent.
    Un sink est un noeud dont l'altitude est inférieure à tous ses voisins 
    et qui est situé en bas d'une rue à forte pente (>3%).
    """
    sinks = []
    if G is None or len(G.nodes) == 0:
        return sinks
        
    nodes_data = list(G.nodes(data=True))
    if "elevation" not in nodes_data[0][1]:
        return sinks

    for node, data in G.nodes(data=True):
        elev = data.get("elevation", 0)
        neighbors = list(G.neighbors(node))
        if not neighbors:
            continue
        
        is_sink = True
        steep_input = False
        
        for nb in neighbors:
            nb_elev = G.nodes[nb].get("elevation", elev)
            if nb_elev < elev:
                is_sink = False
                break
            
            # Calcul de la pente
            dist = ox.distance.great_circle_vec(data["y"], data["x"], G.nodes[nb]["y"], G.nodes[nb]["x"])
            if dist > 0:
                slope = (nb_elev - elev) / dist
                if slope > threshold_slope:
                    steep_input = True
        
        if is_sink and steep_input:
            sinks.append({
                "lat": data["y"],
                "lon": data["x"],
                "type": "Point de Capture Prioritaire",
                "description": "Entonnoir à pollution : point bas topographique récoltant les eaux de ruissellement."
            })
            
    return sinks

def check_flood_risk(lat, lon, adresse, type_lieu):
    """
    Vérifie le risque d'inondation locale via l'API Open-Meteo.
    """
    if not lat or not lon:
        return False

    keywords = ["seine", "bièvre", "quai", "berge", "canal", "fleuve", "riviere", "eau", "lac"]
    adresse_lower = str(adresse).lower()
    is_water = (type_lieu == "Quai/Pont/Port") or any(k in adresse_lower for k in keywords)

    if is_water:
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&past_days=3&daily=precipitation_sum&timezone=auto"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            payload = response.json()
            daily = payload.get("daily", {})
            precipitation = daily.get("precipitation_sum", []) if isinstance(daily, dict) else []
            total_precip = sum(p for p in precipitation if p is not None)
            return total_precip > 10.0
        except (RequestException, ValueError, TypeError) as exc:
            log_exception(
                component="environment_service",
                action="check_flood_risk",
                exc=exc,
                message="Flood risk API lookup failed",
                context={"lat": lat, "lon": lon},
                severity="warning",
            )
    return False
