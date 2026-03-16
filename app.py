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
    add_spot, get_active_spots, calculate_user_points, get_leaderboard,
    add_mission_validation, get_mission_validation_summary
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

init_db()  # Initialisation de la BDD au démarrage

# Centralisation des Constantes d'Impact importée depuis src.config

# --- INTERNATIONALISATION (i18n) ---
TRANSLATIONS = {
    "fr": {
        "title": "Clean my Map • Protection Citoyenne",
        "tagline": "Visualisez, Agissez, Protégez.",
        "welcome": "Agir. Cartographier. Préserver.",
        "hero_subtitle": "Rejoignez le mouvement citoyen pour une planète plus propre. Chaque action compte, chaque geste est valorisé.",
        "impact_collectif": "📊 Notre Impact Collectif",
        "kg_removed": "kg de déchets retirés",
        "megots_collected": "mégots collectés",
        "citizens_engaged": "citoyens engagés",
        "evolution_title": "📈 Évolution des Ramassages (Cumulé)",
        "progression_title": "🏅 Votre Progression Personnelle",
        "pseudo_placeholder": "Ex: Jean_Vert",
        "check_grade": "Vérifier mon grade",
        "eco_impact_title": "💡 Impact Écologique Réel",
        "lang_select": "🌐 Langue / Language",
        "tab_declaration": "🎯 Déclarer une Action",
        "tab_map": "🗺️ Carte Interactive",
        "tab_trash_spotter": "📢 Trash Spotter",
        "tab_gamification": "🏆 Classement & Badges",
        "tab_community": "🤝 Rassemblements",
        "tab_sandbox": "🧪 Zone d'entraînement",
        "tab_pdf": "📄 Rapport Impact",
        "tab_guide": "📚 Guide Pratique",
        "tab_actors": "🤝 Partenaires Engagés",
        "tab_history": "📋 Historique",
        "tab_route": "🎯 Planifier (IA)",
        "tab_recycling": "♻️ Seconde Vie",
        "tab_climate": "🌍 Enjeux Climatiques",
        "tab_elus": "🏛️ Espace Collectivités",
        "tab_kit": "📱 Kit Terrain",
        "tab_home": "📊 Notre Impact",
        "tab_weather": "🌤️ Météo",
        "tab_compare": "🏙️ Comparaison",
        "tab_admin": "⚙️ Validation Admin",
        "eco_mode": "Mode basse consommation",
        "theme_mode": "🎨 Thème",
        "theme_light": "Clair",
        "theme_dark": "Sombre",
        "nav_label": "📌 Navigation",
        "nav_action": "🚀 Lancer l'action",
        "nav_stats": "📊 Résultats & Impact",
        "nav_social": "🏆 Communauté",
        "nav_edu": "📚 Comprendre & Apprendre",
        "nav_admin": "⚙️ Administration & Outils",
        "eau_preserved": "Eau préservée",
        "co2_avoided": "CO2 évité",
        "dechets_removed": "Déchets retirés",
        "megots_collected": "Mégots ramassés",
        "citizens_engaged": "Citoyens engagés",
    },
    "en": {
        "title": "Clean my Map • Citizen Protection",
        "tagline": "Visualize, Act, Protect.",
        "welcome": "Act. Map. Preserve.",
        "hero_subtitle": "Join the citizen movement for a cleaner planet. Every action counts, every gesture is valued.",
        "impact_collectif": "📊 Our Collective Impact",
        "kg_removed": "kg of waste removed",
        "megots_collected": "cigarette butts collected",
        "citizens_engaged": "engaged citizens",
        "evolution_title": "📈 Cleanup Evolution (Cumulative)",
        "progression_title": "🏅 Your Personal Progression",
        "pseudo_placeholder": "Ex: Green_John",
        "check_grade": "Check my grade",
        "eco_impact_title": "💡 Real Ecological Impact",
        "lang_select": "🌐 Language",
        "tab_declaration": "🎯 Declare an Action",
        "tab_map": "🗺️ Interactive Map",
        "tab_trash_spotter": "📢 Trash Spotter",
        "tab_gamification": "🏆 Leaderboard & Badges",
        "tab_community": "🤝 Meetups",
        "tab_sandbox": "🧪 Sandbox Zone",
        "tab_pdf": "📄 Impact Report",
        "tab_guide": "📚 Practical Guide",
        "tab_actors": "🤝 Engaged Partners",
        "tab_history": "📋 History",
        "tab_route": "🎯 Plan (IA)",
        "tab_recycling": "♻️ Second Life",
        "tab_climate": "🌍 Climate Issues",
        "tab_elus": "🏛️ Local Authorities",
        "tab_kit": "📱 Field Kit",
        "tab_home": "📊 Our Impact",
        "tab_weather": "🌤️ Weather",
        "tab_compare": "🏙️ Territorial Comparison",
        "tab_admin": "⚙️ Admin Validation",
        "eco_mode": "Eco Mode (Data Saver)",
        "theme_mode": "🎨 Theme",
        "theme_light": "Light",
        "theme_dark": "Dark",
        "nav_label": "📌 Navigation",
        "nav_action": "🚀 Start Action",
        "nav_stats": "📊 Results & Impact",
        "nav_social": "🏆 Community",
        "nav_edu": "📚 Learn & Understand",
        "nav_admin": "⚙️ Admin & Tools",
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
    """Calcule le badge et le grade d'un utilisateur d'après ses statistiques."""
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
    """Renvoie les textes de la bibliographie pour la méthodologie de l'app et du PDF."""
    if st.session_state.lang == "fr":
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
    page_icon="🗺️",
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

    /* Masquer les ancres automatiques des titres Streamlit (liens à côté des titres) */
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
            padding: 14px 16px 16px !important;
            margin-top: 6px !important;
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

        .right-nav-scroll {{
            max-height: 320px;
            overflow-y: auto;
            border: 1px solid var(--edge-soft);
            border-radius: 14px;
            padding: 10px 12px;
            background: var(--surface-2);
        }}

        .right-nav-scroll::-webkit-scrollbar {{
            width: 10px;
        }}

        .right-nav-scroll::-webkit-scrollbar-thumb {{
            background: color-mix(in srgb, var(--ink-3) 45%, transparent);
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: content-box;
        }}

        .right-nav-scroll [data-testid="stRadio"] label p,
        .right-nav-scroll [data-testid="stRadio"] label span {{
            color: var(--ink-1) !important;
            font-weight: 600;
        }}

        .rubric-buttons .stButton > button {{
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

            .right-nav-scroll {{
                max-height: 240px;
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
        format_func=lambda x: "Français" if x == "fr" else "English",
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
        help="Réduit l'usage des données pour une navigation plus sobre.",
        key="eco_mode_checkbox",
    )
    st.session_state.eco_mode = eco_mode
st.markdown('</div>', unsafe_allow_html=True)

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


def build_interactive_folium_map(map_df: pd.DataFrame) -> folium.Map:
    """Construit la carte Folium complète (couches, styles, popups, légende, timeline)."""
    # Fallback sur Paris si vide
    center_lat, center_lon = 48.8566, 2.3522
    zoom_start = 12

    if not map_df.empty:
        center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
        zoom_start = 11

    m = folium.Map(location=[center_lat, center_lon], zoom_start=zoom_start, tiles=None)

    folium.TileLayer('OpenStreetMap', name='Fond Clair (Défaut)').add_to(m)
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
    group_pollution = folium.FeatureGroup(name="⚠️ Pollution & Actions", show=True)
    cluster_pollution = MarkerCluster(name="🟣 Cluster Pollution (dense)", show=False, disableClusteringAtZoom=14)
    group_clean = folium.FeatureGroup(name="🌿 Zones Propres", show=True)
    group_business = folium.FeatureGroup(name="⭐ Acteurs Engagés", show=True)
    group_spots = folium.FeatureGroup(name="📢 Trash Spots (Signalisations)", show=True)

    active_spots = get_active_spots()
    for s in active_spots:
        folium.Marker(
            [s['lat'], s['lon']],
            popup=f"<b>⚠️ {s['type_dechet']}</b><br>Signalé par {s['reporter_name']}<br><i>Aidez-nous à nettoyer !</i>",
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
            popup=f"<b>🗑️ Info Officielle</b><br>Type: {b.get('type')}<br>Propriétaire: Ville de Paris"
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
            is_business = row.get('type_lieu') == "Établissement Engagé (Label)"
            gap_alert = ""
            if not is_clean and not is_business and row.get('lat') and row.get('lon'):
                if 48.8 <= row['lat'] <= 48.9 and 2.2 <= row['lon'] <= 2.4:
                    is_gap, dist = calculate_infrastructure_gap(row['lat'], row['lon'], official_bins)
                    if is_gap:
                        gap_alert = f"Besoin d'équipement : poubelle la plus proche à {int(dist)}m"

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
                icon_char = '🚬' if row.get('megots', 0) > 300 else '🗑️'
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
                    tooltip=f"⚠️ Point Critique: {place_name}",
                    popup=f"<b>Point critique détecté</b><br>{place_name}<br><small>Priorité élevée pour intervention.</small>"
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
                <span style="font-size:16px;">🗺️</span>
                <div style="text-align:right;">
                    <b style="color:#10b981; font-size:14px; display:block;">BILAN 2026</b>
                    <small style="color:#94a3b8;">{_current_date}</small>
                </div>
            </div>
            <b style="color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">📋 ÉTAT DES LIEUX</b><br>
            <div style="margin:5px 0 10px 0; display:grid; grid-template-columns: 1fr 1fr; gap:2px;">
                <span><span style="color:#3498db;">●</span> Propres</span>
                <span><span style="color:#27ae60;">●</span> Nettoyés</span>
                <span><span style="color:#e67e22;">●</span> À inspecter</span>
                <span><span style="color:#8e44ad;">●</span> Pollués</span>
            </div>
            <div style="margin-bottom:10px;">
                <span>⚠️ <b>{_nb_critiques}</b> Point critique</span><br>
                <span>📍 <b>{_nb_actions}</b> Actions</span><br>
                <span>👥 <b>{_nb_volunteers}</b> Bénévoles</span><br>
                <span>🚬 <b>{_nb_megots:,}</b> Mégots</span><br>
                <span>♻️ <b>{_nb_kg:.1f} kg</b> Déchets</span>
            </div>
            <b style="color:#475569; font-size:10px; text-transform:uppercase; letter-spacing:0.05em;">🌍 IMPACT</b><br>
            <div style="margin-top:5px; background:rgba(16,185,129,0.05); padding:8px; border-radius:12px; border:1px solid rgba(16,185,129,0.1);">
                <span>💨 <b>{_co2:.1f} kg</b> CO₂ évité</span><br>
                <small style="color:#64748b; margin-left:18px;">🚗 { _km:,} km voiture</small><br>
                <span>💧 <b>{_eau:,} L</b> Eau préservée</span><br>
                <small style="color:#64748b; margin-left:18px;">🚿 {_douches:,} douches</small>
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
        HeatMap(heat_data, name="Heatmap de Saleté (Vue Thermique)", show=False, radius=25, blur=15).add_to(m)

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


@st.cache_data(ttl=3600)
def geocode_and_resolve(location_input: str):
    """
    Tente de résoudre un emplacement (GPS ou texte) en (lat, lon, adresse_formatee).
    """
    if not location_input or len(location_input.strip()) < 3:
        return None, None, location_input

    # 1. Tentative de lecture directe des coordonnées (Decimal)
    lat, lon = parse_coords(location_input)
    geolocator = Nominatim(user_agent="cleanmymap_app_v2")

    if lat is not None and lon is not None:
        try:
            # Récupération de l'adresse textuelle à partir des coordonnées
            location = geolocator.reverse((lat, lon), timeout=5)
            address = location.address if location else f"{lat}, {lon}"
            return lat, lon, address
        except Exception:
            return lat, lon, f"{lat}, {lon}"

    # 2. Tentative de géocodage textuel
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

def auto_enrich_actor(sub_id, actor_name, actor_type, location):
    """
    Simule une recherche automatique pour enrichir la fiche d'un acteur engagé.
    Cette fonction est appelée lors de la validation par l'administrateur.
    """
    try:
        # Nettoyage du nom pour le fallback URL
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', actor_name.lower())
        website_fallback = f"https://www.{clean_name}.fr"
        
        # Description par défaut (sera affichée si la recherche n'est pas remplacée par un agent)
        description = f"Structure engagée opérant à {location}. Reconnu pour ses actions en tant que {actor_type.lower()}."
        
        # On met à jour la base de données avec ces informations initiales
        update_submission_data(sub_id, description, website_fallback)
        return True
    except Exception as e:
        print(f"Erreur d'enrichissement : {e}")
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
    
    badge_icon = "🌱"
    level_name = "Éclaireur"
    level = 1
    
    if count_total >= 15:
        badge_icon, level_name, level = "👑", "Légende Citoyenne", 5
    elif count_total >= 10:
        badge_icon, level_name, level = "🏆", "Maître du Terrain", 4
    elif count_78 >= 3 or count_dirty >= 5:
        badge_icon, level_name, level = "🌳", "Gardien de la Ville", 3
    elif count_total >= 3:
        badge_icon, level_name, level = "🛡️", "Sentinelle", 2
        
    return f"{badge_icon} {level_name} (Niv. {level})"


def build_public_pdf(actions_df: pd.DataFrame, app_url: str, critical_zones: set = None) -> bytes:
    """Construit un rapport PDF complet (multi-pages) avec séparation stricte Récoltes/Lieux Propres."""
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
    pdf.cell(0, 8, _txt(f"Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}"), ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 12)
    pdf.multi_cell(
        0,
        7,
        _txt(
            "Ce rapport consolide deux types de données citoyennes : "
            "1. Les actions de dépollution (récoltes de déchets).\n"
            "2. Les signalements de propreté (zones sans pollution).\n\n"
            "Il permet d'orienter les politiques de propreté urbaine en identifiant les points noirs "
            "et en valorisant les zones préservées."
        ),
    )

    # ---------- PAGE 2 : ACTIONS DE DÉPOLLUTION ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("1. Bilan des actions de dépollution"), ln=True)
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, _txt(f"Nombre total de récoltes validées : {recoltes_count}"), ln=True)
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _txt("Impact cumulé :"), ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, _txt(f"- Mégots collectés : {total_megots:,}".replace(",", " ")), ln=True)
    pdf.cell(0, 6, _txt(f"- Déchets collectés : {total_dechets:.1f} kg"), ln=True)
    pdf.cell(0, 6, _txt(f"- Bénévoles mobilisés : {total_benevoles:,}".replace(",", " ")), ln=True)

    if recoltes_count and "date" in df_recoltes.columns:
        # (Graphique temporel uniquement pour les récoltes)
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
                ax.set_title("Évolution des récoltes (kg)")
                ax.set_xlabel("Mois")
                ax.set_ylabel("Kg")
                ax.tick_params(axis="x", rotation=45)
                fig.tight_layout()
                img_path = os.path.join(os.path.dirname(__file__), "data", "rapport_recoltes.png")
                fig.savefig(img_path)
                plt.close(fig)
                pdf.ln(6)
                pdf.image(img_path, x=15, w=180)

    # ---------- PAGE 3 : SIGNALEMENTS DE PROPRETÉ ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("2. Signalements de zones propres"), ln=True)
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        _txt(
            f"La communauté a effectué {propres_count} signalements de zones propres. "
            "Ces signalements sont essentiels pour cartographier les secteurs où la gestion des "
            "déchets est efficace ou là où le civisme est exemplaire."
        ),
    )
    pdf.ln(6)
    
    if propres_count:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, _txt("Dernières zones signalées propres :"), ln=True)
        pdf.set_font("Helvetica", "", 10)
        # Afficher les 10 dernières adresses propres
        recent_propres = df_propres.sort_values("date", ascending=False).head(10)
        for _, r in recent_propres.iterrows():
            pdf.cell(0, 6, _txt(f"✨ {r['date']} - {r['adresse']}"), ln=True)
    else:
        pdf.cell(0, 6, _txt("Aucun signalement de zone propre pour le moment."), ln=True)

    # ---------- PAGE 4 : ZONES CRITIQUES ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("4. Zones critiques à surveiller"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    if critical_zones:
        pdf.multi_cell(
            0,
            6,
            _txt(
                "Les zones ci-dessous présentent une récurrence de re-pollution. "
                "Elles constituent des candidats prioritaires pour l'installation de cendriers de rue, "
                "de corbeilles supplémentaires ou des actions renforcées de sensibilisation."
            ),
        )
        pdf.ln(4)
        if isinstance(critical_zones, dict):
            for addr, data in critical_zones.items():
                pdf.multi_cell(
                    0,
                    5,
                    _txt(
                        f"📍 {addr} : nettoyé {data['count']} fois, re-pollution tous les "
                        f"{data['delai_moyen']} jours en moyenne."
                    ),
                )
        else:
            for z in critical_zones:
                pdf.multi_cell(0, 5, _txt(f"📍 {z}"))
    else:
        pdf.multi_cell(
            0,
            6,
            _txt(
                "Aucune zone critique de re-pollution n'a encore été identifiée sur la période analysée. "
                "Cela peut signifier soit un territoire bien équipé, soit un besoin d'augmenter le volume de données."
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
            "Les déchets collectés sont une ressource : une partie peut être recyclée en nouveaux objets "
            "(bancs publics, textiles, matières premières secondaires). Cette section rapproche les volumes "
            "ramassés d'équivalents concrets."
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
                f"- Plastique estimé : {tot_plastique:.1f} kg (≈ {bancs} bancs publics ou {pulls} pulls polaires).\n"
                f"- Verre estimé : {tot_verre:.1f} kg.\n"
                f"- Métal estimé : {tot_metal:.1f} kg.\n"
                f"- Masse de mégots : {tot_megots_kg:.1f} kg."
            ),
        )

        if (tot_plastique + tot_verre + tot_metal + tot_megots_kg) > 0:
            labels = ["Plastique", "Verre", "Métal", "Mégots"]
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

    # ---------- PAGE 7 : ÉCONOMIE POUR LA COLLECTIVITÉ ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("6. Bénéfice économique pour la collectivité"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)

    tonnes_dechets = total_dechets / 1000.0
    economie_realisee = tonnes_dechets * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]

    texte_lobbying = (
        f"Sur la période analysée, les actions citoyennes ont permis de retirer environ {total_dechets:.1f} kg "
        f"de déchets de la voie publique, soit {tonnes_dechets:.3f} tonne(s).\n\n"
        f"En appliquant un coût moyen de traitement de {IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']} € par tonne, "
        f"cela représente une économie potentielle d'environ {economie_realisee:,.2f} € pour les services de propreté. "
        "Au-delà de l'économie directe, ces actions réduisent les risques d'inondation, de micro-plastiques et améliorent "
        "la qualité de vie des habitants."
    )
    pdf.multi_cell(0, 6, _txt(texte_lobbying))

    # ---------- PAGE 8 : ENGAGEMENT CITOYEN ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("7. Énergie citoyenne mobilisée"), ln=True)
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
            f"Les brigades citoyennes ont investi environ {heures_benevoles:.1f} heures cumulées sur le terrain. "
            "Chaque heure de bénévolat équivaut à un investissement concret dans la qualité de l'espace public, "
            "la santé environnementale et le lien social entre habitants."
        ),
    )

    # ---------- PAGE 9+ : LISTE DÉTAILLÉE DES DERNIÈRES ACTIONS ----------
    if total:
        preview = actions_df.copy()
        if "date" in preview.columns:
            preview["_date_sort"] = pd.to_datetime(preview["date"], errors="coerce")
            preview = preview.sort_values("_date_sort", ascending=False)

        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, _txt("8. Actions récentes (extrait)"), ln=True)
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)

        max_rows = 60  # répartis sur plusieurs pages si besoin
        rows = []
        for _, row in preview.iterrows():
            line = (
                f"{row.get('date', '')} | {row.get('type_lieu', 'Non spécifié')} | "
                f"{row.get('adresse', '')} | "
                f"{int(row.get('megots', 0))} mégots | "
                f"{float(row.get('dechets_kg', 0)):.1f} kg | "
                f"propre={'oui' if bool(row.get('est_propre', False)) else 'non'}"
            )
            rows.append(line)

        for i, line in enumerate(rows[:max_rows]):
            pdf.multi_cell(0, 5, _txt(f"- {line}"))
            if (i + 1) % 25 == 0 and i + 1 < max_rows:
                pdf.add_page()
                pdf.set_font("Helvetica", "B", 14)
                pdf.cell(0, 8, _txt("Suite des actions récentes"), ln=True)
                pdf.ln(4)
                pdf.set_font("Helvetica", "", 10)

    # ---------- DERNIÈRE PAGE : MÉTHODOLOGIE ----------
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _txt("9. Méthodologie et références scientifiques"), ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(0, 5, _txt(get_impact_sources()))

    # S'assure d'un volume suffisant (~15 pages) en ajoutant une courte annexe si besoin
    while pdf.page_no() < 15:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, _txt("Annexe complémentaire"), ln=True)
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            0,
            5,
            _txt(
                "Cette page est réservée pour des annexes locales (cartes des quartiers, "
                "plans d'action municipaux, comptes-rendus d'opérations spéciales, etc.)."
            ),
        )

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
    if 'sandbox_actions' not in st.session_state:
        st.session_state['sandbox_actions'] = [
            {
                "id": "demo_1",
                "type_lieu": "Brouillon Démo",
                "adresse": "Exemple 1 (Test)",
                "megots": 150,
                "dechets_kg": 2.5,
                "lat": 48.8566,
                "lon": 2.3522,
                "est_propre": False
            }
        ]

init_state()

# Lecture des paramètres d'URL (Kit Terrain QR Code)
lieu_prefill = st.query_params.get("lieu", "")
if lieu_prefill:
    st.toast(f"📍 Lieu détecté via QR Code : {lieu_prefill}", icon="📱")

# Initialisation de check_pseudo avant les tabs pour qu'il soit toujours défini
check_pseudo = ""


# Configuration injectée via CSS global plus haut

# --- AUTHENTIFICATION (SIMPLIFIÉE) ---
# Accès libre pour les bénévoles, mot de passe pour l'admin.
main_user_email = _google_user_email() or "Bénévole Anonyme"

# --- CHARGEMENT DES DONNÉES CUMULÉES ---
db_approved = get_submissions_by_status('approved')
sheet_actions = load_sheet_actions(GOOGLE_SHEET_URL)
all_imported_actions = sheet_actions + TEST_DATA
all_public_actions = db_approved + all_imported_actions
all_public_df = pd.DataFrame(all_public_actions)

# Correction NameError reported by user
df_impact = all_public_df

# Calcul des stats globales cumulées
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
            <div class="metric-value">{total_megots:,}<span class="metric-unit">🚬</span></div>
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
            <div class="metric-value">{total_benevoles:,}<span class="metric-unit">Héros</span></div>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

# sheet_actions et all_imported_actions sont maintenant chargés plus haut
# Import manuel ou asynchrone pour ne les insérer qu'une seule fois. 
# Pour l'instant on garde une vue concaténée en lecture

# --- NAVIGATION PAR RUBRIQUES CLIQUABLES ---
# Liste des options classées par priorité
nav_options = [
    t("tab_home"),
    t("tab_map"),
    t("tab_declaration"),
    t("tab_trash_spotter"),
    t("tab_gamification"),
    t("tab_pdf"),
    t("tab_history"),
    t("tab_community"),
    t("tab_actors"),
    t("tab_route"),
    t("tab_recycling"),
    t("tab_climate"),
    t("tab_elus"),
    t("tab_weather"),
    t("tab_compare"),
    t("tab_kit"),
    t("tab_sandbox"),
    t("tab_admin"),
]

if "active_tab" not in st.session_state or st.session_state.active_tab not in nav_options:
    st.session_state.active_tab = nav_options[0]

active_tab = st.session_state.active_tab

# Affichage du menu de navigation en haut de la page
st.markdown('<div class="nav-shell">', unsafe_allow_html=True)
st.markdown(
    f'<p class="nav-shell-caption">{"Navigation principale" if st.session_state.lang == "fr" else "Main navigation"} - {"Selectionnez un espace pour agir ou analyser vos resultats." if st.session_state.lang == "fr" else "Select a workspace to act or analyze your results."}</p>',
    unsafe_allow_html=True,
)
nav_col, menu_col = st.columns([4.6, 2.4], gap="large")
with nav_col:
    st.markdown(
        f'<p class="rubric-caption">{"Rubriques rapides" if st.session_state.lang == "fr" else "Quick sections"}</p>',
        unsafe_allow_html=True,
    )
    quick_nav_options = nav_options[:8]
    st.markdown('<div class="rubric-buttons">', unsafe_allow_html=True)
    for row_start in range(0, len(quick_nav_options), 4):
        row_items = quick_nav_options[row_start:row_start + 4]
        row_cols = st.columns(len(row_items))
        for col, label in zip(row_cols, row_items):
            with col:
                if st.button(
                    label,
                    key=f"quick_rubric_{label}",
                    use_container_width=True,
                    type="primary" if active_tab == label else "secondary",
                ):
                    active_tab = label
    st.markdown('</div>', unsafe_allow_html=True)

with menu_col:
    st.markdown(
        f'<p class="rubric-caption">{"Toutes les rubriques" if st.session_state.lang == "fr" else "All sections"}</p>',
        unsafe_allow_html=True,
    )
    st.markdown('<div class="right-nav-scroll">', unsafe_allow_html=True)
    selected_menu_tab = st.radio(
        t("nav_label"),
        options=nav_options,
        index=nav_options.index(active_tab),
        key="right_nav_radio",
        label_visibility="collapsed",
    )
    st.markdown('</div>', unsafe_allow_html=True)
    if selected_menu_tab != active_tab:
        active_tab = selected_menu_tab

st.markdown('</div>', unsafe_allow_html=True)

# Synchronisation du state
st.session_state.active_tab = active_tab

# Initialisation des containers (pour garder la compatibilité avec le code existant line 1845)
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

# On active le container correspondant à la sélection
active = st.session_state.active_tab
if active == t("tab_declaration"): tab_declaration = st.container()
elif active == t("tab_map"): tab_map = st.container()
elif active == t("tab_trash_spotter"): tab_trash_spotter = st.container()
elif active == t("tab_gamification"): tab_gamification = st.container()
elif active == t("tab_community"): tab_community = st.container()
elif active == t("tab_sandbox"): tab_sandbox = st.container()
elif active == t("tab_pdf"): tab_pdf = st.container()
elif active == t("tab_guide"): tab_guide = st.container()
elif active == t("tab_actors"): tab_actors = st.container()
elif active == t("tab_history"): tab_history = st.container()
elif active == t("tab_route"): tab_route = st.container()
elif active == t("tab_recycling"): tab_recycling = st.container()
elif active == t("tab_climate"): tab_climate = st.container()
elif active == t("tab_elus"): tab_elus = st.container()
elif active == t("tab_kit"): tab_kit = st.container()
elif active == t("tab_home"): tab_home = st.container()
elif active == t("tab_weather"): tab_weather = st.container()
elif active == t("tab_compare"): tab_compare = st.container()
elif active == t("tab_admin"): tab_admin = st.container()

# Alias rétrocompatibles (évite les NameError après renommage d'onglets)
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
    1. **Simplifier la saisie** : En scannant le code, le lieu de l'action est automatiquement pré-rempli pour les bénévoles.
    2. **Uniformiser les données** : Toutes les déclarations de votre événement porteront exactement le même nom de lieu, facilitant le bilan final.
    3. **Gagner du temps** : Vos bénévoles n'ont plus qu'à renseigner les quantités ramassées.
    
    ---
    ### Générer votre code
    Saisissez le nom du lieu ou les coordonnées GPS exactes pour générer le QR Code à imprimer ou à afficher sur votre téléphone pendant l'action.
    """)
    
    with st.form("qr_generator_form"):
        lieu_event = st.text_input("Nom du lieu ou Coordonnées GPS", placeholder="Ex: Place de la Bastille, Paris ou 48.8534, 2.3488")
        color_qr = st.color_picker("Couleur du QR Code", "#059669")
        generate_btn = st.form_submit_button("Générer le QR Code de terrain", width="stretch")
        
    if generate_btn:
        if not lieu_event.strip():
            st.warning("Veuillez saisir un lieu pour générer le code.")
        else:
            # Construction de l'URL de l'application avec le paramètre de pré-remplissage
            # On utilise STREAMLIT_PUBLIC_URL si définie, sinon une URL générique
            base_url = STREAMLIT_PUBLIC_URL
            share_url = f"{base_url}/?lieu={requests.utils.quote(lieu_event.strip())}"
            
            # Génération du QR Code
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
                st.image(byte_im, caption="QR Code à scanner sur le terrain", width="stretch")
            with col_qr2:
                st.success("✅ Votre QR Code est prêt !")
                st.write(f"**Lien encodé :** `{share_url}`")
                st.download_button(
                    label="⬇️ Télécharger le QR Code (PNG)",
                    data=byte_im,
                    file_name=f"qrcode_terrain_{lieu_event.replace(' ', '_')}.png",
                    mime="image/png",
                    width="stretch"
                )
                st.info("💡 **Conseil :** Imprimez ce code et fixez-le sur votre peson ou sur votre sac de collecte principal pour que chaque bénévole puisse flasher son impact en fin d'action.")

    st.markdown("---")
    st.subheader("🧾 Templates imprimables & gestion multi-bénévoles")
    nb_participants = st.number_input("Nombre de bénévoles attendus", min_value=1, value=10, step=1, key="kit_participants")
    nb_equipes = st.number_input("Nombre d'équipes", min_value=1, value=3, step=1, key="kit_teams")

    planner = pd.DataFrame({
        "equipe": [f"Équipe {((i % nb_equipes) + 1)}" for i in range(nb_participants)],
        "benevole": [f"Participant {i+1}" for i in range(nb_participants)],
        "telephone": ["" for _ in range(nb_participants)],
        "materiel": ["gants, sacs, pinces" for _ in range(nb_participants)],
    })
    st.dataframe(planner, width="stretch", hide_index=True)
    st.download_button(
        "⬇️ Télécharger template équipes (CSV)",
        data=planner.to_csv(index=False).encode("utf-8"),
        file_name="template_equipes_cleanmymap.csv",
        mime="text/csv",
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
    )

    home_actions_df = all_public_df.dropna(subset=["lat", "lon"]) if not all_public_df.empty else pd.DataFrame()
    home_map = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="CartoDB positron")

    if not home_actions_df.empty:
        center_lat_home = home_actions_df["lat"].mean()
        center_lon_home = home_actions_df["lon"].mean()
        home_map.location = [center_lat_home, center_lon_home]

        for _, row in home_actions_df.iterrows():
            marker_color = "green" if row.get("est_propre", False) else "red"
            folium.CircleMarker(
                location=[row["lat"], row["lon"]],
                radius=6,
                color=marker_color,
                fill=True,
                fill_color=marker_color,
                fill_opacity=0.75,
                tooltip=row.get("type_lieu", "Action"),
                popup=f"<b>{row.get('type_lieu', 'Action')}</b><br>{row.get('adresse', '')}<br>{row.get('dechets_kg', 0)} kg",
            ).add_to(home_map)
    else:
        st.info(i18n_text("Aucune action géolocalisée à afficher pour le moment.", "No geolocated action to display yet."))

    st_folium(home_map, width="stretch", height=520, returned_objects=[])

with tab_view:
    render_tab_header(
        icon="\U0001F5FA\ufe0f",
        title_fr="Carte Interactive des Actions",
        title_en="Interactive Action Map",
        subtitle_fr="Explorez les actions validees, les zones sensibles, la chronologie et les couches geographiques en un seul espace.",
        subtitle_en="Explore validated actions, sensitive zones, timeline, and geographic layers in one workspace.",
        chips=[i18n_text("Cartographie", "Mapping"), i18n_text("Analyse", "Analytics"), i18n_text("Temps reel", "Live")],
        compact=True,
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

    # --- Configuration des fonds de carte ---
    m = folium.Map(location=[center_lat, center_lon], zoom_start=zoom_start, tiles=None)
    
    folium.TileLayer('OpenStreetMap', name='Fond Clair (Défaut)').add_to(m)
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

    # Récupération Open Data (Poubelles de rue)
    official_bins = get_paris_bins()
    
    # --- SEGMENTATION DES COUCHES ---
    from folium.plugins import MarkerCluster
    group_pollution = folium.FeatureGroup(name="⚠️ Pollution & Actions", show=True)
    cluster_pollution = MarkerCluster(name="🟣 Cluster Pollution (dense)", show=False, disableClusteringAtZoom=14)
    group_clean = folium.FeatureGroup(name="🌿 Zones Propres", show=True)
    group_business = folium.FeatureGroup(name="⭐ Acteurs Engagés", show=True)
    group_spots = folium.FeatureGroup(name="📢 Trash Spots (Signalisations)", show=True)
    
    # Ajout des Trash Spots (Signalements rapides)
    active_spots = get_active_spots()
    for s in active_spots:
        folium.Marker(
            [s['lat'], s['lon']],
            popup=f"<b>⚠️ {s['type_dechet']}</b><br>Signalé par {s['reporter_name']}<br><i>Aidez-nous à nettoyer !</i>",
            icon=folium.Icon(color='red', icon='exclamation-circle', prefix='fa'),
            tooltip="Spot de pollution actif"
        ).add_to(group_spots)
    group_spots.add_to(m)
    
    # Poubelles (Gris)
    for b in official_bins:
        folium.CircleMarker(
            location=[b['lat'], b['lon']],
            radius=3,
            color='#808080',
            fill=True,
            fill_color='#808080',
            fill_opacity=0.4,
            popup=f"<b>🗑️ Info Officielle</b><br>Type: {b.get('type')}<br>Propriétaire: Ville de Paris"
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
            # 1. Calcul des besoins en équipement (Gap Analysis)
            is_clean = row.get('est_propre', False)
            is_business = row.get('type_lieu') == "Établissement Engagé (Label)"
            gap_alert = ""
            if not is_clean and not is_business and row.get('lat') and row.get('lon'):
                if 48.8 <= row['lat'] <= 48.9 and 2.2 <= row['lon'] <= 2.4:
                    is_gap, dist = calculate_infrastructure_gap(row['lat'], row['lon'], official_bins)
                    if is_gap:
                        gap_alert = f"Besoin d'équipement : poubelle la plus proche à {int(dist)}m"

            # 2. Calcul des scores et styles dynamiques
            score_data = calculate_scores(row)
            color, radius, icon_type = get_marker_style(row, score_data)
            
            # --- GEO-GRAPHISM INTELLIGENT ---
            osm_type = detect_osm_type(row)
            if enable_osm_shapes and osm_type != 'point':
                geometry, final_type = fetch_osm_geometry(row['lat'], row['lon'], osm_type)
            else:
                geometry, final_type = (None, 'point')
            
            # 3. Génération du popup intelligent
            popup_html = create_premium_popup(row, score_data, gap_alert=gap_alert)
            place_name = format_google_maps_name(row)
            
            # 4. Ajout au groupe correspondant
            target_group = group_business if is_business else group_clean if is_clean else group_pollution
            
            # Génération du QR Code
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
                st.image(byte_im, caption="QR Code à scanner sur le terrain", width="stretch")
            with col_qr2:
                st.success("✅ Votre QR Code est prêt !")
                st.write(f"**Lien encodé :** `{share_url}`")
                st.download_button(
                    label="⬇️ Télécharger le QR Code (PNG)",
                    data=byte_im,
                    file_name=f"qrcode_terrain_{lieu_event.replace(' ', '_')}.png",
                    mime="image/png",
                    width="stretch"
                )
                st.info("💡 **Conseil :** Imprimez ce code et fixez-le sur votre peson ou sur votre sac de collecte principal pour que chaque bénévole puisse flasher son impact en fin d'action.")

    st.markdown("---")
    st.subheader("🧾 Templates imprimables & gestion multi-bénévoles")
    nb_participants = st.number_input("Nombre de bénévoles attendus", min_value=1, value=10, step=1, key="kit_participants")
    nb_equipes = st.number_input("Nombre d'équipes", min_value=1, value=3, step=1, key="kit_teams")

    planner = pd.DataFrame({
        "equipe": [f"Équipe {((i % nb_equipes) + 1)}" for i in range(nb_participants)],
        "benevole": [f"Participant {i+1}" for i in range(nb_participants)],
        "telephone": ["" for _ in range(nb_participants)],
        "materiel": ["gants, sacs, pinces" for _ in range(nb_participants)],
    })
    st.dataframe(planner, width="stretch", hide_index=True)
    st.download_button(
        "⬇️ Télécharger template équipes (CSV)",
        data=planner.to_csv(index=False).encode("utf-8"),
        file_name="template_equipes_cleanmymap.csv",
        mime="text/csv",
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
    )

    home_actions_df = all_public_df.dropna(subset=["lat", "lon"]).copy() if not all_public_df.empty else pd.DataFrame()

    if not home_actions_df.empty:
        home_actions_df = calculate_trends(home_actions_df)
        home_map = build_interactive_folium_map(home_actions_df)
    else:
        st.info(i18n_text("Aucune action géolocalisée à afficher pour le moment.", "No geolocated action to display yet."))
        home_map = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="CartoDB positron")

    st_folium(home_map, width="stretch", height=520, returned_objects=[])

with tab_view:
    render_tab_header(
        icon="\U0001F5FA\ufe0f",
        title_fr="Carte Interactive des Actions",
        title_en="Interactive Action Map",
        subtitle_fr="Explorez les actions validees, les zones sensibles, la chronologie et les couches geographiques en un seul espace.",
        subtitle_en="Explore validated actions, sensitive zones, timeline, and geographic layers in one workspace.",
        chips=[i18n_text("Cartographie", "Mapping"), i18n_text("Analyse", "Analytics"), i18n_text("Temps reel", "Live")],
        compact=True,
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

    m = build_interactive_folium_map(map_df)

    # --- CHOIX DU MODE DE VUE (2D vs 3D) ---
    col_view_opt, col_view_lang = st.columns([3, 1])
    with col_view_opt:
        view_mode = st.radio(
            "Mode de visualisation" if st.session_state.lang == "fr" else "Visualization Mode",
            options=["2D (Standard)", "3D (Immersif)"],
            horizontal=True,
            help="Le mode 3D nécessite plus de ressources mais offre une vue spectaculaire des hotspots." if st.session_state.lang == "fr" else "3D mode requires more resources but offers a spectacular view of hotspots."
        )

    if "3D" in view_mode:
        import pydeck as pdk
        st.info("💡 **Montagnes de Mégots** : La hauteur des colonnes représente la densité de pollution cumulée." if st.session_state.lang == "fr" else "💡 **Cigarette Butt Mountains**: Column height represents cumulative pollution density.")
        
        # Color scale based on density (Green to Red)
        layer_3d = pdk.Layer(
            "HexagonLayer",
            map_df,
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
                "html": "<b>Densité :</b> {elevationValue} unités" if st.session_state.lang == "fr" else "<b>Density:</b> {elevationValue} units",
                "style": {"color": "white", "backgroundColor": "#10b981"}
            }
        )
        st.pydeck_chart(r, use_container_width=True)
    else:
        st_folium(m, width=900, height=520, returned_objects=[])

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
        st.subheader("📍 Signaler un Spot")
        with st.form("spot_form_fast"):
            s_addr = st.text_input("Adresse ou Lieu", placeholder="Ex: 10 Rue de Rivoli")
            s_type = st.selectbox("Type de déchet", ["Décharge sauvage", "Mégots en masse", "Plastiques", "Verre", "Autre"])
            s_pseudo = st.text_input("Votre pseudo", value=main_user_email)
            s_btn = st.form_submit_button("📢 Signaler (+10 Eco-Points)")
            
            if s_btn:
                if s_addr:
                    from src.geocoder import geocode_address
                    lat_s, lon_s = geocode_address(s_addr)
                    if lat_s:
                        add_spot(lat_s, lon_s, s_addr, s_type, s_pseudo)
                        st.success("✅ Spot ajouté ! Merci pour votre vigilance.")
                        st.balloons()
                    else:
                        st.error("Impossible de localiser l'adresse.")
                else:
                    st.warning("Précisez l'adresse du spot.")

    with col_ts2:
        st.subheader("🌐 Points Noirs Actifs")
        spots = get_active_spots()
        if spots:
            m_ts = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
            for sp in spots:
                folium.Marker(
                    [sp['lat'], sp['lon']],
                    popup=f"<b>{sp['type_dechet']}</b><br>Signalé par {sp['reporter_name']}",
                    icon=folium.Icon(color='red', icon='trash', prefix='fa')
                ).add_to(m_ts)
            st_folium(m_ts, width=400, height=350, key="ts_map_view")
        else:
            st.info("Aucun spot de pollution signalé pour le moment.")

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
        st.subheader("🥇 Top Contributeurs")
        lb = get_leaderboard(limit=5)
        for i, en in enumerate(lb):
            st.markdown(f"""
            <div style="background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); padding: 12px; border-radius: 12px; margin-bottom: 8px; border-left: 4px solid #10b981;">
                <span style="font-size: 1.2rem;">{'🥇' if i==0 else '🥈' if i==1 else '🥉' if i==2 else '👤'}</span> 
                <b>{en['nom']}</b> : <span style="color:#10b981; font-weight:bold;">{en['total_points']} pts</span>
            </div>
            """, unsafe_allow_html=True)

    with cg2:
        st.subheader("🏅 Badges & Succès")
        # Pseudo actuel pour les badges
        curr_pseudo = st.text_input("Saisissez votre pseudo pour voir vos badges", value=main_user_email if main_user_email != "Bénévole Anonyme" else "")
        if curr_pseudo:
            # Récupérer les stats réelles
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
                st.info("Action validée requise pour débloquer les badges.")

with tab_community:
    render_tab_header(
        icon="\U0001F91D",
        title_fr="Rassemblements Citoyens",
        title_en="Community Meetups",
        subtitle_fr="Coordonnez les sorties, partagez les annonces et engagez les benevoles autour d'actions locales.",
        subtitle_en="Coordinate outings, publish announcements, and engage volunteers around local actions.",
        chips=[i18n_text("Communaute", "Community"), i18n_text("Coordination", "Coordination")],
    )

    st.subheader("🚀 Créer une Sortie Groupée")
    st.write("Choisissez un itinéraire ou un lieu et invitez la communauté.")
    
    st.warning("💡 **Important** : Pour une organisation officielle et une visibilité maximale, nous vous recommandons vivement de créer également votre évènement sur [cleanwalk.org](https://www.cleanwalk.org), la plateforme de référence en France.")

    pending_actions = get_submissions_by_status('pending')
    render_mission_validation(
        pending_actions,
        vote_func=add_mission_validation,
        summary_func=get_mission_validation_summary,
    )
    
    with st.form("community_outing"):
        out_title = st.text_input("Titre de la sortie", placeholder="Ex: Grand Nettoyage du Canal Saint-Martin")
        out_date = st.date_input("Date prévue", value=date.today())
        out_loc = st.text_input("Lieu de rendez-vous", placeholder="Ex: Devant le métro Stalingrad")
        out_desc = st.text_area("Description / Matériel nécessaire")
        st.form_submit_button("📣 Publier l'annonce")

    st.subheader("📍 Sorties en cours")
    st.info("Aucune sortie publique prévue pour le moment. Soyez le premier à lancer l'invitation !")

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
    st.info("Cette zone est un bac à sable : vous pouvez ajouter des données fictives pour tester l'outil. Elles ne sont **pas enregistrées** dans la base réelle et seront perdues si vous rafraîchissez la page.")
    
    col_sb1, col_sb2 = st.columns([1, 2])
    
    with col_sb1:
        st.subheader("Simuler une action")
        with st.form("sandbox_form"):
            sb_nom = st.text_input("Pseudo fictif", value="Testeur")
            sb_type = st.selectbox("Type de lieu", TYPE_LIEU_OPTIONS)
            sb_loc = st.text_input("Emplacement (Adresse ou GPS)", value="48.8584, 2.2945")
            sb_weight = st.number_input("Poids mégots (g)", min_value=0.0, value=50.0)
            sb_cond = st.selectbox("État mégots", ["Sec", "Mélangé / Impuretés", "Humide"])
            sb_kg = st.number_input("Déchets (kg)", min_value=0.0, value=1.5)
            sb_propre = st.checkbox("Signaler comme zone propre")
            
            sb_submit = st.form_submit_button("Ajouter au brouillon")
            
            if sb_submit:
                lat, lon, res_addr = geocode_and_resolve(sb_loc)
                coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
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
                st.success("Action ajoutée au brouillon !")
                st.rerun()

        if st.button("🗑️ Vider le brouillon"):
            st.session_state['sandbox_actions'] = []
            st.rerun()

        st.markdown("---")
        st.subheader("🎮 Simulateur mission fictive")
        target_kg = st.number_input("Objectif mission (kg)", min_value=1.0, value=20.0, step=1.0, key="sb_target_kg")
        target_megots = st.number_input("Objectif mission (mégots)", min_value=0, value=1500, step=100, key="sb_target_megots")
        drafted_df = pd.DataFrame(st.session_state['sandbox_actions'])
        done_kg = float(drafted_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0.0
        done_megots = int(drafted_df.get('megots', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0
        completion = min(((done_kg / target_kg) + (done_megots / max(target_megots, 1))) / 2 * 100, 100)
        st.progress(int(completion))
        st.caption(f"Completion rate mission fictive: {completion:.1f}% — {done_kg:.1f}/{target_kg:.1f} kg, {done_megots}/{target_megots} mégots")

    with col_sb2:
        st.subheader("Carte de test")
        # Carte simplifiée pour le sandbox
        m_sb = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
        
        for act in st.session_state['sandbox_actions']:
            if act['lat'] and act['lon']:
                color = "green" if act['est_propre'] else "blue"
                folium.Marker(
                    [act['lat'], act['lon']],
                    popup=f"<b>{act['type_lieu']}</b><br>Mégots: {act['megots']}<br>Kg: {act['dechets_kg']}",
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
    
    # Sélection du type d'action via un bouton radio plus explicite
    action_type = st.radio(
        "Que souhaitez-vous faire ?",
        ["Ajouter une récolte", "Déclarer un lieu propre", "Déclarer un acteur engagé"],
        horizontal=True,
        help="Choisissez 'Lieu propre' pour un signalement sans déchet, ou 'Acteur Engagé' pour valoriser une structure locale."
    )
    zone_propre = (action_type == "Déclarer un lieu propre")
    acteur_engage = (action_type == "Déclarer un acteur engagé")
    
    with st.form("submission_form", clear_on_submit=True):
        if action_type == "Ajouter une récolte":
            st.subheader("📝 Détails de la récolte")
            c1, c2 = st.columns(2)
            with c1:
                nom = st.text_input("Votre prénom / pseudo (optionnel)", value=check_pseudo if check_pseudo else "", placeholder="Ex: Sarah", key="harvest_pseudo")
                association = st.text_input("Association*", placeholder="Ex: Clean Walk Paris 10")
                type_lieu = st.selectbox("Type de lieu*", TYPE_LIEU_OPTIONS, index=0)
            with c2:
                action_date = st.date_input("Date de l'action*", value=date.today(), max_value=date.today())
                benevoles = st.number_input("Nombre de bénévoles*", min_value=1, value=1, step=1)
                temps_min = st.number_input("Durée (minutes)*", min_value=1, value=60, step=5)
            
            emplacement_brut = st.text_input(
                "Emplacement (Adresse ou GPS)*", 
                value=lieu_prefill if lieu_prefill else "", 
                placeholder="Ex: 48.8584, 2.2945 ou Tour Eiffel, Paris",
                help="💡 Il est préférable de saisir les coordonnées GPS exactes pour un affichage précis sur la carte."
            )

            st.divider()
            c3, c4 = st.columns(2)
            with c3:
                st.write("**🚬 Mégots**")
                m_weight = st.number_input("Poids total (grammes)", min_value=0.0, value=0.0, step=10.0)
                m_condition = st.selectbox("État des mégots", ["Sec", "Mélangé / Impuretés", "Humide"])
                coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
                megots = int(m_weight / coeffs[m_condition]) if m_weight > 0 else 0
                if m_weight > 0:
                    st.info(f"Estimation : ~**{megots}** mégots")
            with c4:
                dechets_kg = st.number_input("Déchets (total kg)", min_value=0.0, value=0.0, step=0.5)
                hints = get_weight_conversion_hints(dechets_kg)
                st.caption(f"≈ {hints['sacs_30l']} sacs 30L • ≈ {hints['bouteilles_1_5l']} bouteilles 1.5L")
            
            plastique_kg, verre_kg, metal_kg = 0.0, 0.0, 0.0

            if type_lieu == "Établissement Engagé (Label)":
                engagement = st.text_area("quelles sont les actions de cet établissement ?", placeholder="ex: démarche zéro déchet, collecte solidaire...")
                commentaire = st.text_area("petite note complémentaire (optionnel)", placeholder="informations utiles pour l'équipe")
                if engagement:
                    commentaire = f"[engagement] {engagement}\n{commentaire}"
            else:
                commentaire = st.text_area("commentaire (optionnel)", placeholder="informations utiles pour l'équipe")
        
        elif action_type == "Déclarer un acteur engagé":
            st.subheader("🏢 Déclarer un Acteur Engagé")
            st.info("Utilisez ce formulaire pour valoriser une association ou un commerçant impliqué dans la transition écologique ou sociale. Une fiche automatique sera générée après validation.")
            
            c1, c2 = st.columns(2)
            with c1:
                nom = st.text_input("Votre pseudo (optionnel)", value=check_pseudo if check_pseudo else "", placeholder="Ex: Jean_Vert", key="actor_pseudo")
                type_acteur = st.selectbox("Type d'acteur*", ["Association écologique", "Association humanitaire et sociale", "Commerçant engagé"])
                association = st.text_input("Nom de l'acteur (Asso/Commerce)*", placeholder="Ex: La Recyclerie du Sport")
            with c2:
                emplacement_brut = st.text_input(
                    "Emplacement (Adresse ou GPS)*", 
                    placeholder="Ex: 15 rue des Maraîchers, Paris",
                    help="💡 L'adresse précise nous permet de géolocaliser l'acteur sur la carte."
                )
                action_date = date.today()
            
            commentaire = st.text_area("Actions & Engagement (optionnel)", placeholder="Décrivez brièvement pourquoi cet acteur est engagé...")
            
            # Valeurs techniques par défaut
            type_lieu = type_acteur
            benevoles = 1
            temps_min = 1
            megots = 0
            dechets_kg = 0.0
            plastique_kg, verre_kg, metal_kg = 0.0, 0.0, 0.0

        else:
            st.subheader("🧼 Signalement Zone Propre")
            st.info("Utilisez ce formulaire pour signaler un lieu où il n'y a aucun déchet à ramasser.")
            nom = st.text_input("Votre pseudo*", value=check_pseudo if check_pseudo else "", placeholder="Ex: Jean_Vert", key="clean_pseudo")
            action_date = st.date_input("Date du constat*", value=date.today(), max_value=date.today())
            
            emplacement_brut = st.text_input(
                "Emplacement (Adresse ou GPS)*", 
                value=lieu_prefill if lieu_prefill else "", 
                placeholder="Ex: 48.8584, 2.2945 ou Place de la Bastille, Paris",
                help="💡 Il est préférable de saisir les coordonnées GPS exactes pour un affichage précis sur la carte.",
                key="clean_location"
            )
            
            # Valeurs par défaut automatiques pour un lieu propre
            association = "Indépendant"
            type_lieu = "Signalement Propreté"
            benevoles = 1
            temps_min = 1
            megots = 0
            dechets_kg = 0.0
            plastique_kg, verre_kg, metal_kg = 0.0, 0.0, 0.0
            commentaire = "Zone signalée propre"
        
        st.markdown("---")
        subscribe_newsletter = st.checkbox("recevoir la gazette des brigades (impact trimestriel)", value=True)
        user_email = ""
        if subscribe_newsletter:
            user_email = st.text_input("votre adresse email pour la gazette*", placeholder="ex: camille@écologie.fr")
            
        submitted = st.form_submit_button("partager mon action", width="stretch")

    if submitted:
        if not emplacement_brut.strip() or not type_lieu or not association.strip():
            st.error("Merci de remplir les champs obligatoires (*)")
        elif subscribe_newsletter and not user_email.strip():
            st.error("Merci de renseigner votre email pour la gazette.")
        else:
            quality_errors = validate_submission_inputs({
                "benevoles": benevoles,
                "temps_min": temps_min,
                "megots": megots,
                "dechets_kg": dechets_kg,
                "emplacement_brut": emplacement_brut,
            })
            if quality_errors:
                for err in quality_errors:
                    st.error(err)
                st.stop()

            with st.spinner("Analyse de l'emplacement..."):
                lat, lon, adresse_resolue = geocode_and_resolve(emplacement_brut)
            if lat is not None and lon is not None and not (-90 <= float(lat) <= 90 and -180 <= float(lon) <= 180):
                st.error("Coordonnées géocodées incohérentes. Vérifiez votre saisie.")
                st.stop()
            
            # Fuzzy match contre la base existante pour unifier les noms d'adresses
            approved_actions = get_submissions_by_status('approved')
            existing_pool = [a.get('adresse') for a in approved_actions if a.get('adresse')]
            adresse_finale = fuzzy_address_match(adresse_resolue, existing_pool)
            
            data_to_save = {
                "id": str(uuid.uuid4()),
                "nom": nom.strip(),
                "association": association.strip(),
                "type_lieu": type_lieu,
                "adresse": adresse_finale,
                "date": str(action_date),
                "benevoles": benevoles,
                "temps_min": temps_min,
                "megots": megots,
                "dechets_kg": dechets_kg,
                "plastique_kg": plastique_kg,
                "verre_kg": verre_kg,
                "metal_kg": metal_kg,
                "gps": f"{lat}, {lon}" if lat and lon else emplacement_brut,
                "lat": lat,
                "lon": lon,
                "commentaire": commentaire,
                "est_propre": zone_propre,
                "submitted_at": datetime.now().isoformat()
            }
            data_to_save["eco_points"] = 5 if zone_propre else calculate_scores(data_to_save)['eco_points']
            insert_submission(data_to_save)
            if subscribe_newsletter and user_email:
                add_subscriber(user_email)
            st.success("Merci ! Votre action a été enregistrée et sera validée par un administrateur.")
            st.balloons()
            
    st.divider()
    st.subheader("💬 Partagez votre exploit avec la communauté !")
    st.write("Maintenant que votre action est déclarée, inspirez les autres brigades en postant un petit mot ou une photo sur le mur public.")
    
    # Récupération des messages
    messages = get_messages()
    
    # Formulaire pour nouveau message
    with st.form("wall_form", clear_on_submit=True):
        pseudo_msg = st.text_input("Votre pseudo", placeholder="Ex : camille_verte")
        contenu_msg = st.text_area("Votre message", placeholder="Merci à l'équipe pour l'action à Versailles !")
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
                saved_image_path = None
                if fichier_image is not None:
                    uploads_dir = os.path.join(os.path.dirname(__file__), "data", "uploads")
                    os.makedirs(uploads_dir, exist_ok=True)
                    safe_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{fichier_image.name}"
                    save_path = os.path.join(uploads_dir, safe_name)
                    with open(save_path, "wb") as f:
                        f.write(fichier_image.getbuffer())
                    saved_image_path = save_path
                final_image_url = image_url_input.strip() or saved_image_path
                add_message(pseudo_msg.strip(), contenu_msg.strip(), final_image_url)
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
        
        for m in reversed(messages):  # Plus récent en haut
            pseudo = m.get('author', m.get('pseudo', 'Anonyme'))
            timestamp = m.get('created_at', m.get('timestamp', ''))
            badge = get_user_badge(pseudo, all_actions_df)
            st.markdown(f"**{pseudo}** {badge} • *{timestamp}*")
            st.info(m.get('content', ''))
            img_url = m.get('image_url')
            if img_url:
                try:
                    st.image(img_url, width="stretch")
                except Exception:
                    st.warning("Impossible d'afficher l'image associée à ce message.")
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
        c_rep1, c_rep2 = st.columns([2, 1])
        with c_rep2:
            st.markdown('<div class="premium-card">', unsafe_allow_html=True)
            st.write("⚙️ **Options du Rapport**")
            is_rse_mode = st.toggle("Format Corporate RSE", value=False, help="Ajoute des métriques ESG et une valorisation du mécénat pour les bilans RSE d'entreprises.")
            st.markdown('</div>', unsafe_allow_html=True)
            
            if is_rse_mode:
                st.success("🏢 **Mode RSE Activé**\nLe rapport inclura les métriques d'impact social et environnemental.")
                total_h = int((public_df['temps_min'] * public_df.get('benevoles', 1)).sum() / 60)
                st.metric("Temps de mécénat accumulé", f"{total_h} h")
        
        with c_rep1:
            # Préparation du générateur
            report_gen = PDFReport(public_df)
            report_gen.is_rse = is_rse_mode
            pdf_bytes = report_gen.generate(dest='S')
            
            label_btn = "⬇️ Télécharger le Rapport RSE (PDF)" if is_rse_mode else t("download_pdf")
            st.download_button(
                label_btn,
                data=pdf_bytes,
                file_name=f"cleanmymap_rapport_{'rse' if is_rse_mode else 'public'}.pdf",
                mime="application/pdf",
                width="stretch",
            )
            
            st.divider()
            st.markdown(f"### 👁️ { 'Aperçu des données' if st.session_state.lang == 'fr' else 'Data Preview' }")
            st.markdown("#### 🔍 Dernières actions marquantes")
            st.dataframe(public_df.sort_values('date', ascending=False).head(10)[["date", "type_lieu", "adresse", "dechets_kg", "megots"]], width="stretch", hide_index=True)
    else:
        st.info("Aucune donnée disponible pour générer le rapport." if st.session_state.lang == "fr" else "No data available to generate report.")

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
        st.write(f"Retrouvez ici l'ensemble des {len(public_df)} actions recensées par la communauté.")
        st.dataframe(public_df[["date", "type_lieu", "adresse", "est_propre", "benevoles", "megots", "dechets_kg"]].sort_values('date', ascending=False), width="stretch", hide_index=True)
        render_historical_rankings(public_df)
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

    if map_df.empty:
        st.warning("Aucune donnée disponible pour optimiser un trajet.")
    else:
        st.markdown("### 🧭 Recommandation basée sur historique")
        hotspots = get_critical_zones(map_df)
        if hotspots:
            recs = []
            if isinstance(hotspots, dict):
                for addr, data in list(sorted(hotspots.items(), key=lambda x: x[1].get('count', 0), reverse=True))[:5]:
                    recs.append({"zone": addr, "occurrences": data.get("count", 0), "delai_moyen_j": data.get("delai_moyen", "n/a")})
            else:
                recs = [{"zone": str(z), "occurrences": 1, "delai_moyen_j": "n/a"} for z in hotspots[:5]]
            st.dataframe(pd.DataFrame(recs), width="stretch", hide_index=True)
        else:
            st.caption("Pas assez d'historique pour générer des recommandations de spots.")

        with st.form("ai_route_form"):
            c1, c2 = st.columns(2)
            with c1:
                nb_ben = st.slider("Nombre de bénévoles présents", 1, 50, 5)
                temps_act = st.select_slider("Durée de l'action souhaitée", options=[30, 60, 90, 120, 180], value=60, format_func=lambda x: f"{x} min")
            with c2:
                arr_list = ["Tous les arrondissements"] + [f"Paris {i}e" for i in range(1, 21)]
                chosen_arr = st.selectbox("Zone d'intervention", arr_list)
                use_violets = st.checkbox("Prioriser les points noirs (violets)", value=True)
            
            gen_btn = st.form_submit_button("💎 Générer le parcours optimal", width="stretch")

        if gen_btn:
            with st.spinner("L'IA analyse les flux piétons et les points noirs de Paris..."):
                # On utilise la fonction de map_utils (retourne paths, msg, logistics_df)
                result = generate_ai_route(map_df, nb_ben, temps_act, chosen_arr)
                
                if result[0]:
                    paths, msg, logistics_df = result
                    st.success(f"✅ Parcours stratégique généré ! {msg}")
                    
                    # 1. Affichage du tableau de bord logistique
                    st.markdown("### 📋 Tableau de Bord Logistique (10 Équipes)")
                    st.dataframe(logistics_df, width="stretch", hide_index=True)
                    
                    # 2. Affichage de la carte de l'itinéraire multi-couleurs
                    center_coords = paths[0]["coords"][0]
                    m_route = folium.Map(location=center_coords, zoom_start=15)
                    
                    # Ajout des différents segments colorés
                    for p in paths:
                        folium.PolyLine(
                            p["coords"], 
                            color=p["color"], 
                            weight=p["weight"], 
                            opacity=0.8, 
                            tooltip=p["label"]
                        ).add_to(m_route)
                    
                    # Marqueurs Départ/Arrivée
                    folium.Marker(paths[0]["coords"][0], popup="Point de rassemblement (Départ)", icon=folium.Icon(color="green", icon="play")).add_to(m_route)
                    folium.Marker(paths[1]["coords"][-1], popup="Fin de la mission (Retour)", icon=folium.Icon(color="red", icon="stop")).add_to(m_route)
                    
                    st_folium(m_route, width=900, height=500, key="ai_strategic_map")
                    
                    st.info(f"💡 **Conseil IA** : Les équipes 1 à 4 couvrent la montée, tandis que les équipes 5 à 8 couvrent le retour. Les équipes 9 et 10 sécurisent les abords. Restez groupés par binômes !")
                    
                    st.success("🎯 **Étape Suivante** : Maintenant que vous avez votre itinéraire stratégique, officialisez votre action sur [cleanwalk.org](https://www.cleanwalk.org) pour recruter encore plus de bénévoles !")
                else:
                    st.error(f"Désolé, l'IA n'a pas pu générer de parcours : {result[1]}")

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
        st.info("Aucune donnée disponible pour l'instant.")
    else:
        total_megots = public_df.get('megots', pd.Series(dtype=int)).fillna(0).sum()
        tot_dechets = public_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
        
        # Nouvelles équivalences "Grand Public"
        bouteilles_evitees = int(tot_dechets * 33)
        km_voiture_eq = int(tot_dechets * 19)
        eau_preservee = total_megots * IMPACT_CONSTANTS.get('EAU_PROTEGEE_PER_MEGOT_L', 500)
        
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### 🌍 Impact Réel de la Communauté")
        col_r1, col_r2, col_r3 = st.columns(3)
        
        with col_r1:
            st.metric(label="💧 Eau Préservée", value=f"{eau_preservee:,} L", help="1 seul mégot peut polluer jusqu'à 500 litres d'eau.")
        with col_r2:
            st.metric(label="🍾 Équivalent Bouteilles", value=f"{bouteilles_evitees:,}", help="1 kg de déchets équivaut environ au poids de 33 bouteilles plastiques de 1.5L.")
        with col_r3:
            st.metric(label="🚗 CO2 Évité (km voiture)", value=f"{km_voiture_eq:,} km", help="Émissions évitées sur le cycle de vie.")
        st.markdown('</div>', unsafe_allow_html=True)
            
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### 🧠 Le Saviez-vous ?")
        
        z1, z2 = st.columns(2)
        with z1:
            st.info("**Recyclage vs Décyclage** : Le verre se recycle à l'infini, mais le plastique perd souvent en qualité, c'est le *downcycling*.")
        with z2:
            st.success("**Le Poids des Mégots** : Un seul mégot contient des milliers de substances chimiques nocives qui mettent 12 ans à se décomposer.")
        st.markdown('</div>', unsafe_allow_html=True)
            
        with st.expander("⚡ Énergie Primaire vs Électricité"):
            st.write('''
            On confond souvent les deux ! 
            - **L'électricité** n'est pas une source, c'est un *vecteur* (un moyen de la transporter). 
            - **L'énergie primaire** est ce que l'on extrait de la nature (Pétrole, Vent, Soleil, Uranium, Charbon).
            
            Recycler de l'aluminium (canettes) permet d'économiser **jusqu'à 95%** de l'énergie primaire nécessaire pour l'extraire de la mine (la bauxite), limitant ainsi la destruction d'écosystèmes.
            ''')
            
        with st.expander("📊 Qu'est-ce que l'ACV (Analyse du Cycle de Vie) ?"):
            st.write('''
            L'Analyse du Cycle de Vie est la méthode d'évaluation environnementale systémique :
            1. **L'Extraction** des matières premières (Le *Sac à Dos Écologique*, c'est-à-dire les milliers de litres d'eau et matériaux invisibles déplacés).
            2. **La Fabrication** en usine.
            3. **Le Transport** et la logistique.
            4. **L'Utilisation**, parfois gourmande en énergie.
            5. **La Fin de vie**, où les déchets deviennent de la pollution ou retournent dans la boucle matérielle via le recyclage.
            ''')
            
        with st.expander("💧 Microplastiques : Invisible et Universel"):
            st.write('''
            Lorsqu'un plastique se dégrade dans la nature, il ne disparait jamais : il se fragmente en **microplastiques** sous l'effet du soleil (UV) et des frottements.
            Ces particules intègrent la chaîne alimentaire. On estime que chaque humain ingère **l'équivalent d'une carte de crédit en plastique par semaine** (soit environ 5 grammes) via l'eau potable, le sel et l'alimentation.
            ''')

# ------------------------------------------------------------------------
# ONGLET : DÉRÈGLEMENT CLIMATIQUE (EDUCATION)
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
    st.write("Parce qu'agir pour la planète commence par comprendre les enjeux. Voici les informations essentielles validées par la science pour construire votre culture écologique.")
    
    st.markdown("---")
    
    col_c1, col_c2 = st.columns([1, 1])
    
    with col_c1:
        st.markdown("### 📈 Les Constats du GIEC")
        st.info("Le GIEC (Groupe d'experts intergouvernemental sur l'évolution du climat) synthétise les travaux de milliers de chercheurs à travers le monde.")
        st.write("""
        - **Origine humaine indiscutable :** Le réchauffement actuel (+1.1°C depuis l'ère préindustrielle) est causé sans équivoque par les activités humaines (combustion d'énergies fossiles, déforestation).
        - **Conséquences visibles :** Multiplication des événements extrêmes (canicules, inondations, sécheresses), montée des eaux, fonte des glaces.
        - **L'urgence d'agir :** Chaque fraction de degré compte. Limiter le réchauffement à 1.5°C au lieu de 2°C permet d'éviter des points de basculement irréversibles.
        """)
        st.image("https://www.statistiques.developpement-durable.gouv.fr/sites/default/files/2019-12/giec-ar5-wg1-spm-fig1-fr_0.png", caption="Évolution de la température mondiale combinée des terres et des océans (Source: Synthèse GIEC)")
        
    with col_c2:
        st.markdown("### 🎯 L'Accord de Paris")
        st.success("Adopté en 2015 lors de la COP21, c'est le premier accord universel sur le climat.")
        st.write("""
        - **Objectif principal :** Maintenir l'augmentation de la température moyenne mondiale bien en dessous de 2°C, et de préférence à 1.5°C, par rapport aux niveaux préindustriels.
        - **Neutralité carbone :** Atteindre l'équilibre entre les émissions et les absorptions de gaz à effet de serre d'ici la deuxième moitié du siècle.
        - **La France :** S'est engagée via la Stratégie Nationale Bas-Carbone (SNBC) à réduire ses émissions d'ici 2050.
        """)
        
    st.markdown("---")
    
    st.markdown("### 🌎 Les 9 Limites Planétaires")
    st.write("Le climat n'est qu'une des 9 limites planétaires définies par le Stockholm Resilience Centre. Dépasser ces limites menace la stabilité de l'écosystème terrestre dont nous dépendons.")
    
    col_l1, col_l2 = st.columns([2, 3])
    with col_l1:
        st.write("""
        Aujourd'hui, **6 des 9 limites sont déjà franchies** au niveau mondial :
        1. 🔴 Le changement climatique
        2. 🔴 L'érosion de la biodiversité
        3. 🔴 La perturbation des cycles de l'azote et du phosphore
        4. 🔴 Le changement d'usage des sols (déforestation)
        5. 🔴 L'introduction d'entités nouvelles (pollutions chimiques, plastiques)
        6. 🔴 L'utilisation de l'eau verte (eau douce dans les sols)
        
        *Le ramassage de déchets agit directement sur la limite 5 (entités nouvelles / plastiques) !*
        """)
    with col_l2:
        st.image("https://www.notre-environnement.gouv.fr/IMG/png/limites_planetaires_2023_-_fr.png", caption="État des 9 limites planétaires en 2023 (Source: Stockholm Resilience Centre / Notre-Environnement.gouv)")
        
    st.markdown("---")
    st.info("💡 **Pour aller plus loin :** Pour approfondir ces sujets, n'hésitez pas à participer à une **Fresque du Climat**, un atelier ludique et collaboratif de 3h basé sur les rapports du GIEC, ou à consulter les rapports de l'ADEME.")

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
    
    # Extraire une liste de Villes/Codes Postaux basique à partir des actions approuvées
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)
    all_submissions_df = pd.DataFrame(get_submissions_by_status(None))

    if not approved_df.empty and 'adresse' in approved_df.columns:
        render_partner_dashboard(all_submissions_df, approved_df, PDFReport)
        st.markdown("---")
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

                # --- NOUVEAU : LETTRE AU MAIRE ---
                st.markdown("---")
                st.subheader("✉️ Génération de Courrier Officiel")
                st.write("Générez un courrier officiel à destination de la mairie, avec les statistiques réelles de votre territoire et des recommandations d'infrastructure concrètes.")
                
                with st.form("lettre_maire_form"):
                    col_lm1, col_lm2 = st.columns(2)
                    with col_lm1:
                        nom_maire = st.text_input("Nom du Maire / Élu", placeholder="Ex: Monsieur le Maire Pierre Dupont")
                        nom_association_lettre = st.text_input("Expéditeur (Association)", placeholder="Ex: Association Clean Walk Paris 10")
                    with col_lm2:
                        date_lettre = st.date_input("Date du courrier", value=date.today())
                        objet_lettre = st.text_input("Objet (optionnel)", value=f"Rapport d'impact citoyen — Action bénévole à {recherche_ville}")
                    gen_lettre_btn = st.form_submit_button("📄 Générer la Lettre (PDF)")
                
                if gen_lettre_btn:
                    def build_lettre_maire(nom_m, nom_asso, ville, tot_d, tot_meg, n_act, pts_crit, d_lettre, objet) -> bytes:
                        from fpdf import FPDF
                        pdf = FPDF()
                        pdf.add_page()
                        pdf.set_margins(20, 20, 20)
                        pdf.set_auto_page_break(auto=True, margin=25)
                        
                        # En-tête association
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
                            f"Nous avons l'honneur de vous adresser le présent rapport d'activité concernant "
                            f"les actions citoyennes de dépollution menées sur le territoire de {ville}.\n\n"
                            f"Au cours de la période analysée, nos brigades bénévoles ont réalisé {n_act} interventions, "
                            f"permettant de retirer {tot_d:.1f} kg de déchets et {tot_meg:,} mégots de la voie publique."
                            f" Ces actions ont préservé environ {eau:,} litres d'eau de la contamination toxique "
                            f"et représentent une économie estimée à {eco:,.0f} € pour les services de propreté de votre commune.\n\n"
                        )
                        pdf.multi_cell(0, 6, _txt(corps))
                        
                        if pts_crit:
                            pdf.set_font('Helvetica', 'B', 10)
                            pdf.cell(0, 6, _txt("Zones de récurrence identifiées (Points noirs) :"), ln=True)
                            pdf.set_font('Helvetica', '', 10)
                            if isinstance(pts_crit, dict):
                                for addr, data in list(pts_crit.items())[:5]:
                                    pdf.multi_cell(0, 5, _txt(f"- {addr} : {data['count']} passages bénévoles, re-pollution tous les {data['delai_moyen']} jours en moyenne."))
                            pdf.ln(3)
                            pdf.multi_cell(0, 6, _txt(
                                "Pour limiter la récidive de pollution sur ces zones, nous vous recommandons "
                                "d'envisager l'installation d'infrastructures de collecte supplémentaires "
                                "(cendriers de rue, corbeilles), ainsi que des campagnes de sensibilisation ciblées."
                            ))
                        
                        pdf.ln(6)
                        pdf.multi_cell(0, 6, _txt(
                            "Nous restons à votre disposition pour tout échange ou partenariat visant à "
                            "coordonner nos actions avec les services municipaux de propreté.\n\n"
                            "Dans l'attente d'une réponse favorable, veuillez agréer, " + nom_m + ", "
                            "l'expression de nos salutations distinguées.\n\n"
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
                    
                    # Aperçu HTML de la lettre
                    st.markdown(f"""
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; font-family: 'Georgia', serif; line-height: 1.7; color: #1e293b; margin: 16px 0;">
                        <div style="color: #059669; font-weight: bold; font-size: 14px;">{nom_association_lettre or 'Clean My Map'}</div>
                        <div style="color: #94a3b8; font-size: 11px; margin-bottom: 16px;">contact@cleanmymap.fr</div>
                        <div style="border-top: 1px solid #10b981; margin-bottom: 16px;"></div>
                        <div><strong>{nom_maire or 'Monsieur/Madame le Maire'}</strong><br>Mairie de {recherche_ville}</div>
                        <div style="text-align: right; font-size: 12px; color: #64748b;">Le {date_lettre.strftime('%d/%m/%Y')}</div>
                        <p><strong>Objet : {objet_lettre}</strong></p>
                        <p>{nom_maire or 'Monsieur/Madame le Maire'},</p>
                        <p>Nos brigades bénévoles ont réalisé <strong>{nb_actions} interventions</strong> sur votre territoire, retirant <strong>{tot_dechets:.1f} kg</strong> de déchets et <strong>{int(tot_megots):,}</strong> mégots — soit une économie estimée à <strong>{(tot_dechets/1000)*IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']:,.0f} €</strong> pour la collectivité.</p>
                        <p style="color: #64748b; font-style: italic;">[...] Cordialement, {nom_association_lettre or 'Clean My Map'}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.download_button(
                        "⬇️ Télécharger la lettre officielle (PDF)",
                        data=lettre_bytes,
                        file_name=f"lettre_mairie_{recherche_ville}_{date_lettre}.pdf",
                        mime="application/pdf",
                        width="stretch"
                    )
    else:
        st.info("Aucune donnée publique approuvée disponible pour le moment afin d'alimenter cet espace.")

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
    show_resources()

# ------------------------------------------------------------------------
# ONGLET : ACTEURS ENGAGÉS (ASSOCIATIONS & COMMERCES)
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
    show_partners()

# ------------------------------------------------------------------------
# ONGLET : MÉTÉO & ACTION
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
                   f"&daily=precipitation_sum,temperature_2m_max&past_days=3&timezone=Europe%2FParis")
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
            })
            df_weather['Optimal'] = (df_weather['Pluie (mm)'] < 2) & (df_weather['Temp. max'] > 8)

            fig_w, ax_p = plt.subplots(figsize=(9, 3.5))
            ax_t = ax_p.twinx()
            colors_bar = ['#22c55e' if o else '#f87171' for o in df_weather['Optimal']]
            ax_p.bar(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Pluie (mm)'], color=colors_bar, alpha=0.7)
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Temp. max'], color='#f97316', marker='o', linewidth=2)
            ax_p.set_ylabel('Pluie (mm)', fontsize=9); ax_t.set_ylabel('Temp. max (°C)', fontsize=9, color='#f97316')
            ax_p.axhline(2, color='#ef4444', linestyle='--', linewidth=1, alpha=0.6)
            ax_p.tick_params(axis='x', rotation=25, labelsize=8)
            plt.title("Fenêtres d'action (vert = idéal, rouge = pluie)", fontsize=11, fontweight='bold', color='#1e293b')
            fig_w.tight_layout(); st.pyplot(fig_w); plt.close(fig_w)

            best = df_weather[df_weather['Optimal'] & (df_weather['Date'] >= pd.Timestamp.today())]
            if not best.empty:
                nb = best.iloc[0]
                st.success(f"✅ **Meilleure fenêtre** : {nb['Date'].strftime('%A %d %B')} — {nb['Temp. max']:.0f}°C, {nb['Pluie (mm)']:.1f}mm. Conditions parfaites pour une Clean Walk !")
            else:
                st.warning("⚠️ Pas de fenêtre idéale dans les 7 prochains jours. Consultez à nouveau dans quelques jours.")
        else:
            st.info("Données météo indisponibles (API Open-Meteo). Réessayez dans quelques instants.")

    with col_w2:
        st.markdown('<div class="premium-card">', unsafe_allow_html=True)
        st.subheader("📆 Historique mensuel")
        if not all_public_df.empty and 'date' in all_public_df.columns:
            df_hist = all_public_df.copy()
            df_hist['date_dt'] = pd.to_datetime(df_hist['date'], errors='coerce')
            monthly_count = df_hist.dropna(subset=['date_dt']).groupby(df_hist['date_dt'].dt.month).size()
            mn = {1:'Jan',2:'Fév',3:'Mar',4:'Avr',5:'Mai',6:'Jun',7:'Jul',8:'Aoû',9:'Sep',10:'Oct',11:'Nov',12:'Déc'}
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
        st.info("Pas encore de données disponibles.")
    else:
        df_cmp['benevoles'] = pd.to_numeric(df_cmp.get('benevoles', df_cmp.get('nb_benevoles', 1)), errors='coerce').fillna(1)
        df_cmp['megots'] = pd.to_numeric(df_cmp['megots'], errors='coerce').fillna(0)
        df_cmp['dechets_kg'] = pd.to_numeric(df_cmp['dechets_kg'], errors='coerce').fillna(0)
        df_cmp['temps_min'] = pd.to_numeric(df_cmp.get('temps_min', 60), errors='coerce').fillna(60)
        df_cmp_dirty = df_cmp[df_cmp.get('est_propre', False) == False].copy()

        c1c, c2c = st.columns(2)
        with c1c:
            group_by = st.selectbox("Grouper par", ["Type de lieu", "Adresse (Top 20)"], key="cmp_group")
        with c2c:
            sort_by = st.selectbox("Trier par", ["Score IPC", "kg / action", "Mégots / bénévole", "Nombre d'actions"], key="cmp_sort")

        if group_by == "Type de lieu":
            group_col = 'type_lieu'
        else:
            df_cmp_dirty = df_cmp_dirty.copy()
            df_cmp_dirty['adresse_short'] = df_cmp_dirty['adresse'].apply(lambda x: str(x)[:40])
            group_col = 'adresse_short'

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
        sort_map = {"Score IPC": "score_ipc", "kg / action": "kg_par_action",
                    "Mégots / bénévole": "megots_par_benevole", "Nombre d'actions": "nb_actions"}
        grp = grp.sort_values(sort_map[sort_by], ascending=False).reset_index(drop=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        for i, row in grp.head(15).iterrows():
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"#{i+1}"
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
                        {int(row['nb_actions'])} actions · {row['total_kg']:.1f} kg · {int(row['total_megots']):,} mégots</div>
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
            'total_megots': 'Mégots', 'total_benevoles': 'Bénévoles', 'kg_par_action': 'kg/action',
            'megots_par_benevole': 'Mégots/bén.', 'score_ipc': 'Score IPC'})
        st.dataframe(grp_disp[['Zone','Actions','Total kg','Mégots','Bénévoles','kg/action','Mégots/bén.','Score IPC']],
                     hide_index=True, width=900)
        st.download_button("⬇️ Exporter (CSV)", data=grp_disp.to_csv(index=False).encode('utf-8'),
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


    st.subheader("Carte publique (actions validées)")
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)

    if not approved_df.empty:
        critical_zones = get_critical_zones(approved_df)
        map_df = approved_df.dropna(subset=["lat", "lon"]).copy()
        
        if not map_df.empty:
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
            # --- Version Admin de la carte ---
            m_admin = folium.Map(location=[center_lat, center_lon], zoom_start=11, tiles=None)
            folium.TileLayer('OpenStreetMap', name='Fond Clair (Défaut)').add_to(m_admin)
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
            show_flow_ai = st.checkbox("Afficher l'IA de flux (entonnoirs à pollution)", value=False)
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
                st.success(f"{len(sinks)} entonnoirs détectés")

            st_folium(m_admin, width=900, height=500, returned_objects=[])
        
        st.dataframe(
            approved_df[["date", "type_lieu", "adresse", "benevoles", "megots", "dechets_kg"]],
            width="stretch",
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
        try:
            ADMIN_SECRET_CODE = st.secrets.get("CLEANMYMAP_ADMIN_SECRET_CODE", "")
        except Exception:
            ADMIN_SECRET_CODE = ""
    
    if not ADMIN_SECRET_CODE:
        st.error("Mot de passe administrateur non configuré (CLEANMYMAP_ADMIN_SECRET_CODE).")
        st.stop()

    if "admin_authenticated" not in st.session_state:
        st.session_state["admin_authenticated"] = False

    if not st.session_state["admin_authenticated"]:
        secret_input = st.text_input("Code secret administrateur", type="password", key="admin_pwd_input")
        if st.button("Se connecter à l'espace Admin", width="stretch"):
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
                if a.button("✅ Approuver", key=f"approve_{row['id']}", width="stretch"):
                    update_submission_status(row['id'], 'approved')
                    
                    # Déclencher l'enrichissement automatique si c'est un acteur engagé
                    ACTOR_TYPES = ["Association écologique", "Association humanitaire et sociale", "Commerçant engagé"]
                    if row.get('type_lieu') in ACTOR_TYPES:
                        with st.spinner(f"Recherche d'informations pour {row['association']}..."):
                            auto_enrich_actor(row['id'], row['association'], row['type_lieu'], row['adresse'])
                    
                    st.rerun()
                if r.button("❌ Refuser", key=f"reject_{row['id']}", width="stretch"):
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
            width="stretch",
        )
