import os
import re
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

from src.database import (
    init_db,
    insert_submission,
    update_submission_status,
    update_submission_data,
    get_submissions_by_status,
    get_total_approved_stats,
    add_message,
    get_messages,
    add_subscriber, get_all_subscribers, get_top_contributors,
    add_spot, get_active_spots, update_spot_status, calculate_user_points, get_leaderboard,
    add_mission_validation, get_mission_validation_summary,
    add_community_event, get_community_events, upsert_event_rsvp,
    get_event_rsvp_summary, get_events_for_date, mark_event_reminder
)
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

init_db()  # Initialisation de la BDD au dÃ©marrage

# Centralisation des Constantes d'Impact importÃ©e depuis src.config

# --- INTERNATIONALISATION (i18n) ---
TRANSLATIONS = {
    "fr": {
        "title": "Clean my Map â€¢ Protection Citoyenne",
        "tagline": "Visualisez, Agissez, ProtÃ©gez.",
        "welcome": "Agir. Cartographier. PrÃ©server.",
        "hero_subtitle": "Rejoignez le mouvement citoyen pour une planÃ¨te plus propre. Chaque action compte, chaque geste est valorisÃ©.",
        "impact_collectif": "ðŸ“Š Notre Impact Collectif",
        "kg_removed": "kg de dÃ©chets retirÃ©s",
        "megots_collected": "mÃ©gots collectÃ©s",
        "citizens_engaged": "citoyens engagÃ©s",
        "evolution_title": "ðŸ“ˆ Ã‰volution des Ramassages (CumulÃ©)",
        "progression_title": "ðŸ… Votre Progression Personnelle",
        "pseudo_placeholder": "Ex: Jean_Vert",
        "check_grade": "VÃ©rifier mon grade",
        "eco_impact_title": "ðŸ’¡ Impact Ã‰cologique RÃ©el",
        "lang_select": "ðŸŒ Langue / Language",
        "tab_declaration": "ðŸŽ¯ DÃ©clarer une Action",
        "tab_map": "ðŸ—ºï¸ Carte Interactive",
        "tab_trash_spotter": "ðŸ“¢ Trash Spotter",
        "tab_gamification": "ðŸ† Classement & Badges",
        "tab_community": "ðŸ¤ Rassemblements",
        "tab_sandbox": "ðŸ§ª Zone d'entraÃ®nement",
        "tab_pdf": "ðŸ“„ Rapport Impact",
        "tab_guide": "ðŸ“š Guide Pratique",
        "tab_actors": "ðŸ¤ Partenaires EngagÃ©s",
        "tab_history": "ðŸ“‹ Historique",
        "tab_route": "ðŸŽ¯ Planifier (IA)",
        "tab_recycling": "â™»ï¸ Seconde Vie",
        "tab_climate": "ðŸŒ Enjeux Climatiques",
        "tab_elus": "ðŸ›ï¸ Espace CollectivitÃ©s",
        "tab_kit": "ðŸ“± Kit Terrain",
        "tab_home": "ðŸ“Š Notre Impact",
        "tab_weather": "ðŸŒ¤ï¸ MÃ©tÃ©o",
        "tab_compare": "ðŸ™ï¸ Comparaison",
        "tab_admin": "âš™ï¸ Validation Admin",
        "eco_mode": "Mode basse consommation",
        "theme_mode": "ðŸŽ¨ ThÃ¨me",
        "theme_light": "Clair",
        "theme_dark": "Sombre",
        "nav_label": "ðŸ“Œ Navigation",
        "nav_action": "ðŸš€ Lancer l'action",
        "nav_stats": "ðŸ“Š RÃ©sultats & Impact",
        "nav_social": "ðŸ† CommunautÃ©",
        "nav_edu": "ðŸ“š Comprendre & Apprendre",
        "nav_admin": "âš™ï¸ Administration & Outils",
        "eau_preserved": "Eau prÃ©servÃ©e",
        "co2_avoided": "CO2 Ã©vitÃ©",
        "dechets_removed": "DÃ©chets retirÃ©s",
        "megots_collected": "MÃ©gots ramassÃ©s",
        "citizens_engaged": "Citoyens engagÃ©s",
    },
    "en": {
        "title": "Clean my Map â€¢ Citizen Protection",
        "tagline": "Visualize, Act, Protect.",
        "welcome": "Act. Map. Preserve.",
        "hero_subtitle": "Join the citizen movement for a cleaner planet. Every action counts, every gesture is valued.",
        "impact_collectif": "ðŸ“Š Our Collective Impact",
        "kg_removed": "kg of waste removed",
        "megots_collected": "cigarette butts collected",
        "citizens_engaged": "engaged citizens",
        "evolution_title": "ðŸ“ˆ Cleanup Evolution (Cumulative)",
        "progression_title": "ðŸ… Your Personal Progression",
        "pseudo_placeholder": "Ex: Green_John",
        "check_grade": "Check my grade",
        "eco_impact_title": "ðŸ’¡ Real Ecological Impact",
        "lang_select": "ðŸŒ Language",
        "tab_declaration": "ðŸŽ¯ Declare an Action",
        "tab_map": "ðŸ—ºï¸ Interactive Map",
        "tab_trash_spotter": "ðŸ“¢ Trash Spotter",
        "tab_gamification": "ðŸ† Leaderboard & Badges",
        "tab_community": "ðŸ¤ Meetups",
        "tab_sandbox": "ðŸ§ª Sandbox Zone",
        "tab_pdf": "ðŸ“„ Impact Report",
        "tab_guide": "ðŸ“š Practical Guide",
        "tab_actors": "ðŸ¤ Engaged Partners",
        "tab_history": "ðŸ“‹ History",
        "tab_route": "ðŸŽ¯ Plan (IA)",
        "tab_recycling": "â™»ï¸ Second Life",
        "tab_climate": "ðŸŒ Climate Issues",
        "tab_elus": "ðŸ›ï¸ Local Authorities",
        "tab_kit": "ðŸ“± Field Kit",
        "tab_home": "ðŸ“Š Our Impact",
        "tab_weather": "ðŸŒ¤ï¸ Weather",
        "tab_compare": "ðŸ™ï¸ Territorial Comparison",
        "tab_admin": "âš™ï¸ Admin Validation",
        "eco_mode": "Eco Mode (Data Saver)",
        "theme_mode": "ðŸŽ¨ Theme",
        "theme_light": "Light",
        "theme_dark": "Dark",
        "nav_label": "ðŸ“Œ Navigation",
        "nav_action": "ðŸš€ Start Action",
        "nav_stats": "ðŸ“Š Results & Impact",
        "nav_social": "ðŸ† Community",
        "nav_edu": "ðŸ“š Learn & Understand",
        "nav_admin": "âš™ï¸ Admin & Tools",
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
    return TRANSLATIONS[st.session_state.lang].get(key, key)

def get_user_badge(pseudo, df_impact):
    """Calcule le badge et le grade d'un utilisateur d'aprÃ¨s ses statistiques."""
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
    """Renvoie les textes de la bibliographie pour la mÃ©thodologie de l'app et du PDF."""
    if st.session_state.lang == "fr":
        return (
            "mÃ©thodologie et sources :\n\n"
            "- impact carbone du mÃ©got (0.014 kg co2e) : inclut la culture, la crÃ©ation du filtre en "
            "acÃ©tate de cellulose et la fin de vie. donnÃ©es alignÃ©es sur l'oms.\n"
            "- impact eau (500l/mÃ©got) : contamination toxique aux mÃ©taux lourds (arsenic, plomb) et "
            "Ã  la nicotine selon surfrider foundation et l'ineris.\n"
            "- equivalences plastiques (bancs: 50kg, pulls: 0.5kg) : extrapolations du poids Ã©quivalent "
            "fondÃ©es sur la base empreinte (carbone) de l'ademe.\n\n"
            "avertissement : ce rapport de synthÃ¨se a Ã©tÃ© gÃ©nÃ©rÃ© via l'assistance d'une intelligence artificielle. "
            "bien que les statistiques soient basÃ©es sur une bibliographie scientifique officielle, le "
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
            "disclaimer: this synthesis report was generated with AI assistance. "
            "while statistics are based on official scientific bibliography, the "
            "automatic document may contain approximations or processing errors."
        )


def i18n_text(fr_text: str, en_text: str) -> str:
    """Retourne le texte FR/EN selon la langue active."""
    return fr_text if st.session_state.lang == "fr" else en_text


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


st.set_page_config(
    page_title=TRANSLATIONS[st.session_state.lang]["title"],
    page_icon="ðŸ—ºï¸",
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

    header {visibility: hidden;}
    footer {visibility: hidden;}

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

    /* Masquer les ancres automatiques des titres Streamlit (liens Ã  cÃ´tÃ© des titres) */
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
        }}

        html, body, [class*="css"], .stApp {{
            font-family: 'Outfit', 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif !important;
        }}

        .stApp {{
            background:
                radial-gradient(900px 460px at 8% -8%, rgba(14, 165, 164, 0.15), transparent 70%),
                radial-gradient(760px 420px at 100% 0%, rgba(37, 99, 235, 0.14), transparent 70%),
                var(--surface-0) !important;
            color: var(--ink-1);
        }}

        .main .block-container {{
            max-width: 1380px !important;
            padding-top: 0.35rem !important;
            padding-bottom: 2.1rem !important;
        }}

        [data-testid="stHeader"] {{
            height: 0 !important;
            min-height: 0 !important;
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

        .app-shell-title, .section-title, .kpi-chip-value,
        [data-testid="stMarkdownContainer"] h1,
        [data-testid="stMarkdownContainer"] h2,
        [data-testid="stMarkdownContainer"] h3 {{
            color: var(--ink-1) !important;
        }}

        .app-shell-subtitle, .section-subtitle, .nav-shell-caption,
        .metric-label, .kpi-chip-label, .metric-unit {{
            color: var(--ink-3) !important;
        }}

        .app-shell {{
            padding: 22px 24px !important;
        }}

        .nav-shell {{
            padding: 18px 18px 20px !important;
            margin: 10px 0 12px 0 !important;
        }}

        .rubric-hero-title {{
            margin: 0;
            color: var(--ink-1) !important;
            font-size: 1.22rem;
            font-weight: 800;
            letter-spacing: -0.01em;
        }}

        .rubric-hero-subtitle {{
            margin: 4px 0 14px 0;
            color: var(--ink-3) !important;
            font-size: 0.92rem;
            font-weight: 500;
        }}

        .metric-grid {{
            margin: 14px 0 18px 0 !important;
            gap: 12px !important;
        }}

        .metric-card {{
            min-height: 100px;
            padding: 16px 18px !important;
        }}

        .metric-value {{
            color: var(--brand) !important;
            letter-spacing: -0.01em;
        }}

        .section-chip {{
            background: color-mix(in srgb, var(--brand) 14%, transparent) !important;
            border-color: color-mix(in srgb, var(--brand) 26%, transparent) !important;
            color: var(--ink-2) !important;
        }}

        .stButton > button,
        .stDownloadButton > button {{
            border-radius: 12px !important;
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

        .stButton > button[kind="secondary"] {{
            background: var(--surface-2) !important;
            border-color: var(--edge-soft) !important;
            color: var(--ink-1) !important;
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
            border-radius: 12px !important;
        }}

        div[data-baseweb="select"] > div:focus-within,
        .stTextInput > div > div > input:focus,
        .stTextArea textarea:focus,
        .stNumberInput input:focus,
        .stDateInput input:focus {{
            border-color: color-mix(in srgb, var(--accent) 66%, transparent) !important;
            box-shadow: 0 0 0 0.18rem rgba(37,99,235,.22) !important;
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
            border-radius: 18px;
            padding: 8px 12px;
            margin-bottom: 12px;
        }}

        .rubric-caption {{
            margin: 0 0 8px 0;
            color: var(--ink-3) !important;
            font-size: 0.92rem;
            font-weight: 600;
        }}

        .rubric-search-shell,
        .rubric-jump-shell {{
            border: 1px solid var(--edge-soft);
            border-radius: 14px;
            padding: 10px 12px;
            background: var(--surface-2);
        }}

        .rubric-search-shell {{
            min-height: 126px;
        }}

        .rubric-jump-shell {{
            min-height: 126px;
        }}

        .rubric-meta {{
            margin: 4px 0 0 0;
            color: var(--ink-3) !important;
            font-size: 0.82rem;
            font-weight: 500;
        }}

        .rubric-group-title {{
            margin: 16px 0 8px 0;
            color: var(--ink-1) !important;
            font-size: 0.94rem;
            font-weight: 700;
        }}

        .rubric-buttons {{
            margin-top: 4px;
        }}

        .rubric-buttons .stButton > button {{
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
            color: var(--ink-1) !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            font-weight: 700 !important;
            min-height: 64px !important;
            font-size: 0.98rem !important;
            white-space: normal !important;
            line-height: 1.15 !important;
        }}

        .rubric-buttons .stButton > button[kind="primary"] {{
            background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 86%, #ffffff 14%), var(--accent)) !important;
            color: #ffffff !important;
            border-color: transparent !important;
            box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24) !important;
        }}

        [data-testid="stNotification"],
        div[data-baseweb="notification"] {{
            border-radius: 14px !important;
            border: 1px solid var(--edge-soft) !important;
            background: var(--surface-2) !important;
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
                padding-top: 0.4rem !important;
            }}

            .metric-grid {{
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }}
        }}

        @media (max-width: 720px) {{
            .top-control-shell {{
                padding: 10px;
            }}

            .metric-grid {{
                grid-template-columns: 1fr !important;
            }}

            .rubric-search-shell,
            .rubric-jump-shell {{
                min-height: 0;
            }}

            .rubric-buttons .stButton > button {{
                min-height: 50px !important;
            }}
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )

inject_visual_polish(st.session_state.theme_mode)

st.markdown('<div class="top-control-shell">', unsafe_allow_html=True)
lang_col, theme_col, eco_col = st.columns([1.5, 1.2, 1.3], gap="medium")
with lang_col:
    st.session_state.lang = st.radio(
        t("lang_select"),
        options=["fr", "en"],
        format_func=lambda x: "FranÃ§ais" if x == "fr" else "English",
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
        help="RÃ©duit l'usage des donnÃ©es pour une navigation plus sobre.",
        key="eco_mode_checkbox",
    )
    st.session_state.eco_mode = eco_mode
st.markdown('</div>', unsafe_allow_html=True)

@st.cache_resource(ttl=86400, show_spinner=False)
def add_elevations_to_graph(G):
    """Enrichit le graphe avec des donnÃ©es d'altitude via l'API Open-Elevation."""
    try:
        nodes = list(G.nodes(data=True))
        coords = [{"latitude": data["y"], "longitude": data["x"]} for _, data in nodes]
        
        # On utilise Open-Elevation (Public API)
        # On fragmente par paquets de 100 pour Ã©viter les timeouts
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
        st.error(f"erreur lors de la rÃ©cupÃ©ration des altitudes : {e}")
        return G

def calculate_flow_sinks(G, pollution_points_df, threshold_slope=0.03):
    """
    Identifie les points bas (sinks) oÃ¹ les dÃ©chets convergent.
    Un sink est un noeud dont l'altitude est infÃ©rieure Ã  tous ses voisins 
    et qui est situÃ© en bas d'une rue Ã  forte pente (>3%).
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
                'description': 'entonnoir Ã  pollution : point bas topographique rÃ©coltant les eaux de ruissellement.'
            })
            
    return sinks

@st.cache_resource(ttl=86400, show_spinner=False)
def get_osmnx_graph(center_lat, center_lon, dist):
    return ox.graph_from_point((center_lat, center_lon), dist=dist, network_type='walk', simplify=True)


def build_interactive_folium_map(map_df: pd.DataFrame) -> folium.Map:
    """Construit la carte Folium complÃ¨te (couches, styles, popups, lÃ©gende, timeline)."""
    # Fallback sur Paris si vide
    center_lat, center_lon = 48.8566, 2.3522
    zoom_start = 12

    if not map_df.empty:
        center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
        zoom_start = 11

    m = folium.Map(location=[center_lat, center_lon], zoom_start=zoom_start, tiles=None)

    folium.TileLayer('OpenStreetMap', name='Fond Clair (DÃ©faut)').add_to(m)
    folium.TileLayer(
        tiles='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        name='Fond Sombre',
        attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    ).add_to(m)
    folium.TileLayer(
        tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        name='Vue Satellite',
        attr='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    ).add_to(m)

    official_bins = get_paris_bins()

    from folium.plugins import MarkerCluster
    group_pollution = folium.FeatureGroup(name="âš ï¸ Pollution & Actions", show=True)
    cluster_pollution = MarkerCluster(name="ðŸŸ£ Cluster Pollution (dense)", show=False, disableClusteringAtZoom=14)
    group_clean = folium.FeatureGroup(name="ðŸŒ¿ Zones Propres", show=True)
    group_business = folium.FeatureGroup(name="â­ Acteurs EngagÃ©s", show=True)
    group_spots = folium.FeatureGroup(name="ðŸ“¢ Trash Spots (Signalisations)", show=True)

    active_spots = get_active_spots()
    for s in active_spots:
        folium.Marker(
            [s['lat'], s['lon']],
            popup=f"<b>âš ï¸ {s['type_dechet']}</b><br>SignalÃ© par {s['reporter_name']}<br><i>Aidez-nous Ã  nettoyer !</i>",
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
            popup=f"<b>ðŸ—‘ï¸ Info Officielle</b><br>Type: {b.get('type')}<br>PropriÃ©taire: Ville de Paris"
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
            is_clean = row.get('est_propre', False)
            is_business = row.get('type_lieu') == "Ã‰tablissement EngagÃ© (Label)"
            gap_alert = ""
            if not is_clean and not is_business and row.get('lat') and row.get('lon'):
                if 48.8 <= row['lat'] <= 48.9 and 2.2 <= row['lon'] <= 2.4:
                    is_gap, dist = calculate_infrastructure_gap(row['lat'], row['lon'], official_bins)
                    if is_gap:
                        gap_alert = f"Besoin d'Ã©quipement : poubelle la plus proche Ã  {int(dist)}m"

            score_data = calculate_scores(row)
            color, radius, icon_type = get_marker_style(row, score_data)

            osm_type = detect_osm_type(row)
            if enable_osm_shapes and osm_type != 'point':
                geometry, final_type = fetch_osm_geometry(row['lat'], row['lon'], osm_type)
            else:
                geometry, final_type = (None, 'point')

            popup_html = create_premium_popup(row, score_data, gap_alert=gap_alert)
            place_name = format_google_maps_name(row)
            target_group = group_business if is_business else group_clean if is_clean else group_pollution

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
            elif icon_type == 'star':
                folium.Marker(
                    location=[row['lat'], row['lon']],
                    popup=folium.Popup(popup_html, max_width=300),
                    tooltip=place_name,
                    icon=folium.Icon(color='lightgray', icon_color=color, icon='star', prefix='fa')
                ).add_to(target_group)
            elif score_data['score_salete'] > 200:
                icon_char = 'ðŸš¬' if row.get('megots', 0) > 300 else 'ðŸ—‘ï¸'
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
                    tooltip=f"âš ï¸ Point Critique: {place_name}",
                    popup=f"<b>Point critique dÃ©tectÃ©</b><br>{place_name}<br><small>PrioritÃ© Ã©levÃ©e pour intervention.</small>"
                ).add_to(group_pollution)

    group_pollution.add_child(cluster_pollution)
    group_pollution.add_to(m)
    group_clean.add_to(m)
    group_business.add_to(m)

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
        div.style.fontFamily = 'Outfit, sans-serif';
        div.style.lineHeight = '1.5';
        div.style.minWidth = '200px';
        div.style.color = '#1e293b';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">
                <span style="font-size:16px;">ðŸ—ºï¸</span>
                <div style="text-align:right;">
                    <b style="color:#10b981; font-size:14px; display:block;">BILAN 2026</b>
                    <small style="color:#94a3b8;">{_current_date}</small>
                </div>
            </div>
            <b style="color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">ðŸ“‹ Ã‰TAT DES LIEUX</b><br>
            <div style="margin:5px 0 10px 0; display:grid; grid-template-columns: 1fr 1fr; gap:2px;">
                <span><span style="color:#3498db;">â—</span> Propres</span>
                <span><span style="color:#27ae60;">â—</span> NettoyÃ©s</span>
                <span><span style="color:#e67e22;">â—</span> Ã€ inspecter</span>
                <span><span style="color:#8e44ad;">â—</span> PolluÃ©s</span>
            </div>
            <div style="margin-bottom:10px;">
                <span>âš ï¸ <b>{_nb_critiques}</b> Point critique</span><br>
                <span>ðŸ“ <b>{_nb_actions}</b> Actions</span><br>
                <span>ðŸ‘¥ <b>{_nb_volunteers}</b> BÃ©nÃ©voles</span><br>
                <span>ðŸš¬ <b>{_nb_megots:,}</b> MÃ©gots</span><br>
                <span>â™»ï¸ <b>{_nb_kg:.1f} kg</b> DÃ©chets</span>
            </div>
            <b style="color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">ðŸŒ IMPACT</b><br>
            <div style="margin-top:5px; background:rgba(16,185,129,0.05); padding:8px; border-radius:12px; border:1px solid rgba(16,185,129,0.1);">
                <span>ðŸ’¨ <b>{_co2:.1f} kg</b> COâ‚‚ Ã©vitÃ©</span><br>
                <small style="color:#64748b; margin-left:18px;">ðŸš— { _km:,} km voiture</small><br>
                <span>ðŸ’§ <b>{_eau:,} L</b> Eau prÃ©servÃ©e</span><br>
                <small style="color:#64748b; margin-left:18px;">ðŸš¿ {_douches:,} douches</small>
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
        HeatMap(heat_data, name="Heatmap de SaletÃ© (Vue Thermique)", show=False, radius=25, blur=15).add_to(m)

    if features_timeline:
        TimestampedGeoJson(
            {'type': 'FeatureCollection', 'features': features_timeline},
            period='P1D',
            add_last_point=True,
            auto_play=False,
            loop=False,
            max_speed=1,
            loop_button=True,
            date_options='YYYY-MM-DD',
            time_slider_drag_update=True
        ).add_to(m)

    folium.LayerControl(position='topright', collapsed=False).add_to(m)
    return m


TYPE_LIEU_OPTIONS = [
    "Bois/Parc/Jardin/Square/Sentier",
    "NÂ° Boulevard/Avenue/Place",
    "Quai/Pont/Port",
    "Monument",
    "Quartier",
    "Ã‰tablissement EngagÃ© (Label)",
    "Non spÃ©cifiÃ©",
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
    """RÃ©cupÃ¨re les positions des corbeilles de rue de Paris via l'API Open Data."""
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
    Calcule si un point noir est Ã  plus de threshold_m d'une poubelle officielle.
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
    """Retourne l'email du compte Google connectÃ© via Streamlit auth, sinon None."""
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
    Tente de rÃ©soudre un emplacement (GPS ou texte) en (lat, lon, adresse_formatee).
    """
    if not location_input or len(location_input.strip()) < 3:
        return None, None, location_input

    # 1. Tentative de lecture directe des coordonnÃ©es (Decimal)
    lat, lon = parse_coords(location_input)
    geolocator = Nominatim(user_agent="cleanmymap_app_v2")

    if lat is not None and lon is not None:
        try:
            # RÃ©cupÃ©ration de l'adresse textuelle Ã  partir des coordonnÃ©es
            location = geolocator.reverse((lat, lon), timeout=5)
            address = location.address if location else f"{lat}, {lon}"
            return lat, lon, address
        except Exception:
            return lat, lon, f"{lat}, {lon}"

    # 2. Tentative de gÃ©ocodage textuel
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
    clean_col = clean_col.fillna(False).astype(bool)
    type_col = map_df["type_lieu"] if "type_lieu" in map_df.columns else pd.Series([""] * len(map_df), index=map_df.index)
    type_col = type_col.fillna("").astype(str)
    date_col = pd.to_datetime(map_df.get("date"), errors="coerce")
    if date_col.isna().all() and "submitted_at" in map_df.columns:
        date_col = pd.to_datetime(map_df.get("submitted_at"), errors="coerce")

    if preset_id == "pollution":
        return map_df[(~clean_col) & (type_col != "Ã‰tablissement EngagÃ© (Label)")].copy()
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
        
    keywords = ["seine", "biÃ¨vre", "quai", "berge", "canal", "fleuve", "riviere", "eau", "lac"]
    adresse_lower = str(adresse).lower()
    is_water = (type_lieu == "Quai/Pont/Port") or any(k in adresse_lower for k in keywords)
    
    if is_water:
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&past_days=3&daily=precipitation_sum&timezone=auto"
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if 'daily' in data and 'precipitation_sum' in data['daily']:
                    # Somme des prÃ©cipitations sur les jours historiques retournÃ©s
                    total_precip = sum(p for p in data['daily']['precipitation_sum'] if p is not None)
                    if total_precip > 10.0:  # > 10mm de pluie cummulÃ©e = risque de crue/ruissellement
                        return True
        except Exception:
            pass
    return False

def auto_enrich_actor(sub_id, actor_name, actor_type, location):
    """
    Simule une recherche automatique pour enrichir la fiche d'un acteur engagÃ©.
    Cette fonction est appelÃ©e lors de la validation par l'administrateur.
    """
    try:
        # Nettoyage du nom pour le fallback URL
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', actor_name.lower())
        website_fallback = f"https://www.{clean_name}.fr"
        
        # Description par dÃ©faut (sera affichÃ©e si la recherche n'est pas remplacÃ©e par un agent)
        description = f"Structure engagÃ©e opÃ©rant Ã  {location}. Reconnu pour ses actions en tant que {actor_type.lower()}."
        
        # On met Ã  jour la base de donnÃ©es avec ces informations initiales
        update_submission_data(sub_id, description, website_fallback)
        return True
    except Exception as e:
        print(f"Erreur d'enrichissement : {e}")
        return False


def fuzzy_address_match(new_address: str, existing_list: list, threshold=90):
    """
    Compare une adresse avec une liste existante. 
    Si une correspondance > threshold est trouvÃ©e, renvoie l'adresse existante.
    """
    if not new_address or not existing_list:
        return new_address
        
    clean_new = new_address.strip()
    
    # On Ã©vite les calculs si l'adresse est dÃ©jÃ  strictement identique
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
    """GÃ©nÃ¨re un identifiant opaque Ã  partir du nom pour l'anonymisation scientifique."""
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
    """Calcule le niveau et le badge d'un utilisateur basÃ© sur son historique."""
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
    
    badge_icon = "ðŸŒ±"
    level_name = "Ã‰claireur"
    level = 1
    
    if count_total >= 15:
        badge_icon, level_name, level = "ðŸ‘‘", "LÃ©gende Citoyenne", 5
    elif count_total >= 10:
        badge_icon, level_name, level = "ðŸ†", "MaÃ®tre du Terrain", 4
    elif count_78 >= 3 or count_dirty >= 5:
        badge_icon, level_name, level = "ðŸŒ³", "Gardien de la Ville", 3
    elif count_total >= 3:
        badge_icon, level_name, level = "ðŸ›¡ï¸", "Sentinelle", 2
        
    return f"{badge_icon} {level_name} (Niv. {level})"


def build_public_pdf(actions_df: pd.DataFrame, app_url: str, critical_zones: set = None) -> bytes:
    """Construit un rapport PDF complet (multi-pages) avec sÃ©paration stricte RÃ©coltes/Lieux Propres."""
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
    pdf.cell(0, 8, _txt(f"GÃ©nÃ©rÃ© le {datetime.now().strftime('%d/%m/%Y %H:%M')}"), ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 12)
    pdf.multi_cell(
        0,
        7,
        _txt(
            "Ce rapport consolide deux types de donnÃ©es citoyennes : "
            "1. Les actions de dÃ©pollution (rÃ©coltes de dÃ©chets).\n"
            "2. Les signalements de propretÃ© (zones sans pollution).\n\n"
            "Il permet d'orienter les politiques de propretÃ© urbaine en identifiant les points noirs "
            "et en valorisant les zones prÃ©servÃ©es."
        ),
    )

    # ---------- PAGE 2 : ACTIONS DE DÃ‰POLLUTION ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("1. Bilan des actions de dÃ©pollution"), ln=True)
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, _txt(f"Nombre total de rÃ©coltes validÃ©es : {recoltes_count}"), ln=True)
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _txt("Impact cumulÃ© :"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, _txt(f"- MÃ©gots collectÃ©s : {total_megots:,}".replace(",", " ")), ln=True)
    pdf.cell(0, 6, _txt(f"- DÃ©chets collectÃ©s : {total_dechets:.1f} kg"), ln=True)
    pdf.cell(0, 6, _txt(f"- BÃ©nÃ©voles mobilisÃ©s : {total_benevoles:,}".replace(",", " ")), ln=True)

    if recoltes_count and "date" in df_recoltes.columns:
        # (Graphique temporel uniquement pour les rÃ©coltes)
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
                ax.set_title("Ã‰volution des rÃ©coltes (kg)")
                ax.set_xlabel("Mois")
                ax.set_ylabel("Kg")
                ax.tick_params(axis="x", rotation=45)
                fig.tight_layout()
                img_path = os.path.join(os.path.dirname(__file__), "data", "rapport_recoltes.png")
                fig.savefig(img_path)
                plt.close(fig)
                pdf.ln(6)
                pdf.image(img_path, x=15, w=180)

    # ---------- PAGE 3 : SIGNALEMENTS DE PROPRETÃ‰ ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("2. Signalements de zones propres"), ln=True)
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        _txt(
            f"La communautÃ© a effectuÃ© {propres_count} signalements de zones propres. "
            "Ces signalements sont essentiels pour cartographier les secteurs oÃ¹ la gestion des "
            "dÃ©chets est efficace ou lÃ  oÃ¹ le civisme est exemplaire."
        ),
    )
    pdf.ln(6)
    
    if propres_count:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, _txt("DerniÃ¨res zones signalÃ©es propres :"), ln=True)
        pdf.set_font("Helvetica", "", 10)
        # Afficher les 10 derniÃ¨res adresses propres
        recent_propres = df_propres.sort_values("date", ascending=False).head(10)
        for _, r in recent_propres.iterrows():
            pdf.cell(0, 6, _txt(f"âœ¨ {r['date']} - {r['adresse']}"), ln=True)
    else:
        pdf.cell(0, 6, _txt("Aucun signalement de zone propre pour le moment."), ln=True)

    # ---------- PAGE 4 : ZONES CRITIQUES ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("4. Zones critiques Ã  surveiller"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    if critical_zones:
        pdf.multi_cell(
            0,
            6,
            _txt(
                "Les zones ci-dessous prÃ©sentent une rÃ©currence de re-pollution. "
                "Elles constituent des candidats prioritaires pour l'installation de cendriers de rue, "
                "de corbeilles supplÃ©mentaires ou des actions renforcÃ©es de sensibilisation."
            ),
        )
        pdf.ln(4)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(
                    0,
                    5,
                    _txt(
                        f"ðŸ“ {addr} : nettoyÃ© {data['count']} fois, re-pollution tous les "
                        f"{data['delai_moyen']} jours en moyenne."
                    ),
                )
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"ðŸ“ {z}"))
    else:
        pdf.multi_cell(
            0,
            6,
            _txt(
                "Aucune zone critique de re-pollution n'a encore Ã©tÃ© identifiÃ©e sur la pÃ©riode analysÃ©e. "
                "Cela peut signifier soit un territoire bien Ã©quipÃ©, soit un besoin d'augmenter le volume de donnÃ©es."
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
            "Les dÃ©chets collectÃ©s sont une ressource : une partie peut Ãªtre recyclÃ©e en nouveaux objets "
            "(bancs publics, textiles, matiÃ¨res premiÃ¨res secondaires). Cette section rapproche les volumes "
            "ramassÃ©s d'Ã©quivalents concrets."
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
                f"- Plastique estimÃ© : {tot_plastique:.1f} kg (â‰ˆ {bancs} bancs publics ou {pulls} pulls polaires).\n"
                f"- Verre estimÃ© : {tot_verre:.1f} kg.\n"
                f"- MÃ©tal estimÃ© : {tot_metal:.1f} kg.\n"
                f"- Masse de mÃ©gots : {tot_megots_kg:.1f} kg."
            ),
        )

        if (tot_plastique + tot_verre + tot_metal + tot_megots_kg) > 0:
            labels = ["Plastique", "Verre", "MÃ©tal", "MÃ©gots"]
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

    # ---------- PAGE 7 : Ã‰CONOMIE POUR LA COLLECTIVITÃ‰ ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("6. BÃ©nÃ©fice Ã©conomique pour la collectivitÃ©"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    tonnes_dechets = total_dechets / 1000.0
    economie_realisee = tonnes_dechets * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]

    texte_lobbying = (
        f"Sur la pÃ©riode analysÃ©e, les actions citoyennes ont permis de retirer environ {total_dechets:.1f} kg "
        f"de dÃ©chets de la voie publique, soit {tonnes_dechets:.3f} tonne(s).\n\n"
        f"En appliquant un coÃ»t moyen de traitement de {IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']} â‚¬ par tonne, "
        f"cela reprÃ©sente une Ã©conomie potentielle d'environ {economie_realisee:,.2f} â‚¬ pour les services de propretÃ©. "
        "Au-delÃ  de l'Ã©conomie directe, ces actions rÃ©duisent les risques d'inondation, de micro-plastiques et amÃ©liorent "
        "la qualitÃ© de vie des habitants."
    )
    pdf.multi_cell(0, 6, _txt(texte_lobbying))

    # ---------- PAGE 8 : ENGAGEMENT CITOYEN ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("7. Ã‰nergie citoyenne mobilisÃ©e"), ln=True)
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
            f"Les brigades citoyennes ont investi environ {heures_benevoles:.1f} heures cumulÃ©es sur le terrain. "
            "Chaque heure de bÃ©nÃ©volat Ã©quivaut Ã  un investissement concret dans la qualitÃ© de l'espace public, "
            "la santÃ© environnementale et le lien social entre habitants."
        ),
    )

    # ---------- PAGE 9+ : LISTE DÃ‰TAILLÃ‰E DES DERNIÃˆRES ACTIONS ----------
    if total:
        preview = actions_df.copy()
        if "date" in preview.columns:
            preview["_date_sort"] = pd.to_datetime(preview["date"], errors="coerce")
            preview = preview.sort_values("_date_sort", ascending=False)

        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, _txt("8. Actions rÃ©centes (extrait)"), ln=True)
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)

        max_rows = 60  # rÃ©partis sur plusieurs pages si besoin
        rows = []
        for _, row in preview.iterrows():
            line = (
                f"{row.get('date', '')} | {row.get('type_lieu', 'Non spÃ©cifiÃ©')} | "
                f"{row.get('adresse', '')} | "
                f"{int(row.get('megots', 0))} mÃ©gots | "
                f"{float(row.get('dechets_kg', 0)):.1f} kg | "
                f"propre={'oui' if bool(row.get('est_propre', False)) else 'non'}"
            )
            rows.append(line)

        for i, line in enumerate(rows[:max_rows]):
            pdf.multi_cell(0, 5, _txt(f"- {line}"))
            if (i + 1) % 25 == 0 and i + 1 < max_rows:
                pdf.add_page()
                pdf.set_font("Helvetica", "B", 14)
                pdf.cell(0, 8, _txt("Suite des actions rÃ©centes"), ln=True)
                pdf.ln(4)
                pdf.set_font("Helvetica", "", 10)

    # ---------- DERNIÃˆRE PAGE : MÃ‰THODOLOGIE ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("9. MÃ©thodologie et rÃ©fÃ©rences scientifiques"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, _txt(get_impact_sources()))

    # S'assure d'un volume suffisant (~15 pages) en ajoutant une courte annexe si besoin
    while pdf.page_no() < 15:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, _txt("Annexe complÃ©mentaire"), ln=True)
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            0,
            5,
            _txt(
                "Cette page est rÃ©servÃ©e pour des annexes locales (cartes des quartiers, "
                "plans d'action municipaux, comptes-rendus d'opÃ©rations spÃ©ciales, etc.)."
            ),
        )

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_territorial(df_ville: pd.DataFrame, nom_ville: str, critical_zones: set) -> bytes:
    """Construit un PDF 'Certificat d'Impact Territorial' dÃ©diÃ© Ã  un Ã©lu/commune."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    
    # En-tÃªte officiel
    pdf.set_fill_color(240, 248, 255) # Bleu lÃ©ger
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
        f"Ã€ l'attention de la Mairie et des services de la ville de {nom_ville},\n\n"
        f"Les Brigades Vertes et les citoyens bÃ©nÃ©voles sont intervenus Ã  {nb_actions} reprises sur votre territoire.\n"
        f"Bilan de la dÃ©pollution :\n"
        f"- {total_dechets:.1f} kg de dÃ©chets extraits de la voie publique.\n"
        f"- {total_megots} mÃ©gots ramassÃ©s.\n"
    )
    pdf.multi_cell(0, 6, _txt(texte_intro))
    
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 100, 0)
    pdf.cell(0, 8, _txt("BÃ©nÃ©fices pour la CollectivitÃ©"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 11)
    
    texte_economie = (
        f"ðŸ’° Valeur Ã©conomique : Cette action citoyenne a permis d'Ã©conomiser environ {economie_realisee:,.2f} â‚¬ "
        f"de frais de nettoyage et de traitement des dÃ©chets sauvages Ã  votre commune (Base: 150â‚¬/tonne).\n"
        f"ðŸ’§ Impact environnemental local : PrÃ¨s de {litres_eau:,} litres d'eau protÃ©gÃ©s de la contamination toxique "
        f"sur votre secteur."
    )
    pdf.multi_cell(0, 6, _txt(texte_economie))
    
    # Points Noirs (Infrastructures)
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(220, 20, 20)
    pdf.cell(0, 8, _txt(f"âš ï¸ Zones Prioritaires IdentifiÃ©es ({len(critical_zones)} Points Noirs)"), ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 10)
    
    if critical_zones:
        pdf.multi_cell(0, 5, _txt(
            "Analyse prÃ©dictive de rÃ©currence : Les lieux suivants sur votre commune ont fait "
            "l'objet d'au moins 3 nettoyages rÃ©currents. "
            "Recommandation terrain : Veuillez envisager l'installation d'une infrastructure "
            "(cendrier de rue, poubelle) pour prÃ©venir la rÃ©cidive dont le rythme est mesurÃ© ci-dessous :"
        ))
        pdf.ln(3)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(0, 5, _txt(f"ðŸ“ {addr} : {data['count']} passages. Se re-pollue en moyenne tous les {data['delai_moyen']} jours !"))
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"ðŸ“ {z}"))
    else:
        pdf.multi_cell(0, 5, _txt("Aucune zone de rÃ©cidive chronique critique n'a encore Ã©tÃ© dÃ©tectÃ©e par nos algorithmes sur ce pÃ©rimÃ¨tre spÃ©cifiques."))

    out = pdf.output(dest="S")
    return out if isinstance(out, bytes) else out.encode("latin-1", "replace")


def build_certificat_eco_quartier(nom_quartier: str):
    """GÃ©nÃ¨re un certificat PDF 'Quartier PrÃ©servÃ©'."""
    pdf = FPDF()
    pdf.add_page()
    
    # Bordure dÃ©corative
    pdf.set_line_width(2)
    pdf.rect(5, 5, 200, 287)
    
    # En-tÃªte
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 118, 110) # Vert Clean my Map
    pdf.cell(0, 40, _txt("CERTIFICAT D'IMPACT CITOYEN"), ln=True, align='C')
    
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(34, 197, 94)
    pdf.cell(0, 20, _txt("label Ã©co-quartier"), ln=True, align='C')
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "", 18)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 10, _txt(f"fÃ©licitations aux habitants et contributeurs de {nom_quartier} !"), align='C')
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "I", 14)
    pdf.multi_cell(0, 8, _txt(
        "ce certificat atteste que votre quartier a maintenu un niveau de propretÃ© citoyenne exemplaire "
        "sur les 180 derniers jours, sans aucun point noir recensÃ© et avec des actions de soin rÃ©guliÃ¨res."
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
    Identifie les zones (communes) Ã©ligibles au label Ã©co-quartier.
    CritÃ¨res : 
    1. PrÃ©sence d'au moins une action 'Zone Propre' (est_propre=True) sur les 180 derniers jours.
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
        
    # On groupe par ville (simplifiÃ© par extraction du code postal/ville dans l'adresse)
    # Pour l'instant on groupe par adresse complÃ¨te ou ville si on arrive Ã  l'extraire
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
    Un quartier est Ã©ligible s'il a au moins un signalement 'Zone propre' 
    et ZÃ‰RO 'Point noir' (dechets > 0) sur cette pÃ©riode.
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
    c_type = _find_col(raw, ["type", "categorie", "catÃ©gorie"])
    c_assoc = _find_col(raw, ["association", "asso"])
    c_megots = _find_col(raw, ["megots", "mÃ©gots", "nbr megots"])
    c_dechets = _find_col(raw, ["dechets", "dÃ©chets", "kg", "poids"])
    c_ben = _find_col(raw, ["benevoles", "bÃ©nÃ©voles", "participants", "nombre benevoles"])
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
                "nom": "RÃ©fÃ©rent association",
                "association": str(r.get(c_assoc, "IndÃ©pendant") if c_assoc else "IndÃ©pendant"),
                "type_lieu": str(r.get(c_type, "Non spÃ©cifiÃ©") if c_type else "Non spÃ©cifiÃ©"),
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
                    "nom": "RÃ©fÃ©rent association",
                    "association": "Signalement",
                    "type_lieu": "Non spÃ©cifiÃ©",
                    "adresse": lieu,
                    "date": "",
                    "benevoles": 0,
                    "temps_min": 0,
                    "megots": 0,
                    "dechets_kg": 0.0,
                    "gps": lieu,
                    "lat": lat,
                    "lon": lon,
                    "commentaire": "Zone propre signalÃ©e (Google Sheet)",
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
        'type_lieu': 'NÂ° Boulevard/Avenue/Place',
        'association': 'Test Association',
        'megots': 800,
        'dechets_kg': 50,
        'temps_min': 45,
        'benevoles': 3,
        'date': '2025-08-18',
        'est_propre': False
    },
    {
        'adresse': 'Sortie MÃ©tro BarbÃ¨s-Rochechouart, Paris',
        'lat': 48.8838,
        'lon': 2.3509,
        'ville': 'Paris',
        'type_lieu': 'NÂ° Boulevard/Avenue/Place',
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
        'type_lieu': 'NÂ° Boulevard/Avenue/Place',
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
        'adresse': 'Place de la RÃ©publique, Paris 3e',
        'lat': 48.8675,
        'lon': 2.3632,
        'ville': 'Paris',
        'type_lieu': 'NÂ° Boulevard/Avenue/Place',
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
        'association': 'Paris ZÃ©ro DÃ©chet',
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
        'association': 'Ã‰tudiants pour la PlanÃ¨te',
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
        'adresse': 'Parc AndrÃ© CitroÃ«n, Paris 15e',
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
        'type_lieu': 'NÂ° Boulevard/Avenue/Place',
        'association': 'Les Ã‰co-puces',
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
        'association': 'SÃ©nat Propre',
        'megots': 2100,
        'dechets_kg': 85,
        'temps_min': 110,
        'benevoles': 15,
        'date': '2025-07-22',
        'est_propre': False
    }
]

def init_state():
    if 'sandbox_actions' not in st.session_state:
        st.session_state['sandbox_actions'] = [
            {
                "id": "demo_1",
                "type_lieu": "Brouillon DÃ©mo",
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

# Lecture des paramÃ¨tres d'URL (Kit Terrain QR Code)
lieu_prefill = st.query_params.get("lieu", "")
if lieu_prefill:
    st.toast(f"ðŸ“ Lieu dÃ©tectÃ© via QR Code : {lieu_prefill}", icon="ðŸ“±")

tab_prefill = st.query_params.get("tab", "")
map_preset_prefill = st.query_params.get("preset", "")

# Initialisation de check_pseudo avant les tabs pour qu'il soit toujours dÃ©fini
check_pseudo = ""


# Configuration injectÃ©e via CSS global plus haut

# --- AUTHENTIFICATION (SIMPLIFIÃ‰E) ---
# AccÃ¨s libre pour les bÃ©nÃ©voles, mot de passe pour l'admin.
main_user_email = _google_user_email() or "BÃ©nÃ©vole Anonyme"

# --- CHARGEMENT DES DONNÃ‰ES CUMULÃ‰ES ---
db_approved = get_submissions_by_status('approved')
sheet_actions = load_sheet_actions(GOOGLE_SHEET_URL)
all_imported_actions = sheet_actions + TEST_DATA
all_public_actions = db_approved + all_imported_actions
all_public_df = pd.DataFrame(all_public_actions)

# Correction NameError reported by user
df_impact = all_public_df

# Calcul des stats globales cumulÃ©es
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
        <div class="app-shell-eyebrow">
            {"Plateforme citoyenne" if st.session_state.lang == "fr" else "Citizen platform"}
        </div>
        <h2 class="app-shell-title">
            {"Pilotez vos cleanwalks comme un vrai produit terrain" if st.session_state.lang == "fr" else "Run your cleanwalks with a product-grade interface"}
        </h2>
        <p class="app-shell-subtitle">
            {"Suivez l'impact en temps reel, declarez les actions, visualisez les zones prioritaires et coordonnez les benevoles avec une experience plus claire, moderne et professionnelle."
            if st.session_state.lang == "fr"
            else "Track impact in real time, declare actions, visualize priority zones, and coordinate volunteers in a cleaner, modern, product-style experience."}
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
            <div class="metric-value">{total_megots:,}<span class="metric-unit">ðŸš¬</span></div>
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
            <div class="metric-value">{total_benevoles:,}<span class="metric-unit">HÃ©ros</span></div>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

# sheet_actions et all_imported_actions sont maintenant chargÃ©s plus haut
# Import manuel ou asynchrone pour ne les insÃ©rer qu'une seule fois. 
# Pour l'instant on garde une vue concatÃ©nÃ©e en lecture

# --- NAVIGATION PAR RUBRIQUES CLIQUABLES ---
# Identifiants stables pour eviter les rubriques vides apres changement de langue

tab_specs = [
    {"id": "home", "key": "tab_home"},
    {"id": "declaration", "key": "tab_declaration"},
    {"id": "map", "key": "tab_map"},
    {"id": "trash_spotter", "key": "tab_trash_spotter"},
    {"id": "community", "key": "tab_community"},
    {"id": "gamification", "key": "tab_gamification"},
    {"id": "history", "key": "tab_history"},
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
requested_tab_id = str(tab_prefill).strip().lower() if tab_prefill else ""

if "active_tab_id" not in st.session_state:
    legacy_active_label = st.session_state.get("active_tab")
    st.session_state.active_tab_id = label_to_id.get(legacy_active_label, nav_ids[0])
if requested_tab_id in nav_ids:
    st.session_state.active_tab_id = requested_tab_id

if st.session_state.active_tab_id not in nav_ids:
    st.session_state.active_tab_id = nav_ids[0]

active_tab_id = st.session_state.active_tab_id

# Groupes thematiques pour un affichage plus lisible
nav_groups = [
    {
        "title": i18n_text("Priorite terrain", "Field Priority"),
        "items": ["declaration", "map", "trash_spotter", "route", "kit"],
    },
    {
        "title": i18n_text("Impact et pilotage", "Impact and Insights"),
        "items": ["home", "history", "pdf", "weather", "compare"],
    },
    {
        "title": i18n_text("Mobilisation", "Community"),
        "items": ["gamification", "community", "actors", "recycling", "climate"],
    },
    {
        "title": i18n_text("Outils avances", "Advanced Tools"),
        "items": ["guide", "elus", "sandbox", "admin"],
    },
]

primary_nav_ids = ["declaration", "map", "trash_spotter", "home", "community", "pdf"]

# Navigation centrale: parcours simplifie pour eviter la surcharge
st.markdown('<div class="nav-shell">', unsafe_allow_html=True)
st.markdown(
    f'<p class="rubric-hero-title">{i18n_text("Choisissez votre prochaine action", "Choose your next action")}</p>',
    unsafe_allow_html=True,
)
st.markdown(
    f'<p class="rubric-hero-subtitle">{i18n_text("Commencez par une rubrique essentielle. Les options avancees restent accessibles juste dessous.", "Start with an essential section. Advanced options remain available below.")}</p>',
    unsafe_allow_html=True,
)
st.markdown('<div class="rubric-buttons">', unsafe_allow_html=True)
for row_start in range(0, len(primary_nav_ids), 3):
    row_items = primary_nav_ids[row_start:row_start + 3]
    row_cols = st.columns(len(row_items))
    for item_index, (col, tab_id) in enumerate(zip(row_cols, row_items)):
        with col:
            if st.button(
                id_to_label[tab_id],
                key=f"rubric_primary_{row_start}_{item_index}_{tab_id}",
                use_container_width=True,
                type="primary" if active_tab_id == tab_id else "secondary",
            ):
                active_tab_id = tab_id
st.markdown('</div>', unsafe_allow_html=True)

with st.expander(i18n_text("Afficher toutes les rubriques", "Show all sections"), expanded=False):
    search_col, jump_col = st.columns([4.6, 2.4], gap="large")
    with search_col:
        st.markdown(
            f'<p class="rubric-caption">{i18n_text("Trouver rapidement une rubrique", "Find a section quickly")}</p>',
            unsafe_allow_html=True,
        )
        st.markdown('<div class="rubric-search-shell">', unsafe_allow_html=True)
        search_query = st.text_input(
            i18n_text("Recherche", "Search"),
            placeholder=i18n_text("Ex: Carte, Rapport, Meteo, Admin...", "Ex: Map, Report, Weather, Admin..."),
            key="rubric_search_query",
        )
        normalized_query = search_query.strip().lower()
        filtered_nav_ids = (
            [tab_id for tab_id in nav_ids if normalized_query in id_to_label[tab_id].lower()]
            if normalized_query else nav_ids
        )
        st.markdown(
            f'<p class="rubric-meta">{i18n_text("Rubriques visibles", "Visible sections")}: {len(filtered_nav_ids)} / {len(nav_ids)}</p>',
            unsafe_allow_html=True,
        )
        st.markdown('</div>', unsafe_allow_html=True)

    with jump_col:
        st.markdown(
            f'<p class="rubric-caption">{i18n_text("Acces direct", "Quick jump")}</p>',
            unsafe_allow_html=True,
        )
        st.markdown('<div class="rubric-jump-shell">', unsafe_allow_html=True)
        jump_ids = filtered_nav_ids if filtered_nav_ids else nav_ids
        jump_labels = [id_to_label[tab_id] for tab_id in jump_ids]
        selected_menu_label = st.selectbox(
            i18n_text("Choisir une rubrique", "Choose a section"),
            options=jump_labels,
            index=jump_ids.index(active_tab_id) if active_tab_id in jump_ids else 0,
            key="right_nav_select",
            label_visibility="collapsed",
        )
        selected_menu_id = label_to_id.get(selected_menu_label, active_tab_id)
        if selected_menu_id != active_tab_id:
            active_tab_id = selected_menu_id

        active_index = nav_ids.index(active_tab_id)
        prev_col, next_col = st.columns(2, gap="small")
        with prev_col:
            if st.button(
                i18n_text("<- Precedente", "<- Previous"),
                key="rubric_prev_btn",
                use_container_width=True,
                type="secondary",
                disabled=active_index == 0,
            ):
                active_tab_id = nav_ids[active_index - 1]
        with next_col:
            if st.button(
                i18n_text("Suivante ->", "Next ->"),
                key="rubric_next_btn",
                use_container_width=True,
                type="secondary",
                disabled=active_index == len(nav_ids) - 1,
            ):
                active_tab_id = nav_ids[active_index + 1]
        st.markdown('</div>', unsafe_allow_html=True)

    visible_set = set(filtered_nav_ids) if filtered_nav_ids else set(nav_ids)
    st.markdown('<div class="rubric-buttons">', unsafe_allow_html=True)
    for group_index, group in enumerate(nav_groups):
        visible_item_ids = [item_id for item_id in group["items"] if item_id in visible_set]
        if not visible_item_ids:
            continue
        st.markdown(f'<p class="rubric-group-title">{group["title"]}</p>', unsafe_allow_html=True)
        for row_start in range(0, len(visible_item_ids), 3):
            row_items = visible_item_ids[row_start:row_start + 3]
            row_cols = st.columns(len(row_items))
            for item_index, (col, tab_id) in enumerate(zip(row_cols, row_items)):
                with col:
                    if st.button(
                        id_to_label[tab_id],
                        key=f"rubric_group_{group_index}_{row_start}_{item_index}",
                        use_container_width=True,
                        type="primary" if active_tab_id == tab_id else "secondary",
                    ):
                        active_tab_id = tab_id
    st.markdown('</div>', unsafe_allow_html=True)

st.markdown('</div>', unsafe_allow_html=True)

# Synchronisation du state
st.session_state.active_tab_id = active_tab_id
st.session_state.active_tab = id_to_label[active_tab_id]

# Initialisation des containers

tab_declaration = st.empty()
tab_map = st.empty()
tab_trash_spotter = st.empty()
tab_gamification = st.empty()
tab_community = st.empty()
tab_sandbox = st.empty()
tab_pdf = st.empty()
tab_guide = st.empty()
tab_actors = st.empty()
tab_history = st.empty()
tab_route = st.empty()
tab_recycling = st.empty()
tab_climate = st.empty()
tab_elus = st.empty()
tab_kit = st.empty()
tab_home = st.empty()
tab_weather = st.empty()
tab_compare = st.empty()
tab_admin = st.empty()

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
        subtitle_fr="Generez un QR Code terrain, des templates equipes et des supports pre-remplis pour fluidifier vos cleanwalks.",
        subtitle_en="Generate field QR codes, team templates, and prefilled materials to streamline your cleanwalk operations.",
        chips=[i18n_text("Terrain", "Field"), i18n_text("QR Code", "QR Code"), i18n_text("Organisation", "Operations")],
        compact=True,
    )
    
    st.markdown("""
    ### Pourquoi utiliser un QR Code ?
    Le QR Code de terrain est un outil essentiel pour les organisateurs de Clean Walks. Il permet de :
    1. **Simplifier la saisie** : En scannant le code, le lieu de l'action est automatiquement prÃ©-rempli pour les bÃ©nÃ©voles.
    2. **Uniformiser les donnÃ©es** : Toutes les dÃ©clarations de votre Ã©vÃ©nement porteront exactement le mÃªme nom de lieu, facilitant le bilan final.
    3. **Gagner du temps** : Vos bÃ©nÃ©voles n'ont plus qu'Ã  renseigner les quantitÃ©s ramassÃ©es.
    
    ---
    ### GÃ©nÃ©rer votre code
    Saisissez le nom du lieu ou les coordonnÃ©es GPS exactes pour gÃ©nÃ©rer le QR Code Ã  imprimer ou Ã  afficher sur votre tÃ©lÃ©phone pendant l'action.
    """)
    
    with st.form("qr_generator_form"):
        lieu_event = st.text_input("Nom du lieu ou CoordonnÃ©es GPS", placeholder="Ex: Place de la Bastille, Paris ou 48.8534, 2.3488")
        color_qr = st.color_picker("Couleur du QR Code", "#059669")
        generate_btn = st.form_submit_button("GÃ©nÃ©rer le QR Code de terrain", width="stretch")
        
    if generate_btn:
        if not lieu_event.strip():
            st.warning("Veuillez saisir un lieu pour gÃ©nÃ©rer le code.")
        else:
            # Construction de l'URL de l'application avec le paramÃ¨tre de prÃ©-remplissage
            # On utilise STREAMLIT_PUBLIC_URL si dÃ©finie, sinon une URL gÃ©nÃ©rique
            base_url = STREAMLIT_PUBLIC_URL
            share_url = f"{base_url}/?lieu={requests.utils.quote(lieu_event.strip())}"
            
            # GÃ©nÃ©ration du QR Code
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
                st.image(byte_im, caption="QR Code Ã  scanner sur le terrain", width="stretch")
            with col_qr2:
                st.success("âœ… Votre QR Code est prÃªt !")
                st.write(f"**Lien encodÃ© :** `{share_url}`")
                st.download_button(
                    label="â¬‡ï¸ TÃ©lÃ©charger le QR Code (PNG)",
                    data=byte_im,
                    file_name=f"qrcode_terrain_{lieu_event.replace(' ', '_')}.png",
                    mime="image/png",
                    width="stretch"
                )
                st.info("ðŸ’¡ **Conseil :** Imprimez ce code et fixez-le sur votre peson ou sur votre sac de collecte principal pour que chaque bÃ©nÃ©vole puisse flasher son impact en fin d'action.")

    st.markdown("---")
    st.subheader("ðŸ§¾ Templates imprimables & gestion multi-bÃ©nÃ©voles")
    nb_participants = st.number_input("Nombre de bÃ©nÃ©voles attendus", min_value=1, value=10, step=1, key="kit_participants")
    nb_equipes = st.number_input("Nombre d'Ã©quipes", min_value=1, value=3, step=1, key="kit_teams")

    planner = pd.DataFrame({
        "equipe": [f"Ã‰quipe {((i % nb_equipes) + 1)}" for i in range(nb_participants)],
        "benevole": [f"Participant {i+1}" for i in range(nb_participants)],
        "telephone": ["" for _ in range(nb_participants)],
        "materiel": ["gants, sacs, pinces" for _ in range(nb_participants)],
    })
    st.dataframe(planner, width="stretch", hide_index=True)
    st.download_button(
        "â¬‡ï¸ TÃ©lÃ©charger template Ã©quipes (CSV)",
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

    st.markdown(
        f"**{i18n_text('Parcours recommande', 'Recommended flow')}**: "
        f"{i18n_text('1) choisissez une rubrique au centre, 2) lancez votre action, 3) revenez ici pour suivre la carte en direct.', '1) choose a section in the center, 2) run your action, 3) come back here to track the live map.')}"
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
                    "m_weight": float(last_action.get("megots") or 0) * 0.27,
                    "m_condition": "Mélangé / Impuretés",
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
        st.info(i18n_text("Aucune action gÃ©olocalisÃ©e Ã  afficher pour le moment.", "No geolocated action to display yet."))
        home_map = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="CartoDB positron")

    st_folium(home_map, width="stretch", height=520, returned_objects=[])

with tab_view:
    render_tab_header(
        icon="\U0001F5FA\ufe0f",
        title_fr="Carte Interactive des Actions",
        title_en="Interactive Action Map",
        subtitle_fr="Explorez les actions validées, les zones sensibles, la chronologie et les couches géographiques en un seul espace.",
        subtitle_en="Explore validated actions, sensitive zones, timeline, and geographic layers in one workspace.",
        chips=[i18n_text("Cartographie", "Mapping"), i18n_text("Analyse", "Analytics"), i18n_text("Temps réel", "Live")],
        compact=True,
    )
    st.markdown("#### " + i18n_text("Guide visuel (3 étapes)", "Visual guide (3 steps)"))
    st.info(
        i18n_text(
            "1) Choisissez un préréglage\n2) Lisez le résumé et les zones clés\n3) Passez en mission ou partagez la vue",
            "1) Choose a preset\n2) Read summary and key areas\n3) Switch to mission or share view",
        )
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
        ("all", i18n_text("Vue complète", "Full view")),
        ("pollution", i18n_text("Pollution", "Pollution")),
        ("clean", i18n_text("Zones propres", "Clean zones")),
        ("partners", i18n_text("Partenaires engagés", "Engaged partners")),
        ("recent", i18n_text("Actions récentes (30 j)", "Recent actions (30d)")),
        ("priority", i18n_text("Zones prioritaires", "Priority zones")),
    ]
    preset_to_label = {pid: label for pid, label in preset_items}
    label_to_preset = {label: pid for pid, label in preset_items}
    default_preset = map_preset_prefill if map_preset_prefill in preset_to_label else "all"

    selected_preset_label = st.selectbox(
        i18n_text("Préréglage de filtrage", "Filter preset"),
        options=[label for _, label in preset_items],
        index=[pid for pid, _ in preset_items].index(default_preset),
        key="map_preset_select",
    )
    selected_preset = label_to_preset[selected_preset_label]
    share_url = f"{STREAMLIT_PUBLIC_URL}/?tab=map&preset={selected_preset}"
    st.text_input(
        i18n_text("Lien partageable du préréglage", "Shareable preset link"),
        value=share_url,
        key=f"map_share_url_{selected_preset}",
    )

    filtered_map_df = apply_map_preset(map_df, selected_preset)
    if filtered_map_df.empty and not map_df.empty:
        st.info(i18n_text("Aucun résultat pour ce préréglage. Revenez à la vue complète.", "No result for this preset. Switch to full view."))
    m = build_interactive_folium_map(filtered_map_df)

    map_ref_df = filtered_map_df if not filtered_map_df.empty else map_df
    st.markdown("### " + i18n_text("Résumé du préréglage actif", "Active preset insights"))
    i1, i2 = st.columns(2)
    i1.metric(i18n_text("Actions", "Actions"), int(len(map_ref_df)))
    i2.metric(
        i18n_text("kg collectés", "kg collected"),
        f"{float(pd.to_numeric(map_ref_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
    )
    i3, i4 = st.columns(2)
    i3.metric(
        i18n_text("Mégots", "Cigarette butts"),
        f"{int(pd.to_numeric(map_ref_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
    )
    i4.metric(
        i18n_text("Zones propres", "Clean zones"),
        int(map_ref_df.get("est_propre", pd.Series(dtype=bool)).fillna(False).astype(bool).sum()),
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
        top_hotspots["adresse"] = top_hotspots["adresse"].fillna("").replace("", "Zone non renseignée")
        st.dataframe(
            top_hotspots.rename(
                columns={
                    "adresse": i18n_text("Zone", "Area"),
                    "actions": i18n_text("Actions", "Actions"),
                    "kg": i18n_text("kg", "kg"),
                    "megots": i18n_text("Mégots", "Butts"),
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
        help="Le mode 3D nécessite plus de ressources mais offre une vue spectaculaire des hotspots." if st.session_state.lang == "fr" else "3D mode requires more resources but offers a spectacular view of hotspots."
    )

    if "3D" in view_mode:
        import pydeck as pdk
        st.info("ðŸ’¡ **Montagnes de mégots** : la hauteur des colonnes représente la densité de pollution cumulée." if st.session_state.lang == "fr" else "ðŸ’¡ **Cigarette Butt Mountains**: Column height represents cumulative pollution density.")
        if map_ref_df.empty:
            st.warning(i18n_text("Aucune donnée géolocalisée pour la vue 3D.", "No geolocated data for 3D view."))
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
                    "html": "<b>DensitÃ© :</b> {elevationValue} unitÃ©s" if st.session_state.lang == "fr" else "<b>Density:</b> {elevationValue} units",
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
        subtitle_fr="Signalez rapidement les points noirs pour mobiliser la communaute et accelerer les interventions.",
        subtitle_en="Quickly report black spots to mobilize the community and accelerate interventions.",
        chips=[i18n_text("Signalement", "Reporting"), i18n_text("Reactivite", "Response")],
    )

    col_ts1, col_ts2 = st.columns([1, 1])
    with col_ts1:
        st.subheader("ðŸ“ Signaler un Spot")
        with st.form("spot_form_fast"):
            s_addr = st.text_input("Adresse ou Lieu", placeholder="Ex: 10 Rue de Rivoli")
            s_type = st.selectbox("Type de dÃ©chet", ["DÃ©charge sauvage", "MÃ©gots en masse", "Plastiques", "Verre", "Autre"])
            s_pseudo = st.text_input("Votre pseudo", value=main_user_email)
            s_photo = st.file_uploader("Photo du spot (obligatoire)", type=["png", "jpg", "jpeg"], key="spot_photo_required")
            s_btn = st.form_submit_button("ðŸ“¢ Signaler (+10 Eco-Points)")
            
            if s_btn:
                if not s_addr:
                    st.warning("PrÃ©cisez l'adresse du spot.")
                elif s_photo is None:
                    st.warning("Une photo est obligatoire pour valider le signalement.")
                else:
                    from src.geocoder import geocode_address
                    lat_s, lon_s = geocode_address(s_addr)
                    if lat_s:
                        photo_path = save_uploaded_image(s_photo, prefix="spot")
                        add_spot(lat_s, lon_s, s_addr, s_type, s_pseudo, photo_url=photo_path)
                        st.success("âœ… Spot ajoutÃ© ! Merci pour votre vigilance.")
                        st.balloons()
                    else:
                        st.error("Impossible de localiser l'adresse.")

    with col_ts2:
        st.subheader("ðŸŒ Points Noirs Actifs")
        spots = get_active_spots()
        if spots:
            m_ts = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
            for sp in spots:
                popup_text = f"<b>{sp['type_dechet']}</b><br>SignalÃ© par {sp['reporter_name']}"
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
            st.info("Aucun spot de pollution signalÃ© pour le moment.")

with tab_gamification:
    render_tab_header(
        icon="\U0001F3C6",
        title_fr="Eco-classement & Recompenses",
        title_en="Eco Ranking & Rewards",
        subtitle_fr="Suivez la dynamique de la communaute, valorisez les efforts et activez les badges de progression.",
        subtitle_en="Track community momentum, reward impact, and unlock progression badges.",
        chips=[i18n_text("Leaderboard", "Leaderboard"), i18n_text("Badges", "Badges")],
    )

    cg1, cg2 = st.columns([2, 3])
    with cg1:
        st.subheader("ðŸ¥‡ Top Contributeurs")
        lb = get_leaderboard(limit=5)
        for i, en in enumerate(lb):
            st.markdown(f"""
            <div style="background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); padding: 12px; border-radius: 12px; margin-bottom: 8px; border-left: 4px solid #10b981;">
                <span style="font-size: 1.2rem;">{'ðŸ¥‡' if i==0 else 'ðŸ¥ˆ' if i==1 else 'ðŸ¥‰' if i==2 else 'ðŸ‘¤'}</span> 
                <b>{en['nom']}</b> : <span style="color:#10b981; font-weight:bold;">{en['total_points']} pts</span>
            </div>
            """, unsafe_allow_html=True)

    with cg2:
        st.subheader("ðŸ… Badges & SuccÃ¨s")
        # Pseudo actuel pour les badges
        curr_pseudo = st.text_input("Saisissez votre pseudo pour voir vos badges", value=main_user_email if main_user_email != "BÃ©nÃ©vole Anonyme" else "")
        if curr_pseudo:
            # RÃ©cupÃ©rer les stats rÃ©elles
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
                st.info("Action validÃ©e requise pour dÃ©bloquer les badges.")

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
        subtitle_fr="Coordonnez les sorties, partagez les annonces et engagez les benevoles autour d'actions locales.",
        subtitle_en="Coordinate outings, publish announcements, and engage volunteers around local actions.",
        chips=[i18n_text("Communaute", "Community"), i18n_text("Coordination", "Coordination")],
    )

    st.warning("ðŸ’¡ **Important** : Pour une organisation officielle et une visibilitÃ© maximale, nous vous recommandons vivement de crÃ©er Ã©galement votre Ã©vÃ¨nement sur [cleanwalk.org](https://www.cleanwalk.org), la plateforme de rÃ©fÃ©rence en France.")

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
        title_fr="Zone d'entrainement",
        title_en="Sandbox",
        subtitle_fr="Testez des scenarios fictifs sans impacter la base de donnees de production.",
        subtitle_en="Test fictional scenarios without impacting the production database.",
        chips=[i18n_text("Brouillon", "Draft"), i18n_text("Simulation", "Simulation")],
        compact=True,
    )
    st.info("Cette zone est un bac Ã  sable : vous pouvez ajouter des donnÃ©es fictives pour tester l'outil. Elles ne sont **pas enregistrÃ©es** dans la base rÃ©elle et seront perdues si vous rafraÃ®chissez la page.")
    
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
            sb_weight = st.number_input("Poids mÃ©gots (g)", min_value=0.0, value=50.0)
            sb_cond = st.selectbox("Ã‰tat mÃ©gots", ["Sec", "MÃ©langÃ© / ImpuretÃ©s", "Humide"])
            sb_kg = st.number_input("DÃ©chets (kg)", min_value=0.0, value=1.5)
            sb_propre = st.checkbox("Signaler comme zone propre")
            
            sb_submit = st.form_submit_button("Ajouter au brouillon")
            
            if sb_submit:
                lat, lon, res_addr = geocode_and_resolve(sb_loc)
                coeffs = {"Sec": 0.20, "MÃ©langÃ© / ImpuretÃ©s": 0.27, "Humide": 0.35}
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
                st.success("Action ajoutÃ©e au brouillon !")
                st.rerun()

        if st.button("ðŸ—‘ï¸ Vider le brouillon"):
            st.session_state['sandbox_actions'] = []
            st.rerun()

        st.markdown("---")
        st.subheader("ðŸŽ® Simulateur mission fictive")
        if "sb_target_kg" not in st.session_state:
            st.session_state["sb_target_kg"] = 20.0
        if "sb_target_megots" not in st.session_state:
            st.session_state["sb_target_megots"] = 1500
        target_kg = st.number_input("Objectif mission (kg)", min_value=1.0, step=1.0, key="sb_target_kg")
        target_megots = st.number_input("Objectif mission (mÃ©gots)", min_value=0, step=100, key="sb_target_megots")
        drafted_df = pd.DataFrame(st.session_state['sandbox_actions'])
        done_kg = float(drafted_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0.0
        done_megots = int(drafted_df.get('megots', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0
        completion = min(((done_kg / target_kg) + (done_megots / max(target_megots, 1))) / 2 * 100, 100)
        st.progress(int(completion))
        st.caption(f"Completion rate mission fictive: {completion:.1f}% â€” {done_kg:.1f}/{target_kg:.1f} kg, {done_megots}/{target_megots} mÃ©gots")

    with col_sb2:
        st.subheader("Carte de test")
        # Carte simplifiÃ©e pour le sandbox
        m_sb = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
        
        for act in st.session_state['sandbox_actions']:
            if act['lat'] and act['lon']:
                color = "green" if act['est_propre'] else "blue"
                folium.Marker(
                    [act['lat'], act['lon']],
                    popup=f"<b>{act['type_lieu']}</b><br>MÃ©gots: {act['megots']}<br>Kg: {act['dechets_kg']}",
                    icon=folium.Icon(color=color, icon='info-sign')
                ).add_to(m_sb)
        
        st_folium(m_sb, width=600, height=500, key="sandbox_map")

with tab_add:
    render_tab_header(
        icon="\U0001F3AF",
        title_fr="Declarer une action",
        title_en="Declare an Action",
        subtitle_fr="Soumettez une recolte, un lieu propre ou un acteur engage avec un formulaire clair et guide.",
        subtitle_en="Submit a cleanup, a clean area, or an engaged actor using a clear and guided form.",
        chips=[i18n_text("Formulaire", "Form"), i18n_text("Qualite", "Data quality")],
        compact=True,
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
    _seed_decl_value("decl_benevoles", int(draft.get("benevoles", 1)))
    _seed_decl_value("decl_temps_min", int(draft.get("temps_min", 60)))
    _seed_decl_value("decl_m_weight", float(draft.get("m_weight", 0.0)))
    _seed_decl_value("decl_m_condition", draft.get("m_condition", "Mélangé / Impuretés"))
    _seed_decl_value("decl_dechets_kg", float(draft.get("dechets_kg", 0.0)))
    _seed_decl_value("decl_commentaire", draft.get("commentaire", ""))
    _seed_decl_value("decl_newsletter", bool(draft.get("subscribe_newsletter", True)))
    _seed_decl_value("decl_news_email", draft.get("user_email", ""))
    _seed_decl_value("decl_step", "1. Profil & lieu")
    _seed_decl_value("decl_action_date", date.today())

    st.caption("Brouillon auto actif : vos champs sont sauvegardés en continu.")
    progress_step = st.radio(
        "Progression",
        ["1. Profil & lieu", "2. Donnees d'impact", "3. Validation"],
        horizontal=False,
        key="decl_step",
        format_func=lambda s: {
            "1. Profil & lieu": "1. Profil & lieu",
            "2. Donnees d'impact": "2. Données d'impact",
            "3. Validation": "3. Validation",
        }.get(s, s),
    )
    step_status = {
        "1. Profil & lieu": "🟢" if progress_step == "1. Profil & lieu" else "⚪",
        "2. Donnees d'impact": "🟢" if progress_step == "2. Donnees d'impact" else "⚪",
        "3. Validation": "🟢" if progress_step == "3. Validation" else "⚪",
    }
    step2_key = "2. Donnees d'impact"
    st.caption(f"{step_status['1. Profil & lieu']} Étape 1 : identité, date, lieu")
    st.caption(f"{step_status[step2_key]} Étape 2 : quantités et contexte")
    st.caption(f"{step_status['3. Validation']} Étape 3 : vérification finale")

    action_type = st.radio(
        "Que souhaitez-vous faire ?",
        ["Ajouter une recolte", "Declarer un lieu propre", "Declarer un acteur engage"],
        horizontal=False,
        key="decl_action_type",
        format_func=lambda s: {
            "Ajouter une recolte": "Ajouter une récolte",
            "Declarer un lieu propre": "Déclarer un lieu propre",
            "Declarer un acteur engage": "Déclarer un acteur engagé",
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

        if acteur_engage:
            st.selectbox(
                "Type d'acteur*",
                ["Association ecologique", "Association humanitaire et sociale", "Commercant engage"],
                key="decl_type_acteur",
                format_func=lambda s: {
                    "Association ecologique": "Association écologique",
                    "Association humanitaire et sociale": "Association humanitaire et sociale",
                    "Commercant engage": "Commerçant engagé",
                }.get(s, s),
            )
        elif zone_propre:
            st.info("Mode lieu propre : les métriques de déchets seront renseignées à zéro.")
        else:
            st.selectbox("Type de lieu*", TYPE_LIEU_OPTIONS, key="decl_type_lieu")

    elif progress_step == "2. Donnees d'impact":
        if acteur_engage:
            st.text_area("Actions & Engagement (optionnel)", key="decl_commentaire", placeholder="Décrivez pourquoi cet acteur est engagé.")
        elif zone_propre:
            st.text_area("Commentaire (optionnel)", key="decl_commentaire", placeholder="Précisions sur le lieu propre.")
        else:
            st.number_input("Nombre de bénévoles*", min_value=1, step=1, key="decl_benevoles")
            st.number_input("Durée (minutes)*", min_value=1, step=5, key="decl_temps_min")
            st.number_input("Poids total mégots (grammes)", min_value=0.0, step=10.0, key="decl_m_weight")
            st.selectbox("État des mégots", ["Sec", "Mélangé / Impuretés", "Humide"], key="decl_m_condition")
            coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
            megots_preview = int(float(st.session_state.get("decl_m_weight", 0.0)) / coeffs[st.session_state.get("decl_m_condition", "Mélangé / Impuretés")]) if float(st.session_state.get("decl_m_weight", 0.0)) > 0 else 0
            if megots_preview > 0:
                st.info(f"Estimation : ~{megots_preview} mégots")
            st.number_input("Déchets (total kg)", min_value=0.0, step=0.5, key="decl_dechets_kg")
            hints = get_weight_conversion_hints(float(st.session_state.get("decl_dechets_kg", 0.0)))
            st.caption(f"≈ {hints['sacs_30l']} sacs 30L • ≈ {hints['bouteilles_1_5l']} bouteilles 1.5L")
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
            f"- **Categorie**: {recap_type_lieu}\n"
            f"- **Auteur**: {st.session_state.get('decl_nom', '') or 'Anonyme'}"
        )

        if st.button("Partager mon action", key="decl_submit_btn", use_container_width=True):
            nom = str(st.session_state.get("decl_nom", "")).strip()
            association = str(st.session_state.get("decl_association", "")).strip()
            type_lieu = st.session_state.get("decl_type_lieu", TYPE_LIEU_OPTIONS[0])
            action_date = st.session_state.get("decl_action_date", date.today())
            emplacement_brut = str(st.session_state.get("decl_emplacement", "")).strip()
            commentaire = str(st.session_state.get("decl_commentaire", "")).strip()
            benevoles = int(st.session_state.get("decl_benevoles", 1))
            temps_min = int(st.session_state.get("decl_temps_min", 1))
            dechets_kg = float(st.session_state.get("decl_dechets_kg", 0.0))
            m_weight = float(st.session_state.get("decl_m_weight", 0.0))
            m_condition = st.session_state.get("decl_m_condition", "Mélangé / Impuretés")
            coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
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
                st.error("Merci de remplir les champs obligatoires.")
            elif subscribe_newsletter and not user_email:
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
                        st.error(err)
                    st.stop()

                with st.spinner("Analyse de l'emplacement..."):
                    lat, lon, adresse_resolue = geocode_and_resolve(emplacement_brut)
                if lat is not None and lon is not None and not (-90 <= float(lat) <= 90 and -180 <= float(lon) <= 180):
                    st.error("Coordonnees geocodees incoherentes. Verifiez votre saisie.")
                    st.stop()

                approved_actions = get_submissions_by_status('approved')
                existing_pool = [a.get('adresse') for a in approved_actions if a.get('adresse')]
                adresse_finale = fuzzy_address_match(adresse_resolue, existing_pool)

                data_to_save = {
                    "id": str(uuid.uuid4()),
                    "nom": nom,
                    "association": association,
                    "type_lieu": type_lieu,
                    "adresse": adresse_finale,
                    "date": str(action_date),
                    "benevoles": benevoles,
                    "temps_min": temps_min,
                    "megots": megots,
                    "dechets_kg": dechets_kg,
                    "plastique_kg": 0.0,
                    "verre_kg": 0.0,
                    "metal_kg": 0.0,
                    "gps": f"{lat}, {lon}" if lat and lon else emplacement_brut,
                    "lat": lat,
                    "lon": lon,
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
        "benevoles": st.session_state.get("decl_benevoles", 1),
        "temps_min": st.session_state.get("decl_temps_min", 60),
        "m_weight": st.session_state.get("decl_m_weight", 0.0),
        "m_condition": st.session_state.get("decl_m_condition", "Mélangé / Impuretés"),
        "dechets_kg": st.session_state.get("decl_dechets_kg", 0.0),
        "commentaire": st.session_state.get("decl_commentaire", ""),
        "subscribe_newsletter": st.session_state.get("decl_newsletter", True),
        "user_email": st.session_state.get("decl_news_email", ""),
    }
    st.session_state["submission_draft_saved_at"] = datetime.now().strftime("%H:%M:%S")
    st.caption(f"Brouillon enregistre a {st.session_state['submission_draft_saved_at']}")
             
    st.divider()
    st.subheader("ðŸ’¬ Partagez votre exploit avec la communautÃ© !")
    st.write("Maintenant que votre action est dÃ©clarÃ©e, inspirez les autres brigades en postant un petit mot ou une photo sur le mur public.")
    
    # RÃ©cupÃ©ration des messages
    messages = get_messages()
    
    # Formulaire pour nouveau message
    with st.form("wall_form", clear_on_submit=True):
        pseudo_msg = st.text_input("Votre pseudo", placeholder="Ex : camille_verte")
        contenu_msg = st.text_area("Votre message", placeholder="Merci Ã  l'Ã©quipe pour l'action Ã  Versailles !")
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
                st.success("Message publiÃ© !")
                st.rerun()

    st.divider()
    
    # Affichage des messages avec badges
    if not messages:
        st.info("Soyez le premier Ã  poster un message !")
    else:
        # On a besoin des actions pour calculer les badges
        db_approved = get_submissions_by_status('approved')
        all_actions_df = pd.DataFrame(all_imported_actions + db_approved)
        
        for m in reversed(messages):  # Plus rÃ©cent en haut
            pseudo = m.get('author', m.get('pseudo', 'Anonyme'))
            timestamp = m.get('created_at', m.get('timestamp', ''))
            badge = get_user_badge(pseudo, all_actions_df)
            st.markdown(f"**{pseudo}** {badge} â€¢ *{timestamp}*")
            st.info(m.get('content', ''))
            img_url = m.get('image_url')
            if img_url:
                try:
                    st.image(img_url, width="stretch")
                except Exception:
                    st.warning("Impossible d'afficher l'image associÃ©e Ã  ce message.")
            st.markdown("---")

with tab_report:
    render_tab_header(
        icon="\U0001F4C4",
        title_fr="Rapport d'impact",
        title_en="Impact Report",
        subtitle_fr="Generez un rapport PDF exploitable pour le pilotage, la communication et les partenaires.",
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
            st.write("âš™ï¸ **Options du Rapport**")
            is_rse_mode = st.toggle("Format Corporate RSE", value=False, help="Ajoute des mÃ©triques ESG et une valorisation du mÃ©cÃ©nat pour les bilans RSE d'entreprises.")
            compare_days = st.selectbox("Comparatif de période", [30, 60, 90], format_func=lambda x: f"{x} jours")
            st.markdown('</div>', unsafe_allow_html=True)
            
            if is_rse_mode:
                st.success("ðŸ¢ **Mode RSE ActivÃ©**\nLe rapport inclura les mÃ©triques d'impact social et environnemental.")
                total_h = int((public_df['temps_min'] * public_df.get('benevoles', 1)).sum() / 60)
                st.metric("Temps de mÃ©cÃ©nat accumulÃ©", f"{total_h} h")

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
                clean_col = df.get("est_propre", pd.Series(dtype=bool)).fillna(False).astype(bool)
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

                highlights.append("Carte interactive avec préréglages partageables : pollution, zones propres, partenaires, récentes, prioritaires.")
                if recent_count > 0:
                    highlights.append(f"Préréglage actions récentes : {recent_count} action(s) sur les 30 derniers jours.")
                if partner_count > 0:
                    highlights.append(f"Préréglage partenaires engagés : {partner_count} point(s) cartographiés.")
                if clean_count > 0:
                    highlights.append(f"Préréglage zones propres : {clean_count} point(s) valorisés.")
                if pollution_count > 0:
                    highlights.append(f"Préréglage pollution/priorité : {pollution_count} point(s) à surveiller.")
                if quality_flags > 0:
                    highlights.append(f"Validation admin en lot et pré-validation : {quality_flags} signalement(s) atypique(s) détecté(s).")
                return highlights

            current_stats = _metric_pack(current_period_df)
            previous_stats = _metric_pack(previous_period_df)
            report_highlights = _collect_report_highlights(current_period_df if not current_period_df.empty else report_df)
        
        with c_rep1:
            st.markdown("### Comparatif période précédente")
            cmp1, cmp2 = st.columns(2)
            cmp1.metric("Actions", current_stats["actions"], delta=current_stats["actions"] - previous_stats["actions"])
            cmp2.metric("kg collectés", f"{current_stats['kg']:.1f}", delta=f"{current_stats['kg'] - previous_stats['kg']:.1f}")
            cmp3, cmp4 = st.columns(2)
            cmp3.metric("Mégots", f"{current_stats['megots']:,}", delta=f"{current_stats['megots'] - previous_stats['megots']:,}")
            cmp4.metric("Bénévoles", current_stats["benevoles"], delta=current_stats["benevoles"] - previous_stats["benevoles"])

            st.markdown("### Nouveautés retenues dans ce rapport")
            if report_highlights:
                for hl in report_highlights[:6]:
                    st.caption(f"- {hl}")
            else:
                st.caption("- Pas de nouveauté data-driven à afficher sur la période.")

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
                    pdf.cell(0, 7, _txt("Nouveautés produit visibles (si pertinentes)"), ln=True)
                    pdf.set_font("Helvetica", "", 9)
                    for line in highlights[:4]:
                        pdf.multi_cell(0, 5, _txt(f"- {line}"))
                output = pdf.output(dest="S")
                return output if isinstance(output, bytes) else output.encode("latin-1", "replace")

            onepage_bytes = build_decider_onepager(current_stats, previous_stats, compare_days, current_period_df, report_highlights)
            st.download_button(
                "Telecharger export decideur 1 page (PDF)",
                data=onepage_bytes,
                file_name=f"cleanmymap_decideur_1page_{compare_days}j.pdf",
                mime="application/pdf",
                width="stretch",
            )

            st.divider()
            # PrÃ©paration du gÃ©nÃ©rateur
            report_gen = PDFReport(public_df)
            report_gen.is_rse = is_rse_mode
            report_gen.map_base_url = STREAMLIT_PUBLIC_URL
            pdf_bytes = report_gen.generate(dest='S')
            
            label_btn = "â¬‡ï¸ TÃ©lÃ©charger le Rapport RSE (PDF)" if is_rse_mode else t("download_pdf")
            st.download_button(
                label_btn,
                data=pdf_bytes,
                file_name=f"cleanmymap_rapport_{'rse' if is_rse_mode else 'public'}.pdf",
                mime="application/pdf",
                width="stretch",
            )
            
            st.divider()
            st.markdown(f"### ðŸ‘ï¸ { 'AperÃ§u des donnÃ©es' if st.session_state.lang == 'fr' else 'Data Preview' }")
            st.markdown("#### ðŸ” DerniÃ¨res actions marquantes")
            st.dataframe(public_df.sort_values('date', ascending=False).head(10)[["date", "type_lieu", "adresse", "dechets_kg", "megots"]], width="stretch", hide_index=True)
    else:
        st.info("Aucune donnÃ©e disponible pour gÃ©nÃ©rer le rapport." if st.session_state.lang == "fr" else "No data available to generate report.")

with tab_history:
    render_tab_header(
        icon="\U0001F4CB",
        title_fr="Historique des actions",
        title_en="Action History",
        subtitle_fr="Consultez toutes les actions recensees, leur contexte et les tendances historiques.",
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
        title_fr="Generateur d'action citoyenne IA",
        title_en="AI Mission Planner",
        subtitle_fr="Planifiez un parcours strategique avec l'IA selon l'historique de pollution et vos ressources terrain.",
        subtitle_en="Plan a strategic route with AI based on pollution history and field resources.",
        chips=[i18n_text("IA", "AI"), i18n_text("Parcours", "Routing")],
    )

    route_source_df = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))
    route_source_df = route_source_df.dropna(subset=["lat", "lon"]) if not route_source_df.empty else pd.DataFrame()

    if route_source_df.empty:
        st.warning("Aucune donnee disponible pour optimiser un trajet.")
    else:
        route_source_df = calculate_trends(route_source_df.copy())
        st.markdown("### ðŸ§­ Recommandation basee sur historique")
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
                nb_ben = st.slider("Nombre de bÃ©nÃ©voles prÃ©sents", 1, 50, 5)
                temps_act = st.select_slider("DurÃ©e de l'action souhaitÃ©e", options=[30, 60, 90, 120, 180], value=60, format_func=lambda x: f"{x} min")
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

            gen_btn = st.form_submit_button("ðŸ’Ž GÃ©nÃ©rer le parcours optimal", width="stretch")

        if gen_btn:
            with st.spinner("L'IA analyse les flux piÃ©tons et les points noirs de Paris..."):
                # On utilise la fonction de map_utils (retourne paths, msg, logistics_df)
                result = generate_ai_route(candidate_df, nb_ben, temps_act, chosen_arr)
                
                if result[0]:
                    paths, msg, logistics_df = result
                    st.success(f"âœ… Parcours stratÃ©gique gÃ©nÃ©rÃ© ! {msg}")
                    
                    # 1. Affichage du tableau de bord logistique
                    st.markdown("### ðŸ“‹ Tableau de Bord Logistique (10 Ã‰quipes)")
                    st.dataframe(logistics_df, width="stretch", hide_index=True)
                    
                    # 2. Affichage de la carte de l'itinÃ©raire multi-couleurs
                    center_coords = paths[0]["coords"][0]
                    m_route = folium.Map(location=center_coords, zoom_start=15)
                    
                    # Ajout des diffÃ©rents segments colorÃ©s
                    for p in paths:
                        folium.PolyLine(
                            p["coords"], 
                            color=p["color"], 
                            weight=p["weight"], 
                            opacity=0.8, 
                            tooltip=p["label"]
                        ).add_to(m_route)
                    
                    # Marqueurs DÃ©part/ArrivÃ©e
                    folium.Marker(paths[0]["coords"][0], popup="Point de rassemblement (DÃ©part)", icon=folium.Icon(color="green", icon="play")).add_to(m_route)
                    folium.Marker(paths[1]["coords"][-1], popup="Fin de la mission (Retour)", icon=folium.Icon(color="red", icon="stop")).add_to(m_route)
                    
                    st_folium(m_route, width=900, height=500, key="ai_strategic_map")
                    
                    st.info(f"ðŸ’¡ **Conseil IA** : Les Ã©quipes 1 Ã  4 couvrent la montÃ©e, tandis que les Ã©quipes 5 Ã  8 couvrent le retour. Les Ã©quipes 9 et 10 sÃ©curisent les abords. Restez groupÃ©s par binÃ´mes !")
                    
                    st.success("ðŸŽ¯ **Ã‰tape Suivante** : Maintenant que vous avez votre itinÃ©raire stratÃ©gique, officialisez votre action sur [cleanwalk.org](https://www.cleanwalk.org) pour recruter encore plus de bÃ©nÃ©voles !")
                else:
                    st.error(f"DÃ©solÃ©, l'IA n'a pas pu gÃ©nÃ©rer de parcours : {result[1]}")

with tab_recycling:
    render_tab_header(
        icon="\u267b\ufe0f",
        title_fr="Seconde vie & sensibilisation",
        title_en="Second Life & Awareness",
        subtitle_fr="Transformez les donnees terrain en impact concret et en culture ecologique utile.",
        subtitle_en="Turn field data into concrete impact and practical environmental awareness.",
        chips=[i18n_text("Impact", "Impact"), i18n_text("Pedagogie", "Education")],
    )
    
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if public_df.empty:
        st.info("Aucune donnÃ©e disponible pour l'instant.")
    else:
        total_megots = public_df.get('megots', pd.Series(dtype=int)).fillna(0).sum()
        tot_dechets = public_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
        
        # Nouvelles Ã©quivalences "Grand Public"
        bouteilles_evitees = int(tot_dechets * 33)
        km_voiture_eq = int(tot_dechets * 19)
        eau_preservee = total_megots * IMPACT_CONSTANTS.get('EAU_PROTEGEE_PER_MEGOT_L', 500)
        
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### ðŸŒ Impact RÃ©el de la CommunautÃ©")
        col_r1, col_r2, col_r3 = st.columns(3)
        
        with col_r1:
            st.metric(label="ðŸ’§ Eau PrÃ©servÃ©e", value=f"{eau_preservee:,} L", help="1 seul mÃ©got peut polluer jusqu'Ã  500 litres d'eau.")
        with col_r2:
            st.metric(label="ðŸ¾ Ã‰quivalent Bouteilles", value=f"{bouteilles_evitees:,}", help="1 kg de dÃ©chets Ã©quivaut environ au poids de 33 bouteilles plastiques de 1.5L.")
        with col_r3:
            st.metric(label="ðŸš— CO2 Ã‰vitÃ© (km voiture)", value=f"{km_voiture_eq:,} km", help="Ã‰missions Ã©vitÃ©es sur le cycle de vie.")
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
        st.markdown("### ðŸ§  Le Saviez-vous ?")
        
        z1, z2 = st.columns(2)
        with z1:
            st.info("**Recyclage vs DÃ©cyclage** : Le verre se recycle Ã  l'infini, mais le plastique perd souvent en qualitÃ©, c'est le *downcycling*.")
        with z2:
            st.success("**Le Poids des MÃ©gots** : Un seul mÃ©got contient des milliers de substances chimiques nocives qui mettent 12 ans Ã  se dÃ©composer.")
        st.markdown('</div>', unsafe_allow_html=True)
            
        with st.expander("âš¡ Ã‰nergie Primaire vs Ã‰lectricitÃ©"):
            st.write('''
            On confond souvent les deux ! 
            - **L'Ã©lectricitÃ©** n'est pas une source, c'est un *vecteur* (un moyen de la transporter). 
            - **L'Ã©nergie primaire** est ce que l'on extrait de la nature (PÃ©trole, Vent, Soleil, Uranium, Charbon).
            
            Recycler de l'aluminium (canettes) permet d'Ã©conomiser **jusqu'Ã  95%** de l'Ã©nergie primaire nÃ©cessaire pour l'extraire de la mine (la bauxite), limitant ainsi la destruction d'Ã©cosystÃ¨mes.
            ''')
            
        with st.expander("ðŸ“Š Qu'est-ce que l'ACV (Analyse du Cycle de Vie) ?"):
            st.write('''
            L'Analyse du Cycle de Vie est la mÃ©thode d'Ã©valuation environnementale systÃ©mique :
            1. **L'Extraction** des matiÃ¨res premiÃ¨res (Le *Sac Ã  Dos Ã‰cologique*, c'est-Ã -dire les milliers de litres d'eau et matÃ©riaux invisibles dÃ©placÃ©s).
            2. **La Fabrication** en usine.
            3. **Le Transport** et la logistique.
            4. **L'Utilisation**, parfois gourmande en Ã©nergie.
            5. **La Fin de vie**, oÃ¹ les dÃ©chets deviennent de la pollution ou retournent dans la boucle matÃ©rielle via le recyclage.
            ''')
            
        with st.expander("ðŸ’§ Microplastiques : Invisible et Universel"):
            st.write('''
            Lorsqu'un plastique se dÃ©grade dans la nature, il ne disparait jamais : il se fragmente en **microplastiques** sous l'effet du soleil (UV) et des frottements.
            Ces particules intÃ¨grent la chaÃ®ne alimentaire. On estime que chaque humain ingÃ¨re **l'Ã©quivalent d'une carte de crÃ©dit en plastique par semaine** (soit environ 5 grammes) via l'eau potable, le sel et l'alimentation.
            ''')

# ------------------------------------------------------------------------
# ONGLET : DÃ‰RÃˆGLEMENT CLIMATIQUE (EDUCATION)
# ------------------------------------------------------------------------
with tab_climate:
    render_tab_header(
        icon="\U0001F30D",
        title_fr="Comprendre le dereglement climatique",
        title_en="Understanding Climate Disruption",
        subtitle_fr="Une base scientifique claire pour renforcer l'action citoyenne locale.",
        subtitle_en="A clear scientific baseline to strengthen local citizen action.",
        compact=True,
    )
    st.write("Parce qu'agir pour la planÃ¨te commence par comprendre les enjeux. Voici les informations essentielles validÃ©es par la science pour construire votre culture Ã©cologique.")

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
        st.markdown("### ðŸ“ˆ Les Constats du GIEC")
        st.info("Le GIEC (Groupe d'experts intergouvernemental sur l'Ã©volution du climat) synthÃ©tise les travaux de milliers de chercheurs Ã  travers le monde.")
        st.write("""
        - **Origine humaine indiscutable :** Le rÃ©chauffement actuel (+1.1Â°C depuis l'Ã¨re prÃ©industrielle) est causÃ© sans Ã©quivoque par les activitÃ©s humaines (combustion d'Ã©nergies fossiles, dÃ©forestation).
        - **ConsÃ©quences visibles :** Multiplication des Ã©vÃ©nements extrÃªmes (canicules, inondations, sÃ©cheresses), montÃ©e des eaux, fonte des glaces.
        - **L'urgence d'agir :** Chaque fraction de degrÃ© compte. Limiter le rÃ©chauffement Ã  1.5Â°C au lieu de 2Â°C permet d'Ã©viter des points de basculement irrÃ©versibles.
        """)
        st.image("https://www.statistiques.developpement-durable.gouv.fr/sites/default/files/2019-12/giec-ar5-wg1-spm-fig1-fr_0.png", caption="Ã‰volution de la tempÃ©rature mondiale combinÃ©e des terres et des ocÃ©ans (Source: SynthÃ¨se GIEC)")
        
    with col_c2:
        st.markdown("### ðŸŽ¯ L'Accord de Paris")
        st.success("AdoptÃ© en 2015 lors de la COP21, c'est le premier accord universel sur le climat.")
        st.write("""
        - **Objectif principal :** Maintenir l'augmentation de la tempÃ©rature moyenne mondiale bien en dessous de 2Â°C, et de prÃ©fÃ©rence Ã  1.5Â°C, par rapport aux niveaux prÃ©industriels.
        - **NeutralitÃ© carbone :** Atteindre l'Ã©quilibre entre les Ã©missions et les absorptions de gaz Ã  effet de serre d'ici la deuxiÃ¨me moitiÃ© du siÃ¨cle.
        - **La France :** S'est engagÃ©e via la StratÃ©gie Nationale Bas-Carbone (SNBC) Ã  rÃ©duire ses Ã©missions d'ici 2050.
        """)
        
    st.markdown("---")
    
    st.markdown("### ðŸŒŽ Les 9 Limites PlanÃ©taires")
    st.write("Le climat n'est qu'une des 9 limites planÃ©taires dÃ©finies par le Stockholm Resilience Centre. DÃ©passer ces limites menace la stabilitÃ© de l'Ã©cosystÃ¨me terrestre dont nous dÃ©pendons.")
    
    col_l1, col_l2 = st.columns([2, 3])
    with col_l1:
        st.write("""
        Aujourd'hui, **6 des 9 limites sont dÃ©jÃ  franchies** au niveau mondial :
        1. ðŸ”´ Le changement climatique
        2. ðŸ”´ L'Ã©rosion de la biodiversitÃ©
        3. ðŸ”´ La perturbation des cycles de l'azote et du phosphore
        4. ðŸ”´ Le changement d'usage des sols (dÃ©forestation)
        5. ðŸ”´ L'introduction d'entitÃ©s nouvelles (pollutions chimiques, plastiques)
        6. ðŸ”´ L'utilisation de l'eau verte (eau douce dans les sols)
        
        *Le ramassage de dÃ©chets agit directement sur la limite 5 (entitÃ©s nouvelles / plastiques) !*
        """)
    with col_l2:
        st.image("https://www.notre-environnement.gouv.fr/IMG/png/limites_planetaires_2023_-_fr.png", caption="Ã‰tat des 9 limites planÃ©taires en 2023 (Source: Stockholm Resilience Centre / Notre-Environnement.gouv)")
        
    st.markdown("---")
    st.info("ðŸ’¡ **Pour aller plus loin :** Pour approfondir ces sujets, n'hÃ©sitez pas Ã  participer Ã  une **Fresque du Climat**, un atelier ludique et collaboratif de 3h basÃ© sur les rapports du GIEC, ou Ã  consulter les rapports de l'ADEME.")

# ------------------------------------------------------------------------
# ONGLET : ESPACE ELUS (DASHBOARD COLLECTIVITES)
# ------------------------------------------------------------------------
with tab_elus:
    render_tab_header(
        icon="\U0001F3DB\ufe0f",
        title_fr="Espace Territoires",
        title_en="Territories Dashboard",
        subtitle_fr="Analysez l'impact local, les zones de vigilance et les leviers de decision pour votre collectivite.",
        subtitle_en="Analyze local impact, risk areas, and decision levers for your municipality.",
        chips=[i18n_text("Collectivites", "Municipalities"), i18n_text("Pilotage", "Steering")],
        compact=True,
    )
    st.write("ce portail permet de visualiser l'impact de l'action citoyenne sur votre commune.")
    
    # Extraire une liste de Villes/Codes Postaux basique Ã  partir des actions approuvÃ©es
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
        # Une mÃ©thode robuste pour des adresses non normalisÃ©es est de demander Ã  l'Ã©lu de filtrer par "Mot ClÃ©"
        villes_uniques = ["Paris", "Versailles", "Montreuil", "Lyon", "Marseille", "Toulouse"] # Liste par dÃ©faut si parsing complexe
        
        extracted_cities = set()
        for addr in approved_df['adresse'].dropna():
            match = re.search(r'\b\d{5}\s+([A-Z-a-zÃ€-Ã¿\s]+)\b', addr)
            if match:
                extracted_cities.add(match.group(1).strip())
            else:
                # Fallback : on prend le dernier segment aprÃ¨s une virgule s'il y en a une, sinon le dernier mot
                parts = addr.split(',')
                if len(parts) > 1: extracted_cities.add(parts[-1].strip())
        
        if extracted_cities:
            villes_uniques = sorted(list(extracted_cities))
        
        st.info("ðŸ’¡ Saisissez le nom de votre commune (ou un mot clÃ© de votre territoire) pour isoler les statistiques.")
        
        # Laisser Ã  l'Ã©lu l'opportunitÃ© de taper son arrondissement/ville
        recherche_ville = st.selectbox("SÃ©lectionnez votre Territoire :", options=["-- SÃ©lectionnez --"] + list(villes_uniques) + ["[Autre Recheche Manuelle]"])
        
        if recherche_ville == "[Autre Recheche Manuelle]":
            recherche_ville = st.text_input("Tapez le nom de la ville ou de l'arrondissement librement :")
            
        if recherche_ville and recherche_ville != "-- SÃ©lectionnez --":
            # Filtrer le DataFrame
            df_ville = approved_df[approved_df['adresse'].str.contains(recherche_ville, case=False, na=False)]
            
            if df_ville.empty:
                st.warning(f"Aucune action bÃ©nÃ©vole rÃ©pertoriÃ©e correspondante Ã  '{recherche_ville}' pour le moment.")
            else:
                nb_actions = len(df_ville)
                tot_megots = df_ville.get('megots', pd.Series(dtype=int)).fillna(0).sum()
                tot_dechets = df_ville.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
                
                economie = (tot_dechets / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
                eau_save = tot_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
                
                # RÃ©cupÃ©rer les points critiques (si des zones de rÃ©currence sont dÃ©tectÃ©es sur cette ville)
                points_critiques = get_critical_zones(df_ville)
                
                st.success(f"recherche : **{nb_actions} actions citoyennes** recensÃ©es sur {recherche_ville}")
                
                col1, col2, col3 = st.columns(3)
                col1.metric("matiÃ¨res collectÃ©es", f"{tot_dechets:.1f} kg")
                col2.metric("eau prÃ©servÃ©e", f"{eau_save:,} litres")
                col3.metric("Ã©conomie estimÃ©e", f"{economie:.2f} â‚¬", help="coÃ»t de traitement Ã©vitÃ© pour la collectivitÃ©.")
                
                st.markdown("---")
                st.subheader(f"zones de vigilance ({len(points_critiques)} lieux)")
                if points_critiques:
                    st.info(f"ces **{len(points_critiques)} lieux** font l'objet de soins rÃ©guliers par nos brigades. un renforcement des infrastructures locales (cendriers, bacs) pourrait aider Ã  pÃ©renniser cette propretÃ© :")
                    if isinstance(points_critiques, dict):
                        for addr, data in points_critiques.items():
                            st.write(f"- ðŸ“ **{addr}** : SignalÃ©e {data['count']} fois. MÃ©morisÃ© se re-pollue tous les **{data['delai_moyen']} jours**.")
                    else:
                        for z in points_critiques:
                            st.write(f"- ðŸ“ {z}")
                else:
                    st.success("aucune zone de rÃ©currence critique dÃ©tectÃ©e sur cette sÃ©lection.")

                # --- Maintenance & Backup ---
                st.markdown("---")
                st.subheader("maintenance & sauvegarde")
                col_b1, col_b2 = st.columns(2)
                with col_b1:
                    if st.button("gÃ©nÃ©rer une sauvegarde (json)"):
                        all_data = pd.DataFrame(get_submissions_by_status(None))
                        json_data = all_data.to_json(orient='records', force_ascii=False)
                        st.download_button(
                            label="tÃ©lÃ©charger la sauvegarde",
                            data=json_data,
                            file_name=f"backup_cleanmymap_{datetime.now().strftime('%Y%m%d')}.json",
                            mime="application/json"
                        )
                with col_b2:
                    st.info("ðŸ’¡ pensez Ã  faire une sauvegarde avant toute mise Ã  jour majeure du schÃ©ma de base de donnÃ©es.")

                st.markdown("---")
                if st.button("se dÃ©connecter"):
                    st.logout()
                # --- NOUVEAU : Label Ã‰co-Quartier ---
                st.markdown("---")
                st.subheader("label Ã©co-quartier citoyen")
                eligible_villes = get_eco_districts(approved_df)
                if recherche_ville.lower() in [v.lower() for v in eligible_villes]:
                    st.success(f"ðŸ… fÃ©licitations ! **{recherche_ville}** est labellisÃ© **Ã©co-quartier citoyen**.")
                    certif_eco = build_certificat_eco_quartier(recherche_ville)
                    st.download_button(
                        label=f"tÃ©lÃ©charger le diplÃ´me Ã©co-quartier ({recherche_ville})",
                        data=certif_eco,
                        file_name=f"diplome_eco_quartier_{recherche_ville}.pdf",
                        mime="application/pdf"
                    )
                else:
                    st.info("ce territoire ne remplit pas encore les critÃ¨res du label (180 jours sans pollution signalÃ©e).")

                st.markdown("---")
                certif_pdf = build_certificat_territorial(df_ville, recherche_ville, points_critiques)
                st.download_button(
                    label=f"tÃ©lÃ©charger le certificat d'impact ({recherche_ville})",
                    data=certif_pdf,
                    file_name=f"certificat_impact_{recherche_ville}.pdf",
                    mime="application/pdf"
                )
                
                # Twitter/LinkedIn sharing intents
                share_text = f"fier d'agir pour {recherche_ville} avec les brigades vertes ! dÃ©jÃ  {tot_dechets:.1f}kg de dÃ©chets retirÃ©s. rejoignez-nous sur cleanwalk ðŸŒ¿"
                encoded_text = requests.utils.quote(share_text)
                st.markdown(f"""
                [partager sur linkedin](https://www.linkedin.com/sharing/share-offsite/?url=https://cleanwalk.streamlit.app&text={encoded_text}) â€¢ 
                [partager sur twitter/x](https://twitter.com/intent/tweet?text={encoded_text})
                """, unsafe_allow_html=True)
                
                # --- NOUVEAU : LABEL ECO-QUARTIER ---
                st.markdown("---")
                st.subheader("ðŸ† Label Ã‰co-Quartier Citoyen")
                st.write("Analyse automatique de la prÃ©servation de votre territoire sur les 180 derniers jours.")
                
                labels_eligibles = get_eco_quartiers(df_ville)
                if labels_eligibles:
                    st.success(f"ðŸŒŸ FÃ©licitations ! **{len(labels_eligibles)} zone(s)** de votre commune sont Ã©ligibles au Label Ã‰co-Quartier (ZÃ©ro pollution sur 180 jours).")
                    selected_label = st.selectbox("Choisissez une zone pour gÃ©nÃ©rer son certificat :", options=labels_eligibles)
                    
                    if selected_label:
                        certif_eco = build_certificat_eco_quartier(selected_label)
                        st.download_button(
                            label=f"ðŸ¥‡ TÃ©lÃ©charger le Label pour '{selected_label}'",
                            data=certif_eco,
                            file_name=f"Label_EcoQuartier_{selected_label.replace(' ', '_')}.pdf",
                            mime="application/pdf"
                        )
                else:
                    st.info("Aucune zone n'a encore atteint le seuil des 180 jours de propretÃ© continue avec signalements de contrÃ´le. Encouragez vos citoyens Ã  signaler les zones propres pour activer le label !")

                # --- NOUVEAU : LETTRE AU MAIRE ---
                st.markdown("---")
                st.subheader("âœ‰ï¸ GÃ©nÃ©ration de Courrier Officiel")
                st.write("GÃ©nÃ©rez un courrier officiel Ã  destination de la mairie, avec les statistiques rÃ©elles de votre territoire et des recommandations d'infrastructure concrÃ¨tes.")
                
                with st.form("lettre_maire_form"):
                    col_lm1, col_lm2 = st.columns(2)
                    with col_lm1:
                        nom_maire = st.text_input("Nom du Maire / Ã‰lu", placeholder="Ex: Monsieur le Maire Pierre Dupont")
                        nom_association_lettre = st.text_input("ExpÃ©diteur (Association)", placeholder="Ex: Association Clean Walk Paris 10")
                    with col_lm2:
                        date_lettre = st.date_input("Date du courrier", value=date.today())
                        objet_lettre = st.text_input("Objet (optionnel)", value=f"Rapport d'impact citoyen â€” Action bÃ©nÃ©vole Ã  {recherche_ville}")
                    gen_lettre_btn = st.form_submit_button("ðŸ“„ GÃ©nÃ©rer la Lettre (PDF)")
                
                if gen_lettre_btn:
                    def build_lettre_maire(nom_m, nom_asso, ville, tot_d, tot_meg, n_act, pts_crit, d_lettre, objet) -> bytes:
                        from fpdf import FPDF
                        pdf = FPDF()
                        pdf.add_page()
                        pdf.set_margins(20, 20, 20)
                        pdf.set_auto_page_break(auto=True, margin=25)
                        
                        # En-tÃªte association
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
                            f"Nous avons l'honneur de vous adresser le prÃ©sent rapport d'activitÃ© concernant "
                            f"les actions citoyennes de dÃ©pollution menÃ©es sur le territoire de {ville}.\n\n"
                            f"Au cours de la pÃ©riode analysÃ©e, nos brigades bÃ©nÃ©voles ont rÃ©alisÃ© {n_act} interventions, "
                            f"permettant de retirer {tot_d:.1f} kg de dÃ©chets et {tot_meg:,} mÃ©gots de la voie publique."
                            f" Ces actions ont prÃ©servÃ© environ {eau:,} litres d'eau de la contamination toxique "
                            f"et reprÃ©sentent une Ã©conomie estimÃ©e Ã  {eco:,.0f} â‚¬ pour les services de propretÃ© de votre commune.\n\n"
                        )
                        pdf.multi_cell(0, 6, _txt(corps))
                        
                        if pts_crit:
                            pdf.set_font('Helvetica', 'B', 10)
                            pdf.cell(0, 6, _txt("Zones de rÃ©currence identifiÃ©es (Points noirs) :"), ln=True)
                            pdf.set_font('Helvetica', '', 10)
                            if isinstance(pts_crit, dict):
                                for addr, data in list(pts_crit.items())[:5]:
                                    pdf.multi_cell(0, 5, _txt(f"- {addr} : {data['count']} passages bÃ©nÃ©voles, re-pollution tous les {data['delai_moyen']} jours en moyenne."))
                            pdf.ln(3)
                            pdf.multi_cell(0, 6, _txt(
                                "Pour limiter la rÃ©cidive de pollution sur ces zones, nous vous recommandons "
                                "d'envisager l'installation d'infrastructures de collecte supplÃ©mentaires "
                                "(cendriers de rue, corbeilles), ainsi que des campagnes de sensibilisation ciblÃ©es."
                            ))
                        
                        pdf.ln(6)
                        pdf.multi_cell(0, 6, _txt(
                            "Nous restons Ã  votre disposition pour tout Ã©change ou partenariat visant Ã  "
                            "coordonner nos actions avec les services municipaux de propretÃ©.\n\n"
                            "Dans l'attente d'une rÃ©ponse favorable, veuillez agrÃ©er, " + nom_m + ", "
                            "l'expression de nos salutations distinguÃ©es.\n\n"
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
                    
                    # AperÃ§u HTML de la lettre
                    st.markdown(f"""
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; font-family: 'Georgia', serif; line-height: 1.7; color: #1e293b; margin: 16px 0;">
                        <div style="color: #059669; font-weight: bold; font-size: 14px;">{nom_association_lettre or 'Clean My Map'}</div>
                        <div style="color: #94a3b8; font-size: 11px; margin-bottom: 16px;">contact@cleanmymap.fr</div>
                        <div style="border-top: 1px solid #10b981; margin-bottom: 16px;"></div>
                        <div><strong>{nom_maire or 'Monsieur/Madame le Maire'}</strong><br>Mairie de {recherche_ville}</div>
                        <div style="text-align: right; font-size: 12px; color: #64748b;">Le {date_lettre.strftime('%d/%m/%Y')}</div>
                        <p><strong>Objet : {objet_lettre}</strong></p>
                        <p>{nom_maire or 'Monsieur/Madame le Maire'},</p>
                        <p>Nos brigades bÃ©nÃ©voles ont rÃ©alisÃ© <strong>{nb_actions} interventions</strong> sur votre territoire, retirant <strong>{tot_dechets:.1f} kg</strong> de dÃ©chets et <strong>{int(tot_megots):,}</strong> mÃ©gots â€” soit une Ã©conomie estimÃ©e Ã  <strong>{(tot_dechets/1000)*IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']:,.0f} â‚¬</strong> pour la collectivitÃ©.</p>
                        <p style="color: #64748b; font-style: italic;">[...] Cordialement, {nom_association_lettre or 'Clean My Map'}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.download_button(
                        "â¬‡ï¸ TÃ©lÃ©charger la lettre officielle (PDF)",
                        data=lettre_bytes,
                        file_name=f"lettre_mairie_{recherche_ville}_{date_lettre}.pdf",
                        mime="application/pdf",
                        width="stretch"
                    )
    else:
        st.info("Aucune donnÃ©e publique approuvÃ©e disponible pour le moment afin d'alimenter cet espace.")

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
# ONGLET : ACTEURS ENGAGÃ‰S (ASSOCIATIONS & COMMERCES)
# ------------------------------------------------------------------------
with tab_partners:
    render_tab_header(
        icon="\U0001F91D",
        title_fr="Partenaires engages",
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
# ONGLET : MÃ‰TÃ‰O & ACTION
# ------------------------------------------------------------------------
with tab_weather:
    render_tab_header(
        icon="\U0001F324\ufe0f",
        title_fr="Meteo & planification",
        title_en="Weather & Planning",
        subtitle_fr="Identifiez les meilleures fenetres meteo pour planifier des operations efficaces.",
        subtitle_en="Identify the best weather windows to plan effective operations.",
        chips=[i18n_text("Prevision", "Forecast"), i18n_text("Timing", "Timing")],
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
            ax_p.set_ylabel('Pluie (mm)', fontsize=9); ax_t.set_ylabel('Temp. max (Â°C)', fontsize=9, color='#f97316')
            ax_p.axhline(2, color='#ef4444', linestyle='--', linewidth=1, alpha=0.6)
            ax_p.tick_params(axis='x', rotation=25, labelsize=8)
            plt.title("Fenetres d'action (vert = ideal)", fontsize=11, fontweight='bold', color='#1e293b')
            fig_w.tight_layout(); st.pyplot(fig_w); plt.close(fig_w)

            best = df_weather[df_weather['Optimal'] & (df_weather['Date'] >= pd.Timestamp.today())]
            if not best.empty:
                nb = best.iloc[0]
                st.success(f"âœ… **Meilleure fenetre** : {nb['Date'].strftime('%A %d %B')} - {nb['Temp. max']:.0f}Â°C, {nb['Pluie (mm)']:.1f}mm pluie, vent {nb['Vent max (km/h)']:.0f} km/h.")
            else:
                st.warning("âš ï¸ Pas de fenetre ideale dans les 7 prochains jours. Consultez a nouveau dans quelques jours.")

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
                        st.markdown(f"- {slot['time'].strftime('%d/%m %H:%M')} : pluie {slot['rain']:.1f} mm, vent {slot['wind']:.0f} km/h, {slot['temp']:.0f}Â°C")

                next_48h = h_df[(h_df["time"] >= now_ts) & (h_df["time"] <= now_ts + pd.Timedelta(hours=48))]
                heavy_rain = next_48h["rain"].max() if not next_48h.empty else 0
                strong_wind = next_48h["wind"].max() if not next_48h.empty else 0
                if heavy_rain >= 4:
                    st.warning(f"⚠️ Alerte pluie: cumul horaire eleve detecte (max {heavy_rain:.1f} mm/h sur 48h).")
                if strong_wind >= 45:
                    st.warning(f"⚠️ Alerte vent: rafales fortes detectees (max {strong_wind:.0f} km/h sur 48h).")
        else:
            st.info("DonnÃ©es mÃ©tÃ©o indisponibles (API Open-Meteo). RÃ©essayez dans quelques instants.")

    with col_w2:
        st.markdown('<div class="premium-card">', unsafe_allow_html=True)
        st.subheader("ðŸ“† Historique mensuel")
        if not all_public_df.empty and 'date' in all_public_df.columns:
            df_hist = all_public_df.copy()
            df_hist['date_dt'] = pd.to_datetime(df_hist['date'], errors='coerce')
            monthly_count = df_hist.dropna(subset=['date_dt']).groupby(df_hist['date_dt'].dt.month).size()
            mn = {1:'Jan',2:'FÃ©v',3:'Mar',4:'Avr',5:'Mai',6:'Jun',7:'Jul',8:'AoÃ»',9:'Sep',10:'Oct',11:'Nov',12:'DÃ©c'}
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
        subtitle_fr="Comparez les zones par performance, intensite et recurrence de pollution.",
        subtitle_en="Compare zones by performance, intensity, and pollution recurrence.",
        chips=[i18n_text("Benchmark", "Benchmark"), i18n_text("Priorisation", "Prioritization")],
    )

    df_cmp = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))

    if df_cmp.empty:
        st.info("Pas encore de donnÃ©es disponibles.")
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
                ["Score IPC", "kg / action", "MÃ©gots / bÃ©nÃ©vole", "Nombre d'actions", "kg / 10k habitants", "MÃ©gots / kmÂ²"],
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
                    "MÃ©gots / bÃ©nÃ©vole": "megots_par_benevole", "Nombre d'actions": "nb_actions",
                    "kg / 10k habitants": "kg_par_10k_hab", "MÃ©gots / kmÂ²": "megots_par_km2"}
        grp = grp.sort_values(sort_map[sort_by], ascending=False).reset_index(drop=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        for i, row in grp.head(15).iterrows():
            medal = "ðŸ¥‡" if i == 0 else "ðŸ¥ˆ" if i == 1 else "ðŸ¥‰" if i == 2 else f"#{i+1}"
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
                        {int(row['nb_actions'])} actions Â· {row['total_kg']:.1f} kg Â· {int(row['total_megots']):,} mÃ©gots</div>
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
            'total_megots': 'MÃ©gots', 'total_benevoles': 'BÃ©nÃ©voles', 'kg_par_action': 'kg/action',
            'megots_par_benevole': 'MÃ©gots/bÃ©n.', 'score_ipc': 'Score IPC',
            'kg_par_10k_hab': 'kg/10k hab', 'megots_par_km2': 'MÃ©gots/kmÂ²'})
        st.dataframe(grp_disp[['Zone','Actions','Total kg','MÃ©gots','BÃ©nÃ©voles','kg/action','MÃ©gots/bÃ©n.','kg/10k hab','MÃ©gots/kmÂ²','Score IPC']],
                     hide_index=True, width=900)
        st.download_button("â¬‡ï¸ Exporter (CSV)", data=grp_disp.to_csv(index=False).encode('utf-8'),
                           file_name="comparaison_territoriale.csv", mime="text/csv")

# ------------------------------------------------------------------------
# ONGLET : ADMIN
# ------------------------------------------------------------------------
with tab_admin:
    render_tab_header(
        icon="\u2699\ufe0f",
        title_fr="Espace administrateur",
        title_en="Admin Workspace",
        subtitle_fr="Validez les contributions, pilotez la carte publique et exportez les donnees scientifiques.",
        subtitle_en="Validate submissions, manage the public map, and export scientific datasets.",
        chips=[i18n_text("Validation", "Moderation"), i18n_text("Donnees", "Data")],
        compact=True,
    )
    st.caption("Connexion Google obligatoire pour les administrateurs")


    st.subheader("Carte publique (actions validÃ©es)")
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)

    if not approved_df.empty:
        critical_zones = get_critical_zones(approved_df)
        map_df = approved_df.dropna(subset=["lat", "lon"]).copy()
        
        if not map_df.empty:
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
            # --- Version Admin de la carte ---
            m_admin = folium.Map(location=[center_lat, center_lon], zoom_start=11, tiles=None)
            folium.TileLayer('OpenStreetMap', name='Fond Clair (DÃ©faut)').add_to(m_admin)
            folium.TileLayer(
                tiles='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                name='Fond Sombre',
                attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            ).add_to(m_admin)
            folium.TileLayer(
                tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                name='Vue Satellite',
                attr='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            ).add_to(m_admin)
            
            folium.LayerControl(position='topright', collapsed=True).add_to(m_admin)
            
            features = []
            for _, row in map_df.iterrows():
                is_critical = row.get('adresse', '') in critical_zones
                is_clean = row.get('est_propre', False)
                is_business = row.get('type_lieu') == "Ã‰tablissement EngagÃ© (Label)"
                
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
                    
                popup_html = f"<b>{row.get('type_lieu', 'Lieu')}</b><br>Asso: {row.get('association', 'Inconnu')}<br>MÃ©gots: {int(row.get('megots', 0))}<br>DÃ©chets: {float(row.get('dechets_kg', 0))} kg<br>Statut: {'âœ¨ Propre' if is_clean else 'ðŸ—‘ï¸ NettoyÃ©'}"
                if is_business:
                    popup_html = f"<b>ðŸŽ–ï¸ {row.get('type_lieu')}</b><br>Nom: {row.get('association')}<br>{row.get('commentaire', '')}"
                
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
            show_flow_ai = st.checkbox("Afficher l'IA de flux (entonnoirs Ã  pollution)", value=False)
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
                st.success(f"{len(sinks)} entonnoirs dÃ©tectÃ©s")

            st_folium(m_admin, width=900, height=500, returned_objects=[])
        
        st.dataframe(
            approved_df[["date", "type_lieu", "adresse", "benevoles", "megots", "dechets_kg"]],
            width="stretch",
            hide_index=True,
        )

        st.markdown("---")
        st.subheader("science citoyenne : export e-prtr")
        st.write("gÃ©nÃ©rez un jeu de donnÃ©es anonymisÃ© respectant les standards europÃ©ens pour la recherche.")
        
        if st.button("prÃ©parer l'export scientifique (csv)"):
            science_df = approved_df.copy()
            
            # Anonymisation
            science_df['anonymized_id'] = science_df['nom'].apply(anonymize_contributor)
            
            # Extraction annÃ©e
            science_df['reporting_year'] = pd.to_datetime(science_df['date'], errors='coerce').dt.year
            
            # Mapping E-PRTR simplifiÃ©
            rows = []
            for _, row in science_df.iterrows():
                # On sÃ©pare mÃ©gots et dÃ©chets pour le format long E-PRTR
                if row.get('megots', 0) > 0:
                    rows.append({
                        'reporting_year': row['reporting_year'],
                        'latitude': row['lat'],
                        'longitude': row['lon'],
                        'pollutant_name': 'mÃ©gots (cigarette butts)',
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
                        'pollutant_name': 'dÃ©chets divers (mixed waste)',
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
                    label="tÃ©lÃ©charger le fichier e-prtr (.csv)",
                    data=csv_buffer.getvalue(),
                    file_name=f"cleanwalk_eper_export_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )
                st.success("votre jeu de donnÃ©es anonymisÃ© est prÃªt.")
            else:
                st.warning("aucune donnÃ©e d'impact (mÃ©gots/dÃ©chets) Ã  exporter.")
    else:
        st.info("Aucune action validÃ©e pour le moment.")

    st.subheader("Espace administrateur âš™ï¸")

    if not ADMIN_SECRET_CODE:
        # Fallback to check st.secrets if os.getenv failed
        try:
            ADMIN_SECRET_CODE = st.secrets.get("CLEANMYMAP_ADMIN_SECRET_CODE", "")
        except Exception:
            ADMIN_SECRET_CODE = ""
    
    if not ADMIN_SECRET_CODE:
        st.error("Mot de passe administrateur non configurÃ© (CLEANMYMAP_ADMIN_SECRET_CODE).")
        st.stop()

    if "admin_authenticated" not in st.session_state:
        st.session_state["admin_authenticated"] = False

    if not st.session_state["admin_authenticated"]:
        secret_input = st.text_input("Code secret administrateur", type="password", key="admin_pwd_input")
        if st.button("Se connecter Ã  l'espace Admin", width="stretch"):
            if secret_input == ADMIN_SECRET_CODE:
                st.session_state["admin_authenticated"] = True
                st.rerun()
            else:
                st.error("Code incorrect.")
        st.stop()

    st.success("AccÃ¨s administrateur validÃ© âœ…")
    if st.button("Se dÃ©connecter de l'espace Admin"):
        st.session_state["admin_authenticated"] = False
        st.rerun()

    # Le contenu admin doit Ãªtre en dehors du bloc 'if st.button'
    pending = get_submissions_by_status('pending')

    if not pending:
        st.info("Aucune demande en attente.")
    else:
        st.markdown("### Pre-validation automatique")

        actor_types = [
            "Association ecologique",
            "Association humanitaire et sociale",
            "Commercant engage",
            "Association Ã©cologique",
            "CommerÃ§ant engagÃ©",
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
            with st.expander(f"#{i+1} â€¢ {row['date']} â€¢ {row['type_lieu']} â€¢ {row['adresse']}"):
                if check_flood_risk(row.get('lat'), row.get('lon'), row.get('adresse', ''), row.get('type_lieu', '')):
                    st.error("ðŸš¨ Zone humide : risque de dispersion des micro-plastiques Ã©levÃ©, intervention prioritaire requise")
                    
                st.write(
                    {
                        "Nom": row["nom"],
                        "Association": row["association"],
                        "Zone propre": row.get("est_propre", False),
                        "BÃ©nÃ©voles": row["benevoles"],
                        "DurÃ©e (min)": row["temps_min"],
                        "MÃ©gots": row["megots"],
                        "DÃ©chets (kg)": row["dechets_kg"],
                        "Plastique (kg)": row.get("plastique_kg", 0),
                        "Verre (kg)": row.get("verre_kg", 0),
                        "MÃ©tal (kg)": row.get("metal_kg", 0),
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
                if a.button("âœ… Approuver", key=f"approve_{row['id']}", width="stretch"):
                    update_submission_status(row['id'], 'approved')
                    
                    # DÃ©clencher l'enrichissement automatique si c'est un acteur engagÃ©
                    if row.get('type_lieu') in actor_types:
                        with st.spinner(f"Recherche d'informations pour {row['association']}..."):
                            auto_enrich_actor(row['id'], row['association'], row['type_lieu'], row['adresse'])
                    
                    st.rerun()
                if r.button("âŒ Refuser", key=f"reject_{row['id']}", width="stretch"):
                    update_submission_status(row['id'], 'rejected')
                    st.rerun()

    st.divider()
    st.caption("Export rapide des actions validÃ©es")
    db_approved = get_submissions_by_status('approved')
    if db_approved:
        approved_export_df = pd.DataFrame(db_approved)
        st.download_button(
            "â¬‡ï¸ TÃ©lÃ©charger CSV (actions validÃ©es)",
            data=approved_export_df.to_csv(index=False).encode("utf-8"),
            file_name="actions_validees.csv",
            mime="text/csv",
            width="stretch",
        )

