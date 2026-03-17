from datetime import datetime
import folium
import re
import osmnx as ox
import networkx as nx
import numpy as np
import pandas as pd
from shapely.ops import unary_union
from shapely.geometry import Point
import unicodedata

# --- CONFIGURATION DES COULEURS ---
MAP_COLORS = {
    'clean': '#3498db',      # Bleu (Zone propre)
    'low': '#27ae60',        # Vert (Standard/Faible)
    'medium': '#e67e22',     # Orange (Moyen/Ancien)
    'critical': '#8e44ad',    # Violet (Point noir)
    'business': '#FFD700',   # Or (Établissement Engagé)
    'park': '#2ecc71',       # Vert OSM (Parcs)
    'street': '#95a5a6'      # Gris OSM (Rues)
}

# --- CONFIGURATION OSM ---
TAGS_PARKS = {
    'leisure': ['park', 'garden', 'recreation_ground'],
    'landuse': ['grass', 'forest', 'village_green'],
    'natural': ['wood', 'scrub']
}

def format_google_maps_name(row):
    """Formate le nom du lieu pour qu'il ressemble à un affichage Google Maps."""
    adresse = str(row.get('adresse', '')).strip()
    type_lieu = str(row.get('type_lieu', '')).strip()
    assoc = str(row.get('association', '')).strip()
    
    if "Établissement" in type_lieu:
        return f"{assoc} ({adresse})"
    
    # Nettoyage de l'adresse (on enlève le CP et la ville si redondant)
    adresse_clean = re.sub(r',\s*\d{5}.*$', '', adresse)
    
    if type_lieu and type_lieu != "Lieu" and type_lieu not in adresse:
        return f"{type_lieu}, {adresse_clean}"
    
    return adresse_clean

def detect_osm_type(row):
    """Détecte si le lieu est une rue ou un espace vert."""
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
    """Récupère la géométrie OSM (Polygone ou PolyLine) à partir d'un point.

    Pour les rues, on étend le tracé selon une distance cible (mètres) pour
    éviter les segments trop courts visuellement.
    """
    try:
        if osm_type == 'park':
            # Rayon élargi pour pouvoir récupérer le parc principal même si le point
            # est proche d'un sous-espace (ex: théâtre, pelouse annexe, etc.).
            features = ox.features_from_point((lat, lon), tags=TAGS_PARKS, dist=1000)
            if not features.empty:
                point_pnt = Point(lon, lat)
                gdf = features.copy()
                gdf = gdf[gdf.geometry.notnull()].copy()
                gdf = gdf[gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()

                if not gdf.empty:
                    # Priorité aux véritables parcs (leisure=park/garden/recreation_ground)
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
                            # Parmi les noms qui matchent, on favorise d'abord le nombre de mots
                            # correspondants, puis les polygones englobants, puis la surface.
                            target = matched.sort_values(
                                by=["match_score", "contains_point", "area_m2", "distance_m"],
                                ascending=[False, False, False, True],
                            ).iloc[0]
                            return target.geometry, 'park'

                    # Fallback sans nom: on privilégie un polygone englobant, puis la plus grande surface proche.
                    containers = candidate_pool[candidate_pool["contains_point"]].copy()
                    if not containers.empty:
                        target = containers.sort_values(
                            by=["area_m2", "distance_m"],
                            ascending=[False, True],
                        ).iloc[0]
                        return target.geometry, 'park'

                    nearby = candidate_pool[candidate_pool["distance_m"] <= 600].copy()
                    pool = nearby if not nearby.empty else candidate_pool.copy()
                    target = pool.sort_values(
                        by=["area_m2", "distance_m"],
                        ascending=[False, True],
                    ).iloc[0]
                    return target.geometry, 'park'
         
        elif osm_type == 'street':
            # Recherche de rues avec rayon adapté à la distance cible.
            target_distance_m = float(target_distance_m or 700.0)
            target_distance_m = max(250.0, min(target_distance_m, 2200.0))
            max_distance_m = max(target_distance_m * 1.35, 180.0)
            search_dist = int(max(900, min(3200, target_distance_m * 1.7)))
            graph = ox.graph_from_point((lat, lon), dist=search_dist, network_type='all')
            if len(graph) > 0:
                edges = ox.graph_to_gdfs(graph, nodes=False)

                if edges.empty:
                    return None, 'point'

                # Trouver l'arête la plus proche pour le point de départ
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

                            # Priorité au même nom de rue; fallback raisonnable si nom absent.
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

                    # Si le nom de rue n'est pas trouvé dans le voisinage, on garde au moins l'arête de départ.
                    if not selected_edge_ids:
                        fallback_id = resolve_edge_id(u, v, key)
                        if fallback_id is not None:
                            selected_edge_ids.add(fallback_id)
                            visited_edge_ids.add(fallback_id)
                            total_length_m = float(edges.loc[fallback_id].get('length') or 40.0)

                    # Stop dès qu'on a une longueur pertinente.
                    if total_length_m >= target_distance_m:
                        break

                # Si la portion trouvée reste trop courte, on autorise une extension
                # contrôlée sur des segments de voirie compatibles pour mieux
                # représenter une action longue (ex: dépollution de quai).
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
                     
    except:
        pass
    return None, 'point'

def calculate_scores(row):
    """Calcule les scores de saleté et de mixité (ancienneté) pour une action."""
    # 1. Extraction des données de base
    megots = float(row.get('megots', 0))
    dechets_kg = float(row.get('dechets_kg', 0))
    # Approximation : 1 sac ~ 5kg si dechets_kg absent (non utilisé ici car dechets_kg est standard)
    
    # Temps et Bénévoles
    temps = float(row.get('temps_min', 60)) / 60.0 # Heures
    ben = float(row.get('nb_benevoles', 1))
    
    # 2. Score de Saleté (Intensité)
    # Formule inspirée du code historique : (mégots + kg*50) / (heures * bénévoles)
    # On multiplie les kg par 50 pour donner un poids équivalent à 50 mégots par kg de déchets
    effort = max(temps * ben, 0.5) # Minimum 0.5h effort-homme
    score_salete = (megots + (dechets_kg * 50)) / effort
    
    # 3. Ancienneté
    date_action = row.get('date')
    if pd.isna(date_action):
        jours = 365 # Par défaut
    else:
        try:
            date_dt = pd.to_datetime(date_action)
            if hasattr(date_dt, 'tz') and date_dt.tz is not None:
                date_dt = date_dt.tz_localize(None)
            jours = (datetime.now() - date_dt).days
        except:
            jours = 365

    # 4. Score Mixte (Normalisé sur 100)
    # Saleté (70%) + Ancienneté (30%)
    # On plafonne le score de saleté à une valeur "très sale" pour la normalisation (ex: 500)
    norm_salete = min(score_salete / 500.0, 1.0) * 70
    norm_temps = min(max(jours, 0) / 540.0, 1.0) * 30 # Max impact après 18 mois
    
    score_mixte = norm_salete + norm_temps
    
    # 5. Calcul des Eco-Points (Innovation Gamification)
    # 10 pts fixe + 10 pts/15min + 5 pts/kg + 1 pt/100 mégots
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

def calculate_impact(megots, dechets_kg):
    """Calcule l'équivalence écologique d'une action."""
    # 1 mégot pollue jusqu'à 500L d'eau
    eau_sauvee = megots * 500
    
    # Émissions de CO2 évitées (Moyenne : 2kg CO2 par kg de déchet collecté/trié)
    co2_evite = dechets_kg * 2.0
    
    # Équivalence bouteilles plastiques (1kg ~ 40 bouteilles)
    bouteilles = dechets_kg * 40
    
    return {
        'eau_litres': eau_sauvee,
        'co2_kg': co2_evite,
        'bouteilles': int(bouteilles)
    }

def check_badges(user_stats):
    """Détecte les badges débloqués par un utilisateur."""
    badges = []
    nb_actions = user_stats.get('nb_actions', 0)
    total_kg = user_stats.get('total_kg', 0)
    total_points = user_stats.get('total_points', 0)
    
    if nb_actions >= 1: badges.append({"id": "first_action", "name": "🌱 Premier Pas", "desc": "Première action de nettoyage validée."})
    if nb_actions >= 5: badges.append({"id": "regular", "name": "🏃 Sentinelle de Paris", "desc": "5 actions de dépollution."})
    if total_kg >= 50: badges.append({"id": "heavy_lifter", "name": "🐘 Hercule du Propre", "desc": "Plus de 50kg de déchets ramassés !"})
    if total_points >= 1000: badges.append({"id": "eco_hero", "name": "🦸 Éco-Héros", "desc": "Plus de 1000 Eco-Points accumulés."})
    
    return badges

def get_marker_style(row, score_data):
    """Détermine la couleur et le rayon du marqueur selon les scores."""
    is_clean = row.get('est_propre', False)
    is_business = row.get('type_lieu') == "Établissement Engagé (Label)"
    
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

def create_premium_popup(row, score_data, gap_alert=""):
    """Génère le HTML d'un popup premium glassmorphism avec support optionnel d'alerte infrastructure."""
    is_clean = row.get('est_propre', False)
    is_business = row.get('type_lieu') == "Établissement Engagé (Label)"
    
    color, _, _ = get_marker_style(row, score_data)
    
    # Alert Badge for infrastructure gaps
    gap_html = f"""
    <div style="background: #fff7ed; padding: 8px; border-radius: 8px; border: 1px dashed #fb923c; margin-top: 10px; font-size: 10px; color: #c2410c; text-align: center;">
        ⚠️ <b>Besoin d'équipement</b><br>{gap_alert.replace('<br>', ' ').replace('<b>', '').replace('</b>', '')}
    </div>
    """ if gap_alert else ""

    # --- TEMPLATE ZONE PROPRE ---
    if is_clean:
        return f"""
        <div style="font-family: 'Outfit', sans-serif; width: 260px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.1); border: 2px solid #3498db33;">
            <div style="background: linear-gradient(135deg, #ebf8ff, #e0fdf4); color: #2980b9; padding: 15px; text-align: center; border-bottom: 1px solid #3498db11;">
                <div style="font-size: 28px; margin-bottom: 5px;">🌿</div>
                <div style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e40af;">Zone Impeccable</div>
                <div style="font-size: 10px; font-weight: 500; color: #3b82f6;">Signalement de Propreté</div>
            </div>
            <div style="padding: 15px; background: white;">
                <div style="font-size: 13px; color: #475569; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 16px;">📍</span>
                    <span>{row.get('adresse', 'Lieu inconnu')}</span>
                </div>
                <div style="background: #f0fdf4; padding: 10px; border-radius: 10px; border: 1px solid #dcfce7; display: flex; align-items: center; gap: 10px;">
                    <div style="background: #22c55e; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">
                        {row.get('association', 'B')[0].upper()}
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #166534; text-transform: uppercase; font-weight: 700;">Validé par</div>
                        <div style="font-size: 13px; font-weight: 600; color: #14532d;">{row.get('association', 'Bénévole')}</div>
                    </div>
                </div>
            </div>
            <div style="padding: 8px; background: #f8fafc; text-align: center; font-size: 10px; color: #94a3b8; font-style: italic;">
                Dernière vérification le {pd.to_datetime(row.get('date')).strftime('%d/%m/%Y') if pd.notna(row.get('date')) else 'Récemment'}
            </div>
        </div>
        """

    # --- TEMPLATE ÉTABLISSEMENT ---
    if is_business:
        return f"""
        <div style="font-family: 'Outfit', sans-serif; width: 280px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #f1c40f, #f39c12); color: white; padding: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">⭐</span>
                    <span style="font-size: 15px; font-weight: 700;">Établissement Engagé</span>
                </div>
            </div>
            <div style="padding: 15px; background: white;">
                <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 5px;">{row.get('association', 'Commerce')}</div>
                <div style="font-size: 12px; color: #64748b; font-style: italic;">{row.get('commentaire', 'Lieu labellisé pour son engagement.')}</div>
            </div>
        </div>
        """

    # --- TEMPLATE ACTION DÉPOLLUTION ---
    megots = int(row.get('megots', 0))
    dechets = float(row.get('dechets_kg', 0))
    duree = int(row.get('temps_min', 60))
    ben = int(row.get('nb_benevoles', 1))
    
    impact = calculate_impact(megots, dechets)
    eau_estimee = int(impact.get('eau_litres', 0))
    score_mixte_display = f"{score_data['score_mixte']:.1f}".replace(".", ",")
    
    # Tendance visuelle
    trend = row.get('tendance', '📝 Premier passage')
    trend_color = "#27ae60" if "📉" in trend else "#e74c3c" if "📈" in trend else "#64748b"
    
    return f"""
    <div style="font-family: 'Outfit', sans-serif; width: 260px; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 24px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, {color}, {color}dd); color: white; padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-size: 14px; font-weight: 700;">{row.get('association', 'Action')[:25]}</span>
                <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 9px; text-transform: uppercase;">{row.get('type_lieu', 'Lieu')[:15]}</span>
            </div>
            <div style="font-size: 10px; opacity: 0.9;">Action du {pd.to_datetime(row.get('date')).strftime('%d/%m/%Y') if pd.notna(row.get('date')) else 'Inconnue'}</div>
        </div>
        
        <div style="padding: 12px; background: white;">
            <!-- Analyse de Tendance -->
            <div style="background: {trend_color}11; border: 1px solid {trend_color}33; padding: 6px 10px; border-radius: 8px; margin-bottom: 10px; font-size: 11px; color: {trend_color}; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600;">
                {trend}
            </div>

            <div style="background: #f8fafc; padding: 6px 10px; border-radius: 8px; margin-bottom: 10px; font-size: 11px; color: #475569; display: flex; align-items: center; gap: 5px;">
                <span>📍</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{row.get('adresse', 'Sans adresse')}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <div style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 18px; font-weight: 800; color: #1e293b;">{megots}</div>
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Mégots</div>
                </div>
                <div style="background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 18px; font-weight: 800; color: #1e293b;">{dechets:.1f}</div>
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Kg Déchets</div>
                </div>
            </div>
            
            <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 10px; color: #64748b;"><b>{ben} bénévoles</b>, <b>{duree} minutes</b></div>
                <div style="font-size: 11px; font-weight: 700; color: {color};">
                    Score de saleté : {score_mixte_display}/100
                </div>
            </div>
            <div style="margin-top: 8px; text-align: center; background: linear-gradient(135deg, #0284c7, #0ea5e9); border-radius: 8px; padding: 6px 8px;">
                <span style="color: white; font-weight: 700; font-size: 11px;">💧 Eau préservée estimée: {eau_estimee:,} L</span>
            </div>
            {gap_html}
        </div>
    </div>
    """

def calculate_trends(df):
    """Calcule les tendances locales pour chaque action en comparant avec l'historique proche."""
    if df.empty:
        return df
    
    # S'assurer que la colonne date est au bon format
    df['date_dt'] = pd.to_datetime(df['date'])
    df = df.sort_values('date_dt', ascending=False).copy()
    df['tendance'] = "📝 Premier passage"
    
    # On arrondit la position pour regrouper les actions proches (environ 50m)
    df['lat_bin'] = df['lat'].round(4)
    df['lon_bin'] = df['lon'].round(4)
    
    for (lat, lon), group in df.groupby(['lat_bin', 'lon_bin']):
        if len(group) > 1:
            indices = group.index.tolist()
            for i in range(len(indices)-1):
                curr_idx = indices[i]
                prev_idx = indices[i+1]
                
                curr_score = calculate_scores(df.loc[curr_idx])['score_salete']
                prev_score = calculate_scores(df.loc[prev_idx])['score_salete']
                
                if curr_score < prev_score * 0.8:
                    df.at[curr_idx, 'tendance'] = "📉 En amélioration"
                elif curr_score > prev_score * 1.2:
                    df.at[curr_idx, 'tendance'] = "📈 En dégradation"
                else:
                    df.at[curr_idx, 'tendance'] = "📊 Situation stable"
                    
    return df.drop(['date_dt', 'lat_bin', 'lon_bin'], axis=1)

def get_heatmap_data(map_df):
    """Prépare les données pour le plugin HeatMap de Folium (uniquement zones à dépolluer)."""
    if map_df.empty:
        return []
    
    heat_data = []
    # On filtre pour ne garder que les zones de pollution (pas les zones propres)
    polluted_df = map_df[map_df.get('est_propre', False) == False]
    for _, row in polluted_df.iterrows():
        if pd.notna(row['lat']) and pd.notna(row['lon']):
            score = calculate_scores(row)['score_salete']
            # On normalise l'intensité pour la heatmap
            intensity = min(score / 500, 1.0)
            heat_data.append([row['lat'], row['lon'], intensity])
            
    return heat_data

def generate_ai_route(map_df, nb_benevoles, temps_action_min, arrondissement=None):
    """
    Génère un itinéraire stratégique pour 10 sous-équipes.
    Vitesses: 20 min/km (Déchets) / 40 min/km (Mégots).
    Retourne: (list of path objects, message, logistics_df)
    """
    
    # 1. Sélection du point de départ (le point le plus "violet")
    target_df = map_df.copy()
    target_df['internal_score'] = target_df.apply(lambda r: calculate_scores(r)['score_mixte'], axis=1)
    critical_points = target_df[target_df['internal_score'] > 60].sort_values('internal_score', ascending=False)
    
    if critical_points.empty:
        return None, "Aucun point critique trouvé pour générer un parcours.", None

    # Vitesse moyenne pondérée pour le calcul de distance max
    # On prend une moyenne conservative (Ramassage lent)
    vitesse_km_h = 1.0 
    distance_boucle_km = (temps_action_min / 60.0) * vitesse_km_h / 2.0 # /2 car on doit revenir
    
    start_point = critical_points.iloc[0]
    lat_start, lon_start = start_point['lat'], start_point['lon']
    
    try:
        # Graphe pour les piétons
        G = ox.graph_from_point((lat_start, lon_start), dist=distance_boucle_km * 1000, network_type='walk')
        
        # Trouver un point "pivot" (on va au point le plus sale dans le périmètre puis on revient)
        nearby = critical_points[critical_points.index != start_point.name].head(5)
        if nearby.empty:
            return None, "Zone trop isolée pour générer un parcours stratégique.", None
            
        pivot_point = nearby.iloc[0]
        
        orig_node = ox.distance.nearest_nodes(G, lon_start, lat_start)
        pivot_node = ox.distance.nearest_nodes(G, pivot_point['lon'], pivot_point['lat'])
        
        # Calcul de l'aller et du retour (peuvent être différents selon OSM)
        path_aller = nx.shortest_path(G, orig_node, pivot_node, weight='length')
        path_retour = nx.shortest_path(G, pivot_node, orig_node, weight='length')
        
        def nodes_to_coords(nodes):
            return [[G.nodes[n]['y'], G.nodes[n]['x']] for n in nodes]
            
        # Construction des 3 types de segments
        paths = [
            {"coords": nodes_to_coords(path_aller), "color": "#3498db", "label": "Montée (Déchets & Mégots)", "weight": 6},
            {"coords": nodes_to_coords(path_retour), "color": "#e74c3c", "label": "Descente (Déchets & Mégots)", "weight": 6},
        ]
        
        # Ajout d'une boucle adjacente (2 équipes)
        try:
            # On cherche une petite boucle autour du pivot
            adj_node = list(G.neighbors(pivot_node))[0]
            path_adj = nx.shortest_path(G, pivot_node, adj_node, weight='length')
            paths.append({"coords": nodes_to_coords(path_adj), "color": "#27ae60", "label": "Zones Adjacentes (Parcs/Ponts)", "weight": 4})
        except: pass

        # Préparation des données logistiques (Tableau des 10 équipes)
        n = max(10, nb_benevoles)
        size = n // 10
        logistics = [
            {"Équipe": "1 & 2", "Rôle": "🚀 Montée - Déchets", "Effectif": size*2, "Vitesse": "20 min/km"},
            {"Équipe": "3 & 4", "Rôle": "🚬 Montée - Mégots", "Effectif": size*2, "Vitesse": "40 min/km"},
            {"Équipe": "5 & 6", "Rôle": "🛬 Descente - Déchets", "Effectif": size*2, "Vitesse": "20 min/km"},
            {"Équipe": "7 & 8", "Rôle": "🚬 Descente - Mégots", "Effectif": size*2, "Vitesse": "40 min/km"},
            {"Équipe": "9 & 10", "Rôle": "🌳 Adjacents (Rues/Parcs)", "Effectif": n - (size*8), "Vitesse": "30 min/km"}
        ]
        logistics_df = pd.DataFrame(logistics)
        
        dist_tot = (len(path_aller) + len(path_retour)) * 0.05 # Approx
        
        return paths, f"Circuit stratégique de {dist_tot:.1f}km généré. Départ et Arrivée à {format_google_maps_name(start_point)}.", logistics_df
        
    except Exception as e:
        return None, f"Erreur IA : {str(e)}", None
