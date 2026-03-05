import os
import re
from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st
import folium
from folium.plugins import TimestampedGeoJson
from streamlit_folium import st_folium
import osmnx as ox
import networkx as nx
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
from fpdf import FPDF
import matplotlib.pyplot as plt
import requests
import uuid
import qrcode
import io
from thefuzz import fuzz, process

from src.database import init_db, insert_submission, update_submission_status, get_submissions_by_status, get_total_approved_stats, add_message, get_messages, add_subscriber
from src.pages.resources import show_resources

init_db()  # Initialisation de la BDD au démarrage

# Centralisation des Constantes d'Impact (issues du Fact-Checking ACV)
IMPACT_CONSTANTS = {
    "CO2_PER_MEGOT_KG": 0.014,        # Approuvé par l'OMS et ACV Cycle Complet
    "EAU_PROTEGEE_PER_MEGOT_L": 500,  # Plancher retenu par Surfrider Foundation/INERIS
    "POIDS_MOYEN_MEGOT_KG": 0.0002,   # 0.2g
    "PLASTIQUE_URBAIN_RATIO": 0.5,
    "VERRE_URBAIN_RATIO": 0.3,
    "METAL_URBAIN_RATIO": 0.2,
    "PLASTIQUE_POUR_BANC_KG": 50.0,   # Base ADEME
    "PLASTIQUE_POUR_PULL_KG": 0.5,    # Base ADEME
    "COUT_TRAITEMENT_TONNE_EUR": 150  # Plaidoyer : 150€ d'économie par tonne ramassée
}

def get_impact_sources():
    """Renvoie les textes de la bibliographie pour la méthodologie de l'app et du PDF."""
    return (
        "méthodologie et sources :\n\n"
        "- impact carbone du mégot (0.014 kg co2e) : inclut la culture, la création du filtre en "
        "acétate de cellulose et la fin de vie. données alignées sur l'oms.\n"
        "- impact eau (500l/mégot) : contamination toxique aux métaux lourds (arsenic, plomb) et "
        "à la nicotine selon surfrider foundation et l'ineris.\n"
        "- equivalences plastiques (bancs: 50kg, pulls: 0.5kg) : extrapolations du poids équivalent "
        "fondées sur la base empreinte (carbone) de l'ademe.\n\n"
        "avertissement : ce rapport de synthèse a été généré via l'assistance d'une intelligence artificielle. "
        "bien que les statistiques soient basées sur une bibliographie scientifique officielle, le "
        "document automatique peut contenir des approximations ou des erreurs de traitement."
    )


st.set_page_config(
    page_title="Clean my Map • Protection Citoyenne",
    page_icon="🗺️",
    layout="wide",
)

# Custom Professional CSS
# --- DESIGN SYSTEM (PREMIUM APPLE STYLE) ---
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    :root {
        --primary: #059669;
        --primary-soft: rgba(5, 150, 105, 0.1);
        --bg-glass: rgba(255, 255, 255, 0.7);
        --border-glass: rgba(255, 255, 255, 0.3);
        --text-main: #1e293b;
        --text-soft: #64748b;
    }

    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, sans-serif !important;
        color: var(--text-main);
    }

    .stApp {
        background: radial-gradient(circle at top right, #e2f2ef, #ffffff),
                    radial-gradient(circle at bottom left, #f1f5f9, #ffffff);
    }

    /* Hide Streamlit Header/Footer for cleanliness */
    header {visibility: hidden;}
    footer {visibility: hidden;}

    /* Glass Container */
    .premium-card {
        background: var(--bg-glass);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--border-glass);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
        margin-bottom: 24px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .premium-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.08);
    }

    /* Hero Section */
    .hero-container {
        text-align: center;
        padding: 60px 20px;
        max-width: 900px;
        margin: 0 auto;
    }

    .hero-title {
        font-size: 4rem !important;
        font-weight: 800 !important;
        letter-spacing: -0.04em !important;
        background: linear-gradient(135deg, #1e293b 0%, #059669 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 16px !important;
    }

    .hero-subtitle {
        font-size: 1.25rem !important;
        color: var(--text-soft);
        max-width: 600px;
        margin: 0 auto 40px !important;
        line-height: 1.6 !important;
    }

    /* Tab Styling */
    .stTabs [data-baseweb="tab-list"] {
        padding: 6px;
        background: rgba(0,0,0,0.03);
        border-radius: 16px;
        gap: 4px;
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        padding: 8px 16px;
        transition: all 0.2s;
        border: none !important;
        color: var(--text-soft);
    }

    .stTabs [aria-selected="true"] {
        background: white !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        color: var(--primary) !important;
    }

    /* Metric Cards */
    .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin: 40px 0;
    }

    .metric-card {
        background: white;
        padding: 24px;
        border-radius: 20px;
        border: 1px solid #f1f5f9;
        text-align: left;
    }

    .metric-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
    }

    .metric-value {
        font-size: 2.5rem;
        font-weight: 800;
        color: var(--primary);
    }

    .metric-unit {
        font-size: 1rem;
        color: #94a3b8;
        font-weight: 400;
        margin-left: 4px;
    }

    /* Form Overhaul */
    .stForm {
        border: none !important;
        background: var(--bg-glass) !important;
        backdrop-filter: blur(12px);
        border-radius: 28px !important;
        padding: 40px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1) !important;
    }

    /* Callouts styling */
    div[data-testid="stNotification"] {
        border-radius: 16px !important;
        border: none !important;
        background-color: white !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
    }

    /* Progress bar styling */
    .stProgress div[role="progressbar"] > div {
        background: linear-gradient(90deg, #10b981, #34d399) !important;
        border-radius: 999px !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff !important;
        border-right: 1px solid #f1f5f9 !important;
    }

    /* Input Fields */
    .stTextInput input, .stTextArea textarea, .stSelectbox [data-baseweb="select"] {
        border-radius: 12px !important;
        border: 1px solid #e2e8f0 !important;
        background-color: #f8fafc !important;
    }

    /* Custom Buttons */
    .stButton > button {
        background: #1e293b !important;
        color: white !important;
        border-radius: 14px !important;
        padding: 12px 24px !important;
        font-weight: 600 !important;
        border: none !important;
        transition: all 0.3s !important;
    }

    .stButton > button:hover {
        background: #059669 !important;
        transform: scale(1.02);
    }
    </style>
    """,
    unsafe_allow_html=True,
)

eco_mode = st.sidebar.checkbox("mode basse consommation", help="réduit l'usage des données pour une navigation plus sobre.")

@st.cache_resource(ttl=86400, show_spinner=False)
def add_elevations_to_graph(G):
    """Enrichit le graphe avec des données d'altitude via l'API Open-Elevation."""
    try:
        nodes = list(G.nodes(data=True))
        coords = [{"latitude": data["y"], "longitude": data["x"]} for _, data in nodes]
        
        # On utilise Open-Elevation (Public API)
        # On fragmente par paquets de 100 pour éviter les timeouts
        batch_size = 100
        elevations = []
        import requests
        
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
    except Exception as e:
        st.error(f"erreur lors de la récupération des altitudes : {e}")
        return G

def calculate_flow_sinks(G, pollution_points_df, threshold_slope=0.03):
    """
    Identifie les points bas (sinks) où les déchets convergent.
    Un sink est un noeud dont l'altitude est inférieure à tous ses voisins 
    et qui est situé en bas d'une rue à forte pente (>3%).
    """
    sinks = []
    if 'elevation' not in list(G.nodes(data=True))[0][1]:
        return sinks

    for node, data in G.nodes(data=True):
        elev = data.get('elevation', 0)
        neighbors = list(G.neighbors(node))
        if not neighbors: continue
        
        is_sink = True
        steep_input = False
        
        for nb in neighbors:
            nb_elev = G.nodes[nb].get('elevation', elev)
            if nb_elev < elev:
                is_sink = False
                break
            
            # Calcul de la pente
            dist = ox.distance.great_circle_vec(data['y'], data['x'], G.nodes[nb]['y'], G.nodes[nb]['x'])
            if dist > 0:
                slope = (nb_elev - elev) / dist
                if slope > threshold_slope:
                    steep_input = True
        
        if is_sink and steep_input:
            sinks.append({
                'lat': data['y'],
                'lon': data['x'],
                'type': 'Point de Capture Prioritaire',
                'description': 'entonnoir à pollution : point bas topographique récoltant les eaux de ruissellement.'
            })
            
    return sinks

@st.cache_resource(ttl=86400, show_spinner=False)
def get_osmnx_graph(center_lat, center_lon, dist):
    return ox.graph_from_point((center_lat, center_lon), dist=dist, network_type='walk', simplify=True)


TYPE_LIEU_OPTIONS = [
    "Bois/Parc/Jardin/Square/Sentier",
    "N° Boulevard/Avenue/Place",
    "Quai/Pont/Port",
    "Monument",
    "Quartier",
    "Établissement Engagé (Label)",
    "Non spécifié",
]

GOOGLE_SHEET_URL = os.getenv(
    "CLEANMYMAP_SHEET_URL",
    "https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/edit#gid=0",
)
STREAMLIT_PUBLIC_URL = os.getenv(
    "CLEANMYMAP_STREAMLIT_PUBLIC_URL",
    "https://cleanmymap.streamlit.app",
).strip()
ADMIN_SECRET_CODE = os.getenv("CLEANMYMAP_ADMIN_SECRET_CODE", "").strip()


@st.cache_data(ttl=86400)
def get_paris_bins():
    """Récupère les positions des corbeilles de rue de Paris via l'API Open Data."""
    try:
        url = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/mobilier-urbain-poubelle-de-rue/records?limit=100"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            bins = []
            for record in data.get('results', []):
                coords = record.get('geo_point_2d')
                if coords:
                    bins.append({
                        'lat': coords.get('lat'),
                        'lon': coords.get('lon'),
                        'type': record.get('type_objet', 'Corbeille')
                    })
            return bins
    except Exception:
        pass
    return []


def calculate_infrastructure_gap(point_lat, point_lon, official_bins, threshold_m=200):
    """
    Calcule si un point noir est à plus de threshold_m d'une poubelle officielle.
    Retourne (is_gap, min_dist_m)
    """
    if not official_bins or not point_lat or not point_lon:
        return False, 0
    
    from geopy.distance import geodesic
    
    min_dist = float('inf')
    for b in official_bins:
        d = geodesic((point_lat, point_lon), (b['lat'], b['lon'])).meters
        if d < min_dist:
            min_dist = d
            
    return (min_dist > threshold_m), min_dist


def _google_user_email():
    """Retourne l'email du compte Google connecté via Streamlit auth, sinon None."""
    user = getattr(st, "user", None)
    if user is None:
        return None

    # API moderne Streamlit auth
    is_logged_in = getattr(user, "is_logged_in", None)
    if callable(is_logged_in):
        is_logged_in = is_logged_in()
    if is_logged_in is False:
        return None

    email = getattr(user, "email", None)
    if callable(email):
        email = email()
    if email:
        return str(email).strip().lower()
    return None


def parse_coords(value: str):
    if not value:
        return None, None
    m = re.search(r"(-?\d+\.?\d*)\s*[,;\s]+\s*(-?\d+\.?\d*)", str(value).strip())
    if not m:
        return None, None
    lat, lon = float(m.group(1)), float(m.group(2))
    if -90 <= lat <= 90 and -180 <= lon <= 180:
        return lat, lon
    return None, None

@st.cache_data(ttl=3600)
def check_flood_risk(lat, lon, adresse, type_lieu):
    if not lat or not lon:
        return False
        
    keywords = ["seine", "bièvre", "quai", "berge", "canal", "fleuve", "riviere", "eau", "lac"]
    adresse_lower = str(adresse).lower()
    is_water = (type_lieu == "Quai/Pont/Port") or any(k in adresse_lower for k in keywords)
    
    if is_water:
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&past_days=3&daily=precipitation_sum&timezone=auto"
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if 'daily' in data and 'precipitation_sum' in data['daily']:
                    # Somme des précipitations sur les jours historiques retournés
                    total_precip = sum(p for p in data['daily']['precipitation_sum'] if p is not None)
                    if total_precip > 10.0:  # > 10mm de pluie cummulée = risque de crue/ruissellement
                        return True
        except Exception:
            pass
    return False


def fuzzy_address_match(new_address: str, existing_list: list, threshold=90):
    """
    Compare une adresse avec une liste existante. 
    Si une correspondance > threshold est trouvée, renvoie l'adresse existante.
    """
    if not new_address or not existing_list:
        return new_address
        
    clean_new = new_address.strip()
    
    # On évite les calculs si l'adresse est déjà strictement identique
    if clean_new in existing_list:
        return clean_new
        
    # Tentative d'extraction du meilleur match
    unique_existing = list(set([str(a).strip() for a in existing_list if a]))
    if not unique_existing:
        return new_address
        
    match, score = process.extractOne(clean_new, unique_existing, scorer=fuzz.token_sort_ratio)
    
    if score >= threshold:
        return match
    return new_address


def anonymize_contributor(name: str):
    """Génère un identifiant opaque à partir du nom pour l'anonymisation scientifique."""
    if not name:
        return "citoyen_anonyme"
    import hashlib
    return "brigadier_" + hashlib.md5(str(name).strip().lower().encode()).hexdigest()[:10]


def _sheet_csv_url(sheet_url: str) -> str:
    sheet_id = sheet_url.split('/d/')[1].split('/')[0]
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"


def _txt(value) -> str:
    text = "" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")


def get_critical_zones(df: pd.DataFrame):
    critical_data = {}
    if df.empty or 'date' not in df.columns or 'adresse' not in df.columns:
        return critical_data
        
    dirty = df[df.get('est_propre', False) == False].copy()
    if dirty.empty:
        return critical_data
        
    dirty['dt'] = pd.to_datetime(dirty['date'], errors='coerce')
    dirty = dirty.dropna(subset=['dt', 'adresse'])
    
    grouped = dirty.groupby('adresse')
    for addr, group in grouped:
        if len(group) >= 3:
            sorted_group = group.sort_values('dt')
            span_days = (sorted_group['dt'].max() - sorted_group['dt'].min()).days
            if span_days > 0:
                avg_delay = span_days / (len(group) - 1)
                critical_data[addr] = {
                    'count': len(group),
                    'delai_moyen': int(avg_delay)
                }
            
    return critical_data

def get_user_badge(pseudo: str, df: pd.DataFrame) -> str:
    """Calcule le niveau et le badge d'un utilisateur basé sur son historique."""
    if not pseudo or df.empty or 'nom' not in df.columns:
        return ""
        
    user_actions = df[df['nom'].str.lower() == pseudo.lower()]
    count_total = len(user_actions)
    
    if count_total == 0:
        return ""
        
    count_dirty = len(user_actions[user_actions.get('est_propre', False) == False])
    
    def in_yvelines(addr):
        a = str(addr).lower()
        return "78" in a or "yvelines" in a or "versailles" in a
        
    count_78 = user_actions.get('adresse', '').apply(in_yvelines).sum() if 'adresse' in user_actions.columns else 0
    
    badge = "🌱 Éclaireur (Niv. 1)"
    if count_78 >= 3:
        badge = "🌳 Gardien de la Forêt (Niv. 3)"
    elif count_dirty >= 5:
        badge = "🛡️ Sentinelle (Niv. 2)"
        
    return f"[{badge}]"


def build_public_pdf(actions_df: pd.DataFrame, app_url: str, critical_zones: set = None) -> bytes:
    """Construit un PDF synthétique à télécharger depuis la page Streamlit."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, _txt("Clean my Map - rapport d'impact et de protection"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, _txt(f"Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}"), ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, _txt("Comment fonctionne la page Streamlit"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(
        0,
        6,
        _txt(
            "- Les bénévoles envoient une demande via le formulaire.\n"
            "- Les administrateurs valident/refusent les demandes.\n"
            "- La carte publique affiche les actions du Google Sheet et les actions validées.\n"
            "- Les zones propres sont différenciées des actions avec collecte (mégots/déchets)."
        ),
    )

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, _txt("Lien direct vers le formulaire Streamlit"), ln=True)
    pdf.set_text_color(0, 102, 204)
    pdf.set_font("Helvetica", "U", 10)
    pdf.cell(0, 6, _txt(app_url), ln=True, link=app_url)
    pdf.set_text_color(0, 0, 0)

    total = len(actions_df)
    propres = int(actions_df.get("est_propre", pd.Series(dtype=bool)).fillna(False).astype(bool).sum()) if total else 0
    avec_collecte = max(0, total - propres)
    total_megots = int(pd.to_numeric(actions_df.get("megots", 0), errors="coerce").fillna(0).sum()) if total else 0
    total_dechets = float(pd.to_numeric(actions_df.get("dechets_kg", 0), errors="coerce").fillna(0).sum()) if total else 0.0

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, _txt("Indicateurs"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, _txt(f"Actions publiques: {total}"), ln=True)
    pdf.cell(0, 6, _txt(f"Zones propres: {propres}"), ln=True)
    pdf.cell(0, 6, _txt(f"Actions avec collecte: {avec_collecte}"), ln=True)
    pdf.cell(0, 6, _txt(f"Mégots collectés: {total_megots:,}".replace(",", " ")), ln=True)
    pdf.cell(0, 6, _txt(f"Déchets collectés: {total_dechets:.1f} kg"), ln=True)

    if total:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 7, _txt("Dernières actions"), ln=True)
        pdf.set_font("Helvetica", "", 9)
        preview = actions_df.copy()
        if "date" in preview.columns:
            preview["_date_sort"] = pd.to_datetime(preview["date"], errors="coerce")
            preview = preview.sort_values("_date_sort", ascending=False)
        for _, row in preview.head(12).iterrows():
            line = (
                f"- {row.get('date', '')} | {row.get('type_lieu', 'Non spécifié')} | "
                f"{row.get('adresse', '')} | propre={bool(row.get('est_propre', False))}"
            )
            pdf.multi_cell(0, 5, _txt(line))

    # Ajout Page / Section Méthodologie Sourcée
    if critical_zones:
        pdf.ln(8)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(220, 20, 20) # Red
        pdf.cell(0, 8, _txt("zones nécessitant une attention particulière"), ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _txt(
            "analyse de récurrence : ces lieux ont été soignés au moins "
            "3 fois ces derniers mois. un accompagnement durable par "
            "l'équipement est conseillé (mobilier urbain, sensibilisation)."
        ))
        pdf.ln(2)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(0, 5, _txt(f"📍 {addr} : Nettoyé {data['count']} fois. Re-pollution tous les {data['delai_moyen']} jours."))
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"📍 {z}"))

    # Section : Remerciements aux partenaires locaux (Label Brigade Verte)
    partenaires = actions_df[actions_df.get('type_lieu') == "Établissement Engagé (Label)"]
    if not partenaires.empty:
        pdf.ln(8)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(15, 118, 110) # Vert Clean my Map
        pdf.cell(0, 8, _txt("remerciements aux partenaires locaux"), ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "I", 10)
        pdf.multi_cell(0, 5, _txt("nous saluons ces établissements qui veillent avec nous à la préservation de notre environnement commun."))
        pdf.ln(3)
        pdf.set_font("Helvetica", "", 10)
        for _, p in partenaires.iterrows():
            pdf.multi_cell(0, 5, _txt(f"- {p.get('association', 'établissement')} : {p.get('adresse', '')}"))

    # Plaidoyer Economique (Lobbying pour Mairies)
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 100, 0)
    pdf.cell(0, 8, _txt("Économie Circulaire et Impact sur la Collectivité"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    
    # Calcul coût du traitement évité
    tonnes_dechets = total_dechets / 1000.0
    economie_realisee = tonnes_dechets * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
    
    texte_lobbying = (
        f"Grâce à la mobilisation citoyenne et bénévole, "
        f"cette action a permis d'économiser environ {economie_realisee:,.2f} € "
        f"de frais de nettoyage et de traitement des déchets à la collectivité, tout en protégeant les nappes phréatiques."
    )
    pdf.multi_cell(0, 5, _txt(texte_lobbying))

    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(0, 8, _txt("Transparence : Méthodologie et Preuves Scientifiques"), ln=True, fill=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 9)
    # L'avertissement et les sources proviennent de notre fonction centralisée
    pdf.multi_cell(0, 5, _txt(get_impact_sources()))

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_territorial(df_ville: pd.DataFrame, nom_ville: str, critical_zones: set) -> bytes:
    """Construit un PDF 'Certificat d'Impact Territorial' dédié à un élu/commune."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    
    # En-tête officiel
    pdf.set_fill_color(240, 248, 255) # Bleu léger
    pdf.cell(0, 15, _txt(f"certificat d'impact territorial : {nom_ville}"), ln=True, align="C", fill=True)
    pdf.ln(5)
    
    # Statistiques Locales
    nb_actions = len(df_ville)
    total_dechets = df_ville.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
    total_megots = df_ville.get('megots', pd.Series(dtype=int)).fillna(0).sum()
    litres_eau = total_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
    
    tonnes_dechets = total_dechets / 1000.0
    economie_realisee = tonnes_dechets * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
    
    pdf.set_font("Helvetica", "", 11)
    texte_intro = (
        f"À l'attention de la Mairie et des services de la ville de {nom_ville},\n\n"
        f"Les Brigades Vertes et les citoyens bénévoles sont intervenus à {nb_actions} reprises sur votre territoire.\n"
        f"Bilan de la dépollution :\n"
        f"- {total_dechets:.1f} kg de déchets extraits de la voie publique.\n"
        f"- {total_megots} mégots ramassés.\n"
    )
    pdf.multi_cell(0, 6, _txt(texte_intro))
    
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 100, 0)
    pdf.cell(0, 8, _txt("Bénéfices pour la Collectivité"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 11)
    
    texte_economie = (
        f"💰 Valeur économique : Cette action citoyenne a permis d'économiser environ {economie_realisee:,.2f} € "
        f"de frais de nettoyage et de traitement des déchets sauvages à votre commune (Base: 150€/tonne).\n"
        f"💧 Impact environnemental local : Près de {litres_eau:,} litres d'eau protégés de la contamination toxique "
        f"sur votre secteur."
    )
    pdf.multi_cell(0, 6, _txt(texte_economie))
    
    # Points Noirs (Infrastructures)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(220, 20, 20)
    pdf.cell(0, 8, _txt(f"⚠️ Zones Prioritaires Identifiées ({len(critical_zones)} Points Noirs)"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    
    if critical_zones:
        pdf.multi_cell(0, 5, _txt(
            "Analyse prédictive de récurrence : Les lieux suivants sur votre commune ont fait "
            "l'objet d'au moins 3 nettoyages récurrents. "
            "Recommandation terrain : Veuillez envisager l'installation d'une infrastructure "
            "(cendrier de rue, poubelle) pour prévenir la récidive dont le rythme est mesuré ci-dessous :"
        ))
        pdf.ln(3)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(0, 5, _txt(f"📍 {addr} : {data['count']} passages. Se re-pollue en moyenne tous les {data['delai_moyen']} jours !"))
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"📍 {z}"))
    else:
        pdf.multi_cell(0, 5, _txt("Aucune zone de récidive chronique critique n'a encore été détectée par nos algorithmes sur ce périmètre spécifiques."))

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_eco_quartier(nom_quartier: str):
    """Génère un certificat PDF 'Quartier Préservé'."""
    pdf = FPDF()
    pdf.add_page()
    
    # Bordure décorative
    pdf.set_line_width(2)
    pdf.rect(5, 5, 200, 287)
    
    # En-tête
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 118, 110) # Vert Clean my Map
    pdf.cell(0, 40, _txt("CERTIFICAT D'IMPACT CITOYEN"), ln=True, align='C')
    
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(34, 197, 94)
    pdf.cell(0, 20, _txt("label éco-quartier"), ln=True, align='C')
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "", 18)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 10, _txt(f"félicitations aux habitants et contributeurs de {nom_quartier} !"), align='C')
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "I", 14)
    pdf.multi_cell(0, 8, _txt(
        "ce certificat atteste que votre quartier a maintenu un niveau de propreté citoyenne exemplaire "
        "sur les 180 derniers jours, sans aucun point noir recensé et avec des actions de soin régulières."
    ), align='C')
    
    pdf.ln(30)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, _txt("les brigades vertes"), ln=True, align='C')
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 10, _txt(datetime.now().strftime("%d/%m/%Y")), ln=True, align='C')
    
    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def get_eco_districts(df: pd.DataFrame):
    """
    Identifie les zones (communes) éligibles au label éco-quartier.
    Critères : 
    1. Présence d'au moins une action 'Zone Propre' (est_propre=True) sur les 180 derniers jours.
    2. Absence totale de signalements de pollution (est_propre=False) sur les 180 derniers jours.
    """
    if df.empty or 'date' not in df.columns or 'adresse' not in df.columns:
        return []
    
    # Conversion date
    df = df.copy()
    df['dt'] = pd.to_datetime(df['date'], errors='coerce')
    cutoff_date = datetime.now() - timedelta(days=180)
    recent_df = df[df['dt'] >= cutoff_date]
    
    if recent_df.empty:
        return []
        
    # On groupe par ville (simplifié par extraction du code postal/ville dans l'adresse)
    # Pour l'instant on groupe par adresse complète ou ville si on arrive à l'extraire
    recent_df['ville'] = recent_df['adresse'].apply(lambda x: str(x).split(' ')[-1].strip().lower())
    
    eligible_villes = []
    for ville, group in recent_df.groupby('ville'):
        has_clean_action = group['est_propre'].any()
        has_dirty_action = (group['est_propre'] == False).any()
        
        if has_clean_action and not has_dirty_action:
            eligible_villes.append(ville.capitalize())
            
    return eligible_villes


def get_eco_quartiers(df: pd.DataFrame):
    """
    Analyse les 180 derniers jours. 
    Un quartier est éligible s'il a au moins un signalement 'Zone propre' 
    et ZÉRO 'Point noir' (dechets > 0) sur cette période.
    """
    if df.empty:
        return []
    
    df = df.copy()
    # S'assurer que 'date' est bien au format date
    df['date_dt'] = pd.to_datetime(df['date'], errors='coerce')
    cutoff = datetime.now() - pd.Timedelta(days=180)
    recent = df[df['date_dt'] >= cutoff]
    
    if recent.empty:
        return []
        
    labels = []
    # On groupe par 'adresse'
    for addr, group in recent.groupby('adresse'):
        has_clean_signal = group['est_propre'].any()
        has_pollution = (group['dechets_kg'] > 0).any()
        
        if has_clean_signal and not has_pollution:
            labels.append(addr)
            
    return labels


def _find_col(df: pd.DataFrame, keywords):
    for col in df.columns:
        low = col.lower()
        if any(k in low for k in keywords):
            return col
    return None


@st.cache_data(ttl=300)
def load_sheet_actions(sheet_url: str):
    """Charge les actions du Google Sheet et les convertit en actions affichables."""
    try:
        raw = pd.read_csv(_sheet_csv_url(sheet_url))
        raw.columns = raw.columns.str.strip()
    except Exception:
        return []

    c_date = _find_col(raw, ["date", "jour"])
    c_addr = _find_col(raw, ["adresse", "gps", "lieu", "coordo"])
    c_type = _find_col(raw, ["type", "categorie", "catégorie"])
    c_assoc = _find_col(raw, ["association", "asso"])
    c_megots = _find_col(raw, ["megots", "mégots", "nbr megots"])
    c_dechets = _find_col(raw, ["dechets", "déchets", "kg", "poids"])
    c_ben = _find_col(raw, ["benevoles", "bénévoles", "participants", "nombre benevoles"])
    c_propre = _find_col(raw, ["liste lieux propres", "lieux_propres", "propres"])

    out = []
    db_approved = get_submissions_by_status('approved')
    known_pool = [str(a.get('adresse', '')) for a in db_approved if a.get('adresse')]

    for _, r in raw.iterrows():
        raw_adresse = str(r.get(c_addr, "") if c_addr else "").strip()
        if not raw_adresse or raw_adresse.lower() in {"nan", "none"}:
            continue
            
        adresse = fuzzy_address_match(raw_adresse, known_pool)
        if adresse not in known_pool:
            known_pool.append(adresse)

        lat, lon = parse_coords(adresse)
        dt = pd.to_datetime(r.get(c_date), errors='coerce', dayfirst=True) if c_date else pd.NaT
        d = dt.date().isoformat() if pd.notna(dt) else ""

        out.append(
            {
                "id": f"sheet_{len(out)}_{d}_{adresse[:20]}",
                "nom": "Référent association",
                "association": str(r.get(c_assoc, "Indépendant") if c_assoc else "Indépendant"),
                "type_lieu": str(r.get(c_type, "Non spécifié") if c_type else "Non spécifié"),
                "adresse": adresse,
                "date": d,
                "benevoles": int(pd.to_numeric(r.get(c_ben, 1), errors='coerce') or 1),
                "temps_min": 1,
                "megots": int(pd.to_numeric(r.get(c_megots, 0), errors='coerce') or 0),
                "dechets_kg": float(pd.to_numeric(r.get(c_dechets, 0), errors='coerce') or 0),
                "gps": adresse,
                "lat": lat,
                "lon": lon,
                "commentaire": "Import Google Sheet",
                "submitted_at": datetime.now().isoformat(timespec="seconds"),
                "est_propre": False,
                "source": "google_sheet",
                "plastique_kg": 0.0,
                "verre_kg": 0.0,
                "metal_kg": 0.0,
            }
        )

    # Convertir la colonne 'liste lieux propres' en points 'zone propre'
    if c_propre:
        uniques = raw[c_propre].fillna('').astype(str).str.strip()
        for raw_lieu in sorted({v for v in uniques if v and v.lower() not in {"nan", "none"}}):
            lieu = fuzzy_address_match(raw_lieu, known_pool)
            if lieu not in known_pool:
                known_pool.append(lieu)
                
            lat, lon = parse_coords(lieu)
            out.append(
                {
                    "id": f"sheet_propre_{lieu[:20]}",
                    "nom": "Référent association",
                    "association": "Signalement",
                    "type_lieu": "Non spécifié",
                    "adresse": lieu,
                    "date": "",
                    "benevoles": 0,
                    "temps_min": 0,
                    "megots": 0,
                    "dechets_kg": 0.0,
                    "gps": lieu,
                    "lat": lat,
                    "lon": lon,
                    "commentaire": "Zone propre signalée (Google Sheet)",
                    "submitted_at": datetime.now().isoformat(timespec="seconds"),
                    "est_propre": True,
                    "source": "google_sheet",
                    "plastique_kg": 0.0,
                    "verre_kg": 0.0,
                    "metal_kg": 0.0,
                }
            )

    return out


TEST_DATA = [
    {
        'adresse': 'Bois de Vincennes, Paris',
        'lat': 48.8289,
        'lon': 2.4325,
        'ville': 'Paris',
        'type_lieu': 'Bois/Parc/Jardin/Square/Sentier',
        'association': 'Test Association',
        'megots': 5000,
        'dechets_kg': 200,
        'temps_min': 120,
        'benevoles': 10,
        'date': '2024-02-18',
        'est_propre': False
    },
    {
        'adresse': 'Rue Maurice Utrillo, Paris',
        'lat': 48.8912,
        'lon': 2.3378,
        'ville': 'Paris',
        'type_lieu': 'N° Boulevard/Avenue/Place',
        'association': 'Test Association',
        'megots': 800,
        'dechets_kg': 50,
        'temps_min': 45,
        'benevoles': 3,
        'date': '2025-08-18',
        'est_propre': False
    },
    {
        'adresse': 'Sortie Métro Barbès-Rochechouart, Paris',
        'lat': 48.8838,
        'lon': 2.3509,
        'ville': 'Paris',
        'type_lieu': 'N° Boulevard/Avenue/Place',
        'association': 'Test Association',
        'megots': 12000,
        'dechets_kg': 100,
        'temps_min': 20,
        'benevoles': 5,
        'date': '2026-02-08',
        'est_propre': False
    },
    {
        'adresse': 'Rue de Rivoli, Paris',
        'lat': 48.8575,
        'lon': 2.3514,
        'ville': 'Paris',
        'type_lieu': 'N° Boulevard/Avenue/Place',
        'association': 'Test Association',
        'megots': 0,
        'dechets_kg': 0,
        'temps_min': 60,
        'benevoles': 2,
        'date': '2023-01-01',
        'est_propre': False
    },
    {
        'adresse': 'Tour Eiffel, Paris',
        'lat': 48.8584,
        'lon': 2.2945,
        'ville': 'Paris',
        'type_lieu': 'Monument',
        'association': 'Test Association',
        'megots': 3500,
        'dechets_kg': 75,
        'temps_min': 90,
        'benevoles': 8,
        'date': '2024-06-15',
        'est_propre': False
    },
    {
        'adresse': 'Montmartre, Paris',
        'lat': 48.8867,
        'lon': 2.3431,
        'ville': 'Paris',
        'type_lieu': 'Quartier',
        'association': 'Test Association',
        'megots': 2800,
        'dechets_kg': 45,
        'temps_min': 75,
        'benevoles': 6,
        'date': '2024-09-22',
        'est_propre': False
    },
    {
        'adresse': 'Quai de Valmy, Paris 10e',
        'lat': 48.8705,
        'lon': 2.3650,
        'ville': 'Paris',
        'type_lieu': 'Quai/Pont/Port',
        'association': 'Clean Walk Paris 10',
        'megots': 4500,
        'dechets_kg': 180,
        'temps_min': 150,
        'benevoles': 25,
        'date': '2025-09-21',
        'est_propre': False
    },
    {
        'adresse': 'Parc des Buttes-Chaumont, Paris 19e',
        'lat': 48.8808,
        'lon': 2.3825,
        'ville': 'Paris',
        'type_lieu': 'Bois/Parc/Jardin/Square/Sentier',
        'association': 'Green Friday',
        'megots': 3200,
        'dechets_kg': 210,
        'temps_min': 180,
        'benevoles': 40,
        'date': '2025-11-29',
        'est_propre': False
    },
    {
        'adresse': 'Place de la République, Paris 3e',
        'lat': 48.8675,
        'lon': 2.3632,
        'ville': 'Paris',
        'type_lieu': 'N° Boulevard/Avenue/Place',
        'association': 'Collectif Nettoyons Paris',
        'megots': 6800,
        'dechets_kg': 290,
        'temps_min': 200,
        'benevoles': 55,
        'date': '2026-01-17',
        'est_propre': False
    },
    {
        'adresse': 'Lac Daumesnil, Bois de Vincennes, Paris 12e',
        'lat': 48.8305,
        'lon': 2.4150,
        'ville': 'Paris',
        'type_lieu': 'Bois/Parc/Jardin/Square/Sentier',
        'association': 'Paris Zéro Déchet',
        'megots': 5200,
        'dechets_kg': 310,
        'temps_min': 220,
        'benevoles': 35,
        'date': '2025-10-12',
        'est_propre': False
    },
    {
        'adresse': 'Parc Montsouris, Paris 14e',
        'lat': 48.8225,
        'lon': 2.3380,
        'ville': 'Paris',
        'type_lieu': 'Bois/Parc/Jardin/Square/Sentier',
        'association': 'Étudiants pour la Planète',
        'megots': 1800,
        'dechets_kg': 95,
        'temps_min': 120,
        'benevoles': 18,
        'date': '2025-11-05',
        'est_propre': False
    },
    {
        "adresse": "Parc de la Villette, Paris 19e",
        'lat': 48.8915,
        'lon': 2.3895,
        'ville': 'Paris',
        'type_lieu': 'Quai/Pont/Port',
        'association': 'Green Wednesday',
        'megots': 4100,
        'dechets_kg': 195,
        'temps_min': 170,
        'benevoles': 30,
        'date': '2026-02-28',
        'est_propre': False
    },
    {
        'adresse': 'Quai de la Tournelle, Paris 5e',
        'lat': 48.8510,
        'lon': 2.3540,
        'ville': 'Paris',
        'type_lieu': 'Quai/Pont/Port',
        'association': 'Paris Clean Walk',
        'megots': 3800,
        'dechets_kg': 170,
        'temps_min': 140,
        'benevoles': 22,
        'date': '2025-08-15',
        'est_propre': False
    },
    {
        'adresse': 'Parc André Citroën, Paris 15e',
        'lat': 48.8410,
        'lon': 2.2760,
        'ville': 'Paris',
        'type_lieu': 'Bois/Parc/Jardin/Square/Sentier',
        'association': 'Green Family',
        'megots': 2700,
        'dechets_kg': 140,
        'temps_min': 130,
        'benevoles': 28,
        'date': '2025-09-07',
        'est_propre': False
    },
    {
        'adresse': 'Porte de Clignancourt, Paris 18e',
        'lat': 48.9005,
        'lon': 2.3450,
        'ville': 'Paris',
        'type_lieu': 'N° Boulevard/Avenue/Place',
        'association': 'Les Éco-puces',
        'megots': 5900,
        'dechets_kg': 420,
        'temps_min': 250,
        'benevoles': 45,
        'date': '2025-12-14',
        'est_propre': False
    },
    {
        'adresse': 'Jardin du Luxembourg, Paris 6e',
        'lat': 48.8465,
        'lon': 2.3370,
        'ville': 'Paris',
        'type_lieu': 'Bois/Parc/Jardin/Square/Sentier',
        'association': 'Sénat Propre',
        'megots': 2100,
        'dechets_kg': 85,
        'temps_min': 110,
        'benevoles': 15,
        'date': '2025-07-22',
        'est_propre': False
    }
]

def init_state():
    pass # Les listes temporaires ont été remplacées par SQLite

init_state()

# Lecture des paramètres d'URL (Kit Terrain QR Code)
lieu_prefill = st.query_params.get("lieu", "")
if lieu_prefill:
    st.toast(f"📍 Lieu détecté via QR Code : {lieu_prefill}", icon="📱")


# Configuration injectée via CSS global plus haut

# --- AUTHENTIFICATION (SIMPLIFIÉE) ---
# Accès libre pour les bénévoles, mot de passe pour l'admin.
main_user_email = _google_user_email() or "Bénévole Anonyme"

st.markdown(
    """
    <div class="hero-container">
      <h1 class="hero-title">Agir. Cartographier.<br>Préserver.</h1>
      <p class="hero-subtitle"><b>Clean my Map</b> est l'outil citoyen qui transforme chaque déchet ramassé en donnée scientifique pour protéger durablement notre environnement.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# --- Bannière d'Impact Global (Custom Cards) ---
stats_global = get_total_approved_stats()
eau_litres = stats_global['megots'] * IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L']

st.markdown(
    f"""
    <div class="metric-grid">
        <div class="metric-card">
            <div class="metric-label">Déchets retirés</div>
            <div class="metric-value">{stats_global['dechets_kg']:.1f}<span class="metric-unit">kg</span></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Eau préservée</div>
            <div class="metric-value">{eau_litres:,}<span class="metric-unit">Litres</span></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Citoyens engagés</div>
            <div class="metric-value">{stats_global['benevoles']:,}<span class="metric-unit">Héros</span></div>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

sheet_actions = load_sheet_actions(GOOGLE_SHEET_URL)
all_imported_actions = sheet_actions + TEST_DATA
# Import manuel ou asynchrone pour ne les insérer qu'une seule fois. 
# Pour l'instant on garde une vue concaténée en lecture

pending_count = len(get_submissions_by_status('pending'))
approved_count = len(get_submissions_by_status('approved'))

tabs = st.tabs([
    "📝 Déclaration bénévole",
    "🗺️ Carte & Actions",
    "📄 Rapport PDF",
    "📋 Historique des Actions",
    "📍 Calculateur de Trajet Vert",
    "♻️ Seconde Vie",
    "💬 Mur Communautaire",
    "🏛️ Espace Élus",
    "📊 Notre Impact",
    "⚙️ Admin / Validation"
])

tab_add, tab_view, tab_report, tab_history, tab_route, tab_recycling, tab_wall, tab_elus, tab_home, tab_admin = tabs

with tab_home:
    st.markdown("### 📊 Notre Impact")
    
    st.markdown('<div class="premium-card">', unsafe_allow_html=True)
    st.subheader("🏅 Mon Grade Citoyen")
    c_p1, c_p2 = st.columns([2, 1])
    with c_p1:
        check_pseudo = st.text_input("Vérifier mon grade (entrez votre pseudo)", placeholder="Ex: Jean_Vert", key="top_check_pseudo")
    with c_p2:
        st.write("") # Spacer
        st.write("") # Spacer
        if check_pseudo:
            db_approved = get_submissions_by_status('approved')
            all_actions_df = pd.DataFrame(all_imported_actions + db_approved)
            badge = get_user_badge(check_pseudo.strip(), all_actions_df) if not all_actions_df.empty else ""
            if badge: st.success(badge)
            else: st.info("Nouveau contributeur ? Bienvenue !")
    st.markdown('</div>', unsafe_allow_html=True)

    st.divider()
    col_a, col_b = st.columns(2)
    with col_a:
        st.info("Rejoignez des milliers de citoyens engagés pour une nature plus propre.")
    with col_b:
        st.warning("Devenez bénévole dès aujourd'hui, seul ou en association !")

    st.info("Utilisez l'onglet Déclaration pour contribuer ou consulter la carte.")

with tab_view:
    st.subheader("🗺️ Carte Interactive des Actions")
    
    # Chargement DB + imports (Google Sheet et Excel)
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)

    critical_zones = get_critical_zones(public_df) if not public_df.empty else []
    
    # Fallback sur Paris si vide
    center_lat, center_lon = 48.8566, 2.3522
    zoom_start = 12
    
    map_df = pd.DataFrame()
    if not public_df.empty:
        map_df = public_df.dropna(subset=["lat", "lon"]).copy()
        if not map_df.empty:
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
            zoom_start = 11

    m = folium.Map(location=[center_lat, center_lon], zoom_start=zoom_start)
    
    # Récupération Open Data (Poubelles de rue)
    official_bins = get_paris_bins()
    features = []
    
    # Ajouter les poubelles officielles
    for b in official_bins:
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': [b['lon'], b['lat']]},
            'properties': {
                'time': datetime.now().strftime('%Y-%m-%d'),
                'popup': f"<b>🗑️ Info Officielle</b><br>Type: {b.get('type')}<br>Propriétaire: Ville de Paris",
                'icon': 'circle',
                'iconstyle': {
                    'color': '#808080',
                    'fillColor': '#808080',
                    'fillOpacity': 0.4,
                    'radius': 3
                },
                'style': {'color': '#808080'}
            }
        })

    if not map_df.empty:
        for _, row in map_df.iterrows():
            is_critical = row.get('adresse', '') in critical_zones
            is_clean = row.get('est_propre', False)
            is_business = row.get('type_lieu') == "Établissement Engagé (Label)"
            
            gap_alert = ""
            if not is_clean and not is_business and row.get('lat') and row.get('lon'):
                if 48.8 <= row['lat'] <= 48.9 and 2.2 <= row['lon'] <= 2.4:
                    is_gap, dist = calculate_infrastructure_gap(row['lat'], row['lon'], official_bins)
                    if is_gap:
                        gap_alert = f"<br><b style='color:orange;'>besoin d'équipement</b><br>poubelle la plus proche : {int(dist)}m (> 200m)"

            icon = 'circle'
            if is_critical:
                color = "red"
                radius = 15
            elif is_business:
                color = "#FFD700" 
                radius = 18
                icon = 'star'
            elif is_clean:
                color = "green"
                radius = 8
            else:
                color = "blue"
                radius = 10
                
            popup_html = f"<b>{row.get('type_lieu', 'lieu')}</b><br>asso/nom: {row.get('association', 'inconnu')}<br>"
            if not is_business:
                popup_html += f"mégots: {int(row.get('megots', 0))}<br>déchets: {float(row.get('dechets_kg', 0))} kg<br>statut: {'propre' if is_clean else 'nettoyé'}"
            else:
                popup_html += f"<b>établissement labellisé</b><br>{row.get('commentaire', '')}"
            
            popup_html += gap_alert
            if is_critical:
                popup_html += "<br><b>lieu à surveiller</b>"
            
            raw_date = row.get('date', '')
            if not raw_date or str(raw_date).lower() in ["nan", "none", ""]:
                try:
                    raw_date = row.get('submitted_at', '').split('T')[0]
                except:
                    raw_date = datetime.now().strftime('%Y-%m-%d')
            
            features.append({
                'type': 'Feature',
                'geometry': {'type': 'Point', 'coordinates': [row['lon'], row['lat']]},
                'properties': {
                    'time': raw_date,
                    'popup': popup_html,
                    'icon': icon,
                    'iconstyle': {
                        'color': color,
                        'fillColor': color,
                        'fillOpacity': 0.6,
                        'radius': radius
                    },
                    'style': {'color': color}
                }
            })

    TimestampedGeoJson(
        {'type': 'FeatureCollection', 'features': features},
        period='P1D',
        add_last_point=True,
        auto_play=False,
        loop=False,
        max_speed=1,
        loop_button=True,
        date_options='YYYY-MM-DD',
        time_slider_drag_update=True
    ).add_to(m)
    
    st_folium(m, width=900, height=500, returned_objects=[])

with tab_add:
    st.divider()
    with st.form("submission_form", clear_on_submit=True):
        st.subheader("🏁 Nouvelle déclaration")

        action_type = st.radio(
            "Type d'action",
            ["Ajouter une récolte", "Déclarer un lieu propre"],
            horizontal=True,
            help="Choisissez 'Lieu propre' si vous signalez une zone sans aucun déchet."
        )
        zone_propre = (action_type == "Déclarer un lieu propre")

        if action_type == "Ajouter une récolte":
            st.subheader("📝 Détails de la récolte")
            c1, c2 = st.columns(2)
            with c1:
                nom = st.text_input("Votre prénom / pseudo*", value=check_pseudo if check_pseudo else "", placeholder="Ex: Sarah", key="harvest_pseudo")
                association = st.text_input("Association", placeholder="Ex: Clean Walk Paris 10")
                type_lieu = st.selectbox("Type de lieu*", TYPE_LIEU_OPTIONS, index=0)
                adresse = st.text_input("Adresse / lieu*", value=lieu_prefill if lieu_prefill else "", placeholder="Ex: Tour Eiffel, Paris")
            with c2:
                action_date = st.date_input("Date de l'action*", value=date.today(), max_value=date.today())
                benevoles = st.number_input("Nombre de bénévoles*", min_value=1, value=1, step=1)
                temps_min = st.number_input("Durée (minutes)*", min_value=1, value=60, step=5)
                gps = st.text_input("Coordonnées GPS (optionnel)", placeholder="48.8584, 2.2945")

            st.divider()
            c3, c4 = st.columns(2)
            with c3:
                megots = st.number_input("Mégots collectés", min_value=0, value=0, step=10)
            with c4:
                dechets_kg = st.number_input("Déchets (total kg)", min_value=0.0, value=0.0, step=0.5)
            
            with st.expander("Détail optionnel des déchets (en kg)"):
                cd1, cd2, cd3 = st.columns(3)
                with cd1:
                    plastique_kg = st.number_input("Plastique (kg)", min_value=0.0, step=0.5)
                with cd2:
                    verre_kg = st.number_input("Verre (kg)", min_value=0.0, step=0.5)
                with cd3:
                    metal_kg = st.number_input("Métal (kg)", min_value=0.0, step=0.5)

            if type_lieu == "Établissement Engagé (Label)":
                engagement = st.text_area("quelles sont les actions de cet établissement ?", placeholder="ex: démarche zéro déchet, collecte solidaire...")
                commentaire = st.text_area("petite note complémentaire (optionnel)", placeholder="informations utiles pour l'équipe")
                if engagement:
                    commentaire = f"[engagement] {engagement}\n{commentaire}"
            else:
                commentaire = st.text_area("commentaire (optionnel)", placeholder="informations utiles pour l'équipe")
        else:
            st.subheader("🧼 Signalement Zone Propre")
            nom = st.text_input("Votre pseudo*", value=check_pseudo if check_pseudo else "", placeholder="Ex: Jean_Vert", key="clean_pseudo")
            adresse = st.text_input("Lieu constaté propre*", value=lieu_prefill if lieu_prefill else "", placeholder="Ex: Place de la Bastille, Paris")
            action_date = st.date_input("Date du constat*", value=date.today(), max_value=date.today())
            
            # Valeurs par défaut pour le mode propre
            association = "Indépendant"
            type_lieu = "Non spécifié"
            benevoles = 1
            temps_min = 1
            megots = 0
            dechets_kg = 0.0
            plastique_kg = 0.0
            verre_kg = 0.0
            metal_kg = 0.0
            gps = ""
            commentaire = "Zone signalée propre"
        
        st.markdown("---")
        subscribe_newsletter = st.checkbox("recevoir la gazette des brigades (impact trimestriel)", value=True)
        user_email = ""
        if subscribe_newsletter:
            user_email = st.text_input("votre adresse email pour la gazette*", placeholder="ex: camille@écologie.fr")
            
        submitted = st.form_submit_button("partager mon action", use_container_width=True)

    if submitted:
        if not nom.strip() or not adresse.strip() or not type_lieu:
            st.error("Merci de remplir les champs obligatoires (*)")
        elif subscribe_newsletter and not user_email.strip():
            st.error("Merci de renseigner votre email pour la gazette.")
        else:
            # Fuzzy match contre la base existante pour unifier les noms
            approved_actions = get_submissions_by_status('approved')
            existing_pool = [a.get('adresse') for a in approved_actions if a.get('adresse')]
            adresse_propre = fuzzy_address_match(adresse.strip(), existing_pool)
            
            lat, lon = parse_coords(gps)
            data_to_save = {
                "id": str(uuid.uuid4()),
                "nom": nom.strip(),
                "association": association.strip(),
                "type_lieu": type_lieu,
                "adresse": adresse_propre,
                "date": str(action_date),
                "benevoles": benevoles,
                "temps_min": temps_min,
                "megots": megots,
                "dechets_kg": dechets_kg,
                "plastique_kg": plastik_kg,
                "verre_kg": verre_kg,
                "metal_kg": metal_kg,
                "gps": gps,
                "lat": lat,
                "lon": lon,
                "commentaire": commentaire,
                "est_propre": zone_propre,
                "submitted_at": datetime.now().isoformat()
            }
            insert_submission(data_to_save)
            if subscribe_newsletter and user_email:
                add_subscriber(user_email)
            st.success("Merci ! Votre action a été enregistrée et sera validée par un administrateur.")
            st.balloons()
            st.rerun()

with tab_report:
    st.subheader("📄 Rapport d'Impact Clean My Map")
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if not public_df.empty:
        pdf_bytes = build_public_pdf(public_df, STREAMLIT_PUBLIC_URL, get_critical_zones(public_df))
        st.download_button(
            "⬇️ Télécharger le rapport complet (PDF)",
            data=pdf_bytes,
            file_name="cleanmymap_rapport_public.pdf",
            mime="application/pdf",
            use_container_width=True,
        )
        
        st.divider()
        st.markdown("### 👁️ Aperçu du Rapport")
        
        # Synthèse visuelle pour le web
        col1, col2, col3 = st.columns(3)
        total_d = public_df['dechets_kg'].sum()
        total_m = public_df['megots'].sum()
        total_b = public_df['benevoles'].sum()
        
        col1.metric("Déchets", f"{total_d:.1f} kg")
        col2.metric("Mégots", f"{total_m:,}")
        col3.metric("Bénévoles", f"{total_b:,}")
        
        st.write("---")
        st.markdown("#### 🔍 Dernières actions marquantes")
        st.dataframe(public_df.sort_values('date', ascending=False).head(10)[["date", "type_lieu", "adresse", "dechets_kg", "megots"]], use_container_width=True, hide_index=True)
    else:
        st.info("Aucune donnée disponible pour générer le rapport.")

with tab_history:
    st.subheader("📋 Historique des Actions Citoyennes")
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if not public_df.empty:
        st.write(f"Retrouvez ici l'ensemble des {len(public_df)} actions recensées par la communauté.")
        st.dataframe(public_df[["date", "type_lieu", "adresse", "est_propre", "benevoles", "megots", "dechets_kg"]].sort_values('date', ascending=False), use_container_width=True, hide_index=True)
    else:
        st.info("L'historique est actuellement vide.")

with tab_route:
    st.subheader("📍 Calculateur de Trajet Vert (Logistique)")
    st.write("Calculez le trajet le plus court entre deux points passant par un maximum de zones signalées (Points Noirs).")

    # Récupération des points noirs (actions non propres) depuis les données publiques
    db_approved = get_submissions_by_status('approved')
    public_actions = sheet_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if public_df.empty:
        st.warning("Aucune donnée disponible pour optimiser un trajet.")
    else:
        # Filtrer uniquement les points qui ne sont pas "propres" (i.e., qui nécessitent un ramassage)
        points_noirs_df = public_df[public_df.get('est_propre', False) == False].dropna(subset=["lat", "lon"])
        
        if points_noirs_df.empty:
            st.info("Aucun point noir signalé actuellement. Tout est propre !")
        else:
            with st.form("route_form"):
                col_a, col_b = st.columns(2)
                with col_a:
                    point_a = st.text_input("Point de départ (A)", placeholder="Ex: Gare de Versailles-Chantiers")
                with col_b:
                    point_b = st.text_input("Point d'arrivée (B)", placeholder="Ex: Château de Versailles")
                
                optimize_btn = st.form_submit_button("Calculer l'itinéraire", use_container_width=True)

            if optimize_btn:
                if not point_a or not point_b:
                    st.error("Veuillez saisir un point de départ et un point d'arrivée.")
                else:
                    with st.spinner("Géocodage des adresses..."):
                        geolocator = Nominatim(user_agent="cleanmymap_app")
                        try:
                            loc_a = geolocator.geocode(point_a, timeout=10)
                            loc_b = geolocator.geocode(point_b, timeout=10)
                        except GeocoderTimedOut:
                            st.error("Service de géocodage indisponible (timeout). Réessayez.")
                            loc_a, loc_b = None, None

                    if not loc_a or not loc_b:
                        st.error("Impossible de trouver les coordonnées pour ces adresses.")
                    else:
                        st.success(f"Départ : {loc_a.address} | Arrivée : {loc_b.address}")
                        
                        center_lat = (loc_a.latitude + loc_b.latitude) / 2
                        center_lon = (loc_a.longitude + loc_b.longitude) / 2
                        
                        # Calculer et afficher l'itinéraire
                        spinner_msg = "Génération du trajet (très rapide grâce au cache)..." if eco_mode else "Génération du graphe piéton et calcul du trajet (cela peut prendre un moment)..."
                        with st.spinner(spinner_msg):
                            try:
                                # Télécharger le graphe (zone englobante)
                                dist_approx = ox.distance.great_circle(loc_a.latitude, loc_a.longitude, loc_b.latitude, loc_b.longitude)
                                buffer_meters = 300 if eco_mode else max(2000, dist_approx / 2 + 1000)
                                # L'utilisation du cache evite de refaire l'appel si les memes coords/dist sont demandees
                                G = get_osmnx_graph(center_lat, center_lon, buffer_meters)
                                
                                # Trouver les noeuds les plus proches pour A et B
                                node_a = ox.distance.nearest_nodes(G, loc_a.longitude, loc_a.latitude)
                                node_b = ox.distance.nearest_nodes(G, loc_b.longitude, loc_b.latitude)

                                # Simple proxy d'optimisation (pour MVP) : trouver les points noirs proches de ce graphe
                                # et tenter de faire un chemin qui passe par quelques-uns d'entre eux.
                                # Pour cet exemple, on fait un shortest_path direct si c'est trop complexe, 
                                # ou on insère le point noir le plus proche du centre.
                                
                                path_nodes = [node_a]
                                
                                # Trouver les 2-3 points noirs les plus proches du centre
                                points_noirs_df['dist_to_center'] = points_noirs_df.apply(
                                    lambda r: ox.distance.great_circle(center_lat, center_lon, r['lat'], r['lon']), axis=1
                                )
                                top_points = points_noirs_df.sort_values('dist_to_center').head(3)
                                
                                w_nodes = []
                                for _, p in top_points.iterrows():
                                    pn_node = ox.distance.nearest_nodes(G, p['lon'], p['lat'])
                                    w_nodes.append(pn_node)
                                
                                # Construire un chemin: A -> p1 -> p2 -> p3 -> B
                                current_node = node_a
                                total_path = []
                                total_length = 0
                                
                                for tgt in w_nodes + [node_b]:
                                    try:
                                        sub_path = nx.shortest_path(G, current_node, tgt, weight='length')
                                        if len(total_path) > 0:
                                            total_path.extend(sub_path[1:])
                                        else:
                                            total_path.extend(sub_path)
                                        
                                        # Calcul de distance
                                        for u, v in zip(sub_path[:-1], sub_path[1:]):
                                            data = G.get_edge_data(u, v)[0]
                                            total_length += data.get('length', 0)
                                            
                                        current_node = tgt
                                    except nx.NetworkXNoPath:
                                        continue # Skip this waypoint if unreachable
                                
                                if not total_path:
                                    st.error("Aucun chemin piéton trouvé entre ces points.")
                                else:
                                    # Vitesse de marche moyenne ~ 4.5 km/h = 75 m / min
                                    walk_time_min = total_length / 75
                                    # Temps d'arrêt estimé par point noir (ex: 15min)
                                    stop_time_min = len(w_nodes) * 15
                                    total_time_min = walk_time_min + stop_time_min
                                    
                                    st.info(f"📏 Distance totale : {total_length/1000:.2f} km | ⏱️ Temps estimé : {int(total_time_min)} min (dont {stop_time_min} min de ramassage)")
                                    
                                    # Tracer sur carte Folium
                                    route_coords = [(G.nodes[n]['y'], G.nodes[n]['x']) for n in total_path]
                                    
                                    m = folium.Map(location=[center_lat, center_lon], zoom_start=13)
                                    folium.PolyLine(route_coords, color="blue", weight=5, opacity=0.7).add_to(m)
                                    
                                    # Marqueurs Départ/Arrivée
                                    folium.Marker([loc_a.latitude, loc_a.longitude], popup="Départ", icon=folium.Icon(color="green")).add_to(m)
                                    folium.Marker([loc_b.latitude, loc_b.longitude], popup="Arrivée", icon=folium.Icon(color="red")).add_to(m)
                                    
                                    # Marqueurs Points Noirs
                                    for _, p in top_points.iterrows():
                                        folium.CircleMarker(
                                            location=[p['lat'], p['lon']],
                                            radius=8,
                                            popup=f"Point Noir: {p.get('adresse', 'Inconnu')}",
                                            color="black",
                                            fill=True,
                                            fill_color="orange"
                                        ).add_to(m)
                                    
                                    st_folium(m, width=900, height=500, returned_objects=[])

                            except Exception as e:
                                st.error(f"Erreur lors du calcul de l'itinéraire : {e}")

with tab_recycling:
    st.subheader("♻️ Seconde Vie & Récupération Énergétique")
    st.write("Valorisation des déchets ramassés lors des actions de nettoyage et équivalences de recyclage.")
    
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if public_df.empty:
        st.info("Aucune donnée disponible pour l'instant.")
    else:
        total_megots = public_df.get('megots', pd.Series(dtype=int)).fillna(0).sum()
        
        def get_plastique(r):
            if r.get('plastique_kg', 0) > 0: return float(r['plastique_kg'])
            return float(r.get('dechets_kg', 0)) * IMPACT_CONSTANTS['PLASTIQUE_URBAIN_RATIO']
        def get_verre(r):
            if r.get('verre_kg', 0) > 0: return float(r['verre_kg'])
            return float(r.get('dechets_kg', 0)) * IMPACT_CONSTANTS['VERRE_URBAIN_RATIO']
        def get_metal(r):
            if r.get('metal_kg', 0) > 0: return float(r['metal_kg'])
            return float(r.get('dechets_kg', 0)) * IMPACT_CONSTANTS['METAL_URBAIN_RATIO']
            
        tot_plastique = public_df.apply(get_plastique, axis=1).sum()
        tot_verre = public_df.apply(get_verre, axis=1).sum()
        tot_metal = public_df.apply(get_metal, axis=1).sum()
        
        tot_megots_kg = total_megots * IMPACT_CONSTANTS["POIDS_MOYEN_MEGOT_KG"]
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### Équivalences de recyclage 🛠️")
            st.info(f"**{tot_plastique:.1f} kg** de plastique collectés au total.")
            
            bancs = int(tot_plastique / IMPACT_CONSTANTS['PLASTIQUE_POUR_BANC_KG'])
            pulls = int(tot_plastique / IMPACT_CONSTANTS['PLASTIQUE_POUR_PULL_KG'])
            
            st.success(f"🪑 Avec ce plastique, on pourrait fabriquer **{bancs} bancs publics** !")
            st.success(f"👕 Ou bien **{pulls} pulls en polaire** !")
            
        with col2:
            st.markdown("### Répartition des déchets 📊")
            if (tot_plastique + tot_verre + tot_metal + tot_megots_kg) > 0:
                fig, ax = plt.subplots(figsize=(5, 5))
                labels = ['Plastique', 'Verre', 'Métal', 'Mégots']
                sizes = [tot_plastique, tot_verre, tot_metal, tot_megots_kg]
                colors = ['#ff9999','#66b3ff','#99ff99','#ffcc99']
                
                # Filter out zeroes
                filtered_data = [(l, s, c) for l, s, c in zip(labels, sizes, colors) if s > 0]
                labels = [x[0] for x in filtered_data]
                sizes = [x[1] for x in filtered_data]
                colors = [x[2] for x in filtered_data]

                ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
                ax.axis('equal') 
                st.pyplot(fig)
            else:
                st.warning("Pas de déchets comptabilisés pour générer le graphique.")

# ------------------------------------------------------------------------
# ONGLET : MUR COMMUNAUTAIRE
# ------------------------------------------------------------------------
with tab_wall:
    st.subheader("le mur des brigades")
    st.write("partagez vos impressions, vos réussites ou vos besoins en matériel avec la communauté.")
    
    # Récupération des messages
    messages = get_messages()
    
    # Formulaire pour nouveau message
    with st.form("wall_form", clear_on_submit=True):
        pseudo_msg = st.text_input("votre pseudo", placeholder="ex: camille_verte")
        contenu_msg = st.text_area("votre message", placeholder="merci à l'équipe pour l'action à versailles !")
        submit_msg = st.form_submit_button("partager sur le mur")
        
        if submit_msg:
            if not pseudo_msg.strip() or not contenu_msg.strip():
                st.error("Champs obligatoires manquants.")
            else:
                add_message(pseudo_msg.strip(), contenu_msg.strip())
                st.success("Message publié !")
                st.rerun()

    st.divider()
    
    # Affichage des messages avec badges
    if not messages:
        st.info("Soyez le premier à poster un message !")
    else:
        # On a besoin des actions pour calculer les badges
        db_approved = get_submissions_by_status('approved')
        all_actions_df = pd.DataFrame(all_imported_actions + db_approved)
        
        for m in reversed(messages): # Plus récent en haut
            pseudo = m.get('author', m.get('pseudo', 'Anonyme'))
            timestamp = m.get('created_at', m.get('timestamp', ''))
            badge = get_user_badge(pseudo, all_actions_df)
            st.markdown(f"**{pseudo}** {badge} • *{timestamp}*")
            st.info(m.get('content', ''))
            st.markdown("---")

# ------------------------------------------------------------------------
# ONGLET : ESPACE ELUS (DASHBOARD COLLECTIVITES)
# ------------------------------------------------------------------------
with tab_elus:
    st.header("espace territoires (dashboard collectivités)")
    st.write("ce portail permet de visualiser l'impact de l'action citoyenne sur votre commune.")
    
    # Extraire une liste de Villes/Codes Postaux basique à partir des actions approuvées
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)
    
    if not approved_df.empty and 'adresse' in approved_df.columns:
        # Essayer d'extraire le dernier "mot" de l'adresse (souvent la Ville ou le Code postal) ou afficher toute l'adresse si court
        # Une méthode robuste pour des adresses non normalisées est de demander à l'élu de filtrer par "Mot Clé"
        villes_uniques = ["Paris", "Versailles", "Montreuil", "Lyon", "Marseille", "Toulouse"] # Liste par défaut si parsing complexe
        
        extracted_cities = set()
        for addr in approved_df['adresse'].dropna():
            match = re.search(r'\b\d{5}\s+([A-Z-a-zÀ-ÿ\s]+)\b', addr)
            if match:
                extracted_cities.add(match.group(1).strip())
            else:
                # Fallback : on prend le dernier segment après une virgule s'il y en a une, sinon le dernier mot
                parts = addr.split(',')
                if len(parts) > 1: extracted_cities.add(parts[-1].strip())
        
        if extracted_cities:
            villes_uniques = sorted(list(extracted_cities))
        
        st.info("💡 Saisissez le nom de votre commune (ou un mot clé de votre territoire) pour isoler les statistiques.")
        
        # Laisser à l'élu l'opportunité de taper son arrondissement/ville
        recherche_ville = st.selectbox("Sélectionnez votre Territoire :", options=["-- Sélectionnez --"] + list(villes_uniques) + ["[Autre Recheche Manuelle]"])
        
        if recherche_ville == "[Autre Recheche Manuelle]":
            recherche_ville = st.text_input("Tapez le nom de la ville ou de l'arrondissement librement :")
            
        if recherche_ville and recherche_ville != "-- Sélectionnez --":
            # Filtrer le DataFrame
            df_ville = approved_df[approved_df['adresse'].str.contains(recherche_ville, case=False, na=False)]
            
            if df_ville.empty:
                st.warning(f"Aucune action bénévole répertoriée correspondante à '{recherche_ville}' pour le moment.")
            else:
                nb_actions = len(df_ville)
                tot_megots = df_ville.get('megots', pd.Series(dtype=int)).fillna(0).sum()
                tot_dechets = df_ville.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
                
                economie = (tot_dechets / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
                eau_save = tot_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
                
                # Récupérer les points critiques (si des zones de récurrence sont détectées sur cette ville)
                points_critiques = get_critical_zones(df_ville)
                
                st.success(f"recherche : **{nb_actions} actions citoyennes** recensées sur {recherche_ville}")
                
                col1, col2, col3 = st.columns(3)
                col1.metric("matières collectées", f"{tot_dechets:.1f} kg")
                col2.metric("eau préservée", f"{eau_save:,} litres")
                col3.metric("économie estimée", f"{economie:.2f} €", help="coût de traitement évité pour la collectivité.")
                
                st.markdown("---")
                st.subheader(f"zones de vigilance ({len(points_critiques)} lieux)")
                if points_critiques:
                    st.info(f"ces **{len(points_critiques)} lieux** font l'objet de soins réguliers par nos brigades. un renforcement des infrastructures locales (cendriers, bacs) pourrait aider à pérenniser cette propreté :")
                    if isinstance(points_critiques, dict):
                        for addr, data in points_critiques.items():
                            st.write(f"- 📍 **{addr}** : Signalée {data['count']} fois. Mémorisé se re-pollue tous les **{data['delai_moyen']} jours**.")
                    else:
                        for z in points_critiques:
                            st.write(f"- 📍 {z}")
                else:
                    st.success("aucune zone de récurrence critique détectée sur cette sélection.")

                # --- Maintenance & Backup ---
                st.markdown("---")
                st.subheader("maintenance & sauvegarde")
                col_b1, col_b2 = st.columns(2)
                with col_b1:
                    if st.button("générer une sauvegarde (json)"):
                        all_data = pd.DataFrame(get_submissions_by_status(None))
                        json_data = all_data.to_json(orient='records', force_ascii=False)
                        st.download_button(
                            label="télécharger la sauvegarde",
                            data=json_data,
                            file_name=f"backup_cleanmymap_{datetime.now().strftime('%Y%m%d')}.json",
                            mime="application/json"
                        )
                with col_b2:
                    st.info("💡 pensez à faire une sauvegarde avant toute mise à jour majeure du schéma de base de données.")

                st.markdown("---")
                if st.button("se déconnecter"):
                    st.logout()
                # --- NOUVEAU : Label Éco-Quartier ---
                st.markdown("---")
                st.subheader("label éco-quartier citoyen")
                eligible_villes = get_eco_districts(approved_df)
                if recherche_ville.lower() in [v.lower() for v in eligible_villes]:
                    st.success(f"🏅 félicitations ! **{recherche_ville}** est labellisé **éco-quartier citoyen**.")
                    certif_eco = build_certificat_eco_quartier(recherche_ville)
                    st.download_button(
                        label=f"télécharger le diplôme éco-quartier ({recherche_ville})",
                        data=certif_eco,
                        file_name=f"diplome_eco_quartier_{recherche_ville}.pdf",
                        mime="application/pdf"
                    )
                else:
                    st.info("ce territoire ne remplit pas encore les critères du label (180 jours sans pollution signalée).")

                st.markdown("---")
                certif_pdf = build_certificat_territorial(df_ville, recherche_ville, points_critiques)
                st.download_button(
                    label=f"télécharger le certificat d'impact ({recherche_ville})",
                    data=certif_pdf,
                    file_name=f"certificat_impact_{recherche_ville}.pdf",
                    mime="application/pdf"
                )
                
                # Twitter/LinkedIn sharing intents
                share_text = f"fier d'agir pour {recherche_ville} avec les brigades vertes ! déjà {tot_dechets:.1f}kg de déchets retirés. rejoignez-nous sur cleanwalk 🌿"
                encoded_text = requests.utils.quote(share_text)
                st.markdown(f"""
                [partager sur linkedin](https://www.linkedin.com/sharing/share-offsite/?url=https://cleanwalk.streamlit.app&text={encoded_text}) • 
                [partager sur twitter/x](https://twitter.com/intent/tweet?text={encoded_text})
                """, unsafe_allow_html=True)
                
                # --- NOUVEAU : LABEL ECO-QUARTIER ---
                st.markdown("---")
                st.subheader("🏆 Label Éco-Quartier Citoyen")
                st.write("Analyse automatique de la préservation de votre territoire sur les 180 derniers jours.")
                
                labels_eligibles = get_eco_quartiers(df_ville)
                if labels_eligibles:
                    st.success(f"🌟 Félicitations ! **{len(labels_eligibles)} zone(s)** de votre commune sont éligibles au Label Éco-Quartier (Zéro pollution sur 180 jours).")
                    selected_label = st.selectbox("Choisissez une zone pour générer son certificat :", options=labels_eligibles)
                    
                    if selected_label:
                        certif_eco = build_certificat_eco_quartier(selected_label)
                        st.download_button(
                            label=f"🥇 Télécharger le Label pour '{selected_label}'",
                            data=certif_eco,
                            file_name=f"Label_EcoQuartier_{selected_label.replace(' ', '_')}.pdf",
                            mime="application/pdf"
                        )
                else:
                    st.info("Aucune zone n'a encore atteint le seuil des 180 jours de propreté continue avec signalements de contrôle. Encouragez vos citoyens à signaler les zones propres pour activer le label !")
    else:
        st.info("Aucune donnée publique approuvée disponible pour le moment afin d'alimenter cet espace.")

# ------------------------------------------------------------------------
# ONGLET : LE GUIDE DU CITOYEN VERT
# ------------------------------------------------------------------------
with tab_guide:
    show_resources()

# ------------------------------------------------------------------------
# ONGLET : ADMIN
# ------------------------------------------------------------------------
with tab_admin:
    st.subheader("Espace administrateur")
    st.caption("Connexion Google obligatoire pour les administrateurs")

    st.subheader("Carte publique (actions validées)")
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)

    if not approved_df.empty:
        critical_zones = get_critical_zones(approved_df)
        map_df = approved_df.dropna(subset=["lat", "lon"]).copy()
        
        if not map_df.empty:
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
            m_admin = folium.Map(location=[center_lat, center_lon], zoom_start=11)
            
            features = []
            for _, row in map_df.iterrows():
                is_critical = row.get('adresse', '') in critical_zones
                is_clean = row.get('est_propre', False)
                is_business = row.get('type_lieu') == "Établissement Engagé (Label)"
                
                icon = 'circle'
                if is_critical:
                    color = "red"
                    radius = 15
                elif is_business:
                    color = "#FFD700" # Gold
                    radius = 18
                    icon = 'star'
                elif is_clean:
                    color = "green"
                    radius = 8
                else:
                    color = "blue"
                    radius = 10
                    
                popup_html = f"<b>{row.get('type_lieu', 'Lieu')}</b><br>Asso: {row.get('association', 'Inconnu')}<br>Mégots: {int(row.get('megots', 0))}<br>Déchets: {float(row.get('dechets_kg', 0))} kg<br>Statut: {'✨ Propre' if is_clean else '🗑️ Nettoyé'}"
                if is_business:
                    popup_html = f"<b>🎖️ {row.get('type_lieu')}</b><br>Nom: {row.get('association')}<br>{row.get('commentaire', '')}"
                
                # Formatage date ISO (YYYY-MM-DD)
                raw_date = row.get('date', '')
                if not raw_date or str(raw_date).lower() in ["nan", "none", ""]:
                    try:
                        raw_date = row.get('submitted_at', '').split('T')[0]
                    except:
                        raw_date = datetime.now().strftime('%Y-%m-%d')

                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [row['lon'], row['lat']],
                    },
                    'properties': {
                        'time': raw_date,
                        'popup': popup_html,
                        'icon': icon,
                        'iconstyle': {
                            'color': color,
                            'fillColor': color,
                            'fillOpacity': 0.6,
                            'radius': radius
                        },
                        'style': {'color': color}
                    }
                })

            TimestampedGeoJson(
                {
                    'type': 'FeatureCollection',
                    'features': features,
                },
                period='P1D',
                add_last_point=True,
                auto_play=False,
                loop=False,
                max_speed=1,
                loop_button=True,
                date_options='YYYY-MM-DD',
                time_slider_drag_update=True
            ).add_to(m_admin)
            
            # --- IA de Flux & Topographie ---
            show_flow_ai = st.sidebar.checkbox("afficher l'ia de flux (entonnoirs à pollution)", value=False)
            if show_flow_ai:
                with st.spinner("analyse des pentes et du ruissellement en cours..."):
                    # On utilise le graphe OSMnx pour la zone moyenne
                    G_flow = get_osmnx_graph(center_lat, center_lon, 1000)
                    G_elev = add_elevations_to_graph(G_flow)
                    sinks = calculate_flow_sinks(G_elev, map_df)
                    
                    for sink in sinks:
                        folium.Marker(
                            location=[sink['lat'], sink['lon']],
                            icon=folium.Icon(color='purple', icon='bullseye', prefix='fa'),
                            popup=f"<b>{sink['type']}</b><br>{sink['description']}"
                        ).add_to(m_admin)
                st.sidebar.success(f"{len(sinks)} entonnoirs détectés")

            st_folium(m_admin, width=900, height=500, returned_objects=[])
        
        st.dataframe(
            approved_df[["date", "type_lieu", "adresse", "benevoles", "megots", "dechets_kg"]],
            use_container_width=True,
            hide_index=True,
        )

        st.markdown("---")
        st.subheader("science citoyenne : export e-prtr")
        st.write("générez un jeu de données anonymisé respectant les standards européens pour la recherche.")
        
        if st.button("préparer l'export scientifique (csv)"):
            science_df = approved_df.copy()
            
            # Anonymisation
            science_df['anonymized_id'] = science_df['nom'].apply(anonymize_contributor)
            
            # Extraction année
            science_df['reporting_year'] = pd.to_datetime(science_df['date'], errors='coerce').dt.year
            
            # Mapping E-PRTR simplifié
            rows = []
            for _, row in science_df.iterrows():
                # On sépare mégots et déchets pour le format long E-PRTR
                if row.get('megots', 0) > 0:
                    rows.append({
                        'reporting_year': row['reporting_year'],
                        'latitude': row['lat'],
                        'longitude': row['lon'],
                        'pollutant_name': 'mégots (cigarette butts)',
                        'quantity': row['megots'],
                        'unit': 'units',
                        'method_code': 'M',
                        'method_type': 'measurement',
                        'contributor_id': row['anonymized_id']
                    })
                if row.get('dechets_kg', 0) > 0:
                    rows.append({
                        'reporting_year': row['reporting_year'],
                        'latitude': row['lat'],
                        'longitude': row['lon'],
                        'pollutant_name': 'déchets divers (mixed waste)',
                        'quantity': row['dechets_kg'],
                        'unit': 'kg',
                        'method_code': 'M',
                        'method_type': 'measurement',
                        'contributor_id': row['anonymized_id']
                    })
            
            if rows:
                eper_df = pd.DataFrame(rows)
                csv_buffer = io.StringIO()
                eper_df.to_csv(csv_buffer, index=False)
                
                st.download_button(
                    label="télécharger le fichier e-prtr (.csv)",
                    data=csv_buffer.getvalue(),
                    file_name=f"cleanwalk_eper_export_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )
                st.success("votre jeu de données anonymisé est prêt.")
            else:
                st.warning("aucune donnée d'impact (mégots/déchets) à exporter.")
    else:
        st.info("Aucune action validée pour le moment.")

    st.subheader("Espace administrateur ⚙️")

    if not ADMIN_SECRET_CODE:
        # Fallback to check st.secrets if os.getenv failed
        ADMIN_SECRET_CODE = st.secrets.get("CLEANMYMAP_ADMIN_SECRET_CODE", "")
    
    if not ADMIN_SECRET_CODE:
        st.error("Mot de passe administrateur non configuré (CLEANMYMAP_ADMIN_SECRET_CODE).")
        st.stop()

    if "admin_authenticated" not in st.session_state:
        st.session_state["admin_authenticated"] = False

    if not st.session_state["admin_authenticated"]:
        secret_input = st.text_input("Code secret administrateur", type="password", key="admin_pwd_input")
        if st.button("Se connecter à l'espace Admin", use_container_width=True):
            if secret_input == ADMIN_SECRET_CODE:
                st.session_state["admin_authenticated"] = True
                st.rerun()
            else:
                st.error("Code incorrect.")
        st.stop()

    st.success("Accès administrateur validé ✅")
    if st.button("Se déconnecter de l'espace Admin"):
        st.session_state["admin_authenticated"] = False
        st.rerun()

    # Le contenu admin doit être en dehors du bloc 'if st.button'
    pending = get_submissions_by_status('pending')

    if not pending:
        st.info("Aucune demande en attente.")
    else:
        for i, row in enumerate(pending):
            with st.expander(f"#{i+1} • {row['date']} • {row['type_lieu']} • {row['adresse']}"):
                if check_flood_risk(row.get('lat'), row.get('lon'), row.get('adresse', ''), row.get('type_lieu', '')):
                    st.error("🚨 Zone humide : risque de dispersion des micro-plastiques élevé, intervention prioritaire requise")
                    
                st.write(
                    {
                        "Nom": row["nom"],
                        "Association": row["association"],
                        "Zone propre": row.get("est_propre", False),
                        "Bénévoles": row["benevoles"],
                        "Durée (min)": row["temps_min"],
                        "Mégots": row["megots"],
                        "Déchets (kg)": row["dechets_kg"],
                        "Plastique (kg)": row.get("plastique_kg", 0),
                        "Verre (kg)": row.get("verre_kg", 0),
                        "Métal (kg)": row.get("metal_kg", 0),
                        "GPS": row["gps"],
                        "Commentaire": row["commentaire"],
                    }
                )
                a, r = st.columns(2)
                if a.button("✅ Approuver", key=f"approve_{row['id']}", use_container_width=True):
                    update_submission_status(row['id'], 'approved')
                    st.rerun()
                if r.button("❌ Refuser", key=f"reject_{row['id']}", use_container_width=True):
                    update_submission_status(row['id'], 'rejected')
                    st.rerun()

    st.divider()
    st.caption("Export rapide des actions validées")
    db_approved = get_submissions_by_status('approved')
    if db_approved:
        approved_export_df = pd.DataFrame(db_approved)
        st.download_button(
            "⬇️ Télécharger CSV (actions validées)",
            data=approved_export_df.to_csv(index=False).encode("utf-8"),
            file_name="actions_validees.csv",
            mime="text/csv",
            use_container_width=True,
        )
