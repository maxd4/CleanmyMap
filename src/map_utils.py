from datetime import datetime
from dataclasses import dataclass
from typing import Any, Mapping
import time
import folium
import re
import osmnx as ox
import networkx as nx
import numpy as np
import pandas as pd
from shapely.ops import unary_union
from shapely.geometry import Point
import unicodedata
from src.security_utils import sanitize_html_multiline, sanitize_html_text
from src.logging_utils import log_exception, log_perf
from src.text_utils import repair_mojibake_text

# --- CONFIGURATION DES COULEURS ---
MAP_COLORS = {
    'clean': '#3498db',      # Bleu (Zone propre)
    'low': '#27ae60',        # Vert (Standard/Faible)
    'medium': '#e67e22',     # Orange (Moyen/Ancien)
    'critical': '#8e44ad',    # Violet (Point noir)
    'business': '#FFD700',   # Or (ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°tablissement EngagÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©)
    'park': '#2ecc71',       # Vert OSM (Parcs)
    'street': '#95a5a6'      # Gris OSM (Rues)
}

# --- CONFIGURATION OSM ---
TAGS_PARKS = {
    'leisure': ['park', 'garden', 'recreation_ground'],
    'landuse': ['grass', 'forest', 'village_green'],
    'natural': ['wood', 'scrub']
}

EARTH_RADIUS_KM = 6371.0088


@dataclass(frozen=True, slots=True)
class SanitizedPopupRow:
    """Normalized row values for popup rendering and escaped text fragments for HTML."""

    row: dict[str, Any]
    escaped: dict[str, str]

def format_google_maps_name(row):
    """Formate le nom du lieu pour qu'il ressemble ÃƒÆ'Ã†'Ãƒâ€ '  un affichage Google Maps."""
    adresse = str(row.get('adresse', '')).strip()
    type_lieu = str(row.get('type_lieu', '')).strip()
    assoc = str(row.get('association', '')).strip()
    
    if "ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°tablissement" in type_lieu:
        return f"{assoc} ({adresse})"
    
    # Nettoyage de l'adresse (on enlÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ve le CP et la ville si redondant)
    adresse_clean = re.sub(r',\s*\d{5}.*$', '', adresse)
    
    if type_lieu and type_lieu != "Lieu" and type_lieu not in adresse:
        return f"{type_lieu}, {adresse_clean}"
    
    return adresse_clean

def detect_osm_type(row):
    """DÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tecte si le lieu est une rue ou un espace vert."""
    lieu = (str(row.get('adresse', '')) + " " + str(row.get('type_lieu', ''))).lower()
    
    # Normalisation
    lieu = ''.join(c for c in unicodedata.normalize('NFD', lieu) if unicodedata.category(c) != 'Mn')
    
    if any(kw in lieu for kw in ['jardin', 'parc', 'square', 'bois', 'pelouse', 'forest', 'garden', 'park']):
        return 'park'
    if any(kw in lieu for kw in ['rue', 'boulevard', 'avenue', 'quai', 'place', 'voie', 'route', 'chemin']):
        return 'street'
    return 'point'


def _normalize_street_name(name):
    if name is None:
        return ""
    if isinstance(name, (list, tuple, set)):
        parts = [str(p) for p in name if p]
        name = " ".join(parts)
    text = str(name).strip().lower()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _same_street_family(candidate_name, main_name):
    if not main_name:
        return False
    if not candidate_name:
        return False
    return (
        candidate_name == main_name
        or candidate_name in main_name
        or main_name in candidate_name
    )


def _as_highway_set(value):
    if isinstance(value, (list, tuple, set)):
        return {str(v).lower() for v in value if v}
    if value:
        return {str(value).lower()}
    return set()


def _extract_place_keywords(text):
    raw = _normalize_street_name(text)
    if not raw:
        return []
    stopwords = {
        "de", "du", "des", "la", "le", "les", "un", "une", "et", "a", "au", "aux",
        "theatre", "theatre", "jardin", "parc", "square", "bois", "espace", "vert",
        "rue", "avenue", "boulevard", "quai", "place", "route", "chemin", "voie",
        "saint", "sainte", "paris", "france"
    }
    keywords = []
    for token in raw.split():
        if len(token) < 4:
            continue
        if token.isdigit():
            continue
        if token in stopwords:
            continue
        if token not in keywords:
            keywords.append(token)
    return keywords[:5]


def fetch_osm_geometry(lat, lon, osm_type, target_distance_m=None, place_hint=None):
    """RÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cupÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨re la gÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©omÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©trie OSM (Polygone ou PolyLine) ÃƒÆ'Ã†'Ãƒâ€ '  partir d'un point.

    Pour les rues, on ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tend le tracÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© selon une distance cible (mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨tres) pour
    ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©viter les segments trop courts visuellement.
    """
    try:
        if osm_type == 'park':
            # Rayon ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©largi pour pouvoir rÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cupÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©rer le parc principal mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªme si le point
            # est proche d'un sous-espace (ex: thÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢tre, pelouse annexe, etc.).
            features = ox.features_from_point((lat, lon), tags=TAGS_PARKS, dist=1000)
            if not features.empty:
                point_pnt = Point(lon, lat)
                gdf = features.copy()
                gdf = gdf[gdf.geometry.notnull()].copy()
                gdf = gdf[gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()

                if not gdf.empty:
                    # PrioritÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© aux vÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ritables parcs (leisure=park/garden/recreation_ground)
                    candidate_pool = gdf
                    if "leisure" in gdf.columns:
                        leisure_norm = gdf["leisure"].astype(str).str.lower()
                        leisure_mask = leisure_norm.isin(["park", "garden", "recreation_ground"])
                        if leisure_mask.any():
                            candidate_pool = gdf[leisure_mask].copy()

                    gdf_proj = candidate_pool.to_crs(epsg=3857)
                    point_proj = ox.projection.project_geometry(point_pnt, to_crs=3857)[0]

                    candidate_pool["distance_m"] = gdf_proj.geometry.distance(point_proj)
                    candidate_pool["area_m2"] = gdf_proj.geometry.area
                    candidate_pool["contains_point"] = candidate_pool.geometry.contains(point_pnt)

                    name_cols = [c for c in ["name", "official_name", "alt_name", "short_name"] if c in candidate_pool.columns]
                    if name_cols:
                        candidate_pool["name_norm"] = candidate_pool[name_cols].astype(str).agg(" ".join, axis=1).map(_normalize_street_name)
                    else:
                        candidate_pool["name_norm"] = ""

                    keywords = _extract_place_keywords(place_hint or "")
                    if keywords:
                        candidate_pool["match_score"] = candidate_pool["name_norm"].map(
                            lambda n: sum(1 for kw in keywords if kw in n)
                        )
                        matched = candidate_pool[candidate_pool["match_score"] > 0].copy()
                        if not matched.empty:
                            # On conserve les meilleurs matchs textuels, puis on ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©vite de choisir
                            # un micro-polygone local si un grand parc correspondant est proche.
                            max_score = matched["match_score"].max()
                            top = matched[matched["match_score"] == max_score].copy()

                            nearby_top = top[top["distance_m"] <= 850].copy()
                            if not nearby_top.empty:
                                top = nearby_top

                            top_sorted_area = top.sort_values(
                                by=["area_m2", "distance_m"],
                                ascending=[False, True],
                            )
                            largest_top = top_sorted_area.iloc[0]

                            top_containers = top[top["contains_point"]].copy()
                            if not top_containers.empty:
                                best_container = top_containers.sort_values(
                                    by=["area_m2", "distance_m"],
                                    ascending=[False, True],
                                ).iloc[0]
                                # Cas type "Parc des Buttes-Chaumont" : si un grand parc proche
                                # est trÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s dominant, on le prÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©fÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨re au petit sous-espace englobant.
                                if (
                                    float(largest_top["area_m2"]) >= float(best_container["area_m2"]) * 2.2
                                    and float(largest_top["distance_m"]) <= 500.0
                                ):
                                    target = largest_top
                                else:
                                    target = best_container
                            else:
                                target = largest_top
                            return target.geometry, 'park'

                    # Fallback sans nom: on privilÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©gie un polygone englobant, puis la plus grande surface proche.
                    containers = candidate_pool[candidate_pool["contains_point"]].copy()
                    if not containers.empty:
                        best_container = containers.sort_values(
                            by=["area_m2", "distance_m"],
                            ascending=[False, True],
                        ).iloc[0]

                        nearby_large = candidate_pool[candidate_pool["distance_m"] <= 500].copy()
                        if not nearby_large.empty:
                            largest_near = nearby_large.sort_values(
                                by=["area_m2", "distance_m"],
                                ascending=[False, True],
                            ).iloc[0]
                            if float(largest_near["area_m2"]) >= float(best_container["area_m2"]) * 2.2:
                                return largest_near.geometry, 'park'

                        return best_container.geometry, 'park'

                    nearby = candidate_pool[candidate_pool["distance_m"] <= 600].copy()
                    pool = nearby if not nearby.empty else candidate_pool.copy()
                    target = pool.sort_values(
                        by=["area_m2", "distance_m"],
                        ascending=[False, True],
                    ).iloc[0]
                    return target.geometry, 'park'
         
        elif osm_type == 'street':
            # Recherche de rues avec rayon adaptÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© ÃƒÆ'Ã†'Ãƒâ€ '  la distance cible.
            target_distance_m = float(target_distance_m or 700.0)
            target_distance_m = max(250.0, min(target_distance_m, 2200.0))
            max_distance_m = max(target_distance_m * 1.35, 180.0)
            search_dist = int(max(900, min(3200, target_distance_m * 1.7)))
            graph = ox.graph_from_point((lat, lon), dist=search_dist, network_type='all')
            if len(graph) > 0:
                edges = ox.graph_to_gdfs(graph, nodes=False)

                if edges.empty:
                    return None, 'point'

                # Trouver l'arÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªte la plus proche pour le point de dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©part
                u, v, key = ox.nearest_edges(graph, lon, lat)

                if (u, v, key) in edges.index:
                    start_edge = edges.loc[(u, v, key)]
                elif (v, u, key) in edges.index:
                    start_edge = edges.loc[(v, u, key)]
                else:
                    start_edge = edges.iloc[0]

                main_name = _normalize_street_name(start_edge.get('name'))
                main_highway = _as_highway_set(start_edge.get('highway'))

                graph_ud = nx.MultiGraph(graph)
                selected_edge_ids = set()
                visited_edge_ids = set()
                queue = [u, v]
                visited_nodes = {u, v}
                total_length_m = 0.0

                def resolve_edge_id(a, b, k):
                    if (a, b, k) in edges.index:
                        return (a, b, k)
                    if (b, a, k) in edges.index:
                        return (b, a, k)
                    return None

                while queue and total_length_m < max_distance_m:
                    curr_node = queue.pop(0)
                    for nbr in graph_ud.neighbors(curr_node):
                        edge_variants = graph_ud.get_edge_data(curr_node, nbr) or {}
                        for k, data in edge_variants.items():
                            edge_id = resolve_edge_id(curr_node, nbr, k)
                            if edge_id is None or edge_id in visited_edge_ids:
                                continue

                            edge_name = _normalize_street_name(data.get('name'))
                            edge_highway = _as_highway_set(data.get('highway'))

                            # PrioritÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© au mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªme nom de rue; fallback raisonnable si nom absent.
                            same_name = _same_street_family(edge_name, main_name)
                            compatible_highway = bool(main_highway & edge_highway) if main_highway else True
                            allow_connector = (not edge_name) and compatible_highway
                            if main_name:
                                if not (same_name or allow_connector):
                                    continue
                            elif not compatible_highway:
                                continue

                            edge_len = float(data.get('length') or edges.loc[edge_id].get('length') or 0.0)
                            if edge_len <= 0.0:
                                edge_len = 25.0

                            selected_edge_ids.add(edge_id)
                            visited_edge_ids.add(edge_id)
                            total_length_m += edge_len

                            if nbr not in visited_nodes and total_length_m < max_distance_m:
                                visited_nodes.add(nbr)
                                queue.append(nbr)

                    # Si le nom de rue n'est pas trouvÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© dans le voisinage, on garde au moins l'arÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªte de dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©part.
                    if not selected_edge_ids:
                        fallback_id = resolve_edge_id(u, v, key)
                        if fallback_id is not None:
                            selected_edge_ids.add(fallback_id)
                            visited_edge_ids.add(fallback_id)
                            total_length_m = float(edges.loc[fallback_id].get('length') or 40.0)

                    # Stop dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s qu'on a une longueur pertinente.
                    if total_length_m >= target_distance_m:
                        break

                # Si la portion trouvÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e reste trop courte, on autorise une extension
                # contrÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´lÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e sur des segments de voirie compatibles pour mieux
                # reprÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©senter une action longue (ex: dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©pollution de quai).
                min_required_m = min(target_distance_m * 0.72, 950.0)
                if selected_edge_ids and total_length_m < min_required_m:
                    ext_queue = list(visited_nodes) if visited_nodes else [u, v]
                    ext_seen_nodes = set(ext_queue)

                    while ext_queue and total_length_m < min_required_m and total_length_m < max_distance_m:
                        curr_node = ext_queue.pop(0)
                        for nbr in graph_ud.neighbors(curr_node):
                            edge_variants = graph_ud.get_edge_data(curr_node, nbr) or {}
                            for k, data in edge_variants.items():
                                edge_id = resolve_edge_id(curr_node, nbr, k)
                                if edge_id is None or edge_id in visited_edge_ids:
                                    continue

                                edge_highway = _as_highway_set(data.get('highway'))
                                compatible_highway = bool(main_highway & edge_highway) if main_highway else True
                                if not compatible_highway:
                                    continue

                                edge_len = float(data.get('length') or edges.loc[edge_id].get('length') or 0.0)
                                if edge_len <= 0.0:
                                    edge_len = 25.0
                                if total_length_m + edge_len > max_distance_m:
                                    continue

                                selected_edge_ids.add(edge_id)
                                visited_edge_ids.add(edge_id)
                                total_length_m += edge_len

                                if nbr not in ext_seen_nodes:
                                    ext_seen_nodes.add(nbr)
                                    ext_queue.append(nbr)

                                if total_length_m >= min_required_m:
                                    break
                            if total_length_m >= min_required_m:
                                break

                if selected_edge_ids:
                    final_geoms = [edges.loc[eid].geometry for eid in selected_edge_ids if eid in edges.index]
                    if final_geoms:
                        return unary_union(final_geoms), 'street'
                     
    except (ValueError, TypeError, KeyError, IndexError, nx.NetworkXException) as exc:
        log_exception(
            component="map_utils",
            action="fetch_osm_geometry",
            exc=exc,
            message="OSM geometry lookup failed",
            context={"lat": lat, "lon": lon, "osm_type": osm_type},
            severity="warning",
        )
    return None, 'point'

def calculate_scores(row):
    """Calcule les scores de saletÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© et de mixitÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© (anciennetÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©) pour une action."""
    # 1. Extraction des donnÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©es de base
    megots = float(row.get('megots', 0))
    dechets_kg = float(row.get('dechets_kg', 0))
    # Approximation : 1 sac ~ 5kg si dechets_kg absent (non utilisÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© ici car dechets_kg est standard)
    
    # Temps et BÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©voles
    temps = float(row.get('temps_min', 60)) / 60.0 # Heures
    ben = float(row.get('nb_benevoles', 1))
    
    # 2. Score de SaletÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© (IntensitÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©)
    # Formule inspirÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e du code historique : (mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©gots + kg*50) / (heures * bÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©voles)
    # On multiplie les kg par 50 pour donner un poids ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©quivalent ÃƒÆ'Ã†'Ãƒâ€ '  50 mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©gots par kg de dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©chets
    effort = max(temps * ben, 0.5) # Minimum 0.5h effort-homme
    score_salete = (megots + (dechets_kg * 50)) / effort
    
    # 3. AnciennetÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©
    date_action = row.get('date')
    if pd.isna(date_action):
        jours = 365 # Par dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©faut
    else:
        try:
            date_dt = pd.to_datetime(date_action)
            if hasattr(date_dt, 'tz') and date_dt.tz is not None:
                date_dt = date_dt.tz_localize(None)
            jours = (datetime.now() - date_dt).days
        except (TypeError, ValueError, OverflowError):
            jours = 365

    # 4. Score Mixte (NormalisÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© sur 100)
    # SaletÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© (70%) + AnciennetÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© (30%)
    # On plafonne le score de saletÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© ÃƒÆ'Ã†'Ãƒâ€ '  une valeur "trÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s sale" pour la normalisation (ex: 500)
    norm_salete = min(score_salete / 500.0, 1.0) * 70
    norm_temps = min(max(jours, 0) / 540.0, 1.0) * 30 # Max impact aprÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s 18 mois
    
    score_mixte = norm_salete + norm_temps
    
    # 5. Calcul des Eco-Points (Innovation Gamification)
    # 10 pts fixe + 10 pts/15min + 5 pts/kg + 1 pt/100 mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©gots
    points = 10 
    points += (float(row.get('temps_min', 60)) / 15.0) * 10
    points += dechets_kg * 5
    points += (megots / 100.0)
    
    return {
        'score_salete': score_salete,
        'score_mixte': score_mixte,
        'jours': jours,
        'eco_points': int(points)
    }


def compute_score_components(df: pd.DataFrame) -> pd.DataFrame:
    """Compute score components with vectorized operations for hot paths."""
    if df.empty:
        return pd.DataFrame(
            {
                "score_salete": pd.Series(dtype=float),
                "score_mixte": pd.Series(dtype=float),
                "jours": pd.Series(dtype=float),
                "eco_points": pd.Series(dtype=float),
            },
            index=df.index,
        )

    megots = pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0.0)
    dechets_kg = pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0.0)

    temps_minutes = pd.to_numeric(df.get("temps_min", 60), errors="coerce").fillna(60.0)
    temps_h = temps_minutes / 60.0

    ben = pd.to_numeric(
        df.get("nb_benevoles", df.get("benevoles", 1)),
        errors="coerce",
    ).fillna(1.0)
    effort = (temps_h * ben).clip(lower=0.5)

    score_salete = (megots + (dechets_kg * 50.0)) / effort

    date_col = pd.to_datetime(df.get("date"), errors="coerce")
    if date_col.isna().all() and "submitted_at" in df.columns:
        date_col = pd.to_datetime(df.get("submitted_at"), errors="coerce")

    now_ts = pd.Timestamp.now()
    jours = (now_ts - date_col).dt.days.astype(float)
    jours = jours.fillna(365.0).clip(lower=0.0)

    norm_salete = np.minimum(score_salete / 500.0, 1.0) * 70.0
    norm_temps = np.minimum(jours / 540.0, 1.0) * 30.0
    score_mixte = norm_salete + norm_temps

    eco_points = 10.0 + ((temps_minutes / 15.0) * 10.0) + (dechets_kg * 5.0) + (megots / 100.0)

    return pd.DataFrame(
        {
            "score_salete": score_salete.astype(float),
            "score_mixte": score_mixte.astype(float),
            "jours": jours.astype(float),
            "eco_points": eco_points.astype(float),
        },
        index=df.index,
    )


def compute_score_series(df: pd.DataFrame, metric: str = "score_mixte") -> pd.Series:
    components = compute_score_components(df)
    if metric not in components.columns:
        raise ValueError(f"Unknown score metric: {metric}")
    return components[metric]


def haversine_distance_km(
    lat_series: pd.Series,
    lon_series: pd.Series,
    ref_lat: float,
    ref_lon: float,
) -> pd.Series:
    """Vectorized Haversine distance between series points and a reference point."""
    lat = pd.to_numeric(lat_series, errors="coerce").astype(float)
    lon = pd.to_numeric(lon_series, errors="coerce").astype(float)
    ref_lat_val = float(ref_lat)
    ref_lon_val = float(ref_lon)

    lat_rad = np.radians(lat)
    lon_rad = np.radians(lon)
    ref_lat_rad = np.radians(ref_lat_val)
    ref_lon_rad = np.radians(ref_lon_val)

    delta_lat = lat_rad - ref_lat_rad
    delta_lon = lon_rad - ref_lon_rad
    a = (
        np.sin(delta_lat / 2.0) ** 2
        + np.cos(ref_lat_rad) * np.cos(lat_rad) * (np.sin(delta_lon / 2.0) ** 2)
    )
    a = np.clip(a, 0.0, 1.0)
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    distance = EARTH_RADIUS_KM * c

    return pd.Series(distance, index=lat_series.index, dtype=float)

def calculate_impact(megots, dechets_kg):
    """Calcule l'ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©quivalence ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cologique d'une action."""
    # 1 mÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©got pollue jusqu'ÃƒÆ'Ã†'Ãƒâ€ '  500L d'eau
    eau_sauvee = megots * 500
    
    # ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°missions de CO2 ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©vitÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©es (Moyenne : 2kg CO2 par kg de dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©chet collectÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©/triÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©)
    co2_evite = dechets_kg * 2.0
    
    # ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°quivalence bouteilles plastiques (1kg ~ 40 bouteilles)
    bouteilles = dechets_kg * 40
    
    return {
        'eau_litres': eau_sauvee,
        'co2_kg': co2_evite,
        'bouteilles': int(bouteilles)
    }

def evaluate_badges(user_stats: Mapping[str, Any] | None) -> tuple[list[dict[str, str]], list[str]]:
    """Return unlocked badges and warnings when KPI prerequisites are missing."""
    stats = dict(user_stats or {})
    badges: list[dict[str, str]] = []
    warnings: list[str] = []

    nb_actions = int(pd.to_numeric(stats.get("nb_actions"), errors="coerce") or 0)
    total_points = int(pd.to_numeric(stats.get("total_points"), errors="coerce") or 0)
    total_kg_numeric = pd.to_numeric(stats.get("total_kg"), errors="coerce")
    total_kg_available = bool(pd.notna(total_kg_numeric))
    total_kg = float(total_kg_numeric) if total_kg_available else 0.0

    if nb_actions >= 1:
        badges.append({"id": "first_action", "name": "Premier Pas", "desc": "Premiere action de nettoyage validee."})
    if nb_actions >= 5:
        badges.append({"id": "regular", "name": "Sentinelle de Paris", "desc": "5 actions de depollution."})
    if total_kg_available and total_kg >= 50:
        badges.append({"id": "heavy_lifter", "name": "Hercule du Propre", "desc": "Plus de 50kg de dechets ramasses."})
    if not total_kg_available:
        warnings.append("KPI total_kg indisponible : badges de volume desactives.")
    if total_points >= 1000:
        badges.append({"id": "eco_hero", "name": "Eco-Heros", "desc": "Plus de 1000 Eco-Points accumules."})

    return badges, warnings


def check_badges(user_stats):
    """Detecte les badges debloques par un utilisateur."""
    badges, _ = evaluate_badges(user_stats)
    return badges


def get_marker_style(row, score_data):
    """DÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©termine la couleur et le rayon du marqueur selon les scores."""
    is_clean = row.get('est_propre', False)
    is_business = row.get('type_lieu') == "ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°tablissement EngagÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© (Label)"
    
    if is_business:
        return MAP_COLORS['business'], 18, 'star'
    
    if is_clean:
        return MAP_COLORS['clean'], 12, 'leaf'
    
    score = score_data['score_mixte']
    jours = score_data['jours']
    
    # Classification par seuils
    if score > 80:
        color = MAP_COLORS['critical']
        radius = 16
    elif score > 50 or jours > 365:
        color = MAP_COLORS['medium']
        radius = 13
    else:
        color = MAP_COLORS['low']
        radius = 10
        
    return color, radius, 'circle'


_POPUP_TEXT_LIMITS: dict[str, int] = {
    "adresse": 160,
    "association": 120,
    "commentaire": 320,
    "type_lieu": 80,
    "tendance": 80,
    "adresse_depart": 160,
    "adresse_arrivee": 160,
    "type_dechet": 80,
    "reporter_name": 80,
    "place_name": 180,
}


def _normalize_popup_text_value(value: Any, max_len: int) -> str:
    if value is None:
        return ""
    if isinstance(value, (float, np.floating)) and pd.isna(value):
        return ""
    text = str(value).replace("\x00", "").strip()
    if text.lower() in {"nan", "none", "null"}:
        return ""
    return text[:max_len]


def sanitize_popup_row(row: Mapping[str, Any] | None) -> SanitizedPopupRow:
    """
    Sanitize dynamic row values used by map popups/tooltips.

    - normalize null/NaN and unexpected values
    - truncate text fields
    - provide escaped variants for direct HTML interpolation
    """
    source = dict(row or {})
    clean_row = dict(source)
    escaped: dict[str, str] = {}

    for field, max_len in _POPUP_TEXT_LIMITS.items():
        clean_text = _normalize_popup_text_value(source.get(field), max_len=max_len)
        clean_row[field] = clean_text
        escaped[field] = sanitize_html_text(clean_text, max_len=max_len)

    place_name = format_google_maps_name(clean_row)
    place_name = _normalize_popup_text_value(place_name, max_len=_POPUP_TEXT_LIMITS["place_name"])
    clean_row["place_name"] = place_name
    escaped["place_name"] = sanitize_html_text(place_name, max_len=_POPUP_TEXT_LIMITS["place_name"])

    return SanitizedPopupRow(row=clean_row, escaped=escaped)


def _parse_tags(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        parts = [str(v).strip() for v in value if str(v).strip()]
    else:
        parts = [p.strip() for p in re.split(r"[|,;/]+", str(value)) if p.strip()]
    dedup = []
    for tag in parts:
        if tag not in dedup:
            dedup.append(tag)
    return dedup


def _source_badge(source_value):
    source_raw = str(source_value or "").strip().lower()
    if source_raw in {"simulation", "simule", "simulee", "test", "demo"}:
        return ("DonnÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©es simulÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©es", "#ede9fe", "#6d28d9")
    return ("DonnÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©es rÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©elles", "#dcfce7", "#166534")

def create_premium_popup(row, score_data, gap_alert=""):
    """Generate popup HTML from a submission row with escaped dynamic fields."""
    row = sanitize_popup_row(row).row
    is_clean = row.get("est_propre", False)
    is_business = row.get("type_lieu") == "ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°tablissement EngagÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© (Label)"

    safe_address = sanitize_html_text(row.get("adresse", "Lieu inconnu"), max_len=160)
    safe_association = sanitize_html_text(row.get("association", "Action"), max_len=120)
    safe_comment = sanitize_html_multiline(
        row.get("commentaire", "Lieu labellisÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© pour son engagement."),
        max_len=320,
    )
    safe_type_lieu = sanitize_html_text(row.get("type_lieu", "Lieu"), max_len=80)
    safe_trend = sanitize_html_text(row.get("tendance", "Premier passage"), max_len=80)
    safe_start_addr = sanitize_html_text(row.get("adresse_depart") or row.get("adresse") or "", max_len=160)
    safe_end_addr = sanitize_html_text(row.get("adresse_arrivee") or "", max_len=160)
    safe_gap = sanitize_html_text(gap_alert.replace("<br>", " "), max_len=220)

    color, _, _ = get_marker_style(row, score_data)

    gap_html = (
        f"""
    <div style="background: #fff7ed; padding: 8px; border-radius: 8px; border: 1px dashed #fb923c; margin-top: 10px; font-size: 10px; color: #c2410c; text-align: center;">
        ÃƒÆ'Ã†'Ãƒâ€šÃ‚Â¢ÃƒÆ'...Ãƒâ€šÃ‚Â¡ ÃƒÆ'Ã†'Ãƒâ€šÃ‚Â¯ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â <b>Besoin d'ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©quipement</b><br>{safe_gap}
    </div>
    """
        if safe_gap
        else ""
    )

    if is_clean:
        safe_avatar = safe_association[:1].upper() if safe_association else "B"
        return repair_mojibake_text(f"""
        <div style="font-family: 'Outfit', sans-serif; width: 260px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.1); border: 2px solid #3498db33;">
            <div style="background: linear-gradient(135deg, #ebf8ff, #e0fdf4); color: #2980b9; padding: 15px; text-align: center; border-bottom: 1px solid #3498db11;">
                <div style="font-size: 28px; margin-bottom: 5px;">ÃƒÆ'Ã†'Ãƒâ€šÃ‚°ÃƒÆ'...Ãƒâ€šÃ‚Â¸ÃƒÆ'...ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿</div>
                <div style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e40af;">Zone Impeccable</div>
                <div style="font-size: 10px; font-weight: 500; color: #3b82f6;">Signalement de PropretÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©</div>
            </div>
            <div style="padding: 15px; background: white;">
                <div style="font-size: 13px; color: #475569; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 16px;">*</span>
                    <span>{safe_address}</span>
                </div>
                <div style="background: #f0fdf4; padding: 10px; border-radius: 10px; border: 1px solid #dcfce7; display: flex; align-items: center; gap: 10px;">
                    <div style="background: #22c55e; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">
                        {safe_avatar}
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #166534; text-transform: uppercase; font-weight: 700;">ValidÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© par</div>
                        <div style="font-size: 13px; font-weight: 600; color: #14532d;">{safe_association or "BÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©vole"}</div>
                    </div>
                </div>
            </div>
        <div style="padding: 8px; background: #f8fafc; text-align: center; font-size: 10px; color: #94a3b8; font-style: italic;">
                Derniere verification le {pd.to_datetime(row.get('date')).strftime('%d/%m/%Y') if pd.notna(row.get('date')) else 'Recemment'}
            </div>
        </div>
        """)

    if is_business:
        return repair_mojibake_text(f"""
        <div style="font-family: 'Outfit', sans-serif; width: 280px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #f1c40f, #f39c12); color: white; padding: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">ÃƒÆ'Ã†'Ãƒâ€šÃ‚Â¢ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â</span>
                    <span style="font-size: 15px; font-weight: 700;">ÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚°tablissement EngagÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©</span>
                </div>
            </div>
            <div style="padding: 15px; background: white;">
                <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 5px;">{safe_association or "Commerce"}</div>
                <div style="font-size: 12px; color: #64748b; font-style: italic;">{safe_comment}</div>
            </div>
        </div>
        """)

    megots = int(row.get("megots", 0))
    dechets = float(row.get("dechets_kg", 0))
    duree = int(row.get("temps_min", 60))
    ben = int(row.get("benevoles", row.get("nb_benevoles", 1)))

    impact = calculate_impact(megots, dechets)
    eau_estimee = int(impact.get("eau_litres", 0))
    score_mixte_display = f"{score_data['score_mixte']:.1f}".replace(".", ",")
    source_label, source_bg, source_fg = _source_badge(row.get("source"))
    tags = _parse_tags(row.get("tags"))
    tags_html = "".join(
        [
            f'<span style="background:#f1f5f9;border:1px solid #e2e8f0;color:#334155;padding:2px 6px;border-radius:999px;font-size:9px;">{sanitize_html_text(tag, max_len=32)}</span>'
            for tag in tags[:4]
        ]
    )
    start_addr = str(row.get("adresse_depart") or row.get("adresse") or "").strip()
    end_addr = str(row.get("adresse_arrivee") or "").strip()
    route_html = ""
    if end_addr and end_addr.lower() != start_addr.lower():
        route_html = f"""
            <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:8px 10px; border-radius:8px; margin-bottom:10px; font-size:10px; color:#1e40af;">
                <div style="font-weight:700; margin-bottom:4px;">ÃƒÆ'Ã†'Ãƒâ€šÃ‚°ÃƒÆ'...Ãƒâ€šÃ‚Â¸ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ Trajet dÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©clarÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©</div>
                <div><b>DÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©part:</b> {safe_start_addr or "Non renseignÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©"}</div>
                <div><b>ArrivÃƒÆ'Ã†'Ãƒâ€ 'ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e:</b> {safe_end_addr}</div>
            </div>
        """

    trend = row.get("tendance", "Premier passage")
    trend_lower = str(trend).lower()
    trend_color = "#27ae60" if "hausse" in trend_lower else "#e74c3c" if "baisse" in trend_lower else "#64748b"
    return repair_mojibake_text(f"""
    <div style="font-family: 'Outfit', sans-serif; width: 260px; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 24px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, {color}, {color}dd); color: white; padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-size: 14px; font-weight: 700;">{safe_association[:25] if safe_association else "Action"}</span>
                <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 9px; text-transform: uppercase;">{safe_type_lieu[:15] if safe_type_lieu else "Lieu"}</span>
            </div>
            <div style="font-size: 10px; opacity: 0.9;">Action du {pd.to_datetime(row.get('date')).strftime('%d/%m/%Y') if pd.notna(row.get('date')) else 'Inconnue'}</div>
        </div>

        <div style="padding: 12px; background: white;">
            <div style="background: {trend_color}11; border: 1px solid {trend_color}33; padding: 6px 10px; border-radius: 8px; margin-bottom: 10px; font-size: 11px; color: {trend_color}; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600;">
                {safe_trend}
            </div>

            <div style="background: #f8fafc; padding: 6px 10px; border-radius: 8px; margin-bottom: 10px; font-size: 11px; color: #475569; display: flex; align-items: center; gap: 5px;">
                <span>Adresse</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{safe_address or "Sans adresse"}</span>
            </div>
            {route_html}
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
                <span style="background:{source_bg}; color:{source_fg}; border:1px solid {source_fg}33; padding:2px 8px; border-radius:999px; font-size:9px; font-weight:700;">{source_label}</span>
                {tags_html}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <div style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 18px; font-weight: 800; color: #1e293b;">{megots}</div>
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Megots</div>
                </div>
                <div style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 18px; font-weight: 800; color: #1e293b;">{dechets:.1f}</div>
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Kg dechets</div>
                </div>
            </div>

            <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 10px; color: #64748b;"><b>{ben} benevoles</b>, <b>{duree} minutes</b></div>
                <div style="font-size: 11px; font-weight: 700; color: {color};">
                    Score de salete : {score_mixte_display}/100
                </div>
            </div>
            <div style="margin-top: 8px; text-align: center; background: linear-gradient(135deg, #0284c7, #0ea5e9); border-radius: 8px; padding: 6px 8px;">
                <span style="color: white; font-weight: 700; font-size: 11px;">Eau preservee estimee: {eau_estimee:,} L</span>
            </div>
            {gap_html}
        </div>
    </div>
    """)


def calculate_trends(df):
    """Calcule les tendances locales pour chaque action en comparant avec l'historique proche."""
    if df.empty:
        return df

    start = time.perf_counter()
    work_df = df.copy()
    work_df["date_dt"] = pd.to_datetime(work_df.get("date"), errors="coerce")
    if work_df["date_dt"].isna().all() and "submitted_at" in work_df.columns:
        work_df["date_dt"] = pd.to_datetime(work_df.get("submitted_at"), errors="coerce")

    work_df = work_df.sort_values("date_dt", ascending=False)
    work_df["tendance"] = "Premier passage"
    work_df["lat_bin"] = pd.to_numeric(work_df.get("lat"), errors="coerce").round(4)
    work_df["lon_bin"] = pd.to_numeric(work_df.get("lon"), errors="coerce").round(4)
    work_df["_score_salete"] = compute_score_series(work_df, metric="score_salete")

    previous_score = work_df.groupby(["lat_bin", "lon_bin"], dropna=False)["_score_salete"].shift(-1)
    has_previous = previous_score.notna()
    improving = has_previous & (work_df["_score_salete"] < previous_score * 0.8)
    degrading = has_previous & (work_df["_score_salete"] > previous_score * 1.2)
    stable = has_previous & ~(improving | degrading)

    work_df.loc[improving, "tendance"] = "En amelioration"
    work_df.loc[degrading, "tendance"] = "En degradation"
    work_df.loc[stable, "tendance"] = "Situation stable"

    out_df = work_df.drop(columns=["date_dt", "lat_bin", "lon_bin", "_score_salete"], errors="ignore")
    log_perf("map_utils", "calculate_trends", (time.perf_counter() - start) * 1000.0, {"rows": int(len(out_df))})
    return out_df

def build_heatmap_series(map_df: pd.DataFrame) -> pd.DataFrame:
    """Build vectorized heatmap rows (lat, lon, intensity) for polluted actions only."""
    if map_df.empty:
        return pd.DataFrame(columns=["lat", "lon", "intensity"])

    clean_series = map_df.get("est_propre", False)
    if isinstance(clean_series, pd.Series):
        clean_flags = clean_series.fillna(False).astype(str).str.strip().str.lower().isin({"true", "1", "oui", "yes", "y", "vrai"})
    else:
        clean_flags = pd.Series([bool(clean_series)] * len(map_df), index=map_df.index)

    polluted_df = map_df[~clean_flags].copy()
    if polluted_df.empty:
        return pd.DataFrame(columns=["lat", "lon", "intensity"])

    polluted_df["lat"] = pd.to_numeric(polluted_df.get("lat"), errors="coerce")
    polluted_df["lon"] = pd.to_numeric(polluted_df.get("lon"), errors="coerce")
    polluted_df = polluted_df.dropna(subset=["lat", "lon"])
    if polluted_df.empty:
        return pd.DataFrame(columns=["lat", "lon", "intensity"])

    salete = compute_score_series(polluted_df, metric="score_salete")
    intensity = np.clip(salete / 500.0, 0.0, 1.0)
    return pd.DataFrame(
        {
            "lat": polluted_df["lat"].astype(float),
            "lon": polluted_df["lon"].astype(float),
            "intensity": intensity.astype(float),
        },
        index=polluted_df.index,
    )


def get_heatmap_data(map_df):
    """Prepare Folium HeatMap data from vectorized heatmap series."""
    if map_df.empty:
        return []

    start = time.perf_counter()
    heat_df = build_heatmap_series(map_df)
    if heat_df.empty:
        return []

    heat_data = heat_df[["lat", "lon", "intensity"]].to_numpy(dtype=float).tolist()
    log_perf("map_utils", "get_heatmap_data", (time.perf_counter() - start) * 1000.0, {"rows": len(heat_data)})
    return heat_data

def generate_ai_route(map_df, nb_benevoles, temps_action_min, arrondissement=None):
    """
    GÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€šÃ‚Â¨re un itinÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©raire stratÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gique pour 10 sous-ÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©quipes.
    Vitesses: 20 min/km (DÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©chets) / 40 min/km (MÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gots).
    Retourne: (list of path objects, message, logistics_df)
    """

    start = time.perf_counter()

    target_df = map_df.copy()
    target_df["internal_score"] = compute_score_series(target_df, metric="score_mixte")
    critical_points = target_df[target_df["internal_score"] > 60].sort_values("internal_score", ascending=False)

    if critical_points.empty:
        return None, "Aucun point critique trouvÃƒÆ'Ã†'Ãƒâ€šÃ‚Â© pour gÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©rer un parcours.", None

    vitesse_km_h = 1.0
    distance_boucle_km = (temps_action_min / 60.0) * vitesse_km_h / 2.0

    start_point = critical_points.iloc[0]
    lat_start, lon_start = float(start_point["lat"]), float(start_point["lon"])

    try:
        graph = ox.graph_from_point((lat_start, lon_start), dist=distance_boucle_km * 1000, network_type="walk")

        nearby = critical_points[critical_points.index != start_point.name].head(5)
        if nearby.empty:
            return None, "Zone trop isolÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©e pour gÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©rer un parcours stratÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gique.", None

        pivot_point = nearby.iloc[0]
        origin_node = ox.distance.nearest_nodes(graph, lon_start, lat_start)
        pivot_node = ox.distance.nearest_nodes(graph, float(pivot_point["lon"]), float(pivot_point["lat"]))

        path_aller = nx.shortest_path(graph, origin_node, pivot_node, weight="length")
        path_retour = nx.shortest_path(graph, pivot_node, origin_node, weight="length")

        def nodes_to_coords(nodes):
            return [[graph.nodes[n]["y"], graph.nodes[n]["x"]] for n in nodes]

        paths = [
            {"coords": nodes_to_coords(path_aller), "color": "#3498db", "label": "MontÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©e (DÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©chets & MÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gots)", "weight": 6},
            {"coords": nodes_to_coords(path_retour), "color": "#e74c3c", "label": "Descente (DÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©chets & MÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gots)", "weight": 6},
        ]

        try:
            adj_node = list(graph.neighbors(pivot_node))[0]
            path_adj = nx.shortest_path(graph, pivot_node, adj_node, weight="length")
            paths.append({"coords": nodes_to_coords(path_adj), "color": "#27ae60", "label": "Zones adjacentes (Parcs/Ponts)", "weight": 4})
        except (IndexError, nx.NetworkXException) as exc:
            log_exception(
                component="map_utils",
                action="generate_ai_route_adjacent_segment",
                exc=exc,
                message="Adjacent segment could not be generated",
                severity="warning",
            )

        team_count = max(10, int(nb_benevoles))
        base_size = team_count // 10
        logistics_df = pd.DataFrame(
            [
                {"ÃƒÆ'Ã†'ÃƒÂ¢Ã¢â€šÂ¬Ã‚°quipe": "1 & 2", "RÃƒÆ'Ã†'Ãƒâ€šÃ‚Â´le": "ÃƒÆ'Ã‚°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ MontÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©e - DÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©chets", "Effectif": base_size * 2, "Vitesse": "20 min/km"},
                {"ÃƒÆ'Ã†'ÃƒÂ¢Ã¢â€šÂ¬Ã‚°quipe": "3 & 4", "RÃƒÆ'Ã†'Ãƒâ€šÃ‚Â´le": "ÃƒÆ'Ã‚°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¬ MontÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©e - MÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gots", "Effectif": base_size * 2, "Vitesse": "40 min/km"},
                {"ÃƒÆ'Ã†'ÃƒÂ¢Ã¢â€šÂ¬Ã‚°quipe": "5 & 6", "RÃƒÆ'Ã†'Ãƒâ€šÃ‚Â´le": "ÃƒÆ'Ã‚°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒâ€šÃ‚Â¬ Descente - DÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©chets", "Effectif": base_size * 2, "Vitesse": "20 min/km"},
                {"ÃƒÆ'Ã†'ÃƒÂ¢Ã¢â€šÂ¬Ã‚°quipe": "7 & 8", "RÃƒÆ'Ã†'Ãƒâ€šÃ‚Â´le": "ÃƒÆ'Ã‚°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¬ Descente - MÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gots", "Effectif": base_size * 2, "Vitesse": "40 min/km"},
                {"ÃƒÆ'Ã†'ÃƒÂ¢Ã¢â€šÂ¬Ã‚°quipe": "9 & 10", "RÃƒÆ'Ã†'Ãƒâ€šÃ‚Â´le": "ÃƒÆ'Ã‚°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦'Ãƒâ€šÃ‚Â³ Adjacents (Rues/Parcs)", "Effectif": team_count - (base_size * 8), "Vitesse": "30 min/km"},
            ]
        )

        dist_tot = (len(path_aller) + len(path_retour)) * 0.05
        log_perf(
            "map_utils",
            "generate_ai_route",
            (time.perf_counter() - start) * 1000.0,
            {"critical_points": int(len(critical_points))},
        )
        return (
            paths,
            f"Circuit stratÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©gique de {dist_tot:.1f}km gÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©nÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©rÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©. DÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©part et arrivÃƒÆ'Ã†'Ãƒâ€šÃ‚Â©e ÃƒÆ'Ã†'  {format_google_maps_name(start_point)}.",
            logistics_df,
        )

    except (ValueError, TypeError, KeyError, nx.NetworkXException) as exc:
        log_exception(
            component="map_utils",
            action="generate_ai_route",
            exc=exc,
            message="AI route generation failed",
            context={"rows": len(map_df), "nb_benevoles": nb_benevoles, "temps_action_min": temps_action_min},
            severity="error",
        )
        return None, f"Erreur IA : {str(exc)}", None





