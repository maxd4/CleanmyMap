import os
import re
import html
from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st
import folium
from folium.plugins import TimestampedGeoJson
from branca.element import Template, MacroElement
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
import zipfile
from thefuzz import fuzz, process

import src.database as db
from src.config import OUTPUT_DIR, GOOGLE_SHEET_URL, IMPACT_CONSTANTS
from src.predictive_ai import calculate_pollution_risk, get_risk_recommendations
from src.pages.resources import show_resources
from src.pages.partners import show_partners
from src.pages.leaderboards import render_historical_rankings
from src.pages.community_validation import render_mission_validation
from src.data_quality import validate_submission_inputs, get_weight_conversion_hints
from src.report_generator import PDFReport
from src.pages.partner_dashboard import render_partner_dashboard
from src.map_utils import (
    calculate_scores, get_marker_style, create_premium_popup,
    detect_osm_type, fetch_osm_geometry, format_google_maps_name,
    MAP_COLORS, calculate_trends, get_heatmap_data, generate_ai_route,
    calculate_impact, check_badges
)

# R├®trocompatibilit├® d'import (ex: d├®ploiement Cloud avec module database partiellement ├á jour)
init_db = db.init_db
insert_submission = db.insert_submission
update_submission_status = db.update_submission_status
update_submission_data = db.update_submission_data
update_submission_fields = db.update_submission_fields
get_submissions_by_status = db.get_submissions_by_status
get_total_approved_stats = db.get_total_approved_stats
add_message = db.add_message
get_messages = db.get_messages
add_subscriber = db.add_subscriber
get_all_subscribers = db.get_all_subscribers
get_top_contributors = db.get_top_contributors
add_spot = db.add_spot
get_active_spots = db.get_active_spots
update_spot_status = db.update_spot_status
calculate_user_points = db.calculate_user_points
get_leaderboard = db.get_leaderboard
add_mission_validation = db.add_mission_validation
get_mission_validation_summary = db.get_mission_validation_summary
add_community_event = db.add_community_event
get_community_events = db.get_community_events
upsert_event_rsvp = db.upsert_event_rsvp
get_event_rsvp_summary = db.get_event_rsvp_summary
get_events_for_date = db.get_events_for_date
mark_event_reminder = db.mark_event_reminder
add_admin_audit_log = db.add_admin_audit_log
get_admin_audit_logs = db.get_admin_audit_logs
add_ux_event = getattr(db, "add_ux_event", lambda *args, **kwargs: None)
get_ux_events = getattr(db, "get_ux_events", lambda *args, **kwargs: [])
get_ux_error_stats = getattr(
    db,
    "get_ux_error_stats",
    lambda *args, **kwargs: {
        "total_events": 0,
        "invalid_fields": 0,
        "broken_actions": 0,
        "top_invalid_fields": [],
    },
)

init_db()  # Initialisation de la BDD au d├®marrage

# Centralisation des Constantes d'Impact import├®e depuis src.config

# --- INTERNATIONALISATION (i18n) ---
TRANSLATIONS = {
    "fr": {
        "title": "Agir, Cartographier, Prot├®ger",
        "tagline": "Visualisez, Agissez, Prot├®gez.",
        "welcome": "Agir, Cartographier, Prot├®ger",
        "hero_subtitle": "D├®clarez vos actions b├®n├®voles, suivez leur impact en temps r├®el et priorisez les zones ├á traiter.",
        "impact_collectif": "­ƒôè Notre Impact Collectif",
        "kg_removed": "kg de d├®chets retir├®s",
        "megots_collected": "m├®gots collect├®s",
        "citizens_engaged": "citoyens engag├®s",
        "evolution_title": "­ƒôê ├ëvolution des Ramassages (Cumul├®)",
        "progression_title": "­ƒÅà Votre Progression Personnelle",
        "pseudo_placeholder": "Ex: Jean_Vert",
        "check_grade": "V├®rifier mon grade",
        "eco_impact_title": "­ƒÆí Impact ├ëcologique R├®el",
        "lang_select": "­ƒîÉ Langue / Language",
        "tab_declaration": "­ƒÄ» D├®clarer une Action",
        "tab_map": "­ƒù║´©Å Carte Interactive",
        "tab_trash_spotter": "­ƒôó Trash Spotter",
        "tab_gamification": "­ƒÅå Classement & Badges",
        "tab_community": "­ƒñØ Rassemblements",
        "tab_sandbox": "­ƒº¬ Zone d'entra├«nement",
        "tab_pdf": "­ƒôä Rapport Impact",
        "tab_guide": "­ƒôÜ Guide Pratique",
        "tab_actors": "­ƒñØ Partenaires Engag├®s",
        "tab_history": "­ƒôï Historique",
        "tab_route": "­ƒÄ» Planifier (IA)",
        "tab_recycling": "ÔÖ╗´©Å Seconde Vie",
        "tab_climate": "­ƒîì Enjeux Climatiques",
        "tab_elus": "­ƒÅø´©Å Espace Collectivit├®s",
        "tab_kit": "­ƒô▒ Kit Terrain",
        "tab_home": "­ƒôè Notre Impact",
        "tab_weather": "­ƒîñ´©Å M├®t├®o",
        "tab_compare": "­ƒÅÖ´©Å Comparaison",
        "tab_admin": "ÔÜÖ´©Å Validation Admin",
        "eco_mode": "Mode basse consommation",
        "theme_mode": "­ƒÄ¿ Th├¿me",
        "theme_light": "Clair",
        "theme_dark": "Sombre",
        "nav_label": "­ƒôî Navigation",
        "nav_action": "­ƒÜÇ Lancer l'action",
        "nav_stats": "­ƒôè R├®sultats & Impact",
        "nav_social": "­ƒÅå Communaut├®",
        "nav_edu": "­ƒôÜ Comprendre & Apprendre",
        "nav_admin": "ÔÜÖ´©Å Administration & Outils",
        "eau_preserved": "Eau pr├®serv├®e",
        "co2_avoided": "CO2 ├®vit├®",
        "dechets_removed": "D├®chets retir├®s",
        "megots_collected": "M├®gots ramass├®s",
        "citizens_engaged": "Citoyens engag├®s",
    },
    "en": {
        "title": "Clean my Map ÔÇó Citizen Protection",
        "tagline": "Visualize, Act, Protect.",
        "welcome": "Act. Map. Preserve.",
        "hero_subtitle": "Join the citizen movement for a cleaner planet. Every action counts, every gesture is valued.",
        "impact_collectif": "­ƒôè Our Collective Impact",
        "kg_removed": "kg of waste removed",
        "megots_collected": "cigarette butts collected",
        "citizens_engaged": "engaged citizens",
        "evolution_title": "­ƒôê Cleanup Evolution (Cumulative)",
        "progression_title": "­ƒÅà Your Personal Progression",
        "pseudo_placeholder": "Ex: Green_John",
        "check_grade": "Check my grade",
        "eco_impact_title": "­ƒÆí Real Ecological Impact",
        "lang_select": "­ƒîÉ Language",
        "tab_declaration": "­ƒÄ» Declare an Action",
        "tab_map": "­ƒù║´©Å Interactive Map",
        "tab_trash_spotter": "­ƒôó Trash Spotter",
        "tab_gamification": "­ƒÅå Leaderboard & Badges",
        "tab_community": "­ƒñØ Meetups",
        "tab_sandbox": "­ƒº¬ Sandbox Zone",
        "tab_pdf": "­ƒôä Impact Report",
        "tab_guide": "­ƒôÜ Practical Guide",
        "tab_actors": "­ƒñØ Engaged Partners",
        "tab_history": "­ƒôï History",
        "tab_route": "­ƒÄ» Plan (IA)",
        "tab_recycling": "ÔÖ╗´©Å Second Life",
        "tab_climate": "­ƒîì Climate Issues",
        "tab_elus": "­ƒÅø´©Å Local Authorities",
        "tab_kit": "­ƒô▒ Field Kit",
        "tab_home": "­ƒôè Our Impact",
        "tab_weather": "­ƒîñ´©Å Weather",
        "tab_compare": "­ƒÅÖ´©Å Territorial Comparison",
        "tab_admin": "ÔÜÖ´©Å Admin Validation",
        "eco_mode": "Eco Mode (Data Saver)",
        "theme_mode": "­ƒÄ¿ Theme",
        "theme_light": "Light",
        "theme_dark": "Dark",
        "nav_label": "­ƒôî Navigation",
        "nav_action": "­ƒÜÇ Start Action",
        "nav_stats": "­ƒôè Results & Impact",
        "nav_social": "­ƒÅå Community",
        "nav_edu": "­ƒôÜ Learn & Understand",
        "nav_admin": "ÔÜÖ´©Å Admin & Tools",
        "eau_preserved": "Water protected",
        "co2_avoided": "CO2 avoided",
        "dechets_removed": "Waste removed",
        "megots_collected": "Cigarette butts",
        "citizens_engaged": "Engaged citizens",
    }
}

# --- GESTION DE LA LANGUE DANS SESSION STATE ---
if "lang" not in st.session_state:
    st.session_state.lang = "fr"

if "theme_mode" not in st.session_state:
    st.session_state.theme_mode = "light"

def t(key):
    """Fonction de traduction courte."""
    value = TRANSLATIONS[st.session_state.lang].get(key, key)
    return _repair_mojibake_text(value)


def _repair_mojibake_text(value):
    """R├®pare les cha├«nes mal d├®cod├®es (ex: ├â┬® / ├░┼©...) sans impacter le texte sain."""
    if not isinstance(value, str):
        return value
    if not value:
        return value

    markers = ("├â", "├óÔé¼", "├óÔé¼Ôäó", "├░┼©", "├é", "´┐¢")
    if not any(marker in value for marker in markers):
        return value

    for source_encoding in ("cp1252", "latin-1"):
        try:
            repaired = value.encode(source_encoding).decode("utf-8")
            return repaired
        except Exception:
            continue
    return value


def sanitize_dataframe_text(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoie les colonnes texte d'un DataFrame (colonnes + cellules)."""
    if df.empty:
        return df
    cleaned = df.copy()
    cleaned.columns = [_repair_mojibake_text(str(col)).strip() for col in cleaned.columns]
    text_cols = cleaned.select_dtypes(include=["object"]).columns
    for col in text_cols:
        cleaned[col] = cleaned[col].map(_repair_mojibake_text)
    return cleaned


def normalize_bool_flag(value) -> bool:
    """Normalise une valeur bool├®enne venant de sources h├®t├®rog├¿nes."""
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"true", "1", "oui", "yes", "y", "vrai"}


def get_user_badge(pseudo, df_impact):
    """Calcule le badge et le grade d'un utilisateur d'apr├¿s ses statistiques."""
    if df_impact.empty or not pseudo: return None
    user_data = df_impact[df_impact['nom'].str.strip().str.lower() == pseudo.strip().lower()]
    if user_data.empty: return None
    
    stats = {
        'nb_actions': len(user_data),
        'total_kg': user_data['dechets_kg'].fillna(0).sum(),
        'total_points': user_data['eco_points'].fillna(0).sum() if 'eco_points' in user_data.columns else 0
    }
    badges = check_badges(stats) # de map_utils
    if badges:
        return f"{badges[-1]['name']} ({badges[-1]['desc']})"
    return None

def get_impact_sources():
    """Renvoie les textes de la bibliographie pour la m├®thodologie de l'app et du PDF."""
    if st.session_state.lang == "fr":
        return (
            "m├®thodologie et sources :\n\n"
            "- impact carbone du m├®got (0.014 kg co2e) : inclut la culture, la cr├®ation du filtre en "
            "ac├®tate de cellulose et la fin de vie. donn├®es align├®es sur l'oms.\n"
            "- impact eau (500l/m├®got) : contamination toxique aux m├®taux lourds (arsenic, plomb) et "
            "├á la nicotine selon surfrider foundation et l'ineris.\n"
            "- equivalences plastiques (bancs: 50kg, pulls: 0.5kg) : extrapolations du poids ├®quivalent "
            "fond├®es sur la base empreinte (carbone) de l'ademe.\n\n"
            "- eco-points (gamification interne) : formule = 10 + (temps_min/15)*10 + 5*kg dechets + (megots/100). "
            "cet indicateur sert au classement et ne constitue pas une unit├® scientifique d'impact.\n\n"
            "avertissement : ce rapport de synth├¿se a ├®t├® g├®n├®r├® via l'assistance d'une intelligence artificielle. "
            "bien que les statistiques soient bas├®es sur une bibliographie scientifique officielle, le "
            "document automatique peut contenir des approximations ou des erreurs de traitement."
        )
    else:
        return (
            "methodology and sources:\n\n"
            "- carbon impact of a cigarette butt (0.014 kg co2e): includes cultivation, creation of the "
            "cellulose acetate filter and end-of-life. data aligned with who.\n"
            "- water impact (500l/butt): toxic contamination with heavy metals (arsenic, lead) and "
            "nicotine according to surfrider foundation and ineris.\n"
            "- plastic equivalences (benches: 50kg, sweaters: 0.5kg): extrapolations of equivalent weight "
            "based on the ademe carbon footprint database.\n\n"
            "- eco-points (internal gamification): formula = 10 + (time_min/15)*10 + 5*waste_kg + (butts/100). "
            "this metric is used for rankings and is not a scientific impact unit.\n\n"
            "disclaimer: this synthesis report was generated with AI assistance. "
            "while statistics are based on official scientific bibliography, the "
            "automatic document may contain approximations or processing errors."
        )


def i18n_text(fr_text: str, en_text: str) -> str:
    """Retourne le texte FR/EN selon la langue active."""
    text = fr_text if st.session_state.lang == "fr" else en_text
    return _repair_mojibake_text(text)


PRODUCT_CHANGELOG = [
    {
        "date": "2026-03-18",
        "title_fr": "Monitoring UX + Tests E2E",
        "title_en": "UX Monitoring + E2E Tests",
        "details_fr": "Ajout d'un suivi des erreurs UX (champs invalides et actions cass├®es) et d'un socle Playwright sur les flux critiques.",
        "details_en": "Added UX error tracking (invalid fields and broken actions) and a Playwright baseline for critical user flows.",
    },
    {
        "date": "2026-03-17",
        "title_fr": "Navigation par rubriques",
        "title_en": "Section-based navigation",
        "details_fr": "Affichage direct des rubriques avec navigation horizontale et rendu plus lisible.",
        "details_en": "Direct section display with horizontal navigation and improved readability.",
    },
    {
        "date": "2026-03-16",
        "title_fr": "Carte enrichie",
        "title_en": "Enhanced map",
        "details_fr": "Ajout de couches analytiques, timeline et priorisation des hotspots.",
        "details_en": "Added analytics layers, timeline, and hotspot prioritization.",
    },
]


def render_product_changelog() -> None:
    with st.expander(i18n_text("Journal de changements produit", "Product changelog"), expanded=False):
        for item in PRODUCT_CHANGELOG:
            st.markdown(
                f"**{item['date']} - {i18n_text(item['title_fr'], item['title_en'])}**  \n"
                f"{i18n_text(item['details_fr'], item['details_en'])}"
            )


def track_ux_issue(event_type: str, tab_id: str, action_name: str, field_name: str = "", message: str = "", payload: str = "") -> None:
    try:
        add_ux_event(
            event_type=event_type,
            tab_id=tab_id,
            action_name=action_name,
            field_name=field_name,
            message=message,
            payload=payload[:1000] if payload else "",
        )
    except Exception:
        # Le monitoring UX ne doit jamais casser le parcours utilisateur.
        pass


def render_tab_header(
    icon: str,
    title_fr: str,
    title_en: str,
    subtitle_fr: str,
    subtitle_en: str,
    chips: list[str] | None = None,
    compact: bool = False,
) -> None:
    """Header de section reutilisable pour uniformiser tous les onglets."""
    chips = chips or []
    chip_html = "".join(f"<span class='section-chip'>{c}</span>" for c in chips)
    shell_class = "section-shell compact" if compact else "section-shell"
    st.markdown(
        f"""
        <section class="{shell_class} animate-in">
            <div class="section-kicker">{icon} {i18n_text("Espace", "Workspace")}</div>
            <h1 class="section-title">{icon} {i18n_text(title_fr, title_en)}</h1>
            <p class="section-subtitle">{i18n_text(subtitle_fr, subtitle_en)}</p>
            {"<div class='section-chip-row'>" + chip_html + "</div>" if chip_html else ""}
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_ui_callout(
    icon: str,
    title_fr: str,
    title_en: str,
    body_fr: str,
    body_en: str,
    tone: str = "info",
) -> None:
    """Bloc d'information visuel pour am├®liorer la lisibilit├® des parcours."""
    tone_class = f"ux-callout-{tone}" if tone in {"info", "success", "warning"} else "ux-callout-info"
    st.markdown(
        f"""
        <aside class="ux-callout {tone_class}">
            <div class="ux-callout-title">{icon} {i18n_text(title_fr, title_en)}</div>
            <p class="ux-callout-body">{i18n_text(body_fr, body_en)}</p>
        </aside>
        """,
        unsafe_allow_html=True,
    )


st.set_page_config(
    page_title=TRANSLATIONS[st.session_state.lang]["title"],
    page_icon="­ƒù║´©Å",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Custom Professional CSS
# --- PWA SUPPORT ---
st.markdown('<link rel="manifest" href="/manifest.json">', unsafe_allow_html=True)
st.markdown('<meta name="apple-mobile-web-app-capable" content="yes">', unsafe_allow_html=True)
st.markdown('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">', unsafe_allow_html=True)

# --- DESIGN SYSTEM (PREMIUM APPLE STYLE) ---
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500&display=swap');
    
    :root {
        --primary: #10b981;
        --secondary: #3b82f6;
        --primary-soft: rgba(16, 185, 129, 0.1);
        --bg-glass: rgba(255, 255, 255, 0.03);
        --border-glass: rgba(128, 128, 128, 0.15);
        --text-main: #f8fafc;
        --text-soft: #94a3b8;
    }

    @media (prefers-color-scheme: light) {
        :root {
            --bg-glass: rgba(255, 255, 255, 0.7);
            --border-glass: rgba(0, 0, 0, 0.08);
            --text-main: #0f172a;
            --text-soft: #475569;
        }
    }

    /* Base Styling */
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif !important;
    }
    
    .stApp {
        background: radial-gradient(circle at top right, rgba(16,185,129,0.05), transparent 400px),
                    radial-gradient(circle at bottom left, rgba(59,130,246,0.05), transparent 400px);
    }

    header, [data-testid="stHeader"] {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
    }
    footer {
        display: none !important;
    }

    /* Premium Glass Cards */
    .premium-card {
        background: var(--bg-glass);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--border-glass);
        border-radius: 28px;
        padding: 32px;
        margin-bottom: 24px;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
    }

    .premium-card:hover {
        transform: translateY(-5px);
        border-color: var(--primary);
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
    }

    /* Impact Metrics */
    .metric-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 20px;
        background: rgba(128, 128, 128, 0.05);
        border-radius: 20px;
        border: 1px solid transparent;
        transition: all 0.3s ease;
    }

    .metric-container:hover {
        background: var(--primary-soft);
        border-color: var(--primary);
    }

    .metric-value {
        font-size: 2.2rem;
        font-weight: 800;
        color: var(--primary);
        line-height: 1;
        margin-bottom: 8px;
    }

    /* --- WORLD CLASS LANDING ANIMATIONS --- */
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
        100% { transform: translateY(0px); }
    }
    @keyframes glow {
        0% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
        50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
        100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
    }

    .animate-in { animation: fadeInUp 0.8s ease-out forwards; }
    .floating { animation: float 4s ease-in-out infinite; }
    
    .hero-container {
        text-align: center;
        padding: 80px 20px;
        background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
        border-radius: 40px;
        margin-bottom: 40px;
    }
    
    .hero-title {
        font-size: 4.5rem !important;
        font-weight: 900 !important;
        background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -2px;
        line-height: 1.1;
        margin-bottom: 24px;
    }
    
    .hero-subtitle {
        font-size: 1.4rem !important;
        color: #64748b;
        max-width: 700px;
        margin: 0 auto 40px auto;
        line-height: 1.6;
    }

    .feature-card {
        padding: 40px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        cursor: pointer;
    }
    
    .feature-card:hover {
        transform: translateY(-10px) scale(1.02);
        background: white;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    
    /* Dark Mode Emeraude Overlay for Stats */
    .stat-glow {
        border: 1px solid rgba(16, 185, 129, 0.2);
        animation: glow 3s infinite;
    }
    
    /* Parallax effect placeholders */
    .parallax-bg {
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: -1;
        overflow: hidden;
    }
    
    .metric-label {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Hero Styling */
    .hero-title {
        font-size: 4.5rem !important;
        font-weight: 800 !important;
        letter-spacing: -0.05em !important;
        background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 24px !important;
        line-height: 1.1 !important;
    }

    .badge-card {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background: var(--primary-soft);
        border: 1px solid var(--primary);
        border-radius: 100px;
        color: var(--primary);
        font-weight: 700;
        font-size: 1.1rem;
        margin-top: 10px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }
    
    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .animate-in {
        animation: fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    /* Custom Streamlit Overrides */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: transparent !important;
    }

    .stTabs [data-baseweb="tab"] {
        height: 45px;
        white-space: pre-wrap;
        background-color: var(--bg-glass) !important;
        border-radius: 12px !important;
        border: 1px solid var(--border-glass) !important;
        padding: 0 20px !important;
        transition: all 0.3s ease !important;
    }

    .stTabs [aria-selected="true"] {
        color: var(--primary) !important;
        border-color: var(--primary) !important;
        background: var(--primary-soft) !important;
    }

    /* Metric Cards */
    .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin: 40px 0;
    }

    .metric-card {
        background: var(--bg-glass);
        padding: 24px;
        border-radius: 20px;
        border: 1px solid var(--border-glass);
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
        color: var(--text-soft);
        font-weight: 400;
        margin-left: 4px;
    }

    /* Form Overhaul */
    .stForm {
        border: 1px solid var(--border-glass) !important;
        background: var(--bg-glass) !important;
        backdrop-filter: blur(12px);
        border-radius: 28px !important;
        padding: 40px !important;
    }

    /* Callouts styling */
    div[data-testid="stNotification"] {
        border-radius: 16px !important;
        border: 1px solid var(--border-glass) !important;
        background-color: var(--bg-glass) !important;
    }

    /* Progress bar styling */
    .stProgress div[role="progressbar"] > div {
        background: linear-gradient(90deg, #10b981, #34d399) !important;
        border-radius: 999px !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        border-right: 1px solid var(--border-glass) !important;
    }

    /* Custom Buttons */
    .stButton > button {
        background: var(--primary) !important;
        color: white !important;
        border-radius: 14px !important;
        padding: 12px 24px !important;
        font-weight: 600 !important;
        border: none !important;
        transition: all 0.3s !important;
    }

    .stButton > button:hover {
        opacity: 0.9;
        transform: scale(1.02);
    }

    /* Masquer les ancres automatiques des titres Streamlit (liens ├á c├┤t├® des titres) */
    [data-testid="stMarkdownContainer"] h1 a,
    [data-testid="stMarkdownContainer"] h2 a,
    [data-testid="stMarkdownContainer"] h3 a {
        display: none !important;
    }

    /* Ajustements responsives pour mobile */
    @media (max-width: 768px) {
        .hero-container {
            padding: 32px 12px;
        }
        .hero-title {
            font-size: 2.4rem !important;
        }
        .hero-subtitle {
            font-size: 1rem !important;
            margin-bottom: 24px !important;
        }
        .metric-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 24px 0;
        }
        .premium-card {
            padding: 20px;
            margin-bottom: 16px;
        }
    }
    </style>
    """,
    unsafe_allow_html=True,
)



def inject_visual_polish(theme_mode: str):
    """Surcouche visuelle maintenable (sans impact logique metier)."""
    if theme_mode == "dark":
        palette = {
            "surface_0": "#08111f",
            "surface_1": "rgba(15, 23, 42, 0.82)",
            "surface_2": "#111c31",
            "ink_1": "#e2e8f0",
            "ink_2": "#cbd5e1",
            "ink_3": "#94a3b8",
            "edge": "rgba(148, 163, 184, 0.28)",
            "shadow": "0 14px 32px rgba(2, 6, 23, 0.45)",
            "input_bg": "#0f172a",
        }
    else:
        palette = {
            "surface_0": "#f6f9fc",
            "surface_1": "rgba(255, 255, 255, 0.88)",
            "surface_2": "#ffffff",
            "ink_1": "#0f172a",
            "ink_2": "#334155",
            "ink_3": "#64748b",
            "edge": "rgba(15, 23, 42, 0.08)",
            "shadow": "0 14px 32px rgba(15, 23, 42, 0.06)",
            "input_bg": "#ffffff",
        }

    st.markdown(
        f"""
        <style>
        :root {{
            --surface-0: {palette['surface_0']};
            --surface-1: {palette['surface_1']};
            --surface-2: {palette['surface_2']};
            --ink-1: {palette['ink_1']};
            --ink-2: {palette['ink_2']};
            --ink-3: {palette['ink_3']};
            --edge-soft: {palette['edge']};
            --shadow-card: {palette['shadow']};
            --input-bg: {palette['input_bg']};
            --brand: #14b8a6;
            --brand-strong: #0ea5a4;
            --accent: #2563eb;
            --accent-soft: color-mix(in srgb, var(--accent) 14%, transparent);
            --radius-lg: 18px;
            --radius-md: 14px;
            --radius-sm: 10px;
            --space-1: 0.35rem;
            --space-2: 0.6rem;
            --space-3: 0.9rem;
            --space-4: 1.2rem;
            --space-5: 1.6rem;
            --focus-ring: 0 0 0 0.2rem rgba(37, 99, 235, 0.2);
        }}

        html, body, [class*="css"], .stApp {{
            font-family: 'Outfit', 'Inter', system-ui, -apple-system, 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', Roboto, sans-serif !important;
        }}

        * {{
            box-sizing: border-box;
        }}

        .stApp {{
            background:
                radial-gradient(900px 460px at 8% -8%, rgba(14, 165, 164, 0.16), transparent 70%),
                radial-gradient(760px 420px at 100% 0%, rgba(37, 99, 235, 0.13), transparent 70%),
                linear-gradient(180deg, color-mix(in srgb, var(--surface-0) 94%, #ffffff 6%), var(--surface-0)),
                var(--surface-0) !important;
            color: var(--ink-1);
        }}

        .main .block-container {{
            max-width: 1380px !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            padding-bottom: 2.2rem !important;
        }}

        .main .block-container > div {{
            gap: 0.95rem !important;
        }}

        [data-testid="stHeader"] {{
            height: 0 !important;
            min-height: 0 !important;
            display: none !important;
        }}

        [data-testid="stAppViewContainer"] > .main {{
            padding-top: 0 !important;
        }}

        [data-testid="stVerticalBlock"] > div:has(> .top-control-shell) {{
            margin-top: 0 !important;
            padding-top: 0 !important;
        }}

        h1, h2, h3, h4, h5, h6,
        [data-testid="stMarkdownContainer"] p,
        [data-testid="stMarkdownContainer"] li,
        [data-testid="stMetricLabel"],
        label,
        span,
        small {{
            color: var(--ink-2) !important;
        }}

        [data-testid="stMarkdownContainer"] p {{
            line-height: 1.58;
        }}

        [data-testid="stMarkdownContainer"] h4,
        [data-testid="stMarkdownContainer"] h5 {{
            color: var(--ink-1) !important;
            letter-spacing: -0.01em;
        }}

        hr {{
            border: 0 !important;
            border-top: 1px solid color-mix(in srgb, var(--edge-soft) 72%, transparent) !important;
            margin: 16px 0 !important;
        }}

        .app-shell, .nav-shell, .premium-card, .section-shell,
        .metric-card, .kpi-chip, .top-control-shell,
        .stForm, .stExpander, div[data-testid="stMetric"],
        .stDataFrame, div[data-testid="stTable"] {{
            background: var(--surface-1) !important;
            border: 1px solid var(--edge-soft) !important;
            box-shadow: var(--shadow-card) !important;
        }}

        .top-control-shell,
        .app-shell,
        .nav-shell,
        .section-shell,
        .premium-card,
        .metric-card {{
            border-radius: 18px !important;
        }}

        .metric-card, .kpi-chip, .stExpander, div[data-testid="stMetric"] {{
            background: var(--surface-2) !important;
        }}

        .stForm {{
            border-radius: var(--radius-lg) !important;
            padding: 18px 18px 10px 18px !important;
            margin-bottom: 12px !important;
        }}

        div[data-testid="stMetric"] {{
            border-radius: var(--radius-md) !important;
            padding: 10px 12px !important;
        }}

        div[data-testid="stMetricLabel"] p {{
            color: var(--ink-3) !important;
            font-weight: 650 !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 0.74rem !important;
        }}

        div[data-testid="stMetricValue"] {{
            color: var(--ink-1) !important;
            font-weight: 820 !important;
        }}

        .app-shell-title, .section-title, .kpi-chip-value,
        [data-testid="stMarkdownContainer"] h1,
        [data-testid="stMarkdownContainer"] h2,
        [data-testid="stMarkdownContainer"] h3 {{
            color: var(--ink-1) !important;
        }}

        [data-testid="stMarkdownContainer"] h2 {{
            font-size: clamp(1.35rem, 2vw, 1.95rem) !important;
            letter-spacing: -0.02em;
            font-weight: 820 !important;
            margin: 0.2rem 0 0.55rem 0 !important;
        }}

        [data-testid="stMarkdownContainer"] h3 {{
            font-size: clamp(1.06rem, 1.5vw, 1.35rem) !important;
            letter-spacing: -0.01em;
            font-weight: 770 !important;
            margin: 0.2rem 0 0.45rem 0 !important;
        }}

        .app-shell-subtitle, .section-subtitle, .nav-shell-caption,
        .metric-label, .kpi-chip-label, .metric-unit {{
            color: var(--ink-3) !important;
        }}

        .section-shell {{
            position: relative;
            overflow: hidden;
            padding: 18px 20px 16px 20px !important;
            margin: 6px 0 12px 0 !important;
            border: 1px solid color-mix(in srgb, var(--edge-soft) 78%, var(--brand) 22%) !important;
            background:
                linear-gradient(160deg, color-mix(in srgb, var(--surface-2) 90%, var(--brand) 10%), var(--surface-2)) !important;
        }}

        .section-shell::after {{
            content: "";
            position: absolute;
            inset: auto -80px -72px auto;
            width: 210px;
            height: 210px;
            border-radius: 50%;
            background: radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%);
            pointer-events: none;
        }}

        .section-shell.compact {{
            padding: 16px 18px 14px 18px !important;
        }}

        .section-kicker {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 7px 0;
            padding: 5px 10px;
            border-radius: 999px;
            border: 1px solid color-mix(in srgb, var(--brand) 34%, transparent);
            background: color-mix(in srgb, var(--brand) 11%, transparent);
            font-size: 0.74rem;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--brand-strong) !important;
            font-weight: 800;
        }}

        .section-title {{
            margin: 0;
            font-size: clamp(1.25rem, 2.1vw, 1.75rem);
            line-height: 1.2;
            font-weight: 850;
            letter-spacing: -0.015em;
            color: var(--ink-1) !important;
            text-wrap: balance;
        }}

        .section-subtitle {{
            margin: 8px 0 0 0;
            font-size: 0.97rem;
            line-height: 1.53;
            color: var(--ink-2) !important;
            max-width: 88ch;
        }}

        .section-chip-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }}

        .ux-callout {{
            border-radius: var(--radius-md);
            border: 1px solid var(--edge-soft);
            background: var(--surface-2);
            padding: 12px 14px;
            margin: 8px 0 14px 0;
        }}

        .ux-callout-title {{
            margin: 0;
            color: var(--ink-1) !important;
            font-size: 0.92rem;
            font-weight: 760;
            letter-spacing: -0.01em;
        }}

        .ux-callout-body {{
            margin: 5px 0 0 0 !important;
            color: var(--ink-2) !important;
            font-size: 0.91rem;
            line-height: 1.5;
        }}

        .ux-callout-info {{
            border-color: color-mix(in srgb, var(--accent) 34%, var(--edge-soft));
            background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), var(--surface-2));
        }}

        .ux-callout-success {{
            border-color: color-mix(in srgb, var(--brand) 34%, var(--edge-soft));
            background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, transparent), var(--surface-2));
        }}

        .ux-callout-warning {{
            border-color: color-mix(in srgb, #f59e0b 38%, var(--edge-soft));
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), var(--surface-2));
        }}

        .app-shell {{
            position: relative;
            overflow: hidden;
            padding: 28px 30px !important;
            background:
                radial-gradient(520px 220px at -8% -20%, color-mix(in srgb, var(--brand) 20%, transparent), transparent 72%),
                radial-gradient(520px 220px at 108% -30%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 72%),
                var(--surface-2) !important;
            border: 1px solid color-mix(in srgb, var(--brand) 18%, var(--edge-soft)) !important;
        }}

        .nav-shell {{
            padding: 18px 18px 20px !important;
            margin: 10px 0 12px 0 !important;
        }}

        .app-shell-eyebrow {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 12px 0;
            padding: 6px 12px;
            border-radius: 999px;
            border: 1px solid color-mix(in srgb, var(--brand) 28%, transparent);
            background: color-mix(in srgb, var(--brand) 10%, transparent);
            font-size: 0.78rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--brand-strong) !important;
        }}

        .app-shell-title {{
            margin: 0;
            font-size: clamp(2.05rem, 3.9vw, 3.35rem);
            line-height: 1.08;
            font-weight: 900;
            letter-spacing: -0.03em;
            color: var(--ink-1) !important;
            max-width: 18ch;
            text-wrap: balance;
        }}

        .app-shell-title .accent {{
            color: var(--brand-strong) !important;
        }}

        .app-shell-subtitle {{
            margin: 14px 0 0 0;
            font-size: clamp(1.01rem, 1.4vw, 1.16rem);
            max-width: 78ch;
            line-height: 1.62;
            color: var(--ink-2) !important;
            font-weight: 520;
        }}

        .rubric-hero-title {{
            margin: 0;
            color: var(--ink-1) !important;
            font-size: 1.16rem;
            font-weight: 800;
            letter-spacing: -0.01em;
        }}

        .rubric-hero-subtitle {{
            margin: 4px 0 14px 0;
            color: var(--ink-3) !important;
            font-size: 0.9rem;
            font-weight: 500;
        }}

        .nav-shell-caption {{
            margin: 0 0 10px 0;
            font-size: 0.83rem;
            font-weight: 540;
            color: var(--ink-3) !important;
        }}

        .nav-shell-caption strong {{
            color: var(--ink-1) !important;
            font-weight: 760;
        }}

        .metric-grid {{
            margin: 14px 0 18px 0 !important;
            gap: 12px !important;
        }}

        .metric-card {{
            min-height: 100px;
            padding: 16px 18px !important;
            position: relative;
            overflow: hidden;
        }}

        .metric-card::before {{
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--brand), var(--accent));
            opacity: 0.75;
        }}

        .metric-value {{
            color: var(--brand) !important;
            letter-spacing: -0.01em;
            font-size: clamp(1.65rem, 2.6vw, 2.35rem);
            font-weight: 820;
            line-height: 1.08;
        }}

        .section-chip {{
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid transparent !important;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 0.01em;
            background: color-mix(in srgb, var(--brand) 14%, transparent) !important;
            border-color: color-mix(in srgb, var(--brand) 26%, transparent) !important;
            color: var(--ink-2) !important;
        }}

        .stButton > button,
        .stDownloadButton > button {{
            min-height: 42px;
            border-radius: var(--radius-md) !important;
            border: 1px solid transparent !important;
            padding: 0.58rem 1rem !important;
            background: linear-gradient(135deg, var(--brand), var(--accent)) !important;
            color: white !important;
            font-weight: 700 !important;
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22) !important;
            transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease;
        }}

        .stButton > button:hover,
        .stDownloadButton > button:hover {{
            transform: translateY(-1px);
            opacity: 0.95;
            box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3) !important;
        }}

        .stButton > button:focus,
        .stDownloadButton > button:focus {{
            box-shadow: var(--focus-ring) !important;
        }}

        .stButton > button[kind="secondary"] {{
            background: var(--surface-2) !important;
            border-color: var(--edge-soft) !important;
            color: var(--ink-1) !important;
            box-shadow: none !important;
        }}

        .stButton > button[kind="secondary"]:hover {{
            border-color: color-mix(in srgb, var(--brand) 58%, transparent) !important;
            background: color-mix(in srgb, var(--surface-2) 88%, var(--brand) 12%) !important;
        }}

        .stButton > button:disabled,
        .stDownloadButton > button:disabled {{
            opacity: 0.56 !important;
            transform: none !important;
            box-shadow: none !important;
        }}

        div[data-baseweb="select"] > div,
        div[data-baseweb="select"] input,
        .stTextInput > div > div > input,
        .stTextArea textarea,
        .stNumberInput input,
        .stDateInput input {{
            background: var(--input-bg) !important;
            color: var(--ink-1) !important;
            border: 1px solid var(--edge-soft) !important;
            border-radius: var(--radius-sm) !important;
            min-height: 42px !important;
            transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
        }}

        div[data-baseweb="select"] > div:focus-within,
        .stTextInput > div > div > input:focus,
        .stTextArea textarea:focus,
        .stNumberInput input:focus,
        .stDateInput input:focus {{
            border-color: color-mix(in srgb, var(--accent) 66%, transparent) !important;
            box-shadow: var(--focus-ring) !important;
        }}

        .stTextInput > div > div > input::placeholder,
        .stTextArea textarea::placeholder {{
            color: var(--ink-3) !important;
            opacity: 0.95;
        }}

        section[data-testid="stSidebar"] {{
            width: 0 !important;
            min-width: 0 !important;
            border-right: none !important;
        }}

        [data-testid="collapsedControl"] {{
            display: none !important;
        }}

        .top-control-shell {{
            border-radius: var(--radius-lg);
            padding: 10px 14px;
            margin: 0 0 12px 0;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }}

        .top-control-head {{
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 10px;
            margin: 0 0 8px 0;
        }}

        .top-control-title {{
            margin: 0;
            color: var(--ink-1) !important;
            font-size: 0.92rem;
            font-weight: 780;
            letter-spacing: 0.01em;
            text-transform: uppercase;
        }}

        .top-control-subtitle {{
            margin: 0;
            color: var(--ink-3) !important;
            font-size: 0.78rem;
            font-weight: 520;
        }}

        div[data-testid="stRadio"] > label,
        div[data-testid="stSelectbox"] > label,
        div[data-testid="stNumberInput"] > label,
        div[data-testid="stTextInput"] > label,
        div[data-testid="stDateInput"] > label,
        div[data-testid="stTextArea"] > label {{
            color: var(--ink-2) !important;
            font-weight: 700 !important;
            letter-spacing: 0.01em;
            margin-bottom: 4px;
        }}

        div[data-testid="stRadio"] [role="radiogroup"] {{
            gap: 7px;
        }}

        div[data-baseweb="radio"] > label {{
            border: 1px solid var(--edge-soft);
            border-radius: 999px;
            padding: 5px 11px;
            background: var(--surface-2);
            transition: border-color .14s ease, transform .14s ease, background .14s ease;
        }}

        div[data-baseweb="radio"] > label:hover {{
            transform: translateY(-1px);
            border-color: color-mix(in srgb, var(--brand) 52%, transparent);
        }}

        div[data-baseweb="radio"] input:checked + div {{
            color: var(--ink-1) !important;
        }}

        .rubric-scroll {{
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 4px 2px 12px 2px;
            scroll-snap-type: x mandatory;
            scrollbar-width: thin;
            scrollbar-gutter: stable;
        }}

        .rubric-scroll::-webkit-scrollbar {{
            height: 8px;
        }}

        .rubric-scroll::-webkit-scrollbar-thumb {{
            background: color-mix(in srgb, var(--brand) 45%, transparent);
            border-radius: 999px;
        }}

        .rubric-pill-form {{
            margin: 0;
            padding: 0;
            flex: 0 0 auto;
        }}

        .rubric-pill {{
            min-width: 240px;
            max-width: 280px;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid var(--edge-soft);
            background: var(--surface-2);
            text-decoration: none !important;
            color: var(--ink-1) !important;
            display: flex;
            flex-direction: column;
            gap: 6px;
            scroll-snap-align: start;
            transition: transform .14s ease, border-color .14s ease, box-shadow .14s ease;
            cursor: pointer;
            width: 100%;
            text-align: left;
            font: inherit;
            appearance: none;
        }}

        .rubric-pill:hover {{
            transform: translateY(-1px);
            border-color: color-mix(in srgb, var(--brand) 55%, transparent);
            box-shadow: 0 12px 22px rgba(37, 99, 235, 0.16);
        }}

        .rubric-pill-active {{
            border-color: transparent !important;
            background: linear-gradient(138deg, color-mix(in srgb, var(--brand) 86%, #ffffff 14%), var(--accent)) !important;
            box-shadow: 0 12px 26px rgba(37, 99, 235, 0.24);
        }}

        .rubric-pill-active .rubric-pill-label,
        .rubric-pill-active .rubric-pill-hint {{
            color: #ffffff !important;
        }}

        .rubric-pill-label {{
            font-size: 0.98rem;
            font-weight: 700;
            letter-spacing: -0.01em;
            line-height: 1.2;
            color: var(--ink-1);
        }}

        .rubric-pill-hint {{
            font-size: 0.82rem;
            line-height: 1.35;
            color: var(--ink-3);
        }}

        .rubric-controls {{
            margin-top: 8px;
        }}

        .rubric-controls .stButton > button {{
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
            color: var(--ink-1) !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            font-weight: 700 !important;
        }}

        [data-testid="stNotification"],
        div[data-baseweb="notification"] {{
            border-radius: 14px !important;
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
        }}

        div[data-testid="stAlert"] {{
            border-radius: var(--radius-md) !important;
            border: 1px solid var(--edge-soft) !important;
            background: color-mix(in srgb, var(--surface-2) 92%, white 8%) !important;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }}

        div[data-testid="stAlert"] p {{
            color: var(--ink-2) !important;
            line-height: 1.5 !important;
        }}

        div[data-baseweb="checkbox"] > label {{
            border-radius: var(--radius-sm);
            padding: 6px 8px 6px 4px;
        }}

        [data-baseweb="slider"] [role="slider"] {{
            border: 2px solid #ffffff !important;
            box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand) 18%, transparent) !important;
        }}

        [data-testid="stDataFrame"],
        [data-testid="stDataEditor"],
        div[data-testid="stTable"] {{
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid var(--edge-soft);
            background: var(--surface-2) !important;
        }}

        div[data-testid="stTable"] table {{
            border-collapse: separate !important;
            border-spacing: 0 !important;
        }}

        div[data-testid="stTable"] th {{
            background: color-mix(in srgb, var(--surface-2) 84%, var(--brand) 16%) !important;
            color: var(--ink-1) !important;
            font-weight: 700 !important;
            border-bottom: 1px solid var(--edge-soft) !important;
        }}

        div[data-testid="stTable"] td {{
            color: var(--ink-2) !important;
            border-bottom: 1px solid color-mix(in srgb, var(--edge-soft) 70%, transparent) !important;
        }}

        [data-testid="stPlotlyChart"],
        [data-testid="stVegaLiteChart"],
        [data-testid="stPyplot"] {{
            border-radius: var(--radius-lg);
            border: 1px solid var(--edge-soft);
            background: var(--surface-2) !important;
            padding: 8px 8px 2px 8px;
            box-shadow: var(--shadow-card);
        }}

        iframe[title*="st_folium"],
        iframe[title*="streamlit_folium"] {{
            border-radius: var(--radius-lg) !important;
            border: 1px solid var(--edge-soft) !important;
            box-shadow: var(--shadow-card) !important;
            overflow: hidden;
        }}

        .stExpander {{
            border-radius: var(--radius-md) !important;
            overflow: hidden;
        }}

        .stExpander details summary p {{
            color: var(--ink-1) !important;
            font-weight: 730 !important;
            letter-spacing: -0.01em;
        }}

        .stProgress > div > div {{
            border-radius: 999px !important;
        }}

        .stProgress [role="progressbar"] {{
            background: linear-gradient(135deg, var(--brand), var(--accent)) !important;
        }}

        .stTabs [data-baseweb="tab-list"] {{
            gap: 8px;
        }}

        .stTabs [data-baseweb="tab"] {{
            border-radius: 12px !important;
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
            color: var(--ink-2) !important;
        }}

        .stTabs [aria-selected="true"] {{
            background: color-mix(in srgb, var(--brand) 22%, transparent) !important;
            border-color: color-mix(in srgb, var(--brand) 60%, transparent) !important;
            color: var(--ink-1) !important;
        }}

        @media (max-width: 1100px) {{
            .main .block-container {{
                max-width: 100% !important;
                padding-top: 0 !important;
                margin-top: 0 !important;
            }}

            .metric-grid {{
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }}
        }}

        @media (max-width: 720px) {{
            .top-control-shell {{
                padding: 10px;
            }}

            .top-control-head {{
                flex-direction: column;
                align-items: flex-start;
                gap: 2px;
            }}

            .metric-grid {{
                grid-template-columns: 1fr !important;
            }}

            .rubric-pill {{
                min-width: 202px;
                max-width: 230px;
            }}

            .app-shell {{
                padding: 18px 16px !important;
            }}

            .app-shell-title {{
                max-width: 100%;
                font-size: clamp(1.7rem, 7vw, 2.2rem);
            }}

            .section-shell {{
                padding: 14px 14px 12px 14px !important;
            }}

            .rubric-controls .stButton > button {{
                min-height: 50px !important;
            }}
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )

inject_visual_polish(st.session_state.theme_mode)

st.markdown('<div class="top-control-shell">', unsafe_allow_html=True)
st.markdown(
    f"""
    <div class="top-control-head">
        <p class="top-control-title">{i18n_text("Pr├®f├®rences d'affichage", "Display preferences")}</p>
        <p class="top-control-subtitle">{i18n_text("Langue, th├¿me et sobri├®t├® de navigation", "Language, theme, and lightweight browsing")}</p>
    </div>
    """,
    unsafe_allow_html=True,
)
lang_col, theme_col, eco_col = st.columns([1.5, 1.2, 1.3], gap="medium")
with lang_col:
    st.session_state.lang = st.radio(
        t("lang_select"),
        options=["fr", "en"],
        format_func=lambda x: "Fran├ºais" if x == "fr" else "English",
        key="lang_radio_top",
        horizontal=True,
    )
with theme_col:
    selected_theme = st.radio(
        t("theme_mode"),
        options=["light", "dark"],
        format_func=lambda x: t("theme_light") if x == "light" else t("theme_dark"),
        key="theme_mode_radio",
        horizontal=True,
    )
    st.session_state.theme_mode = selected_theme
with eco_col:
    eco_mode = st.checkbox(
        t("eco_mode"),
        value=st.session_state.get("eco_mode", False),
        help=i18n_text(
            "R├®duit l'usage des donn├®es pour une navigation plus sobre.",
            "Reduces data usage for a lighter browsing experience.",
        ),
        key="eco_mode_checkbox",
    )
    st.session_state.eco_mode = eco_mode
st.markdown('</div>', unsafe_allow_html=True)

@st.cache_resource(ttl=86400, show_spinner=False)
def add_elevations_to_graph(G):
    """Enrichit le graphe avec des donn├®es d'altitude via l'API Open-Elevation."""
    try:
        nodes = list(G.nodes(data=True))
        coords = [{"latitude": data["y"], "longitude": data["x"]} for _, data in nodes]
        
        # On utilise Open-Elevation (Public API)
        # On fragmente par paquets de 100 pour ├®viter les timeouts
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
        st.error(f"erreur lors de la r├®cup├®ration des altitudes : {e}")
        return G

def calculate_flow_sinks(G, pollution_points_df, threshold_slope=0.03):
    """
    Identifie les points bas (sinks) o├╣ les d├®chets convergent.
    Un sink est un noeud dont l'altitude est inf├®rieure ├á tous ses voisins 
    et qui est situ├® en bas d'une rue ├á forte pente (>3%).
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
                'description': 'entonnoir ├á pollution : point bas topographique r├®coltant les eaux de ruissellement.'
            })
            
    return sinks

@st.cache_resource(ttl=86400, show_spinner=False)
def get_osmnx_graph(center_lat, center_lon, dist):
    return ox.graph_from_point((center_lat, center_lon), dist=dist, network_type='walk', simplify=True)


def build_interactive_folium_map(map_df: pd.DataFrame) -> folium.Map:
    """Construit la carte Folium compl├¿te (couches, styles, popups, l├®gende, timeline)."""
    # Fallback sur Paris si vide
    center_lat, center_lon = 48.8566, 2.3522
    zoom_start = 12

    if not map_df.empty:
        center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
        zoom_start = 11

    m = folium.Map(location=[center_lat, center_lon], zoom_start=zoom_start, tiles=None)

    folium.TileLayer(
        'OpenStreetMap',
        name='Fond Clair (D├®faut)',
        show=True
    ).add_to(m)
    folium.TileLayer(
        tiles='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        name='Fond Sombre',
        attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        show=False
    ).add_to(m)
    folium.TileLayer(
        tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        name='Vue Satellite',
        attr='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        show=False
    ).add_to(m)

    official_bins = get_paris_bins()

    from folium.plugins import MarkerCluster
    group_pollution = folium.FeatureGroup(name="ÔÜá´©Å Pollution & Actions", show=True)
    cluster_pollution = MarkerCluster(name="­ƒƒú Cluster Pollution (dense)", show=False, disableClusteringAtZoom=14)
    group_clean = folium.FeatureGroup(name="­ƒî┐ Zones Propres", show=True)
    group_business = folium.FeatureGroup(name="Ô¡É Acteurs Engag├®s", show=True)
    group_routes = folium.FeatureGroup(name="­ƒº¡ Liaisons d├®part/arriv├®e", show=True)
    group_spots = folium.FeatureGroup(name="­ƒôó Trash Spots (Signalisations)", show=True)
    group_ashtray_hotspots = folium.FeatureGroup(name="­ƒÜ¼ Cendriers prioritaires (m├®gots/h)", show=True)
    group_bin_hotspots = folium.FeatureGroup(name="­ƒùæ´©Å Poubelles prioritaires (kg/h)", show=True)

    # Seuils horaires (moyennes sur actions de d├®pollution) pour les marqueurs cendrier/poubelle
    avg_megots_h = 0.0
    avg_kg_h = 0.0
    if not map_df.empty:
        perf_df = map_df.copy()
        if "est_propre" in perf_df.columns:
            perf_df = perf_df[~perf_df["est_propre"].map(normalize_bool_flag)]
        if "type_lieu" in perf_df.columns:
            perf_df = perf_df[perf_df["type_lieu"].fillna("").astype(str) != "├ëtablissement Engag├® (Label)"]
        if not perf_df.empty:
            temps_h = pd.to_numeric(perf_df.get("temps_min", 0), errors="coerce").fillna(0) / 60.0
            megots = pd.to_numeric(perf_df.get("megots", 0), errors="coerce").fillna(0)
            kg = pd.to_numeric(perf_df.get("dechets_kg", 0), errors="coerce").fillna(0)
            valid = temps_h > 0
            if valid.any():
                avg_megots_h = float((megots[valid] / temps_h[valid]).mean())
                avg_kg_h = float((kg[valid] / temps_h[valid]).mean())

    active_spots = get_active_spots()
    for s in active_spots:
        spot_type = _repair_mojibake_text(str(s.get('type_dechet', '')))
        spot_reporter = _repair_mojibake_text(str(s.get('reporter_name', '')))
        folium.Marker(
            [s['lat'], s['lon']],
            popup=f"<b>ÔÜá´©Å {spot_type}</b><br>Signal├® par {spot_reporter}<br><i>Aidez-nous ├á nettoyer !</i>",
            icon=folium.Icon(color='red', icon='exclamation-circle', prefix='fa'),
            tooltip="Spot de pollution actif"
        ).add_to(group_spots)
    group_spots.add_to(m)

    for b in official_bins:
        folium.CircleMarker(
            location=[b['lat'], b['lon']],
            radius=3,
            color='#808080',
            fill=True,
            fill_color='#808080',
            fill_opacity=0.4,
            popup=f"<b>­ƒùæ´©Å Info Officielle</b><br>Type: {b.get('type')}<br>Propri├®taire: Ville de Paris"
        ).add_to(group_pollution)

    features_timeline = []
    max_osm_shapes = 80
    enable_osm_shapes = len(map_df) <= max_osm_shapes
    if not enable_osm_shapes:
        st.caption(
            f"Mode rapide: geometries OSM desactivees au-dela de {max_osm_shapes} points."
            if st.session_state.lang == "fr"
            else f"Fast mode: OSM geometries disabled above {max_osm_shapes} points."
        )

    if not map_df.empty:
        for _, row in map_df.iterrows():
            is_clean = normalize_bool_flag(row.get('est_propre', False))
            is_business = row.get('type_lieu') == "├ëtablissement Engag├® (Label)"
            gap_alert = ""
            if not is_clean and not is_business and row.get('lat') and row.get('lon'):
                if 48.8 <= row['lat'] <= 48.9 and 2.2 <= row['lon'] <= 2.4:
                    is_gap, dist = calculate_infrastructure_gap(row['lat'], row['lon'], official_bins)
                    if is_gap:
                        gap_alert = f"Besoin d'├®quipement : poubelle la plus proche ├á {int(dist)}m"

            score_data = calculate_scores(row)
            color, radius, icon_type = get_marker_style(row, score_data)

            osm_type = detect_osm_type(row)
            if enable_osm_shapes and osm_type != 'point':
                action_minutes = float(row.get('temps_min', 60) or 60)
                volunteers = float(row.get('benevoles', row.get('nb_benevoles', 1)) or 1)
                team_factor = 1.0 + min(max(volunteers, 1.0) - 1.0, 4.0) * 0.08
                target_distance_m = (220.0 + action_minutes * 8.0) * team_factor
                geometry, final_type = fetch_osm_geometry(
                    row['lat'],
                    row['lon'],
                    osm_type,
                    target_distance_m=target_distance_m,
                    place_hint=f"{row.get('adresse', '')} {row.get('type_lieu', '')} {row.get('association', '')}",
                )
            else:
                geometry, final_type = (None, 'point')

            popup_html = create_premium_popup(row, score_data, gap_alert=gap_alert)
            place_name = format_google_maps_name(row)
            target_group = group_business if is_business else group_clean if is_clean else group_pollution
            start_lat = pd.to_numeric(row.get("lat_depart", row.get("lat")), errors="coerce")
            start_lon = pd.to_numeric(row.get("lon_depart", row.get("lon")), errors="coerce")
            end_lat = pd.to_numeric(row.get("lat_arrivee"), errors="coerce")
            end_lon = pd.to_numeric(row.get("lon_arrivee"), errors="coerce")
            if pd.notna(start_lat) and pd.notna(start_lon) and pd.notna(end_lat) and pd.notna(end_lon):
                same_point = abs(float(start_lat) - float(end_lat)) < 1e-6 and abs(float(start_lon) - float(end_lon)) < 1e-6
                if not same_point:
                    start_label = str(row.get("adresse_depart") or row.get("adresse") or "D├®part")
                    end_label = str(row.get("adresse_arrivee") or "Arriv├®e")
                    folium.PolyLine(
                        locations=[[float(start_lat), float(start_lon)], [float(end_lat), float(end_lon)]],
                        color="#0ea5e9",
                        weight=4,
                        opacity=0.8,
                        dash_array="8,6",
                        tooltip=f"Trajet d├®clar├®: {place_name}",
                        popup=(
                            f"<b>­ƒº¡ Trajet d├®clar├®</b><br>"
                            f"<b>D├®part:</b> {start_label}<br>"
                            f"<b>Arriv├®e:</b> {end_label}"
                        ),
                    ).add_to(group_routes)

            has_drawn_shape = False
            if final_type == 'park' and geometry:
                _park_color = color
                folium.GeoJson(
                    geometry,
                    style_function=lambda x, c=_park_color: {
                        'fillColor': MAP_COLORS['park'],
                        'color': c,
                        'weight': 2,
                        'fillOpacity': 0.3
                    },
                    tooltip=place_name,
                    popup=folium.Popup(popup_html, max_width=300)
                ).add_to(target_group)
                has_drawn_shape = True
            elif final_type == 'street' and geometry:
                _street_color = color
                folium.GeoJson(
                    geometry,
                    style_function=lambda x, c=_street_color: {
                        'color': c,
                        'weight': 5,
                        'opacity': 0.8
                    },
                    tooltip=place_name,
                    popup=folium.Popup(popup_html, max_width=300)
                ).add_to(target_group)
                has_drawn_shape = True

            # Marqueur ponctuel uniquement quand aucun polygone/trait n'a pu ├¬tre trac├®
            if not has_drawn_shape:
                if icon_type == 'star':
                    folium.Marker(
                        location=[row['lat'], row['lon']],
                        popup=folium.Popup(popup_html, max_width=300),
                        tooltip=place_name,
                        icon=folium.Icon(color='lightgray', icon_color=color, icon='star', prefix='fa')
                    ).add_to(target_group)
                elif score_data['score_salete'] > 200:
                    icon_char = '­ƒÜ¼' if row.get('megots', 0) > 300 else '­ƒùæ´©Å'
                    folium.Marker(
                        location=[row['lat'], row['lon']],
                        icon=folium.DivIcon(html=f"""
                            <div style="background:{color}; width:30px; height:30px; border-radius:15px;
                            display:flex; align-items:center; justify-content:center; color:white; font-size:16px;
                            box-shadow:0 0 10px rgba(0,0,0,0.3); border:2px solid white;">{icon_char}</div>
                        """),
                        tooltip=place_name,
                        popup=folium.Popup(popup_html, max_width=300)
                    ).add_to(target_group)
                elif is_clean:
                    folium.Marker(
                        location=[row['lat'], row['lon']],
                        icon=folium.Icon(color='cadetblue', icon='leaf', prefix='fa'),
                        tooltip=place_name,
                        popup=folium.Popup(popup_html, max_width=300)
                    ).add_to(target_group)
                else:
                    folium.CircleMarker(
                        location=[row['lat'], row['lon']],
                        radius=radius,
                        color=color,
                        fill=True,
                        fill_color=color,
                        fill_opacity=0.7,
                        tooltip=place_name,
                        popup=folium.Popup(popup_html, max_width=300)
                    ).add_to(target_group)

            raw_date = row.get('date', '')
            if not raw_date or str(raw_date).lower() in ["nan", "none", ""]:
                try:
                    raw_date = row.get('submitted_at', '').split('T')[0]
                except Exception:
                    raw_date = datetime.now().strftime('%Y-%m-%d')

            # Le d├®filement chronologique ne duplique pas en cercle les actions d├®j├á trac├®es en forme
            if not has_drawn_shape:
                icon_name = 'star' if icon_type == 'star' else 'circle'
                features_timeline.append({
                    'type': 'Feature',
                    'geometry': {'type': 'Point', 'coordinates': [row['lon'], row['lat']]},
                    'properties': {
                        'time': raw_date,
                        'popup': popup_html,
                        'icon': icon_name,
                        'iconstyle': {
                            'color': color,
                            'fillColor': color,
                            'fillOpacity': 0.8,
                            'radius': max(6, min(radius, 14))
                        },
                        'style': {'color': color}
                    }
                })

            if score_data['score_mixte'] > 80 and not is_business:
                folium.Marker(
                    location=[row['lat'], row['lon']],
                    icon=folium.Icon(color='purple', icon='exclamation-triangle', prefix='fa'),
                    tooltip=f"ÔÜá´©Å Point Critique: {place_name}",
                    popup=f"<b>Point critique d├®tect├®</b><br>{place_name}<br><small>Priorit├® ├®lev├®e pour intervention.</small>"
                ).add_to(group_pollution)

            # Marqueurs de d├®passement des moyennes horaires (cendrier / poubelle)
            if (not is_clean) and (not is_business):
                temps_min = float(pd.to_numeric(row.get("temps_min", 0), errors="coerce") or 0.0)
                if temps_min > 0:
                    megots_h = float(pd.to_numeric(row.get("megots", 0), errors="coerce") or 0.0) * 60.0 / temps_min
                    kg_h = float(pd.to_numeric(row.get("dechets_kg", 0), errors="coerce") or 0.0) * 60.0 / temps_min

                    if avg_megots_h > 0 and megots_h > avg_megots_h:
                        folium.Marker(
                            location=[row['lat'], row['lon']],
                            icon=folium.DivIcon(html="""
                                <div style="background:#f97316;width:28px;height:28px;border-radius:14px;
                                display:flex;align-items:center;justify-content:center;color:white;font-size:15px;
                                border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);">­ƒÜ¼</div>
                            """),
                            tooltip=f"Cendrier prioritaire: {place_name}",
                            popup=(
                                f"<b>­ƒÜ¼ Cendrier prioritaire</b><br>{place_name}<br>"
                                f"M├®gots/h: <b>{megots_h:.1f}</b> (moyenne: {avg_megots_h:.1f})"
                            ),
                        ).add_to(group_ashtray_hotspots)

                    if avg_kg_h > 0 and kg_h > avg_kg_h:
                        folium.Marker(
                            location=[row['lat'], row['lon']],
                            icon=folium.DivIcon(html="""
                                <div style="background:#2563eb;width:28px;height:28px;border-radius:14px;
                                display:flex;align-items:center;justify-content:center;color:white;font-size:15px;
                                border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);">­ƒùæ´©Å</div>
                            """),
                            tooltip=f"Poubelle prioritaire: {place_name}",
                            popup=(
                                f"<b>­ƒùæ´©Å Poubelle prioritaire</b><br>{place_name}<br>"
                                f"kg/h: <b>{kg_h:.2f}</b> (moyenne: {avg_kg_h:.2f})"
                            ),
                        ).add_to(group_bin_hotspots)

    group_pollution.add_child(cluster_pollution)
    group_pollution.add_to(m)
    group_clean.add_to(m)
    group_business.add_to(m)
    group_routes.add_to(m)
    group_ashtray_hotspots.add_to(m)
    group_bin_hotspots.add_to(m)

    _nb_actions = len(map_df) if not map_df.empty else 0
    _nb_megots = int(map_df['megots'].fillna(0).sum()) if not map_df.empty else 0
    _nb_kg = map_df['dechets_kg'].fillna(0).sum() if not map_df.empty else 0.0
    _nb_volunteers = int(map_df['benevoles'].fillna(0).sum()) if not map_df.empty else 0
    _nb_critiques = len(map_df[map_df['score_mixte'] > 80]) if not map_df.empty and 'score_mixte' in map_df.columns else 0

    _impact = calculate_impact(_nb_megots, _nb_kg)
    _co2 = _impact['co2_kg']
    _km = int(_co2 / 0.2) if _co2 > 0 else 0
    _eau = _impact['eau_litres']
    _douches = int(_eau / 50) if _eau > 0 else 0
    _current_date = datetime.now().strftime('%d/%m')

    legend_html = f"""
    {{% macro script(this, kwargs) %}}
    var legend = L.control({{position: 'bottomleft'}});
    legend.onAdd = function(map) {{
        var div = L.DomUtil.create('div', 'info legend');
        div.style.background = 'rgba(255,255,255,0.95)';
        div.style.backdropFilter = 'blur(10px)';
        div.style.padding = '15px';
        div.style.borderRadius = '20px';
        div.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)';
        div.style.border = '1px solid rgba(16,185,129,0.3)';
        div.style.fontSize = '12px';
        div.style.fontFamily = 'Outfit, Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif';
        div.style.lineHeight = '1.5';
        div.style.minWidth = '200px';
        div.style.color = '#1e293b';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">
                <span style="font-size:16px;">­ƒù║´©Å</span>
                <div style="text-align:right;">
                    <b style="color:#10b981; font-size:14px; display:block;">BILAN 2026</b>
                    <small style="color:#94a3b8;">{_current_date}</small>
                </div>
            </div>
            <b style="color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">­ƒôï ├ëTAT DES LIEUX</b><br>
            <div style="margin:5px 0 10px 0; display:grid; grid-template-columns: 1fr 1fr; gap:2px;">
                <span><span style="color:#3498db;">ÔùÅ</span> Propres</span>
                <span><span style="color:#27ae60;">ÔùÅ</span> Nettoy├®s</span>
                <span><span style="color:#e67e22;">ÔùÅ</span> ├Ç inspecter</span>
                <span><span style="color:#8e44ad;">ÔùÅ</span> Pollu├®s</span>
            </div>
            <div style="margin-bottom:10px;">
                <span>ÔÜá´©Å <b>{_nb_critiques}</b> Point critique</span><br>
                <span>­ƒôì <b>{_nb_actions}</b> Actions</span><br>
                <span>­ƒæÑ <b>{_nb_volunteers}</b> B├®n├®voles</span><br>
                <span>­ƒÜ¼ <b>{_nb_megots:,}</b> M├®gots</span><br>
                <span>ÔÖ╗´©Å <b>{_nb_kg:.1f} kg</b> D├®chets</span>
            </div>
            <b style="color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">­ƒîì IMPACT</b><br>
            <div style="margin-top:5px; background:rgba(16,185,129,0.05); padding:8px; border-radius:12px; border:1px solid rgba(16,185,129,0.1);">
                <span>­ƒÆ¿ <b>{_co2:.1f} kg</b> COÔéé ├®vit├®</span><br>
                <small style="color:#64748b; margin-left:18px;">­ƒÜù { _km:,} km voiture</small><br>
                <span>­ƒÆº <b>{_eau:,} L</b> Eau pr├®serv├®e</span><br>
                <small style="color:#64748b; margin-left:18px;">­ƒÜ┐ {_douches:,} douches</small>
            </div>
        `;
        return div;
    }};
    legend.addTo({{{{ this._parent.get_name() }}}});
    {{% endmacro %}}
    """
    legend_element = MacroElement()
    legend_element._template = Template(legend_html)
    m.add_child(legend_element)

    heat_data = get_heatmap_data(map_df)
    if heat_data:
        from folium.plugins import HeatMap
        HeatMap(heat_data, name="Heatmap de Salet├® (Vue Thermique)", show=False, radius=25, blur=15).add_to(m)

    timeline_layer = None
    if features_timeline:
        timeline_layer = TimestampedGeoJson(
            {'type': 'FeatureCollection', 'features': features_timeline},
            period='P1D',
            add_last_point=True,
            auto_play=False,
            loop=False,
            max_speed=1,
            loop_button=True,
            date_options='YYYY-MM-DD',
            time_slider_drag_update=True
        )
        timeline_layer.add_to(m)

    layer_control = folium.LayerControl(position='topright', collapsed=False)
    layer_control.add_to(m)

    if timeline_layer is not None:
        timeline_toggle = MacroElement()
        timeline_toggle._template = Template(
            f"""
            {{% macro script(this, kwargs) %}}
            var mapRef = {{{{ this._parent.get_name() }}}};
            var timelineRef = {timeline_layer.get_name()};
            var layerControlRef = {layer_control.get_name()};
            if (mapRef && timelineRef && layerControlRef) {{
                mapRef.removeLayer(timelineRef);
                layerControlRef.addOverlay(
                    timelineRef,
                    "{i18n_text('­ƒòÆ D├®filement chronologique', '­ƒòÆ Chronological playback')}"
                );
            }}
            {{% endmacro %}}
            """
        )
        m.add_child(timeline_toggle)
    return m


TYPE_LIEU_OPTIONS = [
    "Bois/Parc/Jardin/Square/Sentier",
    "N┬░ Boulevard/Avenue/Place",
    "Quai/Pont/Port",
    "Monument",
    "Quartier",
    "├ëtablissement Engag├® (Label)",
    "Non sp├®cifi├®",
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
    """R├®cup├¿re les positions des corbeilles de rue de Paris via l'API Open Data."""
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
    Calcule si un point noir est ├á plus de threshold_m d'une poubelle officielle.
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
    """Retourne l'email du compte Google connect├® via Streamlit auth, sinon None."""
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


@st.cache_data(ttl=3600)
def geocode_and_resolve(location_input: str):
    """
    Tente de r├®soudre un emplacement (GPS ou texte) en (lat, lon, adresse_formatee).
    """
    if not location_input or len(location_input.strip()) < 3:
        return None, None, location_input

    # 1. Tentative de lecture directe des coordonn├®es (Decimal)
    lat, lon = parse_coords(location_input)
    geolocator = Nominatim(user_agent="cleanmymap_app_v2")

    if lat is not None and lon is not None:
        try:
            # R├®cup├®ration de l'adresse textuelle ├á partir des coordonn├®es
            location = geolocator.reverse((lat, lon), timeout=5)
            address = location.address if location else f"{lat}, {lon}"
            return lat, lon, address
        except Exception:
            return lat, lon, f"{lat}, {lon}"

    # 2. Tentative de g├®ocodage textuel
    try:
        location = geolocator.geocode(location_input, timeout=5)
        if location:
            return location.latitude, location.longitude, location.address
    except Exception:
        pass

    return None, None, location_input


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

def save_uploaded_image(uploaded_file, prefix="upload"):
    """Persist an uploaded image locally and return absolute path."""
    if uploaded_file is None:
        return None
    uploads_dir = os.path.join(os.path.dirname(__file__), "data", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    safe_name = f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uploaded_file.name}"
    save_path = os.path.join(uploads_dir, safe_name)
    with open(save_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    return save_path

def apply_map_preset(map_df: pd.DataFrame, preset_id: str) -> pd.DataFrame:
    """Filter map dataframe based on UI preset."""
    if map_df.empty:
        return map_df
    clean_col = map_df["est_propre"] if "est_propre" in map_df.columns else pd.Series([False] * len(map_df), index=map_df.index)
    clean_col = clean_col.map(normalize_bool_flag)
    type_col = map_df["type_lieu"] if "type_lieu" in map_df.columns else pd.Series([""] * len(map_df), index=map_df.index)
    type_col = type_col.fillna("").astype(str)
    date_col = pd.to_datetime(map_df.get("date"), errors="coerce")
    if date_col.isna().all() and "submitted_at" in map_df.columns:
        date_col = pd.to_datetime(map_df.get("submitted_at"), errors="coerce")

    if preset_id == "pollution":
        return map_df[(~clean_col) & (type_col != "├ëtablissement Engag├® (Label)")].copy()
    if preset_id == "clean":
        return map_df[clean_col].copy()
    if preset_id == "partners":
        return map_df[type_col.astype(str).str.contains("Engag", case=False, na=False)].copy()
    if preset_id == "recent":
        cutoff = pd.Timestamp(date.today()) - pd.Timedelta(days=30)
        recent_mask = date_col >= cutoff
        return map_df[recent_mask.fillna(False)].copy()
    if preset_id == "priority":
        score_col = pd.to_numeric(map_df.get("score_mixte"), errors="coerce")
        if score_col.isna().all():
            try:
                score_col = map_df.apply(
                    lambda r: float(calculate_scores(r).get("score_mixte", 0)),
                    axis=1,
                )
            except Exception:
                score_col = pd.Series([0] * len(map_df), index=map_df.index)
        return map_df[score_col.fillna(0) >= 80].copy()
    return map_df

@st.cache_data(ttl=3600)
def check_flood_risk(lat, lon, adresse, type_lieu):
    if not lat or not lon:
        return False
        
    keywords = ["seine", "bi├¿vre", "quai", "berge", "canal", "fleuve", "riviere", "eau", "lac"]
    adresse_lower = str(adresse).lower()
    is_water = (type_lieu == "Quai/Pont/Port") or any(k in adresse_lower for k in keywords)
    
    if is_water:
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&past_days=3&daily=precipitation_sum&timezone=auto"
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if 'daily' in data and 'precipitation_sum' in data['daily']:
                    # Somme des pr├®cipitations sur les jours historiques retourn├®s
                    total_precip = sum(p for p in data['daily']['precipitation_sum'] if p is not None)
                    if total_precip > 10.0:  # > 10mm de pluie cummul├®e = risque de crue/ruissellement
                        return True
        except Exception:
            pass
    return False

def auto_enrich_actor(sub_id, actor_name, actor_type, location):
    """
    Simule une recherche automatique pour enrichir la fiche d'un acteur engag├®.
    Cette fonction est appel├®e lors de la validation par l'administrateur.
    """
    try:
        # Nettoyage du nom pour le fallback URL
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', actor_name.lower())
        website_fallback = f"https://www.{clean_name}.fr"
        
        # Description par d├®faut (sera affich├®e si la recherche n'est pas remplac├®e par un agent)
        description = f"Structure engag├®e op├®rant ├á {location}. Reconnu pour ses actions en tant que {actor_type.lower()}."
        
        # On met ├á jour la base de donn├®es avec ces informations initiales
        update_submission_data(sub_id, description, website_fallback)
        return True
    except Exception as e:
        print(f"Erreur d'enrichissement : {e}")
        return False


def fuzzy_address_match(new_address: str, existing_list: list, threshold=90):
    """
    Compare une adresse avec une liste existante. 
    Si une correspondance > threshold est trouv├®e, renvoie l'adresse existante.
    """
    if not new_address or not existing_list:
        return new_address
        
    clean_new = new_address.strip()
    
    # On ├®vite les calculs si l'adresse est d├®j├á strictement identique
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
    """G├®n├¿re un identifiant opaque ├á partir du nom pour l'anonymisation scientifique."""
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
    """Calcule le niveau et le badge d'un utilisateur bas├® sur son historique."""
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
    
    badge_icon = "­ƒî▒"
    level_name = "├ëclaireur"
    level = 1
    
    if count_total >= 15:
        badge_icon, level_name, level = "­ƒææ", "L├®gende Citoyenne", 5
    elif count_total >= 10:
        badge_icon, level_name, level = "­ƒÅå", "Ma├«tre du Terrain", 4
    elif count_78 >= 3 or count_dirty >= 5:
        badge_icon, level_name, level = "­ƒî│", "Gardien de la Ville", 3
    elif count_total >= 3:
        badge_icon, level_name, level = "­ƒøí´©Å", "Sentinelle", 2
        
    return f"{badge_icon} {level_name} (Niv. {level})"


def build_public_pdf(actions_df: pd.DataFrame, app_url: str, critical_zones: set = None) -> bytes:
    """Construit un rapport PDF complet (multi-pages) avec s├®paration stricte R├®coltes/Lieux Propres."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    total = len(actions_df)
    df_propres = actions_df[actions_df.get("est_propre", False) == True].copy()
    df_recoltes = actions_df[actions_df.get("est_propre", False) == False].copy()

    propres_count = len(df_propres)
    recoltes_count = len(df_recoltes)
    
    total_megots = int(pd.to_numeric(df_recoltes.get("megots", 0), errors="coerce").fillna(0).sum()) if recoltes_count else 0
    total_dechets = float(pd.to_numeric(df_recoltes.get("dechets_kg", 0), errors="coerce").fillna(0).sum()) if recoltes_count else 0.0
    total_benevoles = int(pd.to_numeric(df_recoltes.get("benevoles", 0), errors="coerce").fillna(0).sum()) if recoltes_count else 0

    # ---------- PAGE 1 : COUVERTURE ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 26)
    pdf.cell(0, 20, _txt("Clean my Map"), ln=True, align="C")
    pdf.set_font("Helvetica", "", 16)
    pdf.cell(0, 10, _txt("Rapport d'impact citoyen & protection"), ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, _txt(f"G├®n├®r├® le {datetime.now().strftime('%d/%m/%Y %H:%M')}"), ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 12)
    pdf.multi_cell(
        0,
        7,
        _txt(
            "Ce rapport consolide deux types de donn├®es citoyennes : "
            "1. Les actions de d├®pollution (r├®coltes de d├®chets).\n"
            "2. Les signalements de propret├® (zones sans pollution).\n\n"
            "Il permet d'orienter les politiques de propret├® urbaine en identifiant les points noirs "
            "et en valorisant les zones pr├®serv├®es."
        ),
    )

    # ---------- PAGE 2 : ACTIONS DE D├ëPOLLUTION ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("1. Bilan des actions de d├®pollution"), ln=True)
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, _txt(f"Nombre total de r├®coltes valid├®es : {recoltes_count}"), ln=True)
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _txt("Impact cumul├® :"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, _txt(f"- M├®gots collect├®s : {total_megots:,}".replace(",", " ")), ln=True)
    pdf.cell(0, 6, _txt(f"- D├®chets collect├®s : {total_dechets:.1f} kg"), ln=True)
    pdf.cell(0, 6, _txt(f"- B├®n├®voles mobilis├®s : {total_benevoles:,}".replace(",", " ")), ln=True)

    if recoltes_count and "date" in df_recoltes.columns:
        # (Graphique temporel uniquement pour les r├®coltes)
        timeline = df_recoltes.copy()
        timeline["_date_sort"] = pd.to_datetime(timeline["date"], errors="coerce")
        timeline = timeline.dropna(subset=["_date_sort"])
        if not timeline.empty:
            timeline = timeline.sort_values("_date_sort")
            by_month = timeline.groupby(timeline["_date_sort"].dt.to_period("M"))["dechets_kg"].sum().reset_index()
            by_month["_date_str"] = by_month["_date_sort"].dt.strftime("%Y-%m")
            if not by_month.empty:
                fig, ax = plt.subplots(figsize=(5, 2.5))
                ax.plot(by_month["_date_str"], by_month["dechets_kg"], marker="o", color="#059669")
                ax.set_title("├ëvolution des r├®coltes (kg)")
                ax.set_xlabel("Mois")
                ax.set_ylabel("Kg")
                ax.tick_params(axis="x", rotation=45)
                fig.tight_layout()
                img_path = os.path.join(os.path.dirname(__file__), "data", "rapport_recoltes.png")
                fig.savefig(img_path)
                plt.close(fig)
                pdf.ln(6)
                pdf.image(img_path, x=15, w=180)

    # ---------- PAGE 3 : SIGNALEMENTS DE PROPRET├ë ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("2. Signalements de zones propres"), ln=True)
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        _txt(
            f"La communaut├® a effectu├® {propres_count} signalements de zones propres. "
            "Ces signalements sont essentiels pour cartographier les secteurs o├╣ la gestion des "
            "d├®chets est efficace ou l├á o├╣ le civisme est exemplaire."
        ),
    )
    pdf.ln(6)
    
    if propres_count:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, _txt("Derni├¿res zones signal├®es propres :"), ln=True)
        pdf.set_font("Helvetica", "", 10)
        # Afficher les 10 derni├¿res adresses propres
        recent_propres = df_propres.sort_values("date", ascending=False).head(10)
        for _, r in recent_propres.iterrows():
            pdf.cell(0, 6, _txt(f"Ô£¿ {r['date']} - {r['adresse']}"), ln=True)
    else:
        pdf.cell(0, 6, _txt("Aucun signalement de zone propre pour le moment."), ln=True)

    # ---------- PAGE 4 : ZONES CRITIQUES ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("4. Zones critiques ├á surveiller"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    if critical_zones:
        pdf.multi_cell(
            0,
            6,
            _txt(
                "Les zones ci-dessous pr├®sentent une r├®currence de re-pollution. "
                "Elles constituent des candidats prioritaires pour l'installation de cendriers de rue, "
                "de corbeilles suppl├®mentaires ou des actions renforc├®es de sensibilisation."
            ),
        )
        pdf.ln(4)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(
                    0,
                    5,
                    _txt(
                        f"­ƒôì {addr} : nettoy├® {data['count']} fois, re-pollution tous les "
                        f"{data['delai_moyen']} jours en moyenne."
                    ),
                )
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"­ƒôì {z}"))
    else:
        pdf.multi_cell(
            0,
            6,
            _txt(
                "Aucune zone critique de re-pollution n'a encore ├®t├® identifi├®e sur la p├®riode analys├®e. "
                "Cela peut signifier soit un territoire bien ├®quip├®, soit un besoin d'augmenter le volume de donn├®es."
            ),
        )

    # ---------- PAGE 6 : RECYCLAGE & SECONDE VIE ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("5. Recyclage et seconde vie"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        _txt(
            "Les d├®chets collect├®s sont une ressource : une partie peut ├¬tre recycl├®e en nouveaux objets "
            "(bancs publics, textiles, mati├¿res premi├¿res secondaires). Cette section rapproche les volumes "
            "ramass├®s d'├®quivalents concrets."
        ),
    )

    if total:
        def _get_plastique(r):
            if r.get("plastique_kg", 0) > 0:
                return float(r["plastique_kg"])
            return float(r.get("dechets_kg", 0)) * IMPACT_CONSTANTS["PLASTIQUE_URBAIN_RATIO"]

        def _get_verre(r):
            if r.get("verre_kg", 0) > 0:
                return float(r["verre_kg"])
            return float(r.get("dechets_kg", 0)) * IMPACT_CONSTANTS["VERRE_URBAIN_RATIO"]

        def _get_metal(r):
            if r.get("metal_kg", 0) > 0:
                return float(r["metal_kg"])
            return float(r.get("dechets_kg", 0)) * IMPACT_CONSTANTS["METAL_URBAIN_RATIO"]

        tot_plastique = actions_df.apply(_get_plastique, axis=1).sum()
        tot_verre = actions_df.apply(_get_verre, axis=1).sum()
        tot_metal = actions_df.apply(_get_metal, axis=1).sum()
        tot_megots_kg = total_megots * IMPACT_CONSTANTS["POIDS_MOYEN_MEGOT_KG"]

        bancs = int(tot_plastique / IMPACT_CONSTANTS["PLASTIQUE_POUR_BANC_KG"])
        pulls = int(tot_plastique / IMPACT_CONSTANTS["PLASTIQUE_POUR_PULL_KG"])

        pdf.ln(4)
        pdf.multi_cell(
            0,
            6,
            _txt(
                f"- Plastique estim├® : {tot_plastique:.1f} kg (Ôëê {bancs} bancs publics ou {pulls} pulls polaires).\n"
                f"- Verre estim├® : {tot_verre:.1f} kg.\n"
                f"- M├®tal estim├® : {tot_metal:.1f} kg.\n"
                f"- Masse de m├®gots : {tot_megots_kg:.1f} kg."
            ),
        )

        if (tot_plastique + tot_verre + tot_metal + tot_megots_kg) > 0:
            labels = ["Plastique", "Verre", "M├®tal", "M├®gots"]
            sizes = [tot_plastique, tot_verre, tot_metal, tot_megots_kg]
            colors = ["#22c55e", "#3b82f6", "#9ca3af", "#f97316"]
            data_filtered = [(l, s, c) for l, s, c in zip(labels, sizes, colors) if s > 0]
            if data_filtered:
                labels = [d[0] for d in data_filtered]
                sizes = [d[1] for d in data_filtered]
                colors = [d[2] for d in data_filtered]
                fig, ax = plt.subplots(figsize=(4.5, 4.5))
                ax.pie(sizes, labels=labels, colors=colors, autopct="%1.1f%%", startangle=90)
                ax.axis("equal")
                fig.tight_layout()

                img_path = os.path.join(os.path.dirname(__file__), "data", "rapport_recyclage.png")
                os.makedirs(os.path.dirname(img_path), exist_ok=True)
                fig.savefig(img_path)
                plt.close(fig)

                pdf.ln(4)
                pdf.image(img_path, x=25, w=160)

    # ---------- PAGE 7 : ├ëCONOMIE POUR LA COLLECTIVIT├ë ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("6. B├®n├®fice ├®conomique pour la collectivit├®"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    tonnes_dechets = total_dechets / 1000.0
    economie_realisee = tonnes_dechets * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]

    texte_lobbying = (
        f"Sur la p├®riode analys├®e, les actions citoyennes ont permis de retirer environ {total_dechets:.1f} kg "
        f"de d├®chets de la voie publique, soit {tonnes_dechets:.3f} tonne(s).\n\n"
        f"En appliquant un co├╗t moyen de traitement de {IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']} Ôé¼ par tonne, "
        f"cela repr├®sente une ├®conomie potentielle d'environ {economie_realisee:,.2f} Ôé¼ pour les services de propret├®. "
        "Au-del├á de l'├®conomie directe, ces actions r├®duisent les risques d'inondation, de micro-plastiques et am├®liorent "
        "la qualit├® de vie des habitants."
    )
    pdf.multi_cell(0, 6, _txt(texte_lobbying))

    # ---------- PAGE 8 : ENGAGEMENT CITOYEN ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("7. ├ënergie citoyenne mobilis├®e"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    if total and "temps_min" in actions_df.columns and "benevoles" in actions_df.columns:
        heures_benevoles = (
            pd.to_numeric(actions_df["temps_min"], errors="coerce").fillna(0)
            * pd.to_numeric(actions_df["benevoles"], errors="coerce").fillna(0)
            / 60.0
        ).sum()
    else:
        heures_benevoles = 0.0

    pdf.multi_cell(
        0,
        6,
        _txt(
            f"Les brigades citoyennes ont investi environ {heures_benevoles:.1f} heures cumul├®es sur le terrain. "
            "Chaque heure de b├®n├®volat ├®quivaut ├á un investissement concret dans la qualit├® de l'espace public, "
            "la sant├® environnementale et le lien social entre habitants."
        ),
    )

    # ---------- PAGE 9+ : LISTE D├ëTAILL├ëE DES DERNI├êRES ACTIONS ----------
    if total:
        preview = actions_df.copy()
        if "date" in preview.columns:
            preview["_date_sort"] = pd.to_datetime(preview["date"], errors="coerce")
            preview = preview.sort_values("_date_sort", ascending=False)

        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, _txt("8. Actions r├®centes (extrait)"), ln=True)
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)

        max_rows = 60  # r├®partis sur plusieurs pages si besoin
        rows = []
        for _, row in preview.iterrows():
            line = (
                f"{row.get('date', '')} | {row.get('type_lieu', 'Non sp├®cifi├®')} | "
                f"{row.get('adresse', '')} | "
                f"{int(row.get('megots', 0))} m├®gots | "
                f"{float(row.get('dechets_kg', 0)):.1f} kg | "
                f"propre={'oui' if normalize_bool_flag(row.get('est_propre', False)) else 'non'}"
            )
            rows.append(line)

        for i, line in enumerate(rows[:max_rows]):
            pdf.multi_cell(0, 5, _txt(f"- {line}"))
            if (i + 1) % 25 == 0 and i + 1 < max_rows:
                pdf.add_page()
                pdf.set_font("Helvetica", "B", 14)
                pdf.cell(0, 8, _txt("Suite des actions r├®centes"), ln=True)
                pdf.ln(4)
                pdf.set_font("Helvetica", "", 10)

    # ---------- DERNI├êRE PAGE : M├ëTHODOLOGIE ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("9. M├®thodologie et r├®f├®rences scientifiques"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, _txt(get_impact_sources()))

    # S'assure d'un volume suffisant (~15 pages) en ajoutant une courte annexe si besoin
    while pdf.page_no() < 15:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, _txt("Annexe compl├®mentaire"), ln=True)
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            0,
            5,
            _txt(
                "Cette page est r├®serv├®e pour des annexes locales (cartes des quartiers, "
                "plans d'action municipaux, comptes-rendus d'op├®rations sp├®ciales, etc.)."
            ),
        )

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_territorial(df_ville: pd.DataFrame, nom_ville: str, critical_zones: set) -> bytes:
    """Construit un PDF 'Certificat d'Impact Territorial' d├®di├® ├á un ├®lu/commune."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    
    # En-t├¬te officiel
    pdf.set_fill_color(240, 248, 255) # Bleu l├®ger
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
        f"├Ç l'attention de la Mairie et des services de la ville de {nom_ville},\n\n"
        f"Les Brigades Vertes et les citoyens b├®n├®voles sont intervenus ├á {nb_actions} reprises sur votre territoire.\n"
        f"Bilan de la d├®pollution :\n"
        f"- {total_dechets:.1f} kg de d├®chets extraits de la voie publique.\n"
        f"- {total_megots} m├®gots ramass├®s.\n"
    )
    pdf.multi_cell(0, 6, _txt(texte_intro))
    
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 100, 0)
    pdf.cell(0, 8, _txt("B├®n├®fices pour la Collectivit├®"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 11)
    
    texte_economie = (
        f"­ƒÆ░ Valeur ├®conomique : Cette action citoyenne a permis d'├®conomiser environ {economie_realisee:,.2f} Ôé¼ "
        f"de frais de nettoyage et de traitement des d├®chets sauvages ├á votre commune (Base: 150Ôé¼/tonne).\n"
        f"­ƒÆº Impact environnemental local : Pr├¿s de {litres_eau:,} litres d'eau prot├®g├®s de la contamination toxique "
        f"sur votre secteur."
    )
    pdf.multi_cell(0, 6, _txt(texte_economie))
    
    # Points Noirs (Infrastructures)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(220, 20, 20)
    pdf.cell(0, 8, _txt(f"ÔÜá´©Å Zones Prioritaires Identifi├®es ({len(critical_zones)} Points Noirs)"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    
    if critical_zones:
        pdf.multi_cell(0, 5, _txt(
            "Analyse pr├®dictive de r├®currence : Les lieux suivants sur votre commune ont fait "
            "l'objet d'au moins 3 nettoyages r├®currents. "
            "Recommandation terrain : Veuillez envisager l'installation d'une infrastructure "
            "(cendrier de rue, poubelle) pour pr├®venir la r├®cidive dont le rythme est mesur├® ci-dessous :"
        ))
        pdf.ln(3)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(0, 5, _txt(f"­ƒôì {addr} : {data['count']} passages. Se re-pollue en moyenne tous les {data['delai_moyen']} jours !"))
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"­ƒôì {z}"))
    else:
        pdf.multi_cell(0, 5, _txt("Aucune zone de r├®cidive chronique critique n'a encore ├®t├® d├®tect├®e par nos algorithmes sur ce p├®rim├¿tre sp├®cifiques."))

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_eco_quartier(nom_quartier: str):
    """G├®n├¿re un certificat PDF 'Quartier Pr├®serv├®'."""
    pdf = FPDF()
    pdf.add_page()
    
    # Bordure d├®corative
    pdf.set_line_width(2)
    pdf.rect(5, 5, 200, 287)
    
    # En-t├¬te
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 118, 110) # Vert Clean my Map
    pdf.cell(0, 40, _txt("CERTIFICAT D'IMPACT CITOYEN"), ln=True, align='C')
    
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(34, 197, 94)
    pdf.cell(0, 20, _txt("label ├®co-quartier"), ln=True, align='C')
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "", 18)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 10, _txt(f"f├®licitations aux habitants et contributeurs de {nom_quartier} !"), align='C')
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "I", 14)
    pdf.multi_cell(0, 8, _txt(
        "ce certificat atteste que votre quartier a maintenu un niveau de propret├® citoyenne exemplaire "
        "sur les 180 derniers jours, sans aucun point noir recens├® et avec des actions de soin r├®guli├¿res."
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
    Identifie les zones (communes) ├®ligibles au label ├®co-quartier.
    Crit├¿res : 
    1. Pr├®sence d'au moins une action 'Zone Propre' (est_propre=True) sur les 180 derniers jours.
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
        
    # On groupe par ville (simplifi├® par extraction du code postal/ville dans l'adresse)
    # Pour l'instant on groupe par adresse compl├¿te ou ville si on arrive ├á l'extraire
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
    Un quartier est ├®ligible s'il a au moins un signalement 'Zone propre' 
    et Z├ëRO 'Point noir' (dechets > 0) sur cette p├®riode.
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
        raw = sanitize_dataframe_text(raw)
    except Exception:
        return []

    c_date = _find_col(raw, ["date", "jour"])
    c_addr = _find_col(raw, ["adresse", "gps", "lieu", "coordo"])
    c_type = _find_col(raw, ["type", "categorie", "cat├®gorie"])
    c_assoc = _find_col(raw, ["association", "asso"])
    c_megots = _find_col(raw, ["megots", "m├®gots", "nbr megots"])
    c_dechets = _find_col(raw, ["dechets", "d├®chets", "kg", "poids"])
    c_ben = _find_col(raw, ["benevoles", "b├®n├®voles", "participants", "nombre benevoles"])
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
                "nom": "R├®f├®rent association",
                "association": str(r.get(c_assoc, "Ind├®pendant") if c_assoc else "Ind├®pendant"),
                "type_lieu": str(r.get(c_type, "Non sp├®cifi├®") if c_type else "Non sp├®cifi├®"),
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
                    "nom": "R├®f├®rent association",
                    "association": "Signalement",
                    "type_lieu": "Non sp├®cifi├®",
                    "adresse": lieu,
                    "date": "",
                    "benevoles": 0,
                    "temps_min": 0,
                    "megots": 0,
                    "dechets_kg": 0.0,
                    "gps": lieu,
                    "lat": lat,
                    "lon": lon,
                    "commentaire": "Zone propre signal├®e (Google Sheet)",
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
        'type_lieu': 'N┬░ Boulevard/Avenue/Place',
        'association': 'Test Association',
        'megots': 800,
        'dechets_kg': 50,
        'temps_min': 45,
        'benevoles': 3,
        'date': '2025-08-18',
        'est_propre': False
    },
    {
        'adresse': 'Sortie M├®tro Barb├¿s-Rochechouart, Paris',
        'lat': 48.8838,
        'lon': 2.3509,
        'ville': 'Paris',
        'type_lieu': 'N┬░ Boulevard/Avenue/Place',
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
        'type_lieu': 'N┬░ Boulevard/Avenue/Place',
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
        'adresse': 'Place de la R├®publique, Paris 3e',
        'lat': 48.8675,
        'lon': 2.3632,
        'ville': 'Paris',
        'type_lieu': 'N┬░ Boulevard/Avenue/Place',
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
        'association': 'Paris Z├®ro D├®chet',
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
        'association': '├ëtudiants pour la Plan├¿te',
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
        'adresse': 'Parc Andr├® Citro├½n, Paris 15e',
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
        'type_lieu': 'N┬░ Boulevard/Avenue/Place',
        'association': 'Les ├ëco-puces',
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
        'association': 'S├®nat Propre',
        'megots': 2100,
        'dechets_kg': 85,
        'temps_min': 110,
        'benevoles': 15,
        'date': '2025-07-22',
        'est_propre': False
    },
    {
        'adresse': 'Promenade Plant├®e, Paris 12e',
        'lat': 48.8458,
        'lon': 2.3810,
        'ville': 'Paris',
        'type_lieu': 'Lieu propre',
        'association': 'Signalement citoyen',
        'megots': 0,
        'dechets_kg': 0.0,
        'temps_min': 30,
        'benevoles': 2,
        'date': '2026-03-10',
        'est_propre': True,
        'commentaire': 'Point de contr├┤le visuel (zone propre)'
    }
]

def init_state():
    if 'sandbox_actions' not in st.session_state:
        st.session_state['sandbox_actions'] = [
            {
                "id": "demo_1",
                "type_lieu": "Brouillon D├®mo",
                "adresse": "Exemple 1 (Test)",
                "megots": 150,
                "dechets_kg": 2.5,
                "lat": 48.8566,
                "lon": 2.3522,
                "est_propre": False
            }
        ]
    if "submission_draft" not in st.session_state:
        st.session_state["submission_draft"] = {}
    if "submission_draft_saved_at" not in st.session_state:
        st.session_state["submission_draft_saved_at"] = None

init_state()

# Lecture des param├¿tres d'URL (Kit Terrain QR Code)
def _qp_scalar(key: str, default: str = "") -> str:
    """Retourne un param├¿tre d'URL sous forme scalaire, compatible str/list."""
    value = st.query_params.get(key, default)
    if isinstance(value, list):
        return str(value[0]) if value else default
    return str(value) if value is not None else default


lieu_prefill = _qp_scalar("lieu", "")
if lieu_prefill:
    st.toast(f"­ƒôì Lieu d├®tect├® via QR Code : {lieu_prefill}", icon="­ƒô▒")

tab_prefill = _qp_scalar("tab", "")
map_preset_prefill = _qp_scalar("preset", "")

# Initialisation de check_pseudo avant les tabs pour qu'il soit toujours d├®fini
check_pseudo = ""


# Configuration inject├®e via CSS global plus haut

# --- AUTHENTIFICATION (SIMPLIFI├ëE) ---
# Acc├¿s libre pour les b├®n├®voles, mot de passe pour l'admin.
main_user_email = _google_user_email() or "B├®n├®vole Anonyme"

# --- CHARGEMENT DES DONN├ëES CUMUL├ëES ---
db_approved = get_submissions_by_status('approved')
sheet_actions = load_sheet_actions(GOOGLE_SHEET_URL)
all_imported_actions = sheet_actions + TEST_DATA
all_public_actions = db_approved + all_imported_actions
all_public_df = pd.DataFrame(all_public_actions)
all_public_df = sanitize_dataframe_text(all_public_df)
if "est_propre" in all_public_df.columns:
    all_public_df["est_propre"] = all_public_df["est_propre"].map(normalize_bool_flag)

# Correction NameError reported by user
df_impact = all_public_df

# Calcul des stats globales cumul├®es
if not all_public_df.empty:
    # Normaliser benevoles / nb_benevoles (les deux noms coexistent dans les sources)
    if 'benevoles' not in all_public_df.columns and 'nb_benevoles' in all_public_df.columns:
        all_public_df['benevoles'] = all_public_df['nb_benevoles']
    elif 'nb_benevoles' not in all_public_df.columns and 'benevoles' in all_public_df.columns:
        all_public_df['nb_benevoles'] = all_public_df['benevoles']
    total_dechets = all_public_df['dechets_kg'].fillna(0).sum()
    total_megots = all_public_df['megots'].fillna(0).sum()
    total_benevoles = all_public_df.get('benevoles', all_public_df.get('nb_benevoles', pd.Series(dtype=float))).fillna(0).sum()
else:
    total_dechets, total_megots, total_benevoles = 0.0, 0, 0

eau_litres = total_megots * IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L']
co2_evite = total_megots * IMPACT_CONSTANTS['CO2_PER_MEGOT_KG']
st.markdown(
    f"""
    <section class="app-shell animate-in">
        <h2 class="app-shell-title">
            {"Agir, Cartographier, Prot├®ger" if st.session_state.lang == "fr" else "Act, Map, Protect"}
        </h2>
        <p class="app-shell-subtitle">
            {"D├®clarez vos actions b├®n├®voles, suivez leur impact en temps r├®el et priorisez les zones ├á traiter."
            if st.session_state.lang == "fr"
            else "Centralize submissions, track impact in real time, map priority zones, and coordinate volunteers, partners, and local authorities from one professional workspace."}
        </p>
    </section>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    f"""
    <div class="metric-grid">
        <div class="metric-card">
            <div class="metric-label">{t("dechets_removed")}</div>
            <div class="metric-value">{total_dechets:.1f}<span class="metric-unit">kg</span></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">{t("megots_collected")}</div>
            <div class="metric-value">{total_megots:,}<span class="metric-unit">­ƒÜ¼</span></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">{t("eau_preserved")}</div>
            <div class="metric-value">{eau_litres:,}<span class="metric-unit">Litres</span></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">{t("co2_avoided")}</div>
            <div class="metric-value">{co2_evite:.1f}<span class="metric-unit">kg CO2</span></div>
        </div>
        <div class="metric-card">
            <div class="metric-label">{t("citizens_engaged")}</div>
            <div class="metric-value">{total_benevoles:,}<span class="metric-unit">H├®ros</span></div>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

render_product_changelog()

# sheet_actions et all_imported_actions sont maintenant charg├®s plus haut
# Import manuel ou asynchrone pour ne les ins├®rer qu'une seule fois. 
# Pour l'instant on garde une vue concat├®n├®e en lecture

# --- NAVIGATION PAR RUBRIQUES CLIQUABLES ---
# Identifiants stables pour ├®viter les rubriques vides apr├¿s changement de langue

tab_specs = [
    {"id": "home", "key": "tab_home"},
    {"id": "declaration", "key": "tab_declaration"},
    {"id": "map", "key": "tab_map"},
    {"id": "trash_spotter", "key": "tab_trash_spotter"},
    {"id": "community", "key": "tab_community"},
    {"id": "gamification", "key": "tab_gamification"},
    {"id": "pdf", "key": "tab_pdf"},
    {"id": "actors", "key": "tab_actors"},
    {"id": "route", "key": "tab_route"},
    {"id": "recycling", "key": "tab_recycling"},
    {"id": "climate", "key": "tab_climate"},
    {"id": "weather", "key": "tab_weather"},
    {"id": "compare", "key": "tab_compare"},
    {"id": "kit", "key": "tab_kit"},
    {"id": "guide", "key": "tab_guide"},
    {"id": "elus", "key": "tab_elus"},
    {"id": "sandbox", "key": "tab_sandbox"},
    {"id": "admin", "key": "tab_admin"},
]

nav_ids = [spec["id"] for spec in tab_specs]
id_to_label = {spec["id"]: t(spec["key"]) for spec in tab_specs}
label_to_id = {label: tab_id for tab_id, label in id_to_label.items()}
rubric_hints = {
    "home": i18n_text("Tableau de bord global et indicateurs cl├®s.", "Global dashboard and key indicators."),
    "declaration": i18n_text("D├®clarez une action terrain en quelques secondes.", "Report a field action in seconds."),
    "map": i18n_text("Carte d'impact en direct et points prioritaires.", "Live impact map and priority hotspots."),
    "trash_spotter": i18n_text("Signalez rapidement une zone ├á traiter.", "Quickly flag a polluted location."),
    "community": i18n_text("Coordonnez sorties, annonces et b├®n├®voles.", "Coordinate meetups, notices, and volunteers."),
    "gamification": i18n_text("Classements, badges et motivation collective.", "Leaderboards, badges, and team momentum."),
    "pdf": i18n_text("G├®n├®rez un rapport d'impact pr├¬t ├á partager.", "Generate a share-ready impact report."),
    "actors": i18n_text("Visualisez les partenaires engag├®s du territoire.", "See active local partners."),
    "route": i18n_text("Planification IA des itin├®raires de collecte.", "AI route planning for cleanups."),
    "recycling": i18n_text("Valorisez le tri et la seconde vie des d├®chets.", "Track sorting and second-life outcomes."),
    "climate": i18n_text("Ressources p├®dagogiques sur les enjeux climat.", "Educational climate insights."),
    "weather": i18n_text("Anticipez vos actions avec la m├®t├®o locale.", "Plan activities with local weather."),
    "compare": i18n_text("Comparez les performances entre territoires.", "Compare performance across territories."),
    "kit": i18n_text("QR codes et outils pr├¬ts pour le terrain.", "Field-ready QR and operation kit."),
    "guide": i18n_text("Guide pratique pour mobiliser durablement.", "Practical guide for sustained mobilization."),
    "elus": i18n_text("Pilotage orient├® collectivit├®s et ├®lus.", "Planning tools for local authorities."),
    "sandbox": i18n_text("Espace de test sans impact production.", "Safe sandbox without production impact."),
    "admin": i18n_text("Validation, contr├┤le qualit├® et exports.", "Validation, quality control, and exports."),
}
requested_tab_id = str(tab_prefill).strip().lower() if tab_prefill else ""

if "active_tab_id" not in st.session_state:
    legacy_active_label = st.session_state.get("active_tab")
    st.session_state.active_tab_id = label_to_id.get(legacy_active_label, nav_ids[0])
if requested_tab_id in nav_ids:
    st.session_state.active_tab_id = requested_tab_id

if st.session_state.active_tab_id not in nav_ids:
    st.session_state.active_tab_id = nav_ids[0]

active_tab_id = st.session_state.active_tab_id

# Navigation centrale: toutes les rubriques visibles directement
st.markdown('<div class="nav-shell">', unsafe_allow_html=True)
st.markdown(
    f'<p class="rubric-hero-subtitle">{i18n_text("Faites d├®filer horizontalement pour acc├®der imm├®diatement ├á chaque rubrique.", "Scroll horizontally to access every section instantly.")}</p>',
    unsafe_allow_html=True,
)
rubric_cards = []
for tab_id in nav_ids:
    active_class = " rubric-pill-active" if tab_id == active_tab_id else ""
    label = html.escape(id_to_label[tab_id])
    hint = html.escape(rubric_hints.get(tab_id, ""))
    rubric_cards.append(
        f'<form class="rubric-pill-form" method="get">'
        f'<input type="hidden" name="tab" value="{tab_id}"/>'
        f'<button class="rubric-pill{active_class}" type="submit" title="{hint}">'
        f'<span class="rubric-pill-label">{label}</span>'
        f'<span class="rubric-pill-hint">{hint}</span>'
        f"</button>"
        f"</form>"
    )
st.markdown(f'<div class="rubric-scroll">{"".join(rubric_cards)}</div>', unsafe_allow_html=True)

active_index = nav_ids.index(active_tab_id)
st.markdown(
    f"<p class='nav-shell-caption'>{i18n_text('Rubrique active', 'Active section')} : "
    f"<strong>{html.escape(id_to_label[active_tab_id])}</strong> "
    f"({active_index + 1}/{len(nav_ids)})</p>",
    unsafe_allow_html=True,
)
st.markdown('<div class="rubric-controls">', unsafe_allow_html=True)
prev_col, next_col = st.columns(2, gap="small")
with prev_col:
    if st.button(
        i18n_text("ÔåÉ Rubrique pr├®c├®dente", "ÔåÉ Previous section"),
        key="rubric_prev_btn",
        use_container_width=True,
        type="secondary",
        disabled=active_index == 0,
    ):
        active_tab_id = nav_ids[active_index - 1]
with next_col:
    if st.button(
        i18n_text("Rubrique suivante ÔåÆ", "Next section ÔåÆ"),
        key="rubric_next_btn",
        use_container_width=True,
        type="secondary",
        disabled=active_index == len(nav_ids) - 1,
    ):
        active_tab_id = nav_ids[active_index + 1]

st.markdown('</div>', unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)

# Synchronisation du state
st.session_state.active_tab_id = active_tab_id
st.session_state.active_tab = id_to_label[active_tab_id]

# Initialisation des containers
tab_placeholders = {
    "declaration": st.empty(),
    "map": st.empty(),
    "trash_spotter": st.empty(),
    "gamification": st.empty(),
    "community": st.empty(),
    "sandbox": st.empty(),
    "pdf": st.empty(),
    "guide": st.empty(),
    "actors": st.empty(),
    "history": st.empty(),
    "route": st.empty(),
    "recycling": st.empty(),
    "climate": st.empty(),
    "elus": st.empty(),
    "kit": st.empty(),
    "home": st.empty(),
    "weather": st.empty(),
    "compare": st.empty(),
    "admin": st.empty(),
}

tab_declaration = tab_placeholders["declaration"]
tab_map = tab_placeholders["map"]
tab_trash_spotter = tab_placeholders["trash_spotter"]
tab_gamification = tab_placeholders["gamification"]
tab_community = tab_placeholders["community"]
tab_sandbox = tab_placeholders["sandbox"]
tab_pdf = tab_placeholders["pdf"]
tab_guide = tab_placeholders["guide"]
tab_actors = tab_placeholders["actors"]
tab_history = tab_placeholders["history"]
tab_route = tab_placeholders["route"]
tab_recycling = tab_placeholders["recycling"]
tab_climate = tab_placeholders["climate"]
tab_elus = tab_placeholders["elus"]
tab_kit = tab_placeholders["kit"]
tab_home = tab_placeholders["home"]
tab_weather = tab_placeholders["weather"]
tab_compare = tab_placeholders["compare"]
tab_admin = tab_placeholders["admin"]

# Active uniquement le container de la rubrique selectionnee
active = st.session_state.active_tab_id
if active == "declaration": tab_declaration = st.container()
elif active == "map": tab_map = st.container()
elif active == "trash_spotter": tab_trash_spotter = st.container()
elif active == "gamification": tab_gamification = st.container()
elif active == "community": tab_community = st.container()
elif active == "sandbox": tab_sandbox = st.container()
elif active == "pdf": tab_pdf = st.container()
elif active == "guide": tab_guide = st.container()
elif active == "actors": tab_actors = st.container()
elif active == "history": tab_history = st.container()
elif active == "route": tab_route = st.container()
elif active == "recycling": tab_recycling = st.container()
elif active == "climate": tab_climate = st.container()
elif active == "elus": tab_elus = st.container()
elif active == "kit": tab_kit = st.container()
elif active == "home": tab_home = st.container()
elif active == "weather": tab_weather = st.container()
elif active == "compare": tab_compare = st.container()
elif active == "admin": tab_admin = st.container()

# Alias retrocompatibles (evite les NameError apres renommage d'onglets)
tab_view = tab_map
tab_add = tab_declaration
tab_report = tab_pdf
tab_partners = tab_actors

with tab_kit:
    render_tab_header(
        icon="\U0001F4F1",
        title_fr="Kit Organisateur",
        title_en="Organizer Kit",
        subtitle_fr="G├®n├®rez un QR code terrain, des templates ├®quipes et des supports pr├®-remplis pour fluidifier vos cleanwalks.",
        subtitle_en="Generate field QR codes, team templates, and prefilled materials to streamline your cleanwalk operations.",
        chips=[i18n_text("Terrain", "Field"), i18n_text("QR Code", "QR Code"), i18n_text("Organisation", "Operations")],
        compact=True,
    )
    
    st.markdown("""
    ### Pourquoi utiliser un QR Code ?
    Le QR Code de terrain est un outil essentiel pour les organisateurs de Clean Walks. Il permet de :
    1. **Simplifier la saisie** : En scannant le code, le lieu de l'action est automatiquement pr├®-rempli pour les b├®n├®voles.
    2. **Uniformiser les donn├®es** : Toutes les d├®clarations de votre ├®v├®nement porteront exactement le m├¬me nom de lieu, facilitant le bilan final.
    3. **Gagner du temps** : Vos b├®n├®voles n'ont plus qu'├á renseigner les quantit├®s ramass├®es.
    
    ---
    ### G├®n├®rer votre code
    Saisissez le nom du lieu ou les coordonn├®es GPS exactes pour g├®n├®rer le QR Code ├á imprimer ou ├á afficher sur votre t├®l├®phone pendant l'action.
    """)
    
    with st.form("qr_generator_form"):
        lieu_event = st.text_input("Nom du lieu ou Coordonn├®es GPS", placeholder="Ex: Place de la Bastille, Paris ou 48.8534, 2.3488")
        color_qr = st.color_picker("Couleur du QR Code", "#059669")
        generate_btn = st.form_submit_button("G├®n├®rer le QR Code de terrain", width="stretch")
        
    if generate_btn:
        if not lieu_event.strip():
            st.warning("Veuillez saisir un lieu pour g├®n├®rer le code.")
        else:
            # Construction de l'URL de l'application avec le param├¿tre de pr├®-remplissage
            # On utilise STREAMLIT_PUBLIC_URL si d├®finie, sinon une URL g├®n├®rique
            base_url = STREAMLIT_PUBLIC_URL
            share_url = f"{base_url}/?lieu={requests.utils.quote(lieu_event.strip())}"
            
            # G├®n├®ration du QR Code
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(share_url)
            qr.make(fit=True)
            img_qr = qr.make_image(fill_color=color_qr, back_color="white")
            
            # Conversion pour affichage Streamlit
            buf = io.BytesIO()
            img_qr.save(buf, format="PNG")
            byte_im = buf.getvalue()
            
            col_qr1, col_qr2 = st.columns([1, 2])
            with col_qr1:
                st.image(byte_im, caption="QR Code ├á scanner sur le terrain", width="stretch")
            with col_qr2:
                st.success("Ô£à Votre QR Code est pr├¬t !")
                st.write(f"**Lien encod├® :** `{share_url}`")
                st.download_button(
                    label="Ô¼ç´©Å T├®l├®charger le QR Code (PNG)",
                    data=byte_im,
                    file_name=f"qrcode_terrain_{lieu_event.replace(' ', '_')}.png",
                    mime="image/png",
                    width="stretch"
                )
                st.info("­ƒÆí **Conseil :** Imprimez ce code et fixez-le sur votre peson ou sur votre sac de collecte principal pour que chaque b├®n├®vole puisse flasher son impact en fin d'action.")

    st.markdown("---")
    st.subheader("­ƒº¥ Templates imprimables & gestion multi-b├®n├®voles")
    nb_participants = st.number_input("Nombre de b├®n├®voles attendus", min_value=1, value=10, step=1, key="kit_participants")
    nb_equipes = st.number_input("Nombre d'├®quipes", min_value=1, value=3, step=1, key="kit_teams")

    planner = pd.DataFrame({
        "equipe": [f"├ëquipe {((i % nb_equipes) + 1)}" for i in range(nb_participants)],
        "benevole": [f"Participant {i+1}" for i in range(nb_participants)],
        "telephone": ["" for _ in range(nb_participants)],
        "materiel": ["gants, sacs, pinces" for _ in range(nb_participants)],
    })
    st.dataframe(planner, width="stretch", hide_index=True)
    st.download_button(
        "Ô¼ç´©Å T├®l├®charger template ├®quipes (CSV)",
        data=planner.to_csv(index=False).encode("utf-8"),
        file_name="template_equipes_cleanmymap.csv",
        mime="text/csv",
        width="stretch",
    )

    st.markdown("---")
    st.subheader("Pack ZIP evenement")
    st.caption("Genere un kit pret a imprimer: QR, feuille equipes, checklist terrain.")
    with st.form("kit_zip_form"):
        event_name = st.text_input("Nom de l'evenement", value="Cleanwalk locale")
        event_place = st.text_input("Lieu de l'evenement", value=lieu_event if 'lieu_event' in locals() and lieu_event else "")
        event_date = st.date_input("Date evenement", value=date.today(), key="kit_event_date")
        generate_zip_btn = st.form_submit_button("Generer le pack ZIP", width="stretch")

    if generate_zip_btn:
        if not event_place.strip():
            st.warning("Precisez le lieu pour generer le pack.")
        else:
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                pack_url = f"{STREAMLIT_PUBLIC_URL}/?lieu={requests.utils.quote(event_place.strip())}"
                qr_pack = qrcode.QRCode(version=1, box_size=10, border=4)
                qr_pack.add_data(pack_url)
                qr_pack.make(fit=True)
                qr_img = qr_pack.make_image(fill_color="#059669", back_color="white")
                qr_bytes = io.BytesIO()
                qr_img.save(qr_bytes, format="PNG")
                zf.writestr("01_qr_code_terrain.png", qr_bytes.getvalue())

                zf.writestr("02_feuille_equipes.csv", planner.to_csv(index=False))

                checklist = (
                    f"CHECKLIST TERRAIN - {event_name}\n"
                    f"Date: {event_date}\n"
                    f"Lieu: {event_place}\n\n"
                    "Avant depart:\n"
                    "- Gants, pinces, sacs (tri)\n"
                    "- Peson / balance\n"
                    "- QR code imprime ou smartphone\n"
                    "- Brief securite equipe\n\n"
                    "Pendant:\n"
                    "- Tri des flux (megots/verre/metal/plastiques)\n"
                    "- Point de regroupement toutes les 30 min\n"
                    "- Photos traceabilite\n\n"
                    "Apres:\n"
                    "- Depot au point de collecte adapte\n"
                    "- Declaration des donnees dans l'app\n"
                    "- Debrief equipe et axes d'amelioration\n"
                )
                zf.writestr("03_checklist_terrain.txt", checklist)

                readme = (
                    f"Pack evenement Clean my Map\n\n"
                    f"Nom: {event_name}\n"
                    f"Lieu: {event_place}\n"
                    f"Date: {event_date}\n"
                    f"Lien QR: {pack_url}\n"
                )
                zf.writestr("README.txt", readme)

            st.download_button(
                "Telecharger le pack ZIP evenement",
                data=zip_buffer.getvalue(),
                file_name=f"kit_evenement_{event_name.replace(' ', '_')}.zip",
                mime="application/zip",
                width="stretch",
            )

with tab_home:
    render_tab_header(
        icon="\U0001F4CA",
        title_fr="Notre Impact",
        title_en="Our Impact",
        subtitle_fr="Vue d'ensemble essentielle : indicateurs globaux et carte interactive des actions.",
        subtitle_en="Essential overview: global indicators and interactive map of actions.",
        chips=[i18n_text("Essentiel", "Essential"), i18n_text("Carte", "Map")],
        compact=True,
    )

    render_ui_callout(
        icon="­ƒº¡",
        title_fr="Parcours recommand├®",
        title_en="Recommended flow",
        body_fr="1) Choisissez une rubrique dans le carrousel, 2) lancez votre action, 3) revenez ici pour suivre la carte et les indicateurs en direct.",
        body_en="1) Pick a section in the ribbon, 2) run your action, 3) come back here to follow the map and live indicators.",
        tone="info",
    )
    top_home_col, resume_col = st.columns([2.4, 1.2], gap="large")
    with top_home_col:
        st.subheader(i18n_text("Actions recentes", "Recent actions"))
        recent_df = all_public_df.copy() if not all_public_df.empty else pd.DataFrame()
        if not recent_df.empty:
            date_candidates = ["date", "submitted_at", "created_at"]
            chosen_date_col = next((col for col in date_candidates if col in recent_df.columns), None)
            if chosen_date_col:
                recent_df["_sort_date"] = pd.to_datetime(recent_df[chosen_date_col], errors="coerce")
                recent_df = recent_df.sort_values("_sort_date", ascending=False)
            recent_preview = recent_df.head(6)
            for _, action in recent_preview.iterrows():
                action_name = action.get("nom") or i18n_text("Benevole", "Volunteer")
                action_place = action.get("adresse") or action.get("type_lieu") or i18n_text("Lieu non precise", "Unknown place")
                action_kg = float(action.get("dechets_kg") or 0.0)
                action_megots = int(action.get("megots") or 0)
                action_date = str(action.get("date") or action.get("submitted_at") or "")[:10]
                st.markdown(
                    f"- **{action_name}** - {action_place}  \n"
                    f"  {action_date} | {action_kg:.1f} kg | {action_megots} megots"
                )
        else:
            st.info(i18n_text("Aucune action recente a afficher.", "No recent action yet."))

    with resume_col:
        st.subheader(i18n_text("Reprise rapide", "Quick resume"))
        st.caption(i18n_text("Reprenez votre dernier formulaire sans repartir de zero.", "Resume your latest form without starting from scratch."))
        if st.button(i18n_text("Reprendre mon action", "Resume my action"), key="resume_my_action_btn", use_container_width=True):
            my_actions = [a for a in get_submissions_by_status(None) if str(a.get("nom", "")).strip().lower() == str(main_user_email).strip().lower()]
            if my_actions:
                my_actions = sorted(
                    my_actions,
                    key=lambda x: str(x.get("date") or x.get("submitted_at") or x.get("created_at") or ""),
                    reverse=True,
                )
                last_action = my_actions[0]
                st.session_state["submission_draft"] = {
                    "action_type": "Ajouter une recolte" if not last_action.get("est_propre") else "Declarer un lieu propre",
                    "nom": last_action.get("nom", ""),
                    "association": last_action.get("association", ""),
                    "type_lieu": last_action.get("type_lieu", TYPE_LIEU_OPTIONS[0]),
                    "action_date": last_action.get("date", str(date.today())),
                    "benevoles": int(last_action.get("benevoles") or 1),
                    "temps_min": int(last_action.get("temps_min") or 60),
                    "emplacement_brut": last_action.get("gps") or last_action.get("adresse", ""),
                    "emplacement_fin_brut": last_action.get("adresse_arrivee", ""),
                    "m_weight": float(last_action.get("megots") or 0) * 0.27,
                    "m_condition": "M├®lang├® / Impuret├®s",
                    "dechets_kg": float(last_action.get("dechets_kg") or 0.0),
                    "commentaire": last_action.get("commentaire", ""),
                    "subscribe_newsletter": False,
                    "user_email": "",
                }
                st.session_state["submission_draft_saved_at"] = datetime.now().strftime("%H:%M:%S")
            st.session_state.active_tab_id = "declaration"
            st.rerun()

    st.markdown("---")
    st.subheader(i18n_text("Carte interactive des actions (temps reel)", "Live interactive action map"))

    home_actions_df = all_public_df.dropna(subset=["lat", "lon"]).copy() if not all_public_df.empty else pd.DataFrame()

    if not home_actions_df.empty:
        home_actions_df = calculate_trends(home_actions_df)
        home_map = build_interactive_folium_map(home_actions_df)
    else:
        st.info(i18n_text("Aucune action g├®olocalis├®e ├á afficher pour le moment.", "No geolocated action to display yet."))
        home_map = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="CartoDB positron")

    st_folium(home_map, width="stretch", height=520, returned_objects=[])

with tab_view:
    render_tab_header(
        icon="\U0001F5FA\ufe0f",
        title_fr="Carte Interactive des Actions",
        title_en="Interactive Action Map",
        subtitle_fr="Explorez les actions valid├®es, les zones sensibles, la chronologie et les couches g├®ographiques en un seul espace.",
        subtitle_en="Explore validated actions, sensitive zones, timeline, and geographic layers in one workspace.",
        chips=[i18n_text("Cartographie", "Mapping"), i18n_text("Analyse", "Analytics"), i18n_text("Temps r├®el", "Live")],
        compact=True,
    )
    render_ui_callout(
        icon="­ƒù║´©Å",
        title_fr="Guide visuel (3 ├®tapes)",
        title_en="Visual guide (3 steps)",
        body_fr="1) Choisissez un pr├®r├®glage. 2) Lisez le r├®sum├® et les zones cl├®s. 3) Passez en mission ou partagez la vue.",
        body_en="1) Choose a preset. 2) Read summary and key areas. 3) Switch to mission or share the view.",
        tone="info",
    )
    
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
            # --- ANALYSE DE TENDANCE LOCALE ---
            map_df = calculate_trends(map_df)
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
            zoom_start = 11

    preset_items = [
        ("all", i18n_text("Vue compl├¿te", "Full view")),
        ("pollution", i18n_text("Pollution", "Pollution")),
        ("clean", i18n_text("Zones propres", "Clean zones")),
        ("partners", i18n_text("Partenaires engag├®s", "Engaged partners")),
        ("recent", i18n_text("Actions r├®centes (30 j)", "Recent actions (30d)")),
        ("priority", i18n_text("Zones prioritaires", "Priority zones")),
    ]
    preset_to_label = {pid: label for pid, label in preset_items}
    label_to_preset = {label: pid for pid, label in preset_items}
    default_preset = map_preset_prefill if map_preset_prefill in preset_to_label else "all"

    selected_preset_label = st.selectbox(
        i18n_text("Pr├®r├®glage de filtrage", "Filter preset"),
        options=[label for _, label in preset_items],
        index=[pid for pid, _ in preset_items].index(default_preset),
        key="map_preset_select",
    )
    selected_preset = label_to_preset[selected_preset_label]
    share_url = f"{STREAMLIT_PUBLIC_URL}/?tab=map&preset={selected_preset}"
    st.text_input(
        i18n_text("Lien partageable du pr├®r├®glage", "Shareable preset link"),
        value=share_url,
        key=f"map_share_url_{selected_preset}",
    )

    filtered_map_df = apply_map_preset(map_df, selected_preset)
    if filtered_map_df.empty and not map_df.empty:
        st.info(i18n_text("Aucun r├®sultat pour ce pr├®r├®glage. Revenez ├á la vue compl├¿te.", "No result for this preset. Switch to full view."))
    try:
        m = build_interactive_folium_map(filtered_map_df)
    except Exception as map_exc:
        track_ux_issue(
            event_type="broken_action",
            tab_id="map",
            action_name="render_map",
            message=str(map_exc),
        )
        st.error(i18n_text("Erreur de rendu de la carte interactive.", "Interactive map render error."))
        m = folium.Map(location=[48.8566, 2.3522], zoom_start=11)

    map_ref_df = filtered_map_df if not filtered_map_df.empty else map_df
    st.markdown("### " + i18n_text("R├®sum├® du pr├®r├®glage actif", "Active preset insights"))
    i1, i2 = st.columns(2)
    i1.metric(i18n_text("Actions", "Actions"), int(len(map_ref_df)))
    i2.metric(
        i18n_text("kg collect├®s", "kg collected"),
        f"{float(pd.to_numeric(map_ref_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
    )
    i3, i4 = st.columns(2)
    i3.metric(
        i18n_text("M├®gots", "Cigarette butts"),
        f"{int(pd.to_numeric(map_ref_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
    )
    i4.metric(
        i18n_text("Zones propres", "Clean zones"),
        int(map_ref_df.get("est_propre", pd.Series(dtype=bool)).map(normalize_bool_flag).sum()),
    )

    if not map_ref_df.empty and "adresse" in map_ref_df.columns:
        top_hotspots = (
            map_ref_df.groupby("adresse", dropna=False)
            .agg(
                actions=("adresse", "count"),
                kg=("dechets_kg", lambda s: float(pd.to_numeric(s, errors="coerce").fillna(0).sum())),
                megots=("megots", lambda s: int(pd.to_numeric(s, errors="coerce").fillna(0).sum())),
            )
            .sort_values(["kg", "megots", "actions"], ascending=False)
            .head(5)
            .reset_index()
        )
        top_hotspots["adresse"] = top_hotspots["adresse"].fillna("").replace("", "Zone non renseign├®e")
        st.dataframe(
            top_hotspots.rename(
                columns={
                    "adresse": i18n_text("Zone", "Area"),
                    "actions": i18n_text("Actions", "Actions"),
                    "kg": i18n_text("kg", "kg"),
                    "megots": i18n_text("M├®gots", "Butts"),
                }
            ),
            hide_index=True,
            width="stretch",
        )

    # --- CHOIX DU MODE DE VUE (2D vs 3D) ---
    view_mode = st.radio(
        "Mode de visualisation" if st.session_state.lang == "fr" else "Visualization Mode",
        options=["2D (Standard)", "3D (Immersif)"],
        horizontal=False,
        help="Le mode 3D n├®cessite plus de ressources mais offre une vue spectaculaire des hotspots." if st.session_state.lang == "fr" else "3D mode requires more resources but offers a spectacular view of hotspots."
    )

    if "3D" in view_mode:
        import pydeck as pdk
        st.info("­ƒÆí **Montagnes de m├®gots** : la hauteur des colonnes repr├®sente la densit├® de pollution cumul├®e." if st.session_state.lang == "fr" else "­ƒÆí **Cigarette Butt Mountains**: Column height represents cumulative pollution density.")
        if map_ref_df.empty:
            st.warning(i18n_text("Aucune donn├®e g├®olocalis├®e pour la vue 3D.", "No geolocated data for 3D view."))
            st_folium(m, width="stretch", height=520, returned_objects=[])
        else:
            # Color scale based on density (Green to Red)
            layer_3d = pdk.Layer(
                "HexagonLayer",
                map_ref_df,
                get_position=["lon", "lat"],
                auto_highlight=True,
                elevation_scale=5,
                elevation_range=[0, 1000],
                extruded=True,
                coverage=1,
                radius=150,
                pickable=True,
                get_fill_color="[255, (1 - value/100) * 255, 0, 180]", # Dynamic color simulation
                color_range=[
                    [16, 185, 129],  # Emerald
                    [59, 130, 246],  # Blue
                    [249, 115, 22],  # Orange
                    [239, 68, 68],   # Red
                ]
            )
            
            view_state = pdk.ViewState(
                latitude=center_lat,
                longitude=center_lon,
                zoom=12,
                pitch=45,
                bearing=0
            )
            
            r = pdk.Deck(
                layers=[layer_3d],
                initial_view_state=view_state,
                map_style="mapbox://styles/mapbox/dark-v10",
                tooltip={
                    "html": "<b>Densit├® :</b> {elevationValue} unit├®s" if st.session_state.lang == "fr" else "<b>Density:</b> {elevationValue} units",
                    "style": {"color": "white", "backgroundColor": "#10b981"}
                }
            )
            st.pydeck_chart(r, use_container_width=True)
    else:
        st_folium(m, width="stretch", height=520, returned_objects=[])

with tab_trash_spotter:
    render_tab_header(
        icon="\U0001F4E2",
        title_fr="Trash Spotter",
        title_en="Trash Spotter",
        subtitle_fr="Signalez rapidement les points noirs pour mobiliser la communaut├® et acc├®l├®rer les interventions.",
        subtitle_en="Quickly report black spots to mobilize the community and accelerate interventions.",
        chips=[i18n_text("Signalement", "Reporting"), i18n_text("R├®activit├®", "Response")],
    )

    col_ts1, col_ts2 = st.columns([1, 1])
    with col_ts1:
        st.subheader("­ƒôì Signaler un Spot")
        with st.form("spot_form_fast"):
            s_addr = st.text_input("Adresse ou Lieu", placeholder="Ex: 10 Rue de Rivoli")
            s_type = st.selectbox("Type de d├®chet", ["D├®charge sauvage", "M├®gots en masse", "Plastiques", "Verre", "Autre"])
            s_pseudo = st.text_input("Votre pseudo", value=main_user_email)
            s_photo = st.file_uploader("Photo du spot (obligatoire)", type=["png", "jpg", "jpeg"], key="spot_photo_required")
            s_btn = st.form_submit_button("­ƒôó Signaler (+10 Eco-Points)")
            
            if s_btn:
                if not s_addr:
                    st.warning("Pr├®cisez l'adresse du spot.")
                elif s_photo is None:
                    st.warning("Une photo est obligatoire pour valider le signalement.")
                else:
                    from src.geocoder import geocode_address
                    lat_s, lon_s = geocode_address(s_addr)
                    if lat_s:
                        photo_path = save_uploaded_image(s_photo, prefix="spot")
                        add_spot(lat_s, lon_s, s_addr, s_type, s_pseudo, photo_url=photo_path)
                        st.success("Ô£à Spot ajout├® ! Merci pour votre vigilance.")
                        st.balloons()
                    else:
                        st.error("Impossible de localiser l'adresse.")

    with col_ts2:
        st.subheader("­ƒîÉ Points Noirs Actifs")
        spots = get_active_spots()
        if spots:
            m_ts = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
            for sp in spots:
                popup_text = f"<b>{sp['type_dechet']}</b><br>Signal├® par {sp['reporter_name']}"
                if sp.get("photo_url"):
                    popup_text += f"<br><small>Photo disponible</small>"
                folium.Marker(
                    [sp['lat'], sp['lon']],
                    popup=popup_text,
                    icon=folium.Icon(color='red', icon='trash', prefix='fa')
                ).add_to(m_ts)
            st_folium(m_ts, width=400, height=350, key="ts_map_view")

            st.markdown("---")
            st.subheader("Validation terrain")
            st.caption("Confirmez sur place qu'un spot est nettoye : il sera cloture automatiquement.")
            for sp in spots[:8]:
                with st.container():
                    st.markdown(f"**{sp.get('type_dechet', 'Spot')}** - {sp.get('adresse', '')}")
                    st.caption(f"Signale par {sp.get('reporter_name', 'N/A')}")
                    if sp.get("photo_url"):
                        try:
                            st.image(sp["photo_url"], width=240)
                        except Exception:
                            st.caption("Photo non affichable")
                    if st.button("Valider terrain et cloturer", key=f"close_spot_{sp['id']}", use_container_width=True):
                        update_spot_status(sp["id"], "cleaned")
                        st.success("Spot cloture automatiquement.")
                        st.rerun()
        else:
            st.info("Aucun spot de pollution signal├® pour le moment.")

with tab_gamification:
    render_tab_header(
        icon="\U0001F3C6",
        title_fr="├ëco-classement & r├®compenses",
        title_en="Eco Ranking & Rewards",
        subtitle_fr="Suivez la dynamique de la communaut├®, valorisez les efforts et activez les badges de progression.",
        subtitle_en="Track community momentum, reward impact, and unlock progression badges.",
        chips=[i18n_text("Leaderboard", "Leaderboard"), i18n_text("Badges", "Badges")],
    )

    cg1, cg2 = st.columns([2, 3])
    with cg1:
        st.subheader("­ƒÑç Top Contributeurs")
        lb = get_leaderboard(limit=5)
        for i, en in enumerate(lb):
            st.markdown(f"""
            <div style="background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); padding: 12px; border-radius: 12px; margin-bottom: 8px; border-left: 4px solid #10b981;">
                <span style="font-size: 1.2rem;">{'­ƒÑç' if i==0 else '­ƒÑê' if i==1 else '­ƒÑë' if i==2 else '­ƒæñ'}</span> 
                <b>{en['nom']}</b> : <span style="color:#10b981; font-weight:bold;">{en['total_points']} pts</span>
            </div>
            """, unsafe_allow_html=True)

    with cg2:
        st.subheader("­ƒÅà Badges & Succ├¿s")
        # Pseudo actuel pour les badges
        curr_pseudo = st.text_input("Saisissez votre pseudo pour voir vos badges", value=main_user_email if main_user_email != "B├®n├®vole Anonyme" else "")
        if curr_pseudo:
            # R├®cup├®rer les stats r├®elles
            all_lb = get_leaderboard(100)
            u_stats = next((x for x in all_lb if x['nom'].lower() == curr_pseudo.lower()), None)
            if u_stats:
                # Ajout fictif de total_kg pour check_badges (normalement extrait de submissions)
                u_stats['total_kg'] = 10 # Backup simple
                bds = check_badges(u_stats)
                b_cols = st.columns(3)
                for idx, b in enumerate(bds):
                    with b_cols[idx % 3]:
                        st.markdown(f"""
                        <div style="text-align: center; padding: 8px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; height: 120px;">
                            <div style="font-size: 1.5rem;">{b['name'].split()[0]}</div>
                            <div style="font-size: 0.8rem; font-weight: bold;">{b['name'].split()[1]}</div>
                            <div style="font-size: 0.7rem; color: #64748b;">{b['desc']}</div>
                        </div>
                        """, unsafe_allow_html=True)
            else:
                st.info("Action valid├®e requise pour d├®bloquer les badges.")

    st.divider()
    st.subheader("Defis hebdo par equipe")
    gami_df = all_public_df.copy() if not all_public_df.empty else pd.DataFrame()
    if not gami_df.empty:
        gami_df["date_dt"] = pd.to_datetime(gami_df.get("date"), errors="coerce")
        gami_df["team_name"] = gami_df.get("association", pd.Series(dtype=str)).fillna("Equipe Independant").replace("", "Equipe Independant")
        week_start = pd.Timestamp(date.today()) - pd.to_timedelta(pd.Timestamp(date.today()).weekday(), unit="D")
        week_end = week_start + pd.Timedelta(days=6)
        week_df = gami_df[(gami_df["date_dt"] >= week_start) & (gami_df["date_dt"] <= week_end)].copy()
        if week_df.empty:
            st.info("Aucune action cette semaine pour lancer un defi.")
        else:
            team_week = (
                week_df.groupby("team_name", dropna=False)
                .agg(
                    actions=("team_name", "count"),
                    kg=("dechets_kg", lambda s: float(pd.to_numeric(s, errors="coerce").fillna(0).sum())),
                    megots=("megots", lambda s: int(pd.to_numeric(s, errors="coerce").fillna(0).sum())),
                    benevoles=("benevoles", lambda s: int(pd.to_numeric(s, errors="coerce").fillna(0).sum())),
                )
                .reset_index()
            )
            team_week["challenge_target_kg"] = team_week["actions"].apply(lambda n: max(20, int(n * 8)))
            team_week["progress_pct"] = (team_week["kg"] / team_week["challenge_target_kg"] * 100).clip(upper=999)
            team_week = team_week.sort_values(["kg", "actions"], ascending=False)

            for _, team_row in team_week.head(8).iterrows():
                st.markdown(f"**{team_row['team_name']}** - objectif {int(team_row['challenge_target_kg'])} kg")
                st.progress(min(100, int(team_row["progress_pct"])))
                st.caption(
                    f"{team_row['kg']:.1f} kg | {int(team_row['megots'])} megots | {int(team_row['actions'])} actions"
                )

    st.markdown("---")
    st.subheader("Saisons mensuelles")
    if not gami_df.empty:
        season_df = gami_df.dropna(subset=["date_dt"]).copy()
        if season_df.empty:
            st.info("Pas encore de donnees datees pour les saisons.")
        else:
            season_df["season"] = season_df["date_dt"].dt.to_period("M").astype(str)
            season_df["team_name"] = season_df.get("association", pd.Series(dtype=str)).fillna("Equipe Independant").replace("", "Equipe Independant")
            month_scores = (
                season_df.groupby(["season", "team_name"], dropna=False)
                .agg(
                    kg=("dechets_kg", lambda s: float(pd.to_numeric(s, errors="coerce").fillna(0).sum())),
                    actions=("team_name", "count"),
                )
                .reset_index()
            )
            champions = (
                month_scores.sort_values(["season", "kg", "actions"], ascending=[False, False, False])
                .groupby("season", as_index=False)
                .head(1)
            )
            st.dataframe(
                champions.rename(
                    columns={
                        "season": "Saison (mois)",
                        "team_name": "Equipe championne",
                        "kg": "kg collectes",
                        "actions": "Actions",
                    }
                ),
                width="stretch",
                hide_index=True,
            )

with tab_community:
    render_tab_header(
        icon="\U0001F91D",
        title_fr="Rassemblements Citoyens",
        title_en="Community Meetups",
        subtitle_fr="Coordonnez les sorties, partagez les annonces et engagez les b├®n├®voles autour d'actions locales.",
        subtitle_en="Coordinate outings, publish announcements, and engage volunteers around local actions.",
        chips=[i18n_text("Communaute", "Community"), i18n_text("Coordination", "Coordination")],
    )

    st.warning("­ƒÆí **Important** : Pour une organisation officielle et une visibilit├® maximale, nous vous recommandons vivement de cr├®er ├®galement votre ├®v├¿nement sur [cleanwalk.org](https://www.cleanwalk.org), la plateforme de r├®f├®rence en France.")

    # Relance automatique J-1 (une fois par jour et par evenement)
    today_iso = date.today().isoformat()
    tomorrow_iso = (date.today() + timedelta(days=1)).isoformat()
    for ev in get_events_for_date(tomorrow_iso):
        if mark_event_reminder(ev["id"], today_iso):
            add_message(
                "CleanmyMap Bot",
                f"Rappel J-1 : {ev.get('title', 'Sortie')} demain ({ev.get('event_date')}) a {ev.get('location', 'lieu a confirmer')}.",
                None,
            )

    c_evt1, c_evt2 = st.columns([1.4, 2.0], gap="large")
    with c_evt1:
        st.subheader("Calendrier des sorties")
        events = get_community_events(limit=50, include_past=False)
        if events:
            cal_df = pd.DataFrame(
                [
                    {
                        "Date": ev.get("event_date"),
                        "Titre": ev.get("title"),
                        "Lieu": ev.get("location"),
                        "Organisateur": ev.get("organizer", ""),
                    }
                    for ev in events
                ]
            )
            st.dataframe(cal_df, hide_index=True, width="stretch")
        else:
            st.info("Aucune sortie planifiee pour le moment.")

        with st.form("community_outing"):
            st.subheader("Creer une sortie")
            out_title = st.text_input("Titre de la sortie", placeholder="Ex: Grand Nettoyage du Canal Saint-Martin")
            out_date = st.date_input("Date prevue", value=date.today())
            out_loc = st.text_input("Lieu de rendez-vous", placeholder="Ex: Devant le metro Stalingrad")
            out_desc = st.text_area("Description / Materiel necessaire")
            out_submit = st.form_submit_button("Publier l'annonce")
            if out_submit:
                if not out_title.strip() or not out_loc.strip():
                    st.error("Titre et lieu sont obligatoires.")
                else:
                    add_community_event(
                        out_title.strip(),
                        str(out_date),
                        out_loc.strip(),
                        out_desc.strip(),
                        organizer=main_user_email,
                    )
                    st.success("Sortie publiee dans le calendrier.")
                    st.rerun()

    with c_evt2:
        st.subheader("RSVP participants")
        events = get_community_events(limit=20, include_past=False)
        if not events:
            st.info("Aucune sortie ouverte au RSVP.")
        for ev in events:
            summary = get_event_rsvp_summary(ev["id"])
            st.markdown(f"**{ev.get('title', 'Sortie')}** - {ev.get('event_date')} - {ev.get('location')}")
            st.caption(f"Oui: {summary['yes']} | Peut-etre: {summary['maybe']} | Non: {summary['no']}")
            rsvp_status = st.selectbox(
                "Votre reponse",
                options=["yes", "maybe", "no"],
                format_func=lambda x: "Oui" if x == "yes" else ("Peut-etre" if x == "maybe" else "Non"),
                key=f"rsvp_status_{ev['id']}",
            )
            if st.button("Enregistrer RSVP", key=f"save_rsvp_{ev['id']}"):
                upsert_event_rsvp(ev["id"], main_user_email, rsvp_status)
                st.success("RSVP enregistre.")
                st.rerun()
            st.markdown("---")

    st.subheader("Validation communautaire des missions")
    pending_actions = get_submissions_by_status('pending')
    render_mission_validation(
        pending_actions,
        vote_func=add_mission_validation,
        summary_func=get_mission_validation_summary,
    )

with tab_sandbox:
    render_tab_header(
        icon="\U0001F9EA",
        title_fr="Zone d'entra├«nement",
        title_en="Sandbox",
        subtitle_fr="Testez des sc├®narios fictifs sans impacter la base de donn├®es de production.",
        subtitle_en="Test fictional scenarios without impacting the production database.",
        chips=[i18n_text("Brouillon", "Draft"), i18n_text("Simulation", "Simulation")],
        compact=True,
    )
    st.info("Cette zone est un bac ├á sable : vous pouvez ajouter des donn├®es fictives pour tester l'outil. Elles ne sont **pas enregistr├®es** dans la base r├®elle et seront perdues si vous rafra├«chissez la page.")
    
    col_sb1, col_sb2 = st.columns([1, 2])
    
    with col_sb1:
        st.subheader("Templates de scenarios")
        sandbox_templates = {
            "Ecole": {
                "target_kg": 12.0,
                "target_megots": 450,
                "actions": [
                    {"nom": "Classe CM2", "type_lieu": "Parc urbain", "adresse": "Ecole Jules Ferry, Paris", "megots": 120, "dechets_kg": 3.0, "lat": 48.886, "lon": 2.343, "est_propre": False},
                    {"nom": "Parents volontaires", "type_lieu": "Rue passante", "adresse": "Rue de l'Ecole, Paris", "megots": 90, "dechets_kg": 2.4, "lat": 48.884, "lon": 2.347, "est_propre": False},
                    {"nom": "Referent eco", "type_lieu": "Signalement Proprete", "adresse": "Cour de recreation", "megots": 0, "dechets_kg": 0.0, "lat": 48.885, "lon": 2.345, "est_propre": True},
                ],
            },
            "Parc": {
                "target_kg": 20.0,
                "target_megots": 900,
                "actions": [
                    {"nom": "Brigade Verte Nord", "type_lieu": "Parc urbain", "adresse": "Parc Montsouris, Paris", "megots": 300, "dechets_kg": 5.5, "lat": 48.822, "lon": 2.338, "est_propre": False},
                    {"nom": "Brigade Verte Sud", "type_lieu": "Parc urbain", "adresse": "Parc Montsouris, Paris", "megots": 210, "dechets_kg": 4.2, "lat": 48.821, "lon": 2.336, "est_propre": False},
                    {"nom": "Equipe sensibilisation", "type_lieu": "Aire de jeux", "adresse": "Aire centrale", "megots": 80, "dechets_kg": 1.5, "lat": 48.823, "lon": 2.34, "est_propre": False},
                ],
            },
            "Centre-ville": {
                "target_kg": 32.0,
                "target_megots": 2200,
                "actions": [
                    {"nom": "Equipe matin", "type_lieu": "Rue passante", "adresse": "Place de la Republique, Paris", "megots": 620, "dechets_kg": 7.4, "lat": 48.867, "lon": 2.363, "est_propre": False},
                    {"nom": "Equipe midi", "type_lieu": "Rue passante", "adresse": "Boulevard du Temple, Paris", "megots": 540, "dechets_kg": 6.1, "lat": 48.866, "lon": 2.366, "est_propre": False},
                    {"nom": "Equipe soir", "type_lieu": "Abords transport", "adresse": "Station Oberkampf, Paris", "megots": 460, "dechets_kg": 5.6, "lat": 48.864, "lon": 2.37, "est_propre": False},
                ],
            },
        }
        tpl_cols = st.columns(3)
        for idx, (tpl_name, tpl_data) in enumerate(sandbox_templates.items()):
            with tpl_cols[idx]:
                if st.button(f"Charger {tpl_name}", key=f"sandbox_tpl_{tpl_name}", use_container_width=True):
                    start_idx = len(st.session_state["sandbox_actions"])
                    for offset, action_tpl in enumerate(tpl_data["actions"]):
                        draft_row = dict(action_tpl)
                        draft_row["id"] = f"draft_{start_idx + offset}"
                        st.session_state["sandbox_actions"].append(draft_row)
                    st.session_state["sb_target_kg"] = float(tpl_data["target_kg"])
                    st.session_state["sb_target_megots"] = int(tpl_data["target_megots"])
                    st.success(f"Template {tpl_name} charge.")
                    st.rerun()
        st.caption("Utilisez un template pour simuler rapidement une intervention type (ecole, parc, centre-ville).")
        st.markdown("---")

        st.subheader("Simuler une action")
        with st.form("sandbox_form"):
            sb_nom = st.text_input("Pseudo fictif", value="Testeur")
            sb_type = st.selectbox("Type de lieu", TYPE_LIEU_OPTIONS)
            sb_loc = st.text_input("Emplacement (Adresse ou GPS)", value="48.8584, 2.2945")
            sb_weight = st.number_input("Poids m├®gots (g)", min_value=0.0, value=50.0)
            sb_cond = st.selectbox("├ëtat m├®gots", ["Sec", "M├®lang├® / Impuret├®s", "Humide"])
            sb_kg = st.number_input("D├®chets (kg)", min_value=0.0, value=1.5)
            sb_propre = st.checkbox("Signaler comme zone propre")
            
            sb_submit = st.form_submit_button("Ajouter au brouillon")
            
            if sb_submit:
                lat, lon, res_addr = geocode_and_resolve(sb_loc)
                coeffs = {"Sec": 0.20, "M├®lang├® / Impuret├®s": 0.27, "Humide": 0.35}
                m_count = int(sb_weight / coeffs[sb_cond]) if sb_weight > 0 else 0
                
                new_draft = {
                    "id": f"draft_{len(st.session_state['sandbox_actions'])}",
                    "nom": sb_nom,
                    "type_lieu": sb_type,
                    "adresse": res_addr,
                    "megots": 0 if sb_propre else m_count,
                    "dechets_kg": 0.0 if sb_propre else sb_kg,
                    "lat": lat or 48.85, 
                    "lon": lon or 2.35,
                    "est_propre": sb_propre
                }
                st.session_state['sandbox_actions'].append(new_draft)
                st.success("Action ajout├®e au brouillon !")
                st.rerun()

        if st.button("­ƒùæ´©Å Vider le brouillon"):
            st.session_state['sandbox_actions'] = []
            st.rerun()

        st.markdown("---")
        st.subheader("­ƒÄ« Simulateur mission fictive")
        if "sb_target_kg" not in st.session_state:
            st.session_state["sb_target_kg"] = 20.0
        if "sb_target_megots" not in st.session_state:
            st.session_state["sb_target_megots"] = 1500
        target_kg = st.number_input("Objectif mission (kg)", min_value=1.0, step=1.0, key="sb_target_kg")
        target_megots = st.number_input("Objectif mission (m├®gots)", min_value=0, step=100, key="sb_target_megots")
        drafted_df = pd.DataFrame(st.session_state['sandbox_actions'])
        done_kg = float(drafted_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0.0
        done_megots = int(drafted_df.get('megots', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0
        completion = min(((done_kg / target_kg) + (done_megots / max(target_megots, 1))) / 2 * 100, 100)
        st.progress(int(completion))
        st.caption(f"Completion rate mission fictive: {completion:.1f}% ÔÇö {done_kg:.1f}/{target_kg:.1f} kg, {done_megots}/{target_megots} m├®gots")

    with col_sb2:
        st.subheader("Carte de test")
        # Carte simplifi├®e pour le sandbox
        m_sb = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
        
        for act in st.session_state['sandbox_actions']:
            if act['lat'] and act['lon']:
                color = "green" if act['est_propre'] else "blue"
                folium.Marker(
                    [act['lat'], act['lon']],
                    popup=f"<b>{act['type_lieu']}</b><br>M├®gots: {act['megots']}<br>Kg: {act['dechets_kg']}",
                    icon=folium.Icon(color=color, icon='info-sign')
                ).add_to(m_sb)
        
        st_folium(m_sb, width=600, height=500, key="sandbox_map")

with tab_add:
    render_tab_header(
        icon="\U0001F3AF",
        title_fr="D├®clarer une action",
        title_en="Declare an Action",
        subtitle_fr="Soumettez une r├®colte, un lieu propre ou un acteur engag├® via un formulaire structur├® et guid├®.",
        subtitle_en="Submit a cleanup, a clean area, or an engaged actor using a clear and guided form.",
        chips=[i18n_text("Formulaire", "Form"), i18n_text("Qualit├®", "Data quality")],
        compact=True,
    )
    render_ui_callout(
        icon="Ô£à",
        title_fr="D├®claration en 3 ├®tapes",
        title_en="3-step submission",
        body_fr="Renseignez d'abord le profil et le lieu, puis les quantit├®s d'impact, avant une validation finale pour s├®curiser la qualit├® des donn├®es.",
        body_en="Start with profile and location, then impact quantities, and finish with final validation to secure data quality.",
        tone="success",
    )
    st.divider()

    draft = st.session_state.get("submission_draft", {})

    def _seed_decl_value(key, value):
        if key not in st.session_state:
            st.session_state[key] = value

    _seed_decl_value("decl_action_type", draft.get("action_type", "Ajouter une recolte"))
    _seed_decl_value("decl_nom", draft.get("nom", check_pseudo if check_pseudo else ""))
    _seed_decl_value("decl_association", draft.get("association", ""))
    _seed_decl_value("decl_type_lieu", draft.get("type_lieu", TYPE_LIEU_OPTIONS[0]))
    _seed_decl_value("decl_type_acteur", draft.get("type_acteur", "Association ecologique"))
    _seed_decl_value("decl_emplacement", draft.get("emplacement_brut", lieu_prefill if lieu_prefill else ""))
    _seed_decl_value("decl_emplacement_fin", draft.get("emplacement_fin_brut", ""))
    _seed_decl_value("decl_benevoles", int(draft.get("benevoles", 1)))
    _seed_decl_value("decl_temps_min", int(draft.get("temps_min", 60)))
    _seed_decl_value("decl_m_weight", float(draft.get("m_weight", 0.0)))
    _seed_decl_value("decl_m_condition", draft.get("m_condition", "M├®lang├® / Impuret├®s"))
    _seed_decl_value("decl_dechets_kg", float(draft.get("dechets_kg", 0.0)))
    _seed_decl_value("decl_commentaire", draft.get("commentaire", ""))
    _seed_decl_value("decl_newsletter", bool(draft.get("subscribe_newsletter", True)))
    _seed_decl_value("decl_news_email", draft.get("user_email", ""))
    _seed_decl_value("decl_step", "1. Profil & lieu")
    _seed_decl_value("decl_action_date", date.today())

    st.caption("Brouillon auto actif : vos champs sont sauvegard├®s en continu.")
    progress_step = st.radio(
        "Progression",
        ["1. Profil & lieu", "2. Donnees d'impact", "3. Validation"],
        horizontal=False,
        key="decl_step",
        format_func=lambda s: {
            "1. Profil & lieu": "1. Profil & lieu",
            "2. Donnees d'impact": "2. Donn├®es d'impact",
            "3. Validation": "3. Validation",
        }.get(s, s),
    )
    step_status = {
        "1. Profil & lieu": "­ƒƒó" if progress_step == "1. Profil & lieu" else "ÔÜ¬",
        "2. Donnees d'impact": "­ƒƒó" if progress_step == "2. Donnees d'impact" else "ÔÜ¬",
        "3. Validation": "­ƒƒó" if progress_step == "3. Validation" else "ÔÜ¬",
    }
    step2_key = "2. Donnees d'impact"
    st.caption(f"{step_status['1. Profil & lieu']} ├ëtape 1 : identit├®, date, lieu")
    st.caption(f"{step_status[step2_key]} ├ëtape 2 : quantit├®s et contexte")
    st.caption(f"{step_status['3. Validation']} ├ëtape 3 : v├®rification finale")

    action_type = st.radio(
        "Que souhaitez-vous faire ?",
        ["Ajouter une recolte", "Declarer un lieu propre", "Declarer un acteur engage"],
        horizontal=False,
        key="decl_action_type",
        format_func=lambda s: {
            "Ajouter une recolte": "Ajouter une r├®colte",
            "Declarer un lieu propre": "D├®clarer un lieu propre",
            "Declarer un acteur engage": "D├®clarer un acteur engag├®",
        }.get(s, s),
    )
    zone_propre = (action_type == "Declarer un lieu propre")
    acteur_engage = (action_type == "Declarer un acteur engage")

    if progress_step == "1. Profil & lieu":
        st.text_input("Votre prenom / pseudo", key="decl_nom", placeholder="Ex: Sarah")
        if not zone_propre:
            st.text_input("Association*", key="decl_association", placeholder="Ex: Clean Walk Paris 10")
        st.date_input("Date de l'action*", key="decl_action_date", max_value=date.today())
        st.text_input(
            "Emplacement (Adresse ou GPS)*",
            key="decl_emplacement",
            placeholder="Ex: 48.8584, 2.2945 ou Tour Eiffel, Paris",
        )
        st.text_input(
            "Adresse de fin d'action (optionnel)",
            key="decl_emplacement_fin",
            placeholder="Ex: Place de la R├®publique, Paris",
        )
        st.caption("Si renseign├®e, la carte reliera automatiquement le point de d├®part et le point d'arriv├®e.")

        if acteur_engage:
            st.selectbox(
                "Type d'acteur*",
                ["Association ecologique", "Association humanitaire et sociale", "Commercant engage"],
                key="decl_type_acteur",
                format_func=lambda s: {
                    "Association ecologique": "Association ├®cologique",
                    "Association humanitaire et sociale": "Association humanitaire et sociale",
                    "Commercant engage": "Commer├ºant engag├®",
                }.get(s, s),
            )
        elif zone_propre:
            st.info("Mode lieu propre : les m├®triques de d├®chets seront renseign├®es ├á z├®ro.")
        else:
            st.selectbox("Type de lieu*", TYPE_LIEU_OPTIONS, key="decl_type_lieu")

    elif progress_step == "2. Donnees d'impact":
        if acteur_engage:
            st.text_area("Actions & Engagement (optionnel)", key="decl_commentaire", placeholder="D├®crivez pourquoi cet acteur est engag├®.")
        elif zone_propre:
            st.text_area("Commentaire (optionnel)", key="decl_commentaire", placeholder="Pr├®cisions sur le lieu propre.")
        else:
            st.number_input("Nombre de b├®n├®voles*", min_value=1, step=1, key="decl_benevoles")
            st.number_input("Dur├®e (minutes)*", min_value=1, step=5, key="decl_temps_min")
            st.number_input("Poids total m├®gots (grammes)", min_value=0.0, step=10.0, key="decl_m_weight")
            st.selectbox("├ëtat des m├®gots", ["Sec", "M├®lang├® / Impuret├®s", "Humide"], key="decl_m_condition")
            coeffs = {"Sec": 0.20, "M├®lang├® / Impuret├®s": 0.27, "Humide": 0.35}
            megots_preview = int(float(st.session_state.get("decl_m_weight", 0.0)) / coeffs[st.session_state.get("decl_m_condition", "M├®lang├® / Impuret├®s")]) if float(st.session_state.get("decl_m_weight", 0.0)) > 0 else 0
            if megots_preview > 0:
                st.info(f"Estimation : ~{megots_preview} m├®gots")
            st.number_input("D├®chets (total kg)", min_value=0.0, step=0.5, key="decl_dechets_kg")
            hints = get_weight_conversion_hints(float(st.session_state.get("decl_dechets_kg", 0.0)))
            st.caption(f"Ôëê {hints['sacs_30l']} sacs 30L ÔÇó Ôëê {hints['bouteilles_1_5l']} bouteilles 1.5L")
            st.text_area("Commentaire (optionnel)", key="decl_commentaire")

    else:
        st.subheader("Validation finale")
        st.checkbox("Recevoir la gazette des brigades", key="decl_newsletter")
        if st.session_state.get("decl_newsletter", True):
            st.text_input("Votre adresse email pour la gazette*", key="decl_news_email", placeholder="ex: camille@ecologie.fr")

        recap_type_lieu = (
            "Signalement Proprete"
            if zone_propre
            else st.session_state.get("decl_type_acteur", "")
            if acteur_engage
            else st.session_state.get("decl_type_lieu", "")
        )
        st.markdown(
            f"- **Type**: {action_type}\n"
            f"- **Lieu**: {st.session_state.get('decl_emplacement', '')}\n"
            f"- **Lieu de fin**: {st.session_state.get('decl_emplacement_fin', '') or 'Non renseign├®'}\n"
            f"- **Categorie**: {recap_type_lieu}\n"
            f"- **Auteur**: {st.session_state.get('decl_nom', '') or 'Anonyme'}"
        )

        if st.button("Partager mon action", key="decl_submit_btn", use_container_width=True):
            nom = str(st.session_state.get("decl_nom", "")).strip()
            association = str(st.session_state.get("decl_association", "")).strip()
            type_lieu = st.session_state.get("decl_type_lieu", TYPE_LIEU_OPTIONS[0])
            action_date = st.session_state.get("decl_action_date", date.today())
            emplacement_brut = str(st.session_state.get("decl_emplacement", "")).strip()
            emplacement_fin_brut = str(st.session_state.get("decl_emplacement_fin", "")).strip()
            commentaire = str(st.session_state.get("decl_commentaire", "")).strip()
            benevoles = int(st.session_state.get("decl_benevoles", 1))
            temps_min = int(st.session_state.get("decl_temps_min", 1))
            dechets_kg = float(st.session_state.get("decl_dechets_kg", 0.0))
            m_weight = float(st.session_state.get("decl_m_weight", 0.0))
            m_condition = st.session_state.get("decl_m_condition", "M├®lang├® / Impuret├®s")
            coeffs = {"Sec": 0.20, "M├®lang├® / Impuret├®s": 0.27, "Humide": 0.35}
            megots = int(m_weight / coeffs[m_condition]) if m_weight > 0 else 0
            subscribe_newsletter = bool(st.session_state.get("decl_newsletter", True))
            user_email = str(st.session_state.get("decl_news_email", "")).strip()

            if acteur_engage:
                type_lieu = st.session_state.get("decl_type_acteur", "Association ecologique")
                benevoles, temps_min, megots, dechets_kg = 1, 1, 0, 0.0
            elif zone_propre:
                association = association or "Independant"
                type_lieu = "Signalement Proprete"
                benevoles, temps_min, megots, dechets_kg = 1, 1, 0, 0.0
                commentaire = commentaire or "Zone signalee propre"

            if not emplacement_brut or not type_lieu or (not association and not zone_propre):
                track_ux_issue(
                    event_type="invalid_field",
                    tab_id="declaration",
                    action_name="submit_action",
                    field_name="required_fields",
                    message="Champs obligatoires manquants",
                )
                st.error("Merci de remplir les champs obligatoires.")
            elif subscribe_newsletter and not user_email:
                track_ux_issue(
                    event_type="invalid_field",
                    tab_id="declaration",
                    action_name="submit_action",
                    field_name="newsletter_email",
                    message="Email newsletter manquant",
                )
                st.error("Merci de renseigner votre email pour la gazette.")
            else:
                quality_errors = validate_submission_inputs(
                    {
                        "benevoles": benevoles,
                        "temps_min": temps_min,
                        "megots": megots,
                        "dechets_kg": dechets_kg,
                        "emplacement_brut": emplacement_brut,
                    }
                )
                if quality_errors:
                    for err in quality_errors:
                        track_ux_issue(
                            event_type="invalid_field",
                            tab_id="declaration",
                            action_name="submit_action",
                            field_name="validation_rule",
                            message=str(err),
                        )
                        st.error(err)
                    st.stop()

                with st.spinner("Analyse de l'emplacement..."):
                    lat_depart, lon_depart, adresse_depart_resolue = geocode_and_resolve(emplacement_brut)
                    lat_arrivee, lon_arrivee, adresse_arrivee_resolue = (None, None, "")
                    if emplacement_fin_brut:
                        lat_arrivee, lon_arrivee, adresse_arrivee_resolue = geocode_and_resolve(emplacement_fin_brut)

                if lat_depart is not None and lon_depart is not None and not (-90 <= float(lat_depart) <= 90 and -180 <= float(lon_depart) <= 180):
                    track_ux_issue(
                        event_type="invalid_field",
                        tab_id="declaration",
                        action_name="submit_action",
                        field_name="geocode",
                        message="Coordonn├®es g├®ocod├®es incoh├®rentes",
                        payload=emplacement_brut,
                    )
                    st.error("Coordonnees geocodees incoherentes. Verifiez votre saisie.")
                    st.stop()
                if emplacement_fin_brut and lat_arrivee is not None and lon_arrivee is not None and not (-90 <= float(lat_arrivee) <= 90 and -180 <= float(lon_arrivee) <= 180):
                    st.error("Coordonn├®es de fin incoh├®rentes. V├®rifiez la seconde adresse.")
                    st.stop()
                if emplacement_fin_brut and (lat_arrivee is None or lon_arrivee is None):
                    st.warning("La seconde adresse n'a pas pu ├¬tre g├®olocalis├®e. L'action est enregistr├®e sur l'adresse principale.")
                    emplacement_fin_brut = ""
                    adresse_arrivee_resolue = ""

                approved_actions = get_submissions_by_status('approved')
                existing_pool = [a.get('adresse') for a in approved_actions if a.get('adresse')]
                adresse_finale = fuzzy_address_match(adresse_depart_resolue, existing_pool)

                data_to_save = {
                    "id": str(uuid.uuid4()),
                    "nom": nom,
                    "association": association,
                    "type_lieu": type_lieu,
                    "adresse": adresse_finale,
                    "adresse_depart": adresse_finale,
                    "adresse_arrivee": adresse_arrivee_resolue if emplacement_fin_brut else None,
                    "date": str(action_date),
                    "benevoles": benevoles,
                    "temps_min": temps_min,
                    "megots": megots,
                    "dechets_kg": dechets_kg,
                    "plastique_kg": 0.0,
                    "verre_kg": 0.0,
                    "metal_kg": 0.0,
                    "gps": f"{lat_depart}, {lon_depart}" if lat_depart is not None and lon_depart is not None else emplacement_brut,
                    "lat": lat_depart,
                    "lon": lon_depart,
                    "lat_depart": lat_depart,
                    "lon_depart": lon_depart,
                    "lat_arrivee": lat_arrivee if emplacement_fin_brut else None,
                    "lon_arrivee": lon_arrivee if emplacement_fin_brut else None,
                    "commentaire": commentaire,
                    "est_propre": zone_propre,
                    "submitted_at": datetime.now().isoformat(),
                }
                data_to_save["eco_points"] = 5 if zone_propre else calculate_scores(data_to_save)['eco_points']
                insert_submission(data_to_save)
                if subscribe_newsletter and user_email:
                    add_subscriber(user_email)

                st.session_state["submission_draft"] = {}
                st.session_state["submission_draft_saved_at"] = None
                for k in list(st.session_state.keys()):
                    if k.startswith("decl_"):
                        del st.session_state[k]
                st.success("Merci ! Votre action a ete enregistree et sera validee par un administrateur.")
                st.balloons()
                st.rerun()

    st.session_state["submission_draft"] = {
        "action_type": st.session_state.get("decl_action_type", "Ajouter une recolte"),
        "nom": st.session_state.get("decl_nom", ""),
        "association": st.session_state.get("decl_association", ""),
        "type_lieu": st.session_state.get("decl_type_lieu", TYPE_LIEU_OPTIONS[0]),
        "type_acteur": st.session_state.get("decl_type_acteur", "Association ecologique"),
        "action_date": str(st.session_state.get("decl_action_date", date.today())),
        "emplacement_brut": st.session_state.get("decl_emplacement", ""),
        "emplacement_fin_brut": st.session_state.get("decl_emplacement_fin", ""),
        "benevoles": st.session_state.get("decl_benevoles", 1),
        "temps_min": st.session_state.get("decl_temps_min", 60),
        "m_weight": st.session_state.get("decl_m_weight", 0.0),
        "m_condition": st.session_state.get("decl_m_condition", "M├®lang├® / Impuret├®s"),
        "dechets_kg": st.session_state.get("decl_dechets_kg", 0.0),
        "commentaire": st.session_state.get("decl_commentaire", ""),
        "subscribe_newsletter": st.session_state.get("decl_newsletter", True),
        "user_email": st.session_state.get("decl_news_email", ""),
    }
    st.session_state["submission_draft_saved_at"] = datetime.now().strftime("%H:%M:%S")
    st.caption(f"Brouillon enregistre a {st.session_state['submission_draft_saved_at']}")
             
    st.divider()
    st.subheader("­ƒÆ¼ Partagez votre exploit avec la communaut├® !")
    st.write("Maintenant que votre action est d├®clar├®e, inspirez les autres brigades en postant un petit mot ou une photo sur le mur public.")
    
    # R├®cup├®ration des messages
    messages = get_messages()
    
    # Formulaire pour nouveau message
    with st.form("wall_form", clear_on_submit=True):
        pseudo_msg = st.text_input("Votre pseudo", placeholder="Ex : camille_verte")
        contenu_msg = st.text_area("Votre message", placeholder="Merci ├á l'├®quipe pour l'action ├á Versailles !")
        col_upload, col_url = st.columns(2)
        with col_upload:
            fichier_image = st.file_uploader("Ajouter une photo (optionnel)", type=["png", "jpg", "jpeg"])
        with col_url:
            image_url_input = st.text_input("Ou coller l'URL d'une image", placeholder="https://...")
        submit_msg = st.form_submit_button("Partager sur le mur")
        
        if submit_msg:
            if not pseudo_msg.strip() or not contenu_msg.strip():
                st.error("Champs obligatoires manquants.")
            else:
                saved_image_path = save_uploaded_image(fichier_image, prefix="wall")
                final_image_url = image_url_input.strip() or saved_image_path
                add_message(pseudo_msg.strip(), contenu_msg.strip(), final_image_url)
                st.success("Message publi├® !")
                st.rerun()

    st.divider()
    
    # Affichage des messages avec badges
    if not messages:
        st.info("Soyez le premier ├á poster un message !")
    else:
        # On a besoin des actions pour calculer les badges
        db_approved = get_submissions_by_status('approved')
        all_actions_df = pd.DataFrame(all_imported_actions + db_approved)
        
        for m in reversed(messages):  # Plus r├®cent en haut
            pseudo = m.get('author', m.get('pseudo', 'Anonyme'))
            timestamp = m.get('created_at', m.get('timestamp', ''))
            badge = get_user_badge(pseudo, all_actions_df)
            st.markdown(f"**{pseudo}** {badge} ÔÇó *{timestamp}*")
            st.info(m.get('content', ''))
            img_url = m.get('image_url')
            if img_url:
                try:
                    st.image(img_url, width="stretch")
                except Exception:
                    st.warning("Impossible d'afficher l'image associ├®e ├á ce message.")
            st.markdown("---")

with tab_report:
    render_tab_header(
        icon="\U0001F4C4",
        title_fr="Rapport d'impact",
        title_en="Impact Report",
        subtitle_fr="G├®n├®rez un rapport PDF exploitable pour le pilotage, la communication et les partenaires.",
        subtitle_en="Generate a PDF report for operations, communication, and partners.",
        chips=[i18n_text("PDF", "PDF"), i18n_text("RSE", "ESG")],
    )
    
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if not public_df.empty:
        report_df = public_df.copy()
        report_df["date_dt"] = pd.to_datetime(report_df.get("date"), errors="coerce")
        if report_df["date_dt"].isna().all() and "submitted_at" in report_df.columns:
            report_df["date_dt"] = pd.to_datetime(report_df.get("submitted_at"), errors="coerce")

        c_rep1, c_rep2 = st.columns([2, 1])
        with c_rep2:
            st.markdown('<div class="premium-card">', unsafe_allow_html=True)
            st.write("ÔÜÖ´©Å **Options du Rapport**")
            is_rse_mode = st.toggle("Format Corporate RSE", value=False, help="Ajoute des m├®triques ESG et une valorisation du m├®c├®nat pour les bilans RSE d'entreprises.")
            compare_days = st.selectbox("Comparatif de p├®riode", [30, 60, 90], format_func=lambda x: f"{x} jours")
            st.markdown('</div>', unsafe_allow_html=True)
            
            if is_rse_mode:
                st.success("­ƒÅó **Mode RSE Activ├®**\nLe rapport inclura les m├®triques d'impact social et environnemental.")
                total_h = int((public_df['temps_min'] * public_df.get('benevoles', 1)).sum() / 60)
                st.metric("Temps de m├®c├®nat accumul├®", f"{total_h} h")

            end_date = pd.Timestamp(date.today())
            current_start = end_date - pd.Timedelta(days=compare_days - 1)
            previous_start = current_start - pd.Timedelta(days=compare_days)
            previous_end = current_start - pd.Timedelta(days=1)

            current_period_df = report_df[(report_df["date_dt"] >= current_start) & (report_df["date_dt"] <= end_date)] if "date_dt" in report_df.columns else report_df
            previous_period_df = report_df[(report_df["date_dt"] >= previous_start) & (report_df["date_dt"] <= previous_end)] if "date_dt" in report_df.columns else pd.DataFrame()

            def _metric_pack(df):
                if df.empty:
                    return {"actions": 0, "kg": 0.0, "megots": 0, "benevoles": 0}
                return {
                    "actions": int(len(df)),
                    "kg": float(pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0).sum()),
                    "megots": int(pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0).sum()),
                    "benevoles": int(pd.to_numeric(df.get("benevoles", 0), errors="coerce").fillna(0).sum()),
                }

            def _collect_report_highlights(df):
                if df.empty:
                    return []
                highlights = []
                type_col = df.get("type_lieu", pd.Series(dtype=str)).fillna("").astype(str)
                clean_col = df.get("est_propre", pd.Series(dtype=bool)).map(normalize_bool_flag)
                date_col = pd.to_datetime(df.get("date"), errors="coerce")
                if date_col.isna().all() and "submitted_at" in df.columns:
                    date_col = pd.to_datetime(df.get("submitted_at"), errors="coerce")
                recent_count = int((date_col >= (pd.Timestamp(date.today()) - pd.Timedelta(days=30))).fillna(False).sum())
                partner_count = int(type_col.str.contains("Engag", case=False, na=False).sum())
                clean_count = int(clean_col.sum())
                pollution_count = int((~clean_col).sum())
                quality_flags = int(
                    (
                        (pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0) > 400)
                        | (pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0) > 80000)
                        | (pd.to_numeric(df.get("benevoles", 0), errors="coerce").fillna(0) > 300)
                        | (pd.to_numeric(df.get("temps_min", 0), errors="coerce").fillna(0) > 720)
                    ).sum()
                )

                highlights.append("Carte interactive avec pr├®r├®glages partageables : pollution, zones propres, partenaires, r├®centes, prioritaires.")
                if recent_count > 0:
                    highlights.append(f"Pr├®r├®glage actions r├®centes : {recent_count} action(s) sur les 30 derniers jours.")
                if partner_count > 0:
                    highlights.append(f"Pr├®r├®glage partenaires engag├®s : {partner_count} point(s) cartographi├®s.")
                if clean_count > 0:
                    highlights.append(f"Pr├®r├®glage zones propres : {clean_count} point(s) valoris├®s.")
                if pollution_count > 0:
                    highlights.append(f"Pr├®r├®glage pollution/priorit├® : {pollution_count} point(s) ├á surveiller.")
                if quality_flags > 0:
                    highlights.append(f"Validation admin en lot et pr├®-validation : {quality_flags} signalement(s) atypique(s) d├®tect├®(s).")
                return highlights

            current_stats = _metric_pack(current_period_df)
            previous_stats = _metric_pack(previous_period_df)
            report_highlights = _collect_report_highlights(current_period_df if not current_period_df.empty else report_df)
        
        with c_rep1:
            st.markdown("### Comparatif p├®riode pr├®c├®dente")
            cmp1, cmp2 = st.columns(2)
            cmp1.metric("Actions", current_stats["actions"], delta=current_stats["actions"] - previous_stats["actions"])
            cmp2.metric("kg collect├®s", f"{current_stats['kg']:.1f}", delta=f"{current_stats['kg'] - previous_stats['kg']:.1f}")
            cmp3, cmp4 = st.columns(2)
            cmp3.metric("M├®gots", f"{current_stats['megots']:,}", delta=f"{current_stats['megots'] - previous_stats['megots']:,}")
            cmp4.metric("B├®n├®voles", current_stats["benevoles"], delta=current_stats["benevoles"] - previous_stats["benevoles"])

            st.markdown("### Nouveaut├®s retenues dans ce rapport")
            if report_highlights:
                for hl in report_highlights[:6]:
                    st.caption(f"- {hl}")
            else:
                st.caption("- Pas de nouveaut├® data-driven ├á afficher sur la p├®riode.")

            def build_decider_onepager(curr_stats: dict, prev_stats: dict, window_days: int, source_df: pd.DataFrame, highlights: list) -> bytes:
                pdf = FPDF()
                pdf.set_auto_page_break(auto=True, margin=14)
                pdf.add_page()
                pdf.set_font("Helvetica", "B", 16)
                pdf.cell(0, 10, _txt("Clean my Map - Synthese decideur (1 page)"), ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.cell(0, 7, _txt(f"Periode analysee: {window_days} jours - edition du {date.today().isoformat()}"), ln=True)
                pdf.ln(3)

                pdf.set_font("Helvetica", "B", 12)
                pdf.cell(0, 8, _txt("Indicateurs cles"), ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 6, _txt(
                    f"- Actions: {curr_stats['actions']} (periode precedente: {prev_stats['actions']})\n"
                    f"- Dechets collectes: {curr_stats['kg']:.1f} kg (precedente: {prev_stats['kg']:.1f} kg)\n"
                    f"- Megots: {curr_stats['megots']:,} (precedente: {prev_stats['megots']:,})\n"
                    f"- Benevoles mobilises: {curr_stats['benevoles']} (precedente: {prev_stats['benevoles']})"
                ))
                pdf.ln(2)

                top_zones = (
                    source_df.groupby("adresse", dropna=False)["dechets_kg"]
                    .sum()
                    .sort_values(ascending=False)
                    .head(5)
                ) if ("adresse" in source_df.columns and "dechets_kg" in source_df.columns and not source_df.empty) else pd.Series(dtype=float)
                pdf.set_font("Helvetica", "B", 12)
                pdf.cell(0, 8, _txt("Top zones prioritaires"), ln=True)
                pdf.set_font("Helvetica", "", 10)
                if top_zones.empty:
                    pdf.multi_cell(0, 6, _txt("- Donnees insuffisantes pour prioriser des zones."))
                else:
                    for zone, kg in top_zones.items():
                        zone_label = str(zone) if str(zone).strip() else "Zone non renseignee"
                        pdf.multi_cell(0, 6, _txt(f"- {zone_label}: {float(kg):.1f} kg"))
                pdf.ln(2)

                pdf.set_font("Helvetica", "B", 12)
                pdf.cell(0, 8, _txt("Recommandations"), ln=True)
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 6, _txt(
                    "1) Renforcer les equipes sur les zones prioritaires identifiees.\n"
                    "2) Coupler operation terrain + sensibilisation locale sur les points de recidive.\n"
                    "3) Suivre les memes indicateurs tous les mois pour mesurer l'effet des actions."
                ))
                if highlights:
                    pdf.ln(2)
                    pdf.set_font("Helvetica", "B", 11)
                    pdf.cell(0, 7, _txt("Nouveaut├®s produit visibles (si pertinentes)"), ln=True)
                    pdf.set_font("Helvetica", "", 9)
                    for line in highlights[:4]:
                        pdf.multi_cell(0, 5, _txt(f"- {line}"))
                output = pdf.output(dest="S")
                return output if isinstance(output, bytes) else output.encode("latin-1", "replace")

            try:
                onepage_bytes = build_decider_onepager(current_stats, previous_stats, compare_days, current_period_df, report_highlights)
                st.download_button(
                    "Telecharger export decideur 1 page (PDF)",
                    data=onepage_bytes,
                    file_name=f"cleanmymap_decideur_1page_{compare_days}j.pdf",
                    mime="application/pdf",
                    width="stretch",
                )

                st.divider()
                # Preparation du generateur
                report_gen = PDFReport(public_df)
                report_gen.is_rse = is_rse_mode
                report_gen.map_base_url = STREAMLIT_PUBLIC_URL
                pdf_bytes = report_gen.generate(dest='S')

                label_btn = "Telecharger le Rapport RSE (PDF)" if is_rse_mode else t("download_pdf")
                st.download_button(
                    label_btn,
                    data=pdf_bytes,
                    file_name=f"cleanmymap_rapport_{'rse' if is_rse_mode else 'public'}.pdf",
                    mime="application/pdf",
                    width="stretch",
                )

                st.divider()
                st.markdown(f"### { 'Apercu des donnees' if st.session_state.lang == 'fr' else 'Data Preview' }")
                st.markdown("#### Dernieres actions marquantes")
                st.dataframe(public_df.sort_values('date', ascending=False).head(10)[["date", "type_lieu", "adresse", "dechets_kg", "megots"]], width="stretch", hide_index=True)
            except Exception as pdf_exc:
                track_ux_issue(
                    event_type="broken_action",
                    tab_id="pdf",
                    action_name="generate_report",
                    message=str(pdf_exc),
                )
                st.error("La generation du rapport a echoue. Verifiez les donnees puis reessayez.")
    else:
        st.info("Aucune donn├®e disponible pour g├®n├®rer le rapport." if st.session_state.lang == "fr" else "No data available to generate report.")

with tab_history:
    render_tab_header(
        icon="\U0001F4CB",
        title_fr="Historique des actions",
        title_en="Action History",
        subtitle_fr="Consultez toutes les actions recens├®es, leur contexte et les tendances historiques.",
        subtitle_en="Browse all recorded actions, their context, and historical trends.",
        compact=True,
    )
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if not public_df.empty:
        st.write(f"Retrouvez ici l'ensemble des {len(public_df)} actions recensees par la communaute.")
        hist_df = public_df.copy()
        hist_df["date_dt"] = pd.to_datetime(hist_df.get("date"), errors="coerce")
        if hist_df["date_dt"].isna().all() and "submitted_at" in hist_df.columns:
            hist_df["date_dt"] = pd.to_datetime(hist_df.get("submitted_at"), errors="coerce")

        min_date = hist_df["date_dt"].min().date() if hist_df["date_dt"].notna().any() else date.today() - timedelta(days=365)
        max_date = hist_df["date_dt"].max().date() if hist_df["date_dt"].notna().any() else date.today()
        default_from = max(min_date, max_date - timedelta(days=90))

        h1, h2, h3, h4 = st.columns(4, gap="small")
        with h1:
            date_range = st.date_input("Periode", value=(default_from, max_date), min_value=min_date, max_value=max_date, key="hist_date_range")
        with h2:
            zone_query = st.text_input("Zone (adresse/quartier)", placeholder="Ex: Rivoli, Canal...", key="hist_zone_query")
        with h3:
            type_options = sorted([str(x) for x in hist_df.get("type_lieu", pd.Series(dtype=str)).dropna().unique().tolist()])
            selected_types = st.multiselect("Type de lieu", options=type_options, default=[], key="hist_type_filter")
        with h4:
            benevole_query = st.text_input("Benevole / pseudo", placeholder="Ex: Sarah", key="hist_benevole_query")

        filtered_df = hist_df.copy()
        if isinstance(date_range, tuple) and len(date_range) == 2:
            d_start, d_end = date_range
            filtered_df = filtered_df[
                (filtered_df["date_dt"].isna()) |
                ((filtered_df["date_dt"].dt.date >= d_start) & (filtered_df["date_dt"].dt.date <= d_end))
            ]
        if zone_query.strip():
            filtered_df = filtered_df[
                filtered_df.get("adresse", pd.Series(dtype=str)).fillna("").str.contains(zone_query.strip(), case=False, na=False)
            ]
        if selected_types:
            filtered_df = filtered_df[
                filtered_df.get("type_lieu", pd.Series(dtype=str)).fillna("").isin(selected_types)
            ]
        if benevole_query.strip():
            filtered_df = filtered_df[
                filtered_df.get("nom", pd.Series(dtype=str)).fillna("").str.contains(benevole_query.strip(), case=False, na=False)
            ]

        st.caption(f"Resultats filtres: {len(filtered_df)} action(s)")
        show_cols = ["date", "nom", "type_lieu", "adresse", "est_propre", "benevoles", "megots", "dechets_kg"]
        safe_cols = [c for c in show_cols if c in filtered_df.columns]
        sort_col = "date_dt" if "date_dt" in filtered_df.columns else "date"
        st.dataframe(
            filtered_df[safe_cols].sort_values(sort_col, ascending=False),
            width="stretch",
            hide_index=True,
        )
        render_historical_rankings(filtered_df if not filtered_df.empty else hist_df)
    else:
        st.info("L'historique est actuellement vide.")

with tab_route:
    render_tab_header(
        icon="\U0001F3AF",
        title_fr="G├®n├®rateur d'action citoyenne IA",
        title_en="AI Mission Planner",
        subtitle_fr="Planifiez un parcours strat├®gique avec l'IA selon l'historique de pollution et vos ressources terrain.",
        subtitle_en="Plan a strategic route with AI based on pollution history and field resources.",
        chips=[i18n_text("IA", "AI"), i18n_text("Parcours", "Routing")],
    )

    route_source_df = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))
    route_source_df = route_source_df.dropna(subset=["lat", "lon"]) if not route_source_df.empty else pd.DataFrame()

    if route_source_df.empty:
        st.warning("Aucune donnee disponible pour optimiser un trajet.")
    else:
        route_source_df = calculate_trends(route_source_df.copy())
        st.markdown("### ­ƒº¡ Recommandation basee sur historique")
        hotspots = get_critical_zones(route_source_df)
        if hotspots:
            recs = []
            if isinstance(hotspots, dict):
                for addr, data in list(sorted(hotspots.items(), key=lambda x: x[1].get('count', 0), reverse=True))[:5]:
                    recs.append({"zone": addr, "occurrences": data.get("count", 0), "delai_moyen_j": data.get("delai_moyen", "n/a")})
            else:
                recs = [{"zone": str(z), "occurrences": 1, "delai_moyen_j": "n/a"} for z in hotspots[:5]]
            st.dataframe(pd.DataFrame(recs), width="stretch", hide_index=True)
        else:
            st.caption("Pas assez d'historique pour generer des recommandations de spots.")

        c_center1, c_center2 = st.columns([2, 1], gap="medium")
        with c_center1:
            center_input = st.text_input(
                "Point de depart (adresse ou GPS, optionnel)",
                value="",
                placeholder="Ex: Place de la Republique, Paris",
                key="route_center_input",
            )
        with c_center2:
            max_distance_km = st.slider("Contrainte distance max (km)", min_value=1, max_value=15, value=5, step=1, key="route_max_distance_km")

        if center_input.strip():
            center_lat, center_lon, _ = geocode_and_resolve(center_input.strip())
            if center_lat is None or center_lon is None:
                st.warning("Point de depart non resolu, utilisation du centre des donnees.")
                center_lat, center_lon = route_source_df["lat"].mean(), route_source_df["lon"].mean()
        else:
            center_lat, center_lon = route_source_df["lat"].mean(), route_source_df["lon"].mean()

        def _within_distance(row, ref_lat, ref_lon, max_km):
            try:
                from geopy.distance import geodesic
                return geodesic((float(row["lat"]), float(row["lon"])), (float(ref_lat), float(ref_lon))).km <= float(max_km)
            except Exception:
                return True

        candidate_df = route_source_df[
            route_source_df.apply(lambda r: _within_distance(r, center_lat, center_lon, max_distance_km), axis=1)
        ].copy()
        if candidate_df.empty:
            st.info("Aucun point dans le rayon choisi. Elargissez la contrainte distance.")
            candidate_df = route_source_df.copy()

        with st.form("ai_route_form"):
            c1, c2 = st.columns(2)
            with c1:
                nb_ben = st.slider("Nombre de b├®n├®voles pr├®sents", 1, 50, 5)
                temps_act = st.select_slider("Dur├®e de l'action souhait├®e", options=[30, 60, 90, 120, 180], value=60, format_func=lambda x: f"{x} min")
            with c2:
                arr_list = ["Tous les arrondissements"] + [f"Paris {i}e" for i in range(1, 21)]
                chosen_arr = st.selectbox("Zone d'intervention", arr_list)
                use_violets = st.checkbox("Prioriser les points noirs (violets)", value=True)
            
            avg_kg = float(pd.to_numeric(candidate_df.get("dechets_kg", 0), errors="coerce").fillna(0).mean()) if not candidate_df.empty else 0.0
            avg_megots = float(pd.to_numeric(candidate_df.get("megots", 0), errors="coerce").fillna(0).mean()) if not candidate_df.empty else 0.0
            efficiency_factor = max(0.7, (nb_ben / 5.0) * (temps_act / 60.0))
            distance_penalty = max(0.6, 1.0 - (max_distance_km - 3) * 0.04)
            est_actions = max(1, int(round(efficiency_factor * distance_penalty)))
            est_kg = max(0.0, avg_kg * est_actions)
            est_megots = max(0, int(avg_megots * est_actions))
            est_impact = calculate_impact(est_megots, est_kg)
            st.markdown(
                f"**Estimation avant depart**: ~{est_actions} actions | ~{est_kg:.1f} kg | ~{est_megots} megots | ~{int(est_impact.get('eau_litres', 0)):,} L eau preservee"
            )

            gen_btn = st.form_submit_button("­ƒÆÄ G├®n├®rer le parcours optimal", width="stretch")

        if gen_btn:
            with st.spinner("L'IA analyse les flux pi├®tons et les points noirs de Paris..."):
                # On utilise la fonction de map_utils (retourne paths, msg, logistics_df)
                result = generate_ai_route(candidate_df, nb_ben, temps_act, chosen_arr)
                
                if result[0]:
                    paths, msg, logistics_df = result
                    st.success(f"Ô£à Parcours strat├®gique g├®n├®r├® ! {msg}")
                    
                    # 1. Affichage du tableau de bord logistique
                    st.markdown("### ­ƒôï Tableau de Bord Logistique (10 ├ëquipes)")
                    st.dataframe(logistics_df, width="stretch", hide_index=True)
                    
                    # 2. Affichage de la carte de l'itin├®raire multi-couleurs
                    center_coords = paths[0]["coords"][0]
                    m_route = folium.Map(location=center_coords, zoom_start=15)
                    
                    # Ajout des diff├®rents segments color├®s
                    for p in paths:
                        folium.PolyLine(
                            p["coords"], 
                            color=p["color"], 
                            weight=p["weight"], 
                            opacity=0.8, 
                            tooltip=p["label"]
                        ).add_to(m_route)
                    
                    # Marqueurs D├®part/Arriv├®e
                    folium.Marker(paths[0]["coords"][0], popup="Point de rassemblement (D├®part)", icon=folium.Icon(color="green", icon="play")).add_to(m_route)
                    folium.Marker(paths[1]["coords"][-1], popup="Fin de la mission (Retour)", icon=folium.Icon(color="red", icon="stop")).add_to(m_route)
                    
                    st_folium(m_route, width=900, height=500, key="ai_strategic_map")
                    
                    st.info(f"­ƒÆí **Conseil IA** : Les ├®quipes 1 ├á 4 couvrent la mont├®e, tandis que les ├®quipes 5 ├á 8 couvrent le retour. Les ├®quipes 9 et 10 s├®curisent les abords. Restez group├®s par bin├┤mes !")
                    
                    st.success("­ƒÄ» **├ëtape Suivante** : Maintenant que vous avez votre itin├®raire strat├®gique, officialisez votre action sur [cleanwalk.org](https://www.cleanwalk.org) pour recruter encore plus de b├®n├®voles !")
                else:
                    st.error(f"D├®sol├®, l'IA n'a pas pu g├®n├®rer de parcours : {result[1]}")

with tab_recycling:
    render_tab_header(
        icon="\u267b\ufe0f",
        title_fr="Seconde vie & sensibilisation",
        title_en="Second Life & Awareness",
        subtitle_fr="Transformez les donn├®es terrain en impact concret et en culture ├®cologique utile.",
        subtitle_en="Turn field data into concrete impact and practical environmental awareness.",
        chips=[i18n_text("Impact", "Impact"), i18n_text("P├®dagogie", "Education")],
    )
    
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if public_df.empty:
        st.info("Aucune donn├®e disponible pour l'instant.")
    else:
        total_megots = public_df.get('megots', pd.Series(dtype=int)).fillna(0).sum()
        tot_dechets = public_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
        
        # Nouvelles ├®quivalences "Grand Public"
        bouteilles_evitees = int(tot_dechets * 33)
        km_voiture_eq = int(tot_dechets * 19)
        eau_preservee = total_megots * IMPACT_CONSTANTS.get('EAU_PROTEGEE_PER_MEGOT_L', 500)
        
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### ­ƒîì Impact R├®el de la Communaut├®")
        col_r1, col_r2, col_r3 = st.columns(3)
        
        with col_r1:
            st.metric(label="­ƒÆº Eau Pr├®serv├®e", value=f"{eau_preservee:,} L", help="1 seul m├®got peut polluer jusqu'├á 500 litres d'eau.")
        with col_r2:
            st.metric(label="­ƒì¥ ├ëquivalent Bouteilles", value=f"{bouteilles_evitees:,}", help="1 kg de d├®chets ├®quivaut environ au poids de 33 bouteilles plastiques de 1.5L.")
        with col_r3:
            st.metric(label="­ƒÜù CO2 ├ëvit├® (km voiture)", value=f"{km_voiture_eq:,} km", help="├ëmissions ├®vit├®es sur le cycle de vie.")
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### Points de collecte locaux par type de dechet")
        recycling_points = pd.DataFrame(
            [
                {"ville": "Paris", "type_dechet": "Megots", "point": "Mairie 10e - Borne mego", "adresse": "72 rue du Faubourg Saint-Martin", "infos": "Depot libre 8h-19h"},
                {"ville": "Paris", "type_dechet": "Plastiques", "point": "Recyparc Bercy", "adresse": "48 quai de Bercy", "infos": "Tri et plastique souple"},
                {"ville": "Paris", "type_dechet": "Verre", "point": "Borne verre Republique", "adresse": "Place de la Republique", "infos": "Acces 24/7"},
                {"ville": "Paris", "type_dechet": "Metal", "point": "Ressourcerie La Petite Rockette", "adresse": "125 rue du Chemin Vert", "infos": "Reemploi et valorisation"},
                {"ville": "Montreuil", "type_dechet": "Plastiques", "point": "Decheterie Murs-a-Peches", "adresse": "127 rue Pierre de Montreuil", "infos": "Tri municipal"},
                {"ville": "Versailles", "type_dechet": "Verre", "point": "Point Tri Chantiers", "adresse": "Rue des Chantiers", "infos": "Verre uniquement"},
            ]
        )
        rc1, rc2 = st.columns([1.2, 2.8], gap="small")
        with rc1:
            selected_type = st.selectbox(
                "Type de dechet",
                options=["Tous", "Megots", "Plastiques", "Verre", "Metal"],
                key="recycling_type_filter",
            )
            selected_city = st.text_input("Ville / zone", value="Paris", key="recycling_city_filter")
        with rc2:
            filtered_points = recycling_points.copy()
            if selected_type != "Tous":
                filtered_points = filtered_points[filtered_points["type_dechet"] == selected_type]
            if selected_city.strip():
                filtered_points = filtered_points[filtered_points["ville"].str.contains(selected_city.strip(), case=False, na=False)]
            if filtered_points.empty:
                st.info("Aucun point de collecte trouve pour ce filtre.")
            else:
                st.dataframe(filtered_points, hide_index=True, width="stretch")
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### Tutoriels courts (2 min)")
        tutorial_col1, tutorial_col2, tutorial_col3 = st.columns(3)
        with tutorial_col1:
            st.markdown("**1) Tri express sur le terrain**")
            st.caption("Separez rapidement: megots / verre / metal / plastiques pour un bilan exploitable.")
        with tutorial_col2:
            st.markdown("**2) Securiser la collecte**")
            st.caption("Gants, pinces, sacs doubles et point de regroupement avant pesage.")
        with tutorial_col3:
            st.markdown("**3) Depot au bon endroit**")
            st.caption("Deposez chaque flux dans le point adapte et conservez une photo de tracabilite.")
        st.markdown('</div>', unsafe_allow_html=True)
             
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### ­ƒºá Le Saviez-vous ?")
        
        z1, z2 = st.columns(2)
        with z1:
            st.info("**Recyclage vs D├®cyclage** : Le verre se recycle ├á l'infini, mais le plastique perd souvent en qualit├®, c'est le *downcycling*.")
        with z2:
            st.success("**Le Poids des M├®gots** : Un seul m├®got contient des milliers de substances chimiques nocives qui mettent 12 ans ├á se d├®composer.")
        st.markdown('</div>', unsafe_allow_html=True)
            
        with st.expander("ÔÜí ├ënergie Primaire vs ├ëlectricit├®"):
            st.write('''
            On confond souvent les deux ! 
            - **L'├®lectricit├®** n'est pas une source, c'est un *vecteur* (un moyen de la transporter). 
            - **L'├®nergie primaire** est ce que l'on extrait de la nature (P├®trole, Vent, Soleil, Uranium, Charbon).
            
            Recycler de l'aluminium (canettes) permet d'├®conomiser **jusqu'├á 95%** de l'├®nergie primaire n├®cessaire pour l'extraire de la mine (la bauxite), limitant ainsi la destruction d'├®cosyst├¿mes.
            ''')
            
        with st.expander("­ƒôè Qu'est-ce que l'ACV (Analyse du Cycle de Vie) ?"):
            st.write('''
            L'Analyse du Cycle de Vie est la m├®thode d'├®valuation environnementale syst├®mique :
            1. **L'Extraction** des mati├¿res premi├¿res (Le *Sac ├á Dos ├ëcologique*, c'est-├á-dire les milliers de litres d'eau et mat├®riaux invisibles d├®plac├®s).
            2. **La Fabrication** en usine.
            3. **Le Transport** et la logistique.
            4. **L'Utilisation**, parfois gourmande en ├®nergie.
            5. **La Fin de vie**, o├╣ les d├®chets deviennent de la pollution ou retournent dans la boucle mat├®rielle via le recyclage.
            ''')
            
        with st.expander("­ƒÆº Microplastiques : Invisible et Universel"):
            st.write('''
            Lorsqu'un plastique se d├®grade dans la nature, il ne disparait jamais : il se fragmente en **microplastiques** sous l'effet du soleil (UV) et des frottements.
            Ces particules int├¿grent la cha├«ne alimentaire. On estime que chaque humain ing├¿re **l'├®quivalent d'une carte de cr├®dit en plastique par semaine** (soit environ 5 grammes) via l'eau potable, le sel et l'alimentation.
            ''')

# ------------------------------------------------------------------------
# ONGLET : D├ëR├êGLEMENT CLIMATIQUE (EDUCATION)
# ------------------------------------------------------------------------
with tab_climate:
    render_tab_header(
        icon="\U0001F30D",
        title_fr="Comprendre le d├®r├¿glement climatique",
        title_en="Understanding Climate Disruption",
        subtitle_fr="Une base scientifique claire pour renforcer l'action citoyenne locale.",
        subtitle_en="A clear scientific baseline to strengthen local citizen action.",
        compact=True,
    )
    st.write("Parce qu'agir pour la plan├¿te commence par comprendre les enjeux. Voici les informations essentielles valid├®es par la science pour construire votre culture ├®cologique.")

    st.markdown("### Mini fiches pedagogiques actionnables localement")
    climate_cards = [
        {
            "title": "Canicules urbaines",
            "why": "Les ilots de chaleur augmentent les risques sante en ville.",
            "actions": ["Cartographier les zones sans ombre", "Installer des points d'eau et pauses fraicheur", "Planter/entretenir micro-vegetalisation locale"],
        },
        {
            "title": "Ruissellement & dechets",
            "why": "La pluie entraine megots/plastiques vers les egouts puis les cours d'eau.",
            "actions": ["Nettoyages avant episodes pluvieux", "Signaler zones de concentration", "Poser cendriers/corbeilles sur points noirs"],
        },
        {
            "title": "Biodiversite locale",
            "why": "Moins de dechets = moins de stress pour la faune urbaine.",
            "actions": ["Retirer filets, plastiques et dechets coupants", "Proteger zones de nidification", "Suivre mensuellement les zones sensibles"],
        },
        {
            "title": "Engagement quartier",
            "why": "La regularite des actions produit un effet durable.",
            "actions": ["Definir un rendez-vous mensuel fixe", "Mettre en place une equipe referente", "Partager les resultats avec mairie/commercants"],
        },
    ]
    ccl1, ccl2 = st.columns(2, gap="large")
    for i, card in enumerate(climate_cards):
        target_col = ccl1 if i % 2 == 0 else ccl2
        with target_col:
            with st.expander(f"{card['title']}"):
                st.caption(card["why"])
                for act in card["actions"]:
                    st.markdown(f"- {act}")
    
    st.markdown("---")
    
    col_c1, col_c2 = st.columns([1, 1])
    
    with col_c1:
        st.markdown("### ­ƒôê Les Constats du GIEC")
        st.info("Le GIEC (Groupe d'experts intergouvernemental sur l'├®volution du climat) synth├®tise les travaux de milliers de chercheurs ├á travers le monde.")
        st.write("""
        - **Origine humaine indiscutable :** Le r├®chauffement actuel (+1.1┬░C depuis l'├¿re pr├®industrielle) est caus├® sans ├®quivoque par les activit├®s humaines (combustion d'├®nergies fossiles, d├®forestation).
        - **Cons├®quences visibles :** Multiplication des ├®v├®nements extr├¬mes (canicules, inondations, s├®cheresses), mont├®e des eaux, fonte des glaces.
        - **L'urgence d'agir :** Chaque fraction de degr├® compte. Limiter le r├®chauffement ├á 1.5┬░C au lieu de 2┬░C permet d'├®viter des points de basculement irr├®versibles.
        """)
        st.image("https://www.statistiques.developpement-durable.gouv.fr/sites/default/files/2019-12/giec-ar5-wg1-spm-fig1-fr_0.png", caption="├ëvolution de la temp├®rature mondiale combin├®e des terres et des oc├®ans (Source: Synth├¿se GIEC)")
        
    with col_c2:
        st.markdown("### ­ƒÄ» L'Accord de Paris")
        st.success("Adopt├® en 2015 lors de la COP21, c'est le premier accord universel sur le climat.")
        st.write("""
        - **Objectif principal :** Maintenir l'augmentation de la temp├®rature moyenne mondiale bien en dessous de 2┬░C, et de pr├®f├®rence ├á 1.5┬░C, par rapport aux niveaux pr├®industriels.
        - **Neutralit├® carbone :** Atteindre l'├®quilibre entre les ├®missions et les absorptions de gaz ├á effet de serre d'ici la deuxi├¿me moiti├® du si├¿cle.
        - **La France :** S'est engag├®e via la Strat├®gie Nationale Bas-Carbone (SNBC) ├á r├®duire ses ├®missions d'ici 2050.
        """)
        
    st.markdown("---")
    
    st.markdown("### ­ƒîÄ Les 9 Limites Plan├®taires")
    st.write("Le climat n'est qu'une des 9 limites plan├®taires d├®finies par le Stockholm Resilience Centre. D├®passer ces limites menace la stabilit├® de l'├®cosyst├¿me terrestre dont nous d├®pendons.")
    
    col_l1, col_l2 = st.columns([2, 3])
    with col_l1:
        st.write("""
        Aujourd'hui, **6 des 9 limites sont d├®j├á franchies** au niveau mondial :
        1. ­ƒö┤ Le changement climatique
        2. ­ƒö┤ L'├®rosion de la biodiversit├®
        3. ­ƒö┤ La perturbation des cycles de l'azote et du phosphore
        4. ­ƒö┤ Le changement d'usage des sols (d├®forestation)
        5. ­ƒö┤ L'introduction d'entit├®s nouvelles (pollutions chimiques, plastiques)
        6. ­ƒö┤ L'utilisation de l'eau verte (eau douce dans les sols)
        
        *Le ramassage de d├®chets agit directement sur la limite 5 (entit├®s nouvelles / plastiques) !*
        """)
    with col_l2:
        st.image("https://www.notre-environnement.gouv.fr/IMG/png/limites_planetaires_2023_-_fr.png", caption="├ëtat des 9 limites plan├®taires en 2023 (Source: Stockholm Resilience Centre / Notre-Environnement.gouv)")
        
    st.markdown("---")
    st.info("­ƒÆí **Pour aller plus loin :** Pour approfondir ces sujets, n'h├®sitez pas ├á participer ├á une **Fresque du Climat**, un atelier ludique et collaboratif de 3h bas├® sur les rapports du GIEC, ou ├á consulter les rapports de l'ADEME.")

# ------------------------------------------------------------------------
# ONGLET : ESPACE ELUS (DASHBOARD COLLECTIVITES)
# ------------------------------------------------------------------------
with tab_elus:
    render_tab_header(
        icon="\U0001F3DB\ufe0f",
        title_fr="Espace Territoires",
        title_en="Territories Dashboard",
        subtitle_fr="Analysez l'impact local, les zones de vigilance et les leviers de d├®cision pour votre collectivit├®.",
        subtitle_en="Analyze local impact, risk areas, and decision levers for your municipality.",
        chips=[i18n_text("Collectivites", "Municipalities"), i18n_text("Pilotage", "Steering")],
        compact=True,
    )
    st.write("ce portail permet de visualiser l'impact de l'action citoyenne sur votre commune.")
    
    # Extraire une liste de Villes/Codes Postaux basique ├á partir des actions approuv├®es
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)
    all_submissions_df = pd.DataFrame(get_submissions_by_status(None))

    st.markdown("### Simulation budget / ROI (scenarios)")
    roi_presets = {
        "Prudent": {"ops_month": 2, "volunteers": 12, "kg_per_op": 18.0, "megots_per_op": 650, "budget_per_op": 320.0, "fixed_cost": 1800.0},
        "Equilibre": {"ops_month": 4, "volunteers": 18, "kg_per_op": 26.0, "megots_per_op": 1200, "budget_per_op": 450.0, "fixed_cost": 2800.0},
        "Ambitieux": {"ops_month": 6, "volunteers": 28, "kg_per_op": 34.0, "megots_per_op": 1900, "budget_per_op": 620.0, "fixed_cost": 4200.0},
    }
    selected_roi_preset = st.selectbox(
        "Scenario de pilotage",
        list(roi_presets.keys()),
        index=1,
        key="roi_preset_select",
    )
    if st.session_state.get("roi_last_preset") != selected_roi_preset:
        preset = roi_presets[selected_roi_preset]
        st.session_state["roi_ops_month"] = int(preset["ops_month"])
        st.session_state["roi_volunteers"] = int(preset["volunteers"])
        st.session_state["roi_kg_per_op"] = float(preset["kg_per_op"])
        st.session_state["roi_megots_per_op"] = int(preset["megots_per_op"])
        st.session_state["roi_budget_per_op"] = float(preset["budget_per_op"])
        st.session_state["roi_fixed_cost"] = float(preset["fixed_cost"])
        st.session_state["roi_last_preset"] = selected_roi_preset

    r1, r2, r3 = st.columns(3)
    with r1:
        roi_ops_month = st.number_input("Operations / mois", min_value=1, max_value=40, step=1, key="roi_ops_month")
        roi_kg_per_op = st.number_input("Kg collectes / operation", min_value=1.0, step=1.0, key="roi_kg_per_op")
    with r2:
        roi_volunteers = st.number_input("Benevoles moyens / operation", min_value=1, max_value=300, step=1, key="roi_volunteers")
        roi_megots_per_op = st.number_input("Megots / operation", min_value=0, step=50, key="roi_megots_per_op")
    with r3:
        roi_budget_per_op = st.number_input("Budget variable / operation (EUR)", min_value=0.0, step=50.0, key="roi_budget_per_op")
        roi_fixed_cost = st.number_input("Budget fixe annuel (coordination, com) (EUR)", min_value=0.0, step=100.0, key="roi_fixed_cost")

    annual_ops = int(roi_ops_month * 12)
    annual_budget = float(roi_fixed_cost + (annual_ops * roi_budget_per_op))
    projected_kg = float(annual_ops * roi_kg_per_op)
    projected_megots = int(annual_ops * roi_megots_per_op)
    treatment_savings = (projected_kg / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
    protected_water_l = projected_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
    protected_water_value = (protected_water_l / 1000.0) * 0.08
    projected_value = treatment_savings + protected_water_value
    roi_ratio = ((projected_value - annual_budget) / annual_budget * 100.0) if annual_budget > 0 else 0.0

    m_roi1, m_roi2, m_roi3, m_roi4 = st.columns(4)
    m_roi1.metric("Budget annuel", f"{annual_budget:,.0f} EUR")
    m_roi2.metric("Impact projete", f"{projected_kg:,.0f} kg")
    m_roi3.metric("Valeur estimee", f"{projected_value:,.0f} EUR")
    m_roi4.metric("ROI estime", f"{roi_ratio:+.1f}%")
    st.caption(
        f"Projection annuelle: {annual_ops} operations, {int(roi_volunteers) * annual_ops:,} participations benevoles, "
        f"{projected_megots:,} megots retires, {protected_water_l:,.0f} L d'eau proteges."
    )
    st.markdown("---")

    if not approved_df.empty and 'adresse' in approved_df.columns:
        render_partner_dashboard(all_submissions_df, approved_df, PDFReport)
        st.markdown("---")
        # Essayer d'extraire le dernier "mot" de l'adresse (souvent la Ville ou le Code postal) ou afficher toute l'adresse si court
        # Une m├®thode robuste pour des adresses non normalis├®es est de demander ├á l'├®lu de filtrer par "Mot Cl├®"
        villes_uniques = ["Paris", "Versailles", "Montreuil", "Lyon", "Marseille", "Toulouse"] # Liste par d├®faut si parsing complexe
        
        extracted_cities = set()
        for addr in approved_df['adresse'].dropna():
            match = re.search(r'\b\d{5}\s+([A-Z-a-z├Ç-├┐\s]+)\b', addr)
            if match:
                extracted_cities.add(match.group(1).strip())
            else:
                # Fallback : on prend le dernier segment apr├¿s une virgule s'il y en a une, sinon le dernier mot
                parts = addr.split(',')
                if len(parts) > 1: extracted_cities.add(parts[-1].strip())
        
        if extracted_cities:
            villes_uniques = sorted(list(extracted_cities))
        
        st.info("­ƒÆí Saisissez le nom de votre commune (ou un mot cl├® de votre territoire) pour isoler les statistiques.")
        
        # Laisser ├á l'├®lu l'opportunit├® de taper son arrondissement/ville
        recherche_ville = st.selectbox("S├®lectionnez votre Territoire :", options=["-- S├®lectionnez --"] + list(villes_uniques) + ["[Autre Recheche Manuelle]"])
        
        if recherche_ville == "[Autre Recheche Manuelle]":
            recherche_ville = st.text_input("Tapez le nom de la ville ou de l'arrondissement librement :")
            
        if recherche_ville and recherche_ville != "-- S├®lectionnez --":
            # Filtrer le DataFrame
            df_ville = approved_df[approved_df['adresse'].str.contains(recherche_ville, case=False, na=False)]
            
            if df_ville.empty:
                st.warning(f"Aucune action b├®n├®vole r├®pertori├®e correspondante ├á '{recherche_ville}' pour le moment.")
            else:
                nb_actions = len(df_ville)
                tot_megots = df_ville.get('megots', pd.Series(dtype=int)).fillna(0).sum()
                tot_dechets = df_ville.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
                
                economie = (tot_dechets / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
                eau_save = tot_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
                
                # R├®cup├®rer les points critiques (si des zones de r├®currence sont d├®tect├®es sur cette ville)
                points_critiques = get_critical_zones(df_ville)
                
                st.success(f"recherche : **{nb_actions} actions citoyennes** recens├®es sur {recherche_ville}")
                
                col1, col2, col3 = st.columns(3)
                col1.metric("mati├¿res collect├®es", f"{tot_dechets:.1f} kg")
                col2.metric("eau pr├®serv├®e", f"{eau_save:,} litres")
                col3.metric("├®conomie estim├®e", f"{economie:.2f} Ôé¼", help="co├╗t de traitement ├®vit├® pour la collectivit├®.")
                
                st.markdown("---")
                st.subheader(f"zones de vigilance ({len(points_critiques)} lieux)")
                if points_critiques:
                    st.info(f"ces **{len(points_critiques)} lieux** font l'objet de soins r├®guliers par nos brigades. un renforcement des infrastructures locales (cendriers, bacs) pourrait aider ├á p├®renniser cette propret├® :")
                    if isinstance(points_critiques, dict):
                        for addr, data in points_critiques.items():
                            st.write(f"- ­ƒôì **{addr}** : Signal├®e {data['count']} fois. M├®moris├® se re-pollue tous les **{data['delai_moyen']} jours**.")
                    else:
                        for z in points_critiques:
                            st.write(f"- ­ƒôì {z}")
                else:
                    st.success("aucune zone de r├®currence critique d├®tect├®e sur cette s├®lection.")

                # --- Maintenance & Backup ---
                st.markdown("---")
                st.subheader("maintenance & sauvegarde")
                col_b1, col_b2 = st.columns(2)
                with col_b1:
                    if st.button("g├®n├®rer une sauvegarde (json)"):
                        all_data = pd.DataFrame(get_submissions_by_status(None))
                        json_data = all_data.to_json(orient='records', force_ascii=False)
                        st.download_button(
                            label="t├®l├®charger la sauvegarde",
                            data=json_data,
                            file_name=f"backup_cleanmymap_{datetime.now().strftime('%Y%m%d')}.json",
                            mime="application/json"
                        )
                with col_b2:
                    st.info("­ƒÆí pensez ├á faire une sauvegarde avant toute mise ├á jour majeure du sch├®ma de base de donn├®es.")

                st.markdown("---")
                if st.button("se d├®connecter"):
                    st.logout()
                # --- NOUVEAU : Label ├ëco-Quartier ---
                st.markdown("---")
                st.subheader("label ├®co-quartier citoyen")
                eligible_villes = get_eco_districts(approved_df)
                if recherche_ville.lower() in [v.lower() for v in eligible_villes]:
                    st.success(f"­ƒÅà f├®licitations ! **{recherche_ville}** est labellis├® **├®co-quartier citoyen**.")
                    certif_eco = build_certificat_eco_quartier(recherche_ville)
                    st.download_button(
                        label=f"t├®l├®charger le dipl├┤me ├®co-quartier ({recherche_ville})",
                        data=certif_eco,
                        file_name=f"diplome_eco_quartier_{recherche_ville}.pdf",
                        mime="application/pdf"
                    )
                else:
                    st.info("ce territoire ne remplit pas encore les crit├¿res du label (180 jours sans pollution signal├®e).")

                st.markdown("---")
                certif_pdf = build_certificat_territorial(df_ville, recherche_ville, points_critiques)
                st.download_button(
                    label=f"t├®l├®charger le certificat d'impact ({recherche_ville})",
                    data=certif_pdf,
                    file_name=f"certificat_impact_{recherche_ville}.pdf",
                    mime="application/pdf"
                )
                
                # Twitter/LinkedIn sharing intents
                share_text = f"fier d'agir pour {recherche_ville} avec les brigades vertes ! d├®j├á {tot_dechets:.1f}kg de d├®chets retir├®s. rejoignez-nous sur cleanwalk ­ƒî┐"
                encoded_text = requests.utils.quote(share_text)
                st.markdown(f"""
                [partager sur linkedin](https://www.linkedin.com/sharing/share-offsite/?url=https://cleanwalk.streamlit.app&text={encoded_text}) ÔÇó 
                [partager sur twitter/x](https://twitter.com/intent/tweet?text={encoded_text})
                """, unsafe_allow_html=True)
                
                # --- NOUVEAU : LABEL ECO-QUARTIER ---
                st.markdown("---")
                st.subheader("­ƒÅå Label ├ëco-Quartier Citoyen")
                st.write("Analyse automatique de la pr├®servation de votre territoire sur les 180 derniers jours.")
                
                labels_eligibles = get_eco_quartiers(df_ville)
                if labels_eligibles:
                    st.success(f"­ƒîƒ F├®licitations ! **{len(labels_eligibles)} zone(s)** de votre commune sont ├®ligibles au Label ├ëco-Quartier (Z├®ro pollution sur 180 jours).")
                    selected_label = st.selectbox("Choisissez une zone pour g├®n├®rer son certificat :", options=labels_eligibles)
                    
                    if selected_label:
                        certif_eco = build_certificat_eco_quartier(selected_label)
                        st.download_button(
                            label=f"­ƒÑç T├®l├®charger le Label pour '{selected_label}'",
                            data=certif_eco,
                            file_name=f"Label_EcoQuartier_{selected_label.replace(' ', '_')}.pdf",
                            mime="application/pdf"
                        )
                else:
                    st.info("Aucune zone n'a encore atteint le seuil des 180 jours de propret├® continue avec signalements de contr├┤le. Encouragez vos citoyens ├á signaler les zones propres pour activer le label !")

                # --- NOUVEAU : LETTRE AU MAIRE ---
                st.markdown("---")
                st.subheader("Ô£ë´©Å G├®n├®ration de Courrier Officiel")
                st.write("G├®n├®rez un courrier officiel ├á destination de la mairie, avec les statistiques r├®elles de votre territoire et des recommandations d'infrastructure concr├¿tes.")
                
                with st.form("lettre_maire_form"):
                    col_lm1, col_lm2 = st.columns(2)
                    with col_lm1:
                        nom_maire = st.text_input("Nom du Maire / ├ëlu", placeholder="Ex: Monsieur le Maire Pierre Dupont")
                        nom_association_lettre = st.text_input("Exp├®diteur (Association)", placeholder="Ex: Association Clean Walk Paris 10")
                    with col_lm2:
                        date_lettre = st.date_input("Date du courrier", value=date.today())
                        objet_lettre = st.text_input("Objet (optionnel)", value=f"Rapport d'impact citoyen ÔÇö Action b├®n├®vole ├á {recherche_ville}")
                    gen_lettre_btn = st.form_submit_button("­ƒôä G├®n├®rer la Lettre (PDF)")
                
                if gen_lettre_btn:
                    def build_lettre_maire(nom_m, nom_asso, ville, tot_d, tot_meg, n_act, pts_crit, d_lettre, objet) -> bytes:
                        from fpdf import FPDF
                        pdf = FPDF()
                        pdf.add_page()
                        pdf.set_margins(20, 20, 20)
                        pdf.set_auto_page_break(auto=True, margin=25)
                        
                        # En-t├¬te association
                        pdf.set_font('Helvetica', 'B', 11)
                        pdf.set_text_color(5, 150, 105)  # Vert CMM
                        pdf.cell(0, 6, _txt(nom_asso), ln=True)
                        pdf.set_font('Helvetica', '', 9)
                        pdf.set_text_color(100, 116, 139)
                        pdf.cell(0, 5, _txt(f"contact@cleanmymap.fr | {STREAMLIT_PUBLIC_URL}"), ln=True)
                        pdf.ln(3)
                        pdf.set_draw_color(16, 185, 129)
                        pdf.set_line_width(0.5)
                        pdf.line(20, pdf.get_y(), 190, pdf.get_y())
                        pdf.ln(8)
                        
                        # Destinataire
                        pdf.set_font('Helvetica', '', 10); pdf.set_text_color(51, 65, 85)
                        pdf.cell(0, 6, _txt(nom_m), ln=True)
                        pdf.cell(0, 6, _txt(f"Mairie de {ville}"), ln=True)
                        pdf.ln(5)
                        
                        # Date & Objet
                        pdf.set_font('Helvetica', '', 10)
                        pdf.cell(0, 6, _txt(f"Le {d_lettre.strftime('%d %B %Y')}"), ln=True, align='R')
                        pdf.ln(4)
                        pdf.set_font('Helvetica', 'B', 10)
                        pdf.multi_cell(0, 6, _txt(f"Objet : {objet}"))
                        pdf.ln(6)
                        
                        # Corps
                        eco = (tot_d / 1000) * IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']
                        eau = int(tot_meg * IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L'])
                        
                        pdf.set_font('Helvetica', '', 10)
                        corps = (
                            f"{nom_m},\n\n"
                            f"Nous avons l'honneur de vous adresser le pr├®sent rapport d'activit├® concernant "
                            f"les actions citoyennes de d├®pollution men├®es sur le territoire de {ville}.\n\n"
                            f"Au cours de la p├®riode analys├®e, nos brigades b├®n├®voles ont r├®alis├® {n_act} interventions, "
                            f"permettant de retirer {tot_d:.1f} kg de d├®chets et {tot_meg:,} m├®gots de la voie publique."
                            f" Ces actions ont pr├®serv├® environ {eau:,} litres d'eau de la contamination toxique "
                            f"et repr├®sentent une ├®conomie estim├®e ├á {eco:,.0f} Ôé¼ pour les services de propret├® de votre commune.\n\n"
                        )
                        pdf.multi_cell(0, 6, _txt(corps))
                        
                        if pts_crit:
                            pdf.set_font('Helvetica', 'B', 10)
                            pdf.cell(0, 6, _txt("Zones de r├®currence identifi├®es (Points noirs) :"), ln=True)
                            pdf.set_font('Helvetica', '', 10)
                            if isinstance(pts_crit, dict):
                                for addr, data in list(pts_crit.items())[:5]:
                                    pdf.multi_cell(0, 5, _txt(f"- {addr} : {data['count']} passages b├®n├®voles, re-pollution tous les {data['delai_moyen']} jours en moyenne."))
                            pdf.ln(3)
                            pdf.multi_cell(0, 6, _txt(
                                "Pour limiter la r├®cidive de pollution sur ces zones, nous vous recommandons "
                                "d'envisager l'installation d'infrastructures de collecte suppl├®mentaires "
                                "(cendriers de rue, corbeilles), ainsi que des campagnes de sensibilisation cibl├®es."
                            ))
                        
                        pdf.ln(6)
                        pdf.multi_cell(0, 6, _txt(
                            "Nous restons ├á votre disposition pour tout ├®change ou partenariat visant ├á "
                            "coordonner nos actions avec les services municipaux de propret├®.\n\n"
                            "Dans l'attente d'une r├®ponse favorable, veuillez agr├®er, " + nom_m + ", "
                            "l'expression de nos salutations distingu├®es.\n\n"
                        ))
                        pdf.set_font('Helvetica', 'B', 10)
                        pdf.cell(0, 6, _txt(nom_asso), ln=True)
                        
                        out = pdf.output(dest='S')
                        return out if isinstance(out, bytes) else out.encode('latin-1', 'replace')
                    
                    lettre_bytes = build_lettre_maire(
                        nom_maire or "Monsieur/Madame le Maire",
                        nom_association_lettre or "Clean My Map",
                        recherche_ville, tot_dechets, int(tot_megots),
                        nb_actions, points_critiques,
                        date_lettre, objet_lettre
                    )
                    
                    # Aper├ºu HTML de la lettre
                    st.markdown(f"""
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; font-family: 'Georgia', serif; line-height: 1.7; color: #1e293b; margin: 16px 0;">
                        <div style="color: #059669; font-weight: bold; font-size: 14px;">{nom_association_lettre or 'Clean My Map'}</div>
                        <div style="color: #94a3b8; font-size: 11px; margin-bottom: 16px;">contact@cleanmymap.fr</div>
                        <div style="border-top: 1px solid #10b981; margin-bottom: 16px;"></div>
                        <div><strong>{nom_maire or 'Monsieur/Madame le Maire'}</strong><br>Mairie de {recherche_ville}</div>
                        <div style="text-align: right; font-size: 12px; color: #64748b;">Le {date_lettre.strftime('%d/%m/%Y')}</div>
                        <p><strong>Objet : {objet_lettre}</strong></p>
                        <p>{nom_maire or 'Monsieur/Madame le Maire'},</p>
                        <p>Nos brigades b├®n├®voles ont r├®alis├® <strong>{nb_actions} interventions</strong> sur votre territoire, retirant <strong>{tot_dechets:.1f} kg</strong> de d├®chets et <strong>{int(tot_megots):,}</strong> m├®gots ÔÇö soit une ├®conomie estim├®e ├á <strong>{(tot_dechets/1000)*IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']:,.0f} Ôé¼</strong> pour la collectivit├®.</p>
                        <p style="color: #64748b; font-style: italic;">[...] Cordialement, {nom_association_lettre or 'Clean My Map'}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.download_button(
                        "Ô¼ç´©Å T├®l├®charger la lettre officielle (PDF)",
                        data=lettre_bytes,
                        file_name=f"lettre_mairie_{recherche_ville}_{date_lettre}.pdf",
                        mime="application/pdf",
                        width="stretch"
                    )
    else:
        st.info("Aucune donn├®e publique approuv├®e disponible pour le moment afin d'alimenter cet espace.")

# ------------------------------------------------------------------------
# ONGLET : LE GUIDE DU CITOYEN VERT
# ------------------------------------------------------------------------
with tab_guide:
    render_tab_header(
        icon="\U0001F4DA",
        title_fr="Guide pratique",
        title_en="Practical Guide",
        subtitle_fr="Retrouvez les ressources utiles pour agir efficacement sur le terrain.",
        subtitle_en="Find practical resources to act effectively in the field.",
        compact=True,
    )
    st.subheader("Onboarding nouveau benevole (2 minutes)")
    g1, g2 = st.columns([2, 1])
    with g1:
        st.markdown(
            "1. **Choisir une mission**: ouvrez `Carte Interactive` et appliquez un preset de filtres.\n"
            "2. **Declarer votre action**: completez le formulaire progressif en 3 etapes.\n"
            "3. **Rester engage**: suivez `Notre Impact` et utilisez `reprendre mon action`."
        )
        done_steps = 0
        done_steps += 1 if st.checkbox("Je sais trouver une mission proche", key="guide_step_mission") else 0
        done_steps += 1 if st.checkbox("Je sais declarer une action complete", key="guide_step_declare") else 0
        done_steps += 1 if st.checkbox("Je sais suivre mon impact perso", key="guide_step_impact") else 0
        st.progress(done_steps / 3)
        st.caption(f"Progression onboarding: {done_steps}/3")
    with g2:
        st.metric("Temps estime", "2 min")
        st.info("Objectif: rendre le premier passage simple, clair et rapide.")
        if st.button("Reinitialiser l'onboarding", key="reset_onboarding_guide", use_container_width=True):
            for step_key in ["guide_step_mission", "guide_step_declare", "guide_step_impact"]:
                st.session_state[step_key] = False
            st.rerun()

    st.markdown("---")
    st.subheader("Ressources detaillees")
    show_resources()

# ------------------------------------------------------------------------
# ONGLET : ACTEURS ENGAG├ëS (ASSOCIATIONS & COMMERCES)
# ------------------------------------------------------------------------
with tab_partners:
    render_tab_header(
        icon="\U0001F91D",
        title_fr="Partenaires engag├®s",
        title_en="Engaged Partners",
        subtitle_fr="Valorisez les structures qui amplifient l'impact local des cleanwalks.",
        subtitle_en="Highlight organizations that amplify local cleanwalk impact.",
        compact=True,
    )
    partners_df = pd.DataFrame(get_submissions_by_status('approved'))
    if not partners_df.empty:
        partner_rows = partners_df[
            partners_df.get("association", pd.Series(dtype=str)).fillna("").astype(str).str.strip() != ""
        ].copy()
        if not partner_rows.empty:
            partner_rows["dechets_kg"] = pd.to_numeric(partner_rows.get("dechets_kg", 0), errors="coerce").fillna(0)
            partner_rows["megots"] = pd.to_numeric(partner_rows.get("megots", 0), errors="coerce").fillna(0)
            unique_partners = int(partner_rows["association"].astype(str).str.strip().nunique())
            partner_actions = int(len(partner_rows))
            cofinance_rate = 0.35
            total_kg_partner = float(partner_rows["dechets_kg"].sum())
            estimated_cost_avoided = (total_kg_partner / 1000.0) * IMPACT_CONSTANTS.get("COUT_TRAITEMENT_TONNE_EUR", 250)
            cofinanced_value = estimated_cost_avoided * cofinance_rate
            p1, p2, p3 = st.columns(3)
            p1.metric("Partenaires actifs", f"{unique_partners}")
            p2.metric("Actions cofinancees", f"{partner_actions}")
            p3.metric("Impact cofinance estime", f"{cofinanced_value:,.0f} EUR")
            st.caption(f"Hypothese de cofinancement moyen: {int(cofinance_rate*100)}% des couts evites.")
    show_partners()

# ------------------------------------------------------------------------
# ONGLET : M├ëT├ëO & ACTION
# ------------------------------------------------------------------------
with tab_weather:
    render_tab_header(
        icon="\U0001F324\ufe0f",
        title_fr="M├®t├®o & planification",
        title_en="Weather & Planning",
        subtitle_fr="Identifiez les meilleures fen├¬tres m├®t├®o pour planifier des op├®rations efficaces.",
        subtitle_en="Identify the best weather windows to plan effective operations.",
        chips=[i18n_text("Pr├®vision", "Forecast"), i18n_text("Timing", "Timing")],
    )

    @st.cache_data(ttl=1800)
    def get_weather_forecast(lat=48.8566, lon=2.3522):
        try:
            url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                   f"&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
                   f"&hourly=temperature_2m,precipitation,windspeed_10m"
                   f"&past_days=3&timezone=Europe%2FParis&wind_speed_unit=kmh")
            r = requests.get(url, timeout=8)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return None

    weather_data = get_weather_forecast()
    col_w1, col_w2 = st.columns([2, 1])

    with col_w1:
        if weather_data and 'daily' in weather_data:
            daily = weather_data['daily']
            df_weather = pd.DataFrame({
                'Date': pd.to_datetime(daily.get('time', [])),
                'Pluie (mm)': [p if p is not None else 0 for p in daily.get('precipitation_sum', [])],
                'Temp. max': [t if t is not None else 0 for t in daily.get('temperature_2m_max', [])],
                'Vent max (km/h)': [w if w is not None else 0 for w in daily.get('windspeed_10m_max', [])],
            })
            df_weather['Optimal'] = (df_weather['Pluie (mm)'] < 2) & (df_weather['Temp. max'] > 8) & (df_weather['Vent max (km/h)'] < 30)

            fig_w, ax_p = plt.subplots(figsize=(9, 3.5))
            ax_t = ax_p.twinx()
            colors_bar = ['#22c55e' if o else '#f87171' for o in df_weather['Optimal']]
            ax_p.bar(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Pluie (mm)'], color=colors_bar, alpha=0.7)
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Temp. max'], color='#f97316', marker='o', linewidth=2, label='Temp')
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Vent max (km/h)'], color='#2563eb', marker='s', linewidth=1.7, label='Vent')
            ax_p.set_ylabel('Pluie (mm)', fontsize=9); ax_t.set_ylabel('Temp. max (┬░C)', fontsize=9, color='#f97316')
            ax_p.axhline(2, color='#ef4444', linestyle='--', linewidth=1, alpha=0.6)
            ax_p.tick_params(axis='x', rotation=25, labelsize=8)
            plt.title("Fenetres d'action (vert = ideal)", fontsize=11, fontweight='bold', color='#1e293b')
            fig_w.tight_layout(); st.pyplot(fig_w); plt.close(fig_w)

            best = df_weather[df_weather['Optimal'] & (df_weather['Date'] >= pd.Timestamp.today())]
            if not best.empty:
                nb = best.iloc[0]
                st.success(f"Ô£à **Meilleure fenetre** : {nb['Date'].strftime('%A %d %B')} - {nb['Temp. max']:.0f}┬░C, {nb['Pluie (mm)']:.1f}mm pluie, vent {nb['Vent max (km/h)']:.0f} km/h.")
            else:
                st.warning("ÔÜá´©Å Pas de fenetre ideale dans les 7 prochains jours. Consultez a nouveau dans quelques jours.")

            st.markdown("#### Creneaux recommandes cleanwalk (prochaines 24h)")
            hourly = weather_data.get("hourly", {})
            h_df = pd.DataFrame({
                "time": pd.to_datetime(hourly.get("time", []), errors="coerce"),
                "rain": pd.to_numeric(hourly.get("precipitation", []), errors="coerce"),
                "wind": pd.to_numeric(hourly.get("windspeed_10m", []), errors="coerce"),
                "temp": pd.to_numeric(hourly.get("temperature_2m", []), errors="coerce"),
            }).dropna(subset=["time"])
            now_ts = pd.Timestamp.now(tz=None)
            next_24h = h_df[(h_df["time"] >= now_ts) & (h_df["time"] <= now_ts + pd.Timedelta(hours=24))].copy()
            if not next_24h.empty:
                slots = next_24h[(next_24h["rain"] <= 0.5) & (next_24h["wind"] <= 25) & (next_24h["temp"].between(8, 32))]
                if slots.empty:
                    st.info("Aucun creneau optimal detecte dans les 24 prochaines heures.")
                else:
                    for _, slot in slots.head(6).iterrows():
                        st.markdown(f"- {slot['time'].strftime('%d/%m %H:%M')} : pluie {slot['rain']:.1f} mm, vent {slot['wind']:.0f} km/h, {slot['temp']:.0f}┬░C")

                next_48h = h_df[(h_df["time"] >= now_ts) & (h_df["time"] <= now_ts + pd.Timedelta(hours=48))]
                heavy_rain = next_48h["rain"].max() if not next_48h.empty else 0
                strong_wind = next_48h["wind"].max() if not next_48h.empty else 0
                if heavy_rain >= 4:
                    st.warning(f"ÔÜá´©Å Alerte pluie: cumul horaire eleve detecte (max {heavy_rain:.1f} mm/h sur 48h).")
                if strong_wind >= 45:
                    st.warning(f"ÔÜá´©Å Alerte vent: rafales fortes detectees (max {strong_wind:.0f} km/h sur 48h).")
        else:
            st.info("Donn├®es m├®t├®o indisponibles (API Open-Meteo). R├®essayez dans quelques instants.")

    with col_w2:
        st.markdown('<div class="premium-card">', unsafe_allow_html=True)
        st.subheader("­ƒôå Historique mensuel")
        if not all_public_df.empty and 'date' in all_public_df.columns:
            df_hist = all_public_df.copy()
            df_hist['date_dt'] = pd.to_datetime(df_hist['date'], errors='coerce')
            monthly_count = df_hist.dropna(subset=['date_dt']).groupby(df_hist['date_dt'].dt.month).size()
            mn = {1:'Jan',2:'F├®v',3:'Mar',4:'Avr',5:'Mai',6:'Jun',7:'Jul',8:'Ao├╗',9:'Sep',10:'Oct',11:'Nov',12:'D├®c'}
            for m, cnt in monthly_count.items():
                bp = int(cnt / max(monthly_count) * 100)
                st.markdown(f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:4px;'>"
                    f"<span style='width:28px;font-size:11px;color:#64748b;'>{mn.get(m,'?')}</span>"
                    f"<div style='flex:1;background:#f1f5f9;border-radius:4px;height:14px;'>"
                    f"<div style='width:{bp}%;background:#10b981;height:14px;border-radius:4px;'></div></div>"
                    f"<span style='font-size:11px;color:#1e293b;font-weight:600;'>{cnt}</span></div>", unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

# ------------------------------------------------------------------------
# ONGLET : COMPARAISON TERRITORIALE
# ------------------------------------------------------------------------
with tab_compare:
    render_tab_header(
        icon="\U0001F3D9\ufe0f",
        title_fr="Comparaison territoriale",
        title_en="Territorial Comparison",
        subtitle_fr="Comparez les zones par performance, intensit├® et r├®currence de pollution.",
        subtitle_en="Compare zones by performance, intensity, and pollution recurrence.",
        chips=[i18n_text("Benchmark", "Benchmark"), i18n_text("Priorisation", "Prioritization")],
    )

    df_cmp = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))

    if df_cmp.empty:
        st.info("Pas encore de donn├®es disponibles.")
    else:
        df_cmp['benevoles'] = pd.to_numeric(df_cmp.get('benevoles', df_cmp.get('nb_benevoles', 1)), errors='coerce').fillna(1)
        df_cmp['megots'] = pd.to_numeric(df_cmp['megots'], errors='coerce').fillna(0)
        df_cmp['dechets_kg'] = pd.to_numeric(df_cmp['dechets_kg'], errors='coerce').fillna(0)
        df_cmp['temps_min'] = pd.to_numeric(df_cmp.get('temps_min', 60), errors='coerce').fillna(60)
        df_cmp_dirty = df_cmp[df_cmp.get('est_propre', False) == False].copy()

        territory_reference = {
            "paris": {"population": 2102650, "area_km2": 105.4},
            "lyon": {"population": 522250, "area_km2": 47.9},
            "marseille": {"population": 873076, "area_km2": 240.6},
            "toulouse": {"population": 504078, "area_km2": 118.3},
            "montreuil": {"population": 111455, "area_km2": 8.9},
            "versailles": {"population": 85000, "area_km2": 26.2},
        }

        def _extract_territory(addr: str) -> str:
            txt = str(addr).lower()
            for city in territory_reference.keys():
                if city in txt:
                    return city.title()
            if "paris" in txt:
                return "Paris"
            return "Territoire non reference"
        df_cmp_dirty["territoire"] = df_cmp_dirty.get("adresse", pd.Series(dtype=str)).apply(_extract_territory)

        c1c, c2c = st.columns(2)
        with c1c:
            group_by = st.selectbox("Grouper par", ["Type de lieu", "Adresse (Top 20)", "Territoire (ville)"], key="cmp_group")
        with c2c:
            sort_by = st.selectbox(
                "Trier par",
                ["Score IPC", "kg / action", "M├®gots / b├®n├®vole", "Nombre d'actions", "kg / 10k habitants", "M├®gots / km┬▓"],
                key="cmp_sort"
            )

        if group_by == "Type de lieu":
            group_col = 'type_lieu'
        elif group_by == "Adresse (Top 20)":
            df_cmp_dirty = df_cmp_dirty.copy()
            df_cmp_dirty['adresse_short'] = df_cmp_dirty['adresse'].apply(lambda x: str(x)[:40])
            group_col = 'adresse_short'
        else:
            group_col = 'territoire'

        if group_col not in df_cmp_dirty.columns:
            df_cmp_dirty[group_col] = 'Inconnu'

        grp = df_cmp_dirty.groupby(group_col).agg(
            nb_actions=('megots', 'count'),
            total_kg=('dechets_kg', 'sum'),
            total_megots=('megots', 'sum'),
            total_benevoles=('benevoles', 'sum'),
            total_min=('temps_min', 'sum'),
        ).reset_index()
        grp['kg_par_action'] = (grp['total_kg'] / grp['nb_actions']).round(2)
        grp['megots_par_benevole'] = (grp['total_megots'] / grp['total_benevoles'].replace(0, 1)).round(1)
        grp['score_ipc'] = (grp['total_megots'] / (grp['total_min'] / 60).replace(0, 1)).round(1)
        grp["population"] = grp[group_col].apply(lambda z: territory_reference.get(str(z).lower(), {}).get("population", None))
        grp["area_km2"] = grp[group_col].apply(lambda z: territory_reference.get(str(z).lower(), {}).get("area_km2", None))
        grp["kg_par_10k_hab"] = grp.apply(
            lambda r: round((r["total_kg"] / max(float(r["population"]), 1.0)) * 10000, 2) if pd.notna(r["population"]) else 0.0,
            axis=1
        )
        grp["megots_par_km2"] = grp.apply(
            lambda r: round(r["total_megots"] / max(float(r["area_km2"]), 0.001), 1) if pd.notna(r["area_km2"]) else 0.0,
            axis=1
        )

        sort_map = {"Score IPC": "score_ipc", "kg / action": "kg_par_action",
                    "M├®gots / b├®n├®vole": "megots_par_benevole", "Nombre d'actions": "nb_actions",
                    "kg / 10k habitants": "kg_par_10k_hab", "M├®gots / km┬▓": "megots_par_km2"}
        grp = grp.sort_values(sort_map[sort_by], ascending=False).reset_index(drop=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        for i, row in grp.head(15).iterrows():
            medal = "­ƒÑç" if i == 0 else "­ƒÑê" if i == 1 else "­ƒÑë" if i == 2 else f"#{i+1}"
            bar_pct = int(row[sort_map[sort_by]] / max(grp[sort_map[sort_by]].max(), 0.001) * 100)
            bg = "#10b981" if i == 0 else "#34d399" if i == 1 else "#6ee7b7" if i == 2 else "#d1fae5"
            border = "3px solid #10b981" if i < 3 else "1px solid #e2e8f0"
            st.markdown(f"""
            <div style="background:{'linear-gradient(135deg,#f0fdf4,#ecfdf5)' if i < 3 else '#f8fafc'};
                    border-radius:12px;padding:12px 16px;margin-bottom:8px;border-left:{border};">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div><span style="font-size:1.1rem;">{medal}</span>
                    <strong style="color:#1e293b;margin-left:8px;">{str(row[group_col])[:45]}</strong></div>
                    <div style="text-align:right;font-size:12px;color:#64748b;">
                        {int(row['nb_actions'])} actions ┬À {row['total_kg']:.1f} kg ┬À {int(row['total_megots']):,} m├®gots</div>
                </div>
                <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;">
                        <div style="width:{bar_pct}%;background:{bg};height:8px;border-radius:4px;"></div></div>
                    <span style="font-size:12px;font-weight:700;color:#059669;">{sort_by}: {row[sort_map[sort_by]]:.1f}</span>
                </div>
            </div>""", unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        st.divider()
        grp_disp = grp.rename(columns={group_col: 'Zone', 'nb_actions': 'Actions', 'total_kg': 'Total kg',
            'total_megots': 'M├®gots', 'total_benevoles': 'B├®n├®voles', 'kg_par_action': 'kg/action',
            'megots_par_benevole': 'M├®gots/b├®n.', 'score_ipc': 'Score IPC',
            'kg_par_10k_hab': 'kg/10k hab', 'megots_par_km2': 'M├®gots/km┬▓'})
        st.dataframe(grp_disp[['Zone','Actions','Total kg','M├®gots','B├®n├®voles','kg/action','M├®gots/b├®n.','kg/10k hab','M├®gots/km┬▓','Score IPC']],
                     hide_index=True, width=900)
        st.download_button("Ô¼ç´©Å Exporter (CSV)", data=grp_disp.to_csv(index=False).encode('utf-8'),
                           file_name="comparaison_territoriale.csv", mime="text/csv")

# ------------------------------------------------------------------------
# ONGLET : ADMIN
# ------------------------------------------------------------------------
with tab_admin:
    render_tab_header(
        icon="\u2699\ufe0f",
        title_fr="Espace administrateur",
        title_en="Admin Workspace",
        subtitle_fr="Validez les contributions, pilotez la carte publique et exportez les donn├®es scientifiques.",
        subtitle_en="Validate submissions, manage the public map, and export scientific datasets.",
        chips=[i18n_text("Validation", "Moderation"), i18n_text("Donn├®es", "Data")],
        compact=True,
    )
    st.caption("Connexion Google obligatoire pour les administrateurs")


    st.subheader("Carte publique (actions valid├®es)")
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)

    if not approved_df.empty:
        critical_zones = get_critical_zones(approved_df)
        map_df = approved_df.dropna(subset=["lat", "lon"]).copy()
        
        if not map_df.empty:
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
            # --- Version Admin de la carte ---
            m_admin = folium.Map(location=[center_lat, center_lon], zoom_start=11, tiles=None)
            folium.TileLayer(
                'OpenStreetMap',
                name='Fond Clair (D├®faut)',
                show=True
            ).add_to(m_admin)
            folium.TileLayer(
                tiles='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                name='Fond Sombre',
                attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                show=False
            ).add_to(m_admin)
            folium.TileLayer(
                tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                name='Vue Satellite',
                attr='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                show=False
            ).add_to(m_admin)
            
            features = []
            for _, row in map_df.iterrows():
                is_critical = row.get('adresse', '') in critical_zones
                is_clean = normalize_bool_flag(row.get('est_propre', False))
                is_business = row.get('type_lieu') == "├ëtablissement Engag├® (Label)"
                
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
                    
                popup_html = f"<b>{row.get('type_lieu', 'Lieu')}</b><br>Asso: {row.get('association', 'Inconnu')}<br>M├®gots: {int(row.get('megots', 0))}<br>D├®chets: {float(row.get('dechets_kg', 0))} kg<br>Statut: {'Ô£¿ Propre' if is_clean else '­ƒùæ´©Å Nettoy├®'}"
                if is_business:
                    popup_html = f"<b>­ƒÄû´©Å {row.get('type_lieu')}</b><br>Nom: {row.get('association')}<br>{row.get('commentaire', '')}"
                
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

            timeline_admin_layer = None
            if features:
                timeline_admin_layer = TimestampedGeoJson(
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
                )
                timeline_admin_layer.add_to(m_admin)

            layer_control_admin = folium.LayerControl(position='topright', collapsed=True)
            layer_control_admin.add_to(m_admin)

            if timeline_admin_layer is not None:
                timeline_admin_toggle = MacroElement()
                timeline_admin_toggle._template = Template(
                    f"""
                    {{% macro script(this, kwargs) %}}
                    var mapRef = {{{{ this._parent.get_name() }}}};
                    var timelineRef = {timeline_admin_layer.get_name()};
                    var layerControlRef = {layer_control_admin.get_name()};
                    if (mapRef && timelineRef && layerControlRef) {{
                        mapRef.removeLayer(timelineRef);
                        layerControlRef.addOverlay(
                            timelineRef,
                            "{i18n_text('­ƒòÆ D├®filement chronologique', '­ƒòÆ Chronological playback')}"
                        );
                    }}
                    {{% endmacro %}}
                    """
                )
                m_admin.add_child(timeline_admin_toggle)
            
            # --- IA de Flux & Topographie ---
            show_flow_ai = st.checkbox("Afficher l'IA de flux (entonnoirs ├á pollution)", value=False)
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
                st.success(f"{len(sinks)} entonnoirs d├®tect├®s")

            st_folium(m_admin, width=900, height=500, returned_objects=[])
        
        st.dataframe(
            approved_df[["date", "type_lieu", "adresse", "benevoles", "megots", "dechets_kg"]],
            width="stretch",
            hide_index=True,
        )

        st.markdown("---")
        st.subheader("science citoyenne : export e-prtr")
        st.write("g├®n├®rez un jeu de donn├®es anonymis├® respectant les standards europ├®ens pour la recherche.")
        
        if st.button("pr├®parer l'export scientifique (csv)"):
            science_df = approved_df.copy()
            
            # Anonymisation
            science_df['anonymized_id'] = science_df['nom'].apply(anonymize_contributor)
            
            # Extraction ann├®e
            science_df['reporting_year'] = pd.to_datetime(science_df['date'], errors='coerce').dt.year
            
            # Mapping E-PRTR simplifi├®
            rows = []
            for _, row in science_df.iterrows():
                # On s├®pare m├®gots et d├®chets pour le format long E-PRTR
                if row.get('megots', 0) > 0:
                    rows.append({
                        'reporting_year': row['reporting_year'],
                        'latitude': row['lat'],
                        'longitude': row['lon'],
                        'pollutant_name': 'm├®gots (cigarette butts)',
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
                        'pollutant_name': 'd├®chets divers (mixed waste)',
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
                    label="t├®l├®charger le fichier e-prtr (.csv)",
                    data=csv_buffer.getvalue(),
                    file_name=f"cleanwalk_eper_export_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )
                st.success("votre jeu de donn├®es anonymis├® est pr├¬t.")
            else:
                st.warning("aucune donn├®e d'impact (m├®gots/d├®chets) ├á exporter.")
    else:
        st.info("Aucune action valid├®e pour le moment.")

    st.subheader("Espace administrateur ÔÜÖ´©Å")

    if not ADMIN_SECRET_CODE:
        # Fallback to check st.secrets if os.getenv failed
        try:
            ADMIN_SECRET_CODE = st.secrets.get("CLEANMYMAP_ADMIN_SECRET_CODE", "")
        except Exception:
            ADMIN_SECRET_CODE = ""
    
    if not ADMIN_SECRET_CODE:
        st.error("Mot de passe administrateur non configur├® (CLEANMYMAP_ADMIN_SECRET_CODE).")
        st.stop()

    if "admin_authenticated" not in st.session_state:
        st.session_state["admin_authenticated"] = False

    if not st.session_state["admin_authenticated"]:
        secret_input = st.text_input("Code secret administrateur", type="password", key="admin_pwd_input")
        if st.button("Se connecter ├á l'espace Admin", width="stretch"):
            if secret_input == ADMIN_SECRET_CODE:
                st.session_state["admin_authenticated"] = True
                st.rerun()
            else:
                st.error("Code incorrect.")
        st.stop()

    st.success("Acc├¿s administrateur valid├® Ô£à")
    if st.button("Se d├®connecter de l'espace Admin"):
        st.session_state["admin_authenticated"] = False
        st.rerun()

    # Le contenu admin doit ├¬tre en dehors du bloc 'if st.button'
    st.markdown("### Monitoring UX")
    ux_stats = get_ux_error_stats(days=30)
    ux_c1, ux_c2, ux_c3 = st.columns(3)
    ux_c1.metric("Erreurs UX (30j)", int(ux_stats.get("total_events", 0)))
    ux_c2.metric("Champs invalides", int(ux_stats.get("invalid_fields", 0)))
    ux_c3.metric("Actions cassees", int(ux_stats.get("broken_actions", 0)))

    top_fields = pd.DataFrame(ux_stats.get("top_invalid_fields", []))
    if not top_fields.empty:
        st.caption("Champs les plus souvent invalides")
        st.dataframe(top_fields.rename(columns={"field_name": "champ", "occurrences": "erreurs"}), width="stretch", hide_index=True)

    with st.expander("Journal UX recent", expanded=False):
        ux_events_df = pd.DataFrame(get_ux_events(limit=200, days=30))
        if ux_events_df.empty:
            st.info("Aucun evenement UX enregistre sur la periode.")
        else:
            cols = ["created_at", "event_type", "tab_id", "action_name", "field_name", "message"]
            show_cols = [c for c in cols if c in ux_events_df.columns]
            st.dataframe(ux_events_df[show_cols], width="stretch", hide_index=True)

    st.markdown("---")

    pending = get_submissions_by_status('pending')

    if not pending:
        st.info("Aucune demande en attente.")
    else:
        st.markdown("### Pre-validation automatique")

        actor_types = [
            "Association ecologique",
            "Association humanitaire et sociale",
            "Commercant engage",
            "Association ├®cologique",
            "Commer├ºant engag├®",
        ]

        def prevalidate_submission(entry):
            reasons = []
            score = 0

            address_ok = bool(str(entry.get("adresse", "")).strip())
            type_ok = bool(str(entry.get("type_lieu", "")).strip())
            owner_ok = bool(str(entry.get("nom", "")).strip() or str(entry.get("association", "")).strip())
            if address_ok and type_ok and owner_ok:
                score += 1
            else:
                reasons.append("champs essentiels incomplets")

            est_propre = bool(entry.get("est_propre", False))
            dechets = float(entry.get("dechets_kg") or 0.0)
            megots = int(entry.get("megots") or 0)
            if est_propre:
                if dechets <= 0 and megots <= 0:
                    score += 1
                else:
                    reasons.append("zone propre avec metriques non nulles")
            else:
                if dechets > 0 or megots > 0:
                    score += 1
                else:
                    reasons.append("aucun impact quantifie")

            lat = entry.get("lat")
            lon = entry.get("lon")
            geo_ok = False
            try:
                if lat is not None and lon is not None:
                    geo_ok = -90 <= float(lat) <= 90 and -180 <= float(lon) <= 180
            except (TypeError, ValueError):
                geo_ok = False
            if geo_ok:
                score += 1
            else:
                reasons.append("coordonnees absentes ou invalides")

            benevoles = int(entry.get("benevoles") or 0)
            duree = int(entry.get("temps_min") or 0)
            plausible = dechets <= 400 and megots <= 80000 and benevoles <= 300 and duree <= 720
            if plausible:
                score += 1
            else:
                reasons.append("valeurs atypiques (controle manuel recommande)")

            if not address_ok or not type_ok:
                decision = "Bloquante"
                priority = 3
            elif not plausible:
                decision = "A verifier (fort)"
                priority = 2
            elif score >= 3:
                decision = "Pre-validee"
                priority = 1
            else:
                decision = "A verifier"
                priority = 2

            return {"decision": decision, "priority": priority, "score": score, "reasons": reasons}

        prevalidation_rows = []
        for row in pending:
            result = prevalidate_submission(row)
            prevalidation_rows.append(
                {
                    "id": row.get("id"),
                    "date": row.get("date"),
                    "type_lieu": row.get("type_lieu"),
                    "adresse": row.get("adresse"),
                    "nom": row.get("nom"),
                    "decision": result["decision"],
                    "score": result["score"],
                    "priority": result["priority"],
                    "raisons": " | ".join(result["reasons"]) if result["reasons"] else "RAS",
                }
            )

        pre_df = pd.DataFrame(prevalidation_rows).sort_values(["priority", "date"], ascending=[True, False]).reset_index(drop=True)
        count_pre = int((pre_df["decision"] == "Pre-validee").sum())
        count_review = int((pre_df["decision"] == "A verifier").sum())
        count_strong = int(((pre_df["decision"] == "A verifier (fort)") | (pre_df["decision"] == "Bloquante")).sum())

        k1, k2, k3 = st.columns(3)
        k1.metric("Pre-validees auto", count_pre)
        k2.metric("A verifier", count_review)
        k3.metric("A verifier (fort/bloquante)", count_strong)

        st.dataframe(
            pre_df[["date", "nom", "type_lieu", "adresse", "decision", "score", "raisons"]],
            hide_index=True,
            width="stretch",
        )

        bulk_choices = st.multiselect(
            "Selection lot",
            options=["Pre-validee", "A verifier", "A verifier (fort)", "Bloquante"],
            default=["Pre-validee"],
            key="admin_bulk_filter",
            help="Filtre les demandes a traiter en lot selon la pre-validation.",
        )
        selected_ids = pre_df[pre_df["decision"].isin(bulk_choices)]["id"].dropna().tolist() if bulk_choices else []
        st.caption(f"{len(selected_ids)} demande(s) ciblee(s) pour action en lot.")
        confirm_bulk = st.checkbox("Je confirme l'action en lot sur la selection ci-dessus", key="admin_bulk_confirm")

        b1, b2 = st.columns(2)
        if b1.button("Approuver la selection", key="bulk_approve_btn", use_container_width=True, disabled=not (confirm_bulk and selected_ids)):
            approved_count = 0
            for row in pending:
                if row.get("id") in selected_ids:
                    update_submission_status(row["id"], "approved")
                    if row.get("type_lieu") in actor_types:
                        auto_enrich_actor(row["id"], row.get("association", ""), row.get("type_lieu", ""), row.get("adresse", ""))
                    approved_count += 1
            st.success(f"{approved_count} demande(s) approuvee(s) en lot.")
            st.rerun()

        if b2.button("Refuser la selection", key="bulk_reject_btn", use_container_width=True, disabled=not (confirm_bulk and selected_ids)):
            rejected_count = 0
            for row in pending:
                if row.get("id") in selected_ids:
                    update_submission_status(row["id"], "rejected")
                    rejected_count += 1
            st.warning(f"{rejected_count} demande(s) refusee(s) en lot.")
            st.rerun()

        st.markdown("---")
        for i, row in enumerate(pending):
            with st.expander(f"#{i+1} ÔÇó {row['date']} ÔÇó {row['type_lieu']} ÔÇó {row['adresse']}"):
                if check_flood_risk(row.get('lat'), row.get('lon'), row.get('adresse', ''), row.get('type_lieu', '')):
                    st.error("­ƒÜ¿ Zone humide : risque de dispersion des micro-plastiques ├®lev├®, intervention prioritaire requise")
                    
                st.write(
                    {
                        "Nom": row["nom"],
                        "Association": row["association"],
                        "Zone propre": row.get("est_propre", False),
                        "B├®n├®voles": row["benevoles"],
                        "Dur├®e (min)": row["temps_min"],
                        "M├®gots": row["megots"],
                        "D├®chets (kg)": row["dechets_kg"],
                        "Plastique (kg)": row.get("plastique_kg", 0),
                        "Verre (kg)": row.get("verre_kg", 0),
                        "M├®tal (kg)": row.get("metal_kg", 0),
                        "GPS": row["gps"],
                        "Commentaire": row["commentaire"],
                    }
                )
                row_precheck = prevalidate_submission(row)
                if row_precheck["decision"] == "Pre-validee":
                    st.success(f"Pre-validation: {row_precheck['decision']} (score {row_precheck['score']}/4)")
                elif row_precheck["decision"] == "A verifier":
                    st.warning(f"Pre-validation: {row_precheck['decision']} (score {row_precheck['score']}/4)")
                else:
                    st.error(f"Pre-validation: {row_precheck['decision']} (score {row_precheck['score']}/4)")
                if row_precheck["reasons"]:
                    st.caption("Raisons: " + " | ".join(row_precheck["reasons"]))
                a, r = st.columns(2)
                if a.button("Ô£à Approuver", key=f"approve_{row['id']}", width="stretch"):
                    update_submission_status(row['id'], 'approved')
                    
                    # D├®clencher l'enrichissement automatique si c'est un acteur engag├®
                    if row.get('type_lieu') in actor_types:
                        with st.spinner(f"Recherche d'informations pour {row['association']}..."):
                            auto_enrich_actor(row['id'], row['association'], row['type_lieu'], row['adresse'])
                    
                    st.rerun()
                if r.button("ÔØî Refuser", key=f"reject_{row['id']}", width="stretch"):
                    update_submission_status(row['id'], 'rejected')
                    st.rerun()

    st.divider()
    st.caption("Export rapide des actions valid├®es")
    db_approved = get_submissions_by_status('approved')
    if db_approved:
        approved_export_df = pd.DataFrame(db_approved)
        st.download_button(
            "Ô¼ç´©Å T├®l├®charger CSV (actions valid├®es)",
            data=approved_export_df.to_csv(index=False).encode("utf-8"),
            file_name="actions_validees.csv",
            mime="text/csv",
            width="stretch",
        )

# Nettoyage final des placeholders inactifs pour eviter les contenus fantomes.
for tab_id, placeholder in tab_placeholders.items():
    if tab_id != active:
        try:
            placeholder.empty()
        except Exception:
            pass

