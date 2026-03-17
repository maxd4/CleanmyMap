import os
import re
import html
import time
import hashlib
from urllib.parse import urlencode
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
    update_submission_fields,
    get_submissions_by_status,
    get_total_approved_stats,
    add_message,
    get_messages,
    add_subscriber, get_all_subscribers, get_top_contributors,
    add_spot, get_active_spots, update_spot_status, calculate_user_points, get_leaderboard,
    add_mission_validation, get_mission_validation_summary,
    add_community_event, get_community_events, upsert_event_rsvp,
    get_event_rsvp_summary, get_events_for_date, mark_event_reminder,
    add_admin_audit_log, get_admin_audit_logs
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
    value = TRANSLATIONS[st.session_state.lang].get(key, key)
    return _repair_mojibake_text(value)


def _repair_mojibake_text(value):
    """RÃ©pare les chaÃ®nes mal dÃ©codÃ©es (ex: ÃƒÂ© / Ã°Å¸...) sans impacter le texte sain."""
    if not isinstance(value, str):
        return value
    if not value:
        return value

    markers = ("Ãƒ", "Ã¢â‚¬", "Ã¢â‚¬â„¢", "Ã°Å¸", "Ã‚", "ï¿½")
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
    """Normalise une valeur boolÃ©enne venant de sources hÃ©tÃ©rogÃ¨nes."""
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"true", "1", "oui", "yes", "y", "vrai"}


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
            "- eco-points (gamification interne) : formule = 10 + (temps_min/15)*10 + 5*kg dechets + (megots/100). "
            "cet indicateur sert au classement et ne constitue pas une unitÃ© scientifique d'impact.\n\n"
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
    """Bloc d'information visuel pour amÃ©liorer la lisibilitÃ© des parcours."""
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


def render_empty_state(
    title: str,
    message: str,
    cta_label: str | None = None,
    cta_tab_id: str | None = None,
    key_suffix: str = "",
) -> None:
    """Etat vide coherent avec CTA de relance."""
    st.markdown(
        f"""
        <div class="empty-state-card" role="status" aria-live="polite">
            <div class="empty-state-title">{html.escape(title)}</div>
            <div class="empty-state-text">{html.escape(message)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if cta_label and cta_tab_id:
        if st.button(cta_label, key=f"empty_cta_{cta_tab_id}_{key_suffix}", use_container_width=True):
            st.session_state.active_tab_id = cta_tab_id
            st.rerun()


def render_loading_skeleton(section_id: str, lines: int = 4) -> None:
    """Skeleton de chargement leger pour transition de rubrique."""
    skeleton_lines = "".join(['<div class="skeleton-line"></div>' for _ in range(max(2, lines))])
    placeholder = st.empty()
    placeholder.markdown(
        f"""
        <div class="skeleton-card" aria-hidden="true" data-section="{html.escape(section_id)}">
            {skeleton_lines}
        </div>
        """,
        unsafe_allow_html=True,
    )
    time.sleep(0.12)
    placeholder.empty()


def global_search_actions(df: pd.DataFrame, query: str, limit: int = 80) -> pd.DataFrame:
    """Recherche globale: adresse, asso, action, quartier."""
    q = str(query or "").strip().lower()
    if not q or df.empty:
        return pd.DataFrame()

    work = df.copy()
    for col in ["adresse", "association", "nom", "type_lieu", "commentaire", "date"]:
        if col not in work.columns:
            work[col] = ""

    work["adresse"] = work["adresse"].fillna("").astype(str)
    work["quartier"] = work["adresse"].str.split(",").str[0].str.strip()
    work["association"] = work["association"].fillna("").astype(str)
    work["nom"] = work["nom"].fillna("").astype(str)
    work["type_lieu"] = work["type_lieu"].fillna("").astype(str)
    work["commentaire"] = work["commentaire"].fillna("").astype(str)

    terms = [t for t in re.split(r"\s+", q) if t]
    work["_search_blob"] = (
        work["adresse"].str.lower()
        + " "
        + work["quartier"].str.lower()
        + " "
        + work["association"].str.lower()
        + " "
        + work["nom"].str.lower()
        + " "
        + work["type_lieu"].str.lower()
        + " "
        + work["commentaire"].str.lower()
    )

    mask = pd.Series(True, index=work.index)
    for term in terms:
        mask = mask & work["_search_blob"].str.contains(re.escape(term), na=False)

    result = work[mask].copy()
    if result.empty:
        return result

    result = result.rename(
        columns={
            "date": "Date",
            "nom": "Action / Auteur",
            "association": "Association",
            "type_lieu": "Type",
            "quartier": "Quartier",
            "adresse": "Adresse",
        }
    )
    keep_cols = [c for c in ["Date", "Action / Auteur", "Association", "Type", "Quartier", "Adresse"] if c in result.columns]
    return result[keep_cols].head(limit)


def render_paginated_dataframe(
    df: pd.DataFrame,
    key_prefix: str,
    title: str | None = None,
    default_page_size: int = 25,
) -> None:
    """Affichage pagine pour tableaux lourds."""
    if title:
        st.caption(title)
    if df is None or df.empty:
        render_empty_state(
            "Aucune donnee a afficher",
            "Le tableau est vide pour le filtre courant.",
            "Creer la premiere action",
            "declaration",
            key_suffix=f"{key_prefix}_empty",
        )
        return

    page_size = st.selectbox(
        "Lignes par page",
        options=[10, 25, 50, 100, 250],
        index=[10, 25, 50, 100, 250].index(default_page_size if default_page_size in [10, 25, 50, 100, 250] else 25),
        key=f"{key_prefix}_page_size",
    )
    total_rows = int(len(df))
    total_pages = max(1, int((total_rows + page_size - 1) / page_size))
    current_page = int(st.session_state.get(f"{key_prefix}_page", 1))
    if current_page > total_pages:
        current_page = total_pages
    if current_page < 1:
        current_page = 1
    nav1, nav2, nav3 = st.columns([1, 2, 1], gap="small")
    with nav1:
        if st.button("Page precedente", key=f"{key_prefix}_prev", use_container_width=True, disabled=current_page <= 1):
            current_page -= 1
    with nav2:
        current_page = st.number_input(
            "Page",
            min_value=1,
            max_value=total_pages,
            value=current_page,
            step=1,
            key=f"{key_prefix}_page_input",
        )
    with nav3:
        if st.button("Page suivante", key=f"{key_prefix}_next", use_container_width=True, disabled=current_page >= total_pages):
            current_page += 1
    st.session_state[f"{key_prefix}_page"] = int(current_page)

    start = (int(current_page) - 1) * int(page_size)
    end = min(start + int(page_size), total_rows)
    st.caption(f"Lignes {start + 1}-{end} sur {total_rows}")
    st.dataframe(df.iloc[start:end], hide_index=True, width="stretch")


def render_standard_exports(df: pd.DataFrame, basename: str, key_prefix: str) -> None:
    """Exports standards CSV + Excel uniformises."""
    if df is None or df.empty:
        return
    clean_base = re.sub(r"[^a-zA-Z0-9_\\-]+", "_", str(basename).strip()).strip("_") or "export"
    e1, e2 = st.columns(2, gap="small")
    with e1:
        st.download_button(
            "Exporter CSV",
            data=df.to_csv(index=False).encode("utf-8"),
            file_name=f"{clean_base}.csv",
            mime="text/csv",
            key=f"{key_prefix}_export_csv",
            use_container_width=True,
        )
    with e2:
        excel_buffer = io.BytesIO()
        try:
            with pd.ExcelWriter(excel_buffer, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name="data")
        except Exception:
            with pd.ExcelWriter(excel_buffer) as writer:
                df.to_excel(writer, index=False, sheet_name="data")
        st.download_button(
            "Exporter Excel",
            data=excel_buffer.getvalue(),
            file_name=f"{clean_base}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            key=f"{key_prefix}_export_xlsx",
            use_container_width=True,
        )


def render_print_current_view(
    view_key: str,
    title: str,
    filters: dict,
    metrics: dict,
    map_link: str = "",
) -> None:
    """Genere une vue imprimable (HTML) de l'etat courant."""
    filters_html = "".join(
        [f"<li><strong>{html.escape(str(k))}:</strong> {html.escape(str(v))}</li>" for k, v in filters.items()]
    )
    metrics_html = "".join(
        [f"<li><strong>{html.escape(str(k))}:</strong> {html.escape(str(v))}</li>" for k, v in metrics.items()]
    )
    link_html = f'<p><strong>Carte:</strong> <a href="{html.escape(map_link)}">{html.escape(map_link)}</a></p>' if map_link else ""
    printable_html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<style>
body {{ font-family: Arial, sans-serif; margin: 24px; color: #111827; }}
h1 {{ margin: 0 0 8px 0; }}
h2 {{ margin: 18px 0 8px 0; font-size: 18px; }}
ul {{ margin: 0; padding-left: 18px; }}
.box {{ border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 10px; }}
.meta {{ color: #6b7280; font-size: 12px; }}
@media print {{ button {{ display:none; }} body {{ margin: 12px; }} }}
</style></head>
<body>
<h1>{html.escape(title)}</h1>
<p class="meta">Genere le {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
<div class="box"><h2>Filtres actifs</h2><ul>{filters_html}</ul></div>
<div class="box"><h2>Statistiques</h2><ul>{metrics_html}</ul></div>
<div class="box"><h2>Reference carte</h2>{link_html}</div>
</body></html>"""
    st.download_button(
        "Imprimer la vue courante (HTML)",
        data=printable_html.encode("utf-8"),
        file_name=f"impression_{view_key}_{datetime.now().strftime('%Y%m%d_%H%M')}.html",
        mime="text/html",
        key=f"print_view_{view_key}",
        use_container_width=True,
    )


def dataframe_signature(df: pd.DataFrame, cols: list[str] | None = None) -> str:
    """Signature stable d'un DataFrame pour cache session."""
    if df is None or df.empty:
        return "empty"
    use_df = df.copy()
    if cols:
        valid = [c for c in cols if c in use_df.columns]
        if valid:
            use_df = use_df[valid].copy()
    hashed = pd.util.hash_pandas_object(use_df, index=True).values.tobytes()
    return hashlib.md5(hashed).hexdigest()


def normalize_source_kind(value) -> str:
    raw = str(value or "").strip().lower()
    if raw in {"simule", "simulee", "simulation", "demo", "test", "fictive"}:
        return "simulation"
    if raw in {"google_sheet", "sheet", "import", "import_sheet"}:
        return "google_sheet"
    return "formulaire"


def parse_action_tags(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        parts = [str(v).strip() for v in value if str(v).strip()]
    else:
        text = str(value).strip()
        if not text:
            return []
        parts = [p.strip() for p in re.split(r"[|,;/]+", text) if p.strip()]
    dedup: list[str] = []
    for tag in parts:
        if tag not in dedup:
            dedup.append(tag)
    return dedup


def serialize_action_tags(tags) -> str:
    return " | ".join(parse_action_tags(tags))


def infer_action_tags(action) -> list[str]:
    src = normalize_source_kind(action.get("source"))
    if src == "simulation":
        return ["Simulation"]

    assoc = str(action.get("association", "")).lower()
    benevoles = int(pd.to_numeric(action.get("benevoles", action.get("nb_benevoles", 0)), errors="coerce") or 0)

    school_kw = ("ecole", "college", "lycee", "universite", "etudiant", "campus")
    business_kw = ("sas", "sarl", "entreprise", "societe", "groupe", "startup", "commerce")
    public_kw = ("mairie", "ville", "commune", "collectivite", "metropole")

    tags: list[str] = []
    if any(k in assoc for k in school_kw):
        tags.append("Ecole")
    if any(k in assoc for k in business_kw):
        tags.append("Entreprise")
    if any(k in assoc for k in public_kw):
        tags.append("Collectivite")
    if benevoles <= 1:
        tags.append("Benevole solitaire")
    elif "Association" not in tags:
        tags.append("Association")
    return tags


def normalize_actions_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if df is None:
        return pd.DataFrame()
    norm = df.copy()
    if "source" not in norm.columns:
        norm["source"] = "formulaire"
    norm["source"] = norm["source"].apply(normalize_source_kind)

    if "tags" not in norm.columns:
        norm["tags"] = ""
    norm["tags"] = norm.apply(
        lambda row: serialize_action_tags(parse_action_tags(row.get("tags")) or infer_action_tags(row)),
        axis=1,
    )
    return norm


def action_datetime_series(df: pd.DataFrame) -> pd.Series:
    if df is None or df.empty:
        return pd.Series(dtype="datetime64[ns]")
    candidates = []
    if "date" in df.columns:
        candidates.append(pd.to_datetime(df["date"], errors="coerce"))
    if "submitted_at" in df.columns:
        candidates.append(pd.to_datetime(df["submitted_at"], errors="coerce"))
    if "created_at" in df.columns:
        candidates.append(pd.to_datetime(df["created_at"], errors="coerce"))
    if not candidates:
        return pd.Series(pd.NaT, index=df.index)
    out = candidates[0]
    for candidate in candidates[1:]:
        out = out.fillna(candidate)
    return out


def get_cached_folium_map(
    df: pd.DataFrame,
    cache_key_prefix: str = "default",
    timeline_max_speed: float = 6.0,
    timeline_auto_play: bool = False,
) -> folium.Map:
    """Cache intelligent en session pour reutiliser les couches carte."""
    sig = (
        f"{cache_key_prefix}_"
        f"{dataframe_signature(df, cols=['lat','lon','adresse','type_lieu','date','megots','dechets_kg','est_propre','source','tags'])}_"
        f"{float(timeline_max_speed):.2f}_{int(bool(timeline_auto_play))}"
    )
    cache = st.session_state.setdefault("_folium_map_cache", {})
    if sig in cache:
        return cache[sig]
    built_map = build_interactive_folium_map(
        df,
        timeline_max_speed=float(timeline_max_speed),
        timeline_auto_play=bool(timeline_auto_play),
    )
    cache[sig] = built_map
    if len(cache) > 6:
        oldest_key = next(iter(cache.keys()))
        if oldest_key != sig:
            cache.pop(oldest_key, None)
    return built_map


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

        .decl-progress-sticky {{
            position: sticky;
            top: 6px;
            z-index: 9;
            border-radius: var(--radius-md);
            border: 1px solid var(--edge-soft);
            background: var(--surface-2);
            padding: 10px 12px;
            margin: 6px 0 10px 0;
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        }}

        .decl-progress-track {{
            width: 100%;
            height: 8px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--ink-3) 20%, transparent);
            overflow: hidden;
            margin-bottom: 8px;
        }}

        .decl-progress-fill {{
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--brand), var(--accent));
            transition: width .22s ease;
        }}

        .decl-progress-steps {{
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 0.75rem;
            color: var(--ink-3);
            font-weight: 650;
        }}

        .map-side-panel {{
            border-radius: var(--radius-md);
            border: 1px solid var(--edge-soft);
            background: var(--surface-2);
            padding: 12px;
            box-shadow: var(--shadow-card);
        }}

        .map-legend-compact {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 5px;
            font-size: 0.82rem;
            color: var(--ink-2);
            margin-bottom: 10px;
        }}

        .map-legend-item {{
            display: flex;
            align-items: center;
            gap: 7px;
        }}

        .map-legend-dot {{
            width: 9px;
            height: 9px;
            border-radius: 50%;
            display: inline-block;
        }}

        .status-badge {{
            display: inline-flex;
            align-items: center;
            gap: 5px;
            border-radius: 999px;
            padding: 2px 8px;
            font-size: 0.72rem;
            font-weight: 740;
            border: 1px solid transparent;
        }}

        .status-new {{
            background: rgba(245, 158, 11, 0.14);
            color: #b45309;
            border-color: rgba(245, 158, 11, 0.34);
        }}

        .status-progress {{
            background: rgba(37, 99, 235, 0.14);
            color: #1d4ed8;
            border-color: rgba(37, 99, 235, 0.34);
        }}

        .status-resolved {{
            background: rgba(22, 163, 74, 0.14);
            color: #15803d;
            border-color: rgba(22, 163, 74, 0.34);
        }}

        .partner-mini-card {{
            border: 1px solid var(--edge-soft);
            border-radius: var(--radius-md);
            background: var(--surface-2);
            padding: 11px 12px;
            margin-bottom: 8px;
        }}

        .partner-mini-head {{
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 6px;
        }}

        .partner-logo {{
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--brand), var(--accent));
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.84rem;
            font-weight: 800;
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

        .skip-link {{
            position: absolute;
            left: -9999px;
            top: auto;
            width: 1px;
            height: 1px;
            overflow: hidden;
        }}

        .skip-link:focus,
        .skip-link:focus-visible {{
            left: 12px;
            top: 10px;
            width: auto;
            height: auto;
            z-index: 9999;
            padding: 8px 12px;
            border-radius: 8px;
            background: #0f172a;
            color: #ffffff !important;
            outline: 3px solid #38bdf8;
            text-decoration: none;
        }}

        :where(
            a,
            button,
            input,
            textarea,
            [role="button"],
            [tabindex]:not([tabindex="-1"])
        ):focus-visible {{
            outline: 3px solid #2563eb !important;
            outline-offset: 2px !important;
            box-shadow: none !important;
        }}

        .empty-state-card {{
            border: 1px dashed color-mix(in srgb, var(--brand) 45%, var(--edge-soft));
            border-radius: var(--radius-md);
            background: color-mix(in srgb, var(--surface-2) 90%, var(--brand) 10%);
            padding: 14px;
            margin: 6px 0 10px 0;
        }}

        .empty-state-title {{
            color: var(--ink-1) !important;
            font-weight: 780;
            font-size: 0.96rem;
            margin-bottom: 2px;
        }}

        .empty-state-text {{
            color: var(--ink-2) !important;
            font-size: 0.88rem;
        }}

        .skeleton-card {{
            border: 1px solid var(--edge-soft);
            border-radius: var(--radius-md);
            background: var(--surface-2);
            padding: 12px;
            margin: 6px 0 12px 0;
        }}

        .skeleton-line {{
            width: 100%;
            height: 12px;
            border-radius: 999px;
            margin: 8px 0;
            background: linear-gradient(
                90deg,
                color-mix(in srgb, var(--ink-3) 12%, transparent) 0%,
                color-mix(in srgb, var(--ink-3) 30%, transparent) 45%,
                color-mix(in srgb, var(--ink-3) 12%, transparent) 100%
            );
            background-size: 300% 100%;
            animation: skeleton-wave 1.1s ease-in-out infinite;
        }}

        @keyframes skeleton-wave {{
            0% {{ background-position: 100% 0; }}
            100% {{ background-position: 0 0; }}
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
        <p class="top-control-title">{i18n_text("PrÃ©fÃ©rences d'affichage", "Display preferences")}</p>
        <p class="top-control-subtitle">{i18n_text("Langue, thÃ¨me et sobriÃ©tÃ© de navigation", "Language, theme, and lightweight browsing")}</p>
    </div>
    """,
    unsafe_allow_html=True,
)
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
        help=i18n_text(
            "RÃ©duit l'usage des donnÃ©es pour une navigation plus sobre.",
            "Reduces data usage for a lighter browsing experience.",
        ),
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


@st.cache_data(ttl=21600, show_spinner=False)
def cached_fetch_osm_geometry(lat, lon, osm_type, target_distance_m=700.0, place_hint=""):
    """Cache intelligent des geometries OSM pour accelerer le premier rendu."""
    geometry, final_type = fetch_osm_geometry(
        float(lat),
        float(lon),
        str(osm_type),
        target_distance_m=float(target_distance_m or 700.0),
        place_hint=str(place_hint or ""),
    )
    if geometry is None:
        return None, final_type
    # Folium accepte un objet geo-interface type dict
    geo_mapping = geometry.__geo_interface__ if hasattr(geometry, "__geo_interface__") else geometry
    return geo_mapping, final_type


def build_interactive_folium_map(
    map_df: pd.DataFrame,
    timeline_max_speed: float = 6.0,
    timeline_auto_play: bool = False,
) -> folium.Map:
    """Construit la carte Folium complÃ¨te (couches, styles, popups, lÃ©gende, timeline)."""
    map_df = normalize_actions_dataframe(map_df)

    # Fallback sur Paris si vide
    center_lat, center_lon = 48.8566, 2.3522
    zoom_start = 12

    if not map_df.empty:
        center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
        zoom_start = 11

    m = folium.Map(location=[center_lat, center_lon], zoom_start=zoom_start, tiles=None)

    folium.TileLayer(
        'OpenStreetMap',
        name='Fond Clair (DÃ©faut)',
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
    group_pollution = folium.FeatureGroup(name="âš ï¸ Pollution & Actions", show=True)
    cluster_pollution = MarkerCluster(name="ðŸŸ£ Cluster Pollution (dense)", show=False, disableClusteringAtZoom=14)
    group_clean = folium.FeatureGroup(name="ðŸŒ¿ Zones Propres", show=True)
    group_business = folium.FeatureGroup(name="â­ Acteurs EngagÃ©s", show=True)
    group_simulated = folium.FeatureGroup(name="ðŸ§ª DonnÃ©es simulÃ©es", show=True)
    group_spots = folium.FeatureGroup(name="ðŸ“¢ Trash Spots (Signalisations)", show=True)
    group_ashtray_hotspots = folium.FeatureGroup(name="ðŸš¬ Cendriers prioritaires (mÃ©gots/h)", show=True)
    group_bin_hotspots = folium.FeatureGroup(name="ðŸ—‘ï¸ Poubelles prioritaires (kg/h)", show=True)

    # Seuils horaires (moyennes sur actions de dÃ©pollution) pour les marqueurs cendrier/poubelle
    avg_megots_h = 0.0
    avg_kg_h = 0.0
    if not map_df.empty:
        perf_df = map_df.copy()
        if "est_propre" in perf_df.columns:
            perf_df = perf_df[~perf_df["est_propre"].map(normalize_bool_flag)]
        if "type_lieu" in perf_df.columns:
            perf_df = perf_df[perf_df["type_lieu"].fillna("").astype(str) != "Ã‰tablissement EngagÃ© (Label)"]
        if "source" in perf_df.columns:
            perf_df = perf_df[perf_df["source"].map(normalize_source_kind) != "simulation"]
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
        spot_status = str(s.get("status", "new"))
        status_label = {
            "new": "Nouveau",
            "active": "Nouveau",
            "in_progress": "En cours",
            "cleaned": "RÃ©solu",
        }.get(spot_status, spot_status)
        icon_color = "red" if spot_status in {"new", "active"} else "blue" if spot_status == "in_progress" else "green"
        folium.Marker(
            [s['lat'], s['lon']],
            popup=f"<b>âš ï¸ {spot_type}</b><br>SignalÃ© par {spot_reporter}<br>Statut: <b>{status_label}</b><br><i>Aidez-nous Ã  nettoyer !</i>",
            icon=folium.Icon(color=icon_color, icon='exclamation-circle', prefix='fa'),
            tooltip=f"Spot de pollution: {status_label}"
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
            is_clean = normalize_bool_flag(row.get('est_propre', False))
            is_business = row.get('type_lieu') == "Ã‰tablissement EngagÃ© (Label)"
            source_kind = normalize_source_kind(row.get("source"))
            is_simulated = source_kind == "simulation"
            display_color = "#7c3aed" if is_simulated else None
            gap_alert = ""
            if (not is_clean) and (not is_business) and (not is_simulated) and row.get('lat') and row.get('lon'):
                if 48.8 <= row['lat'] <= 48.9 and 2.2 <= row['lon'] <= 2.4:
                    is_gap, dist = calculate_infrastructure_gap(row['lat'], row['lon'], official_bins)
                    if is_gap:
                        gap_alert = f"Besoin d'Ã©quipement : poubelle la plus proche Ã  {int(dist)}m"

            score_data = calculate_scores(row)
            color, radius, icon_type = get_marker_style(row, score_data)
            if is_simulated:
                color = display_color or color

            osm_type = detect_osm_type(row)
            if enable_osm_shapes and osm_type != 'point':
                action_minutes = float(row.get('temps_min', 60) or 60)
                volunteers = float(row.get('benevoles', row.get('nb_benevoles', 1)) or 1)
                team_factor = 1.0 + min(max(volunteers, 1.0) - 1.0, 4.0) * 0.08
                target_distance_m = (220.0 + action_minutes * 8.0) * team_factor
                geometry, final_type = cached_fetch_osm_geometry(
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
            if is_simulated:
                target_group = group_simulated
            else:
                target_group = group_business if is_business else group_clean if is_clean else group_pollution

            has_drawn_shape = False
            if final_type == 'park' and geometry:
                _park_color = color
                _park_fill = MAP_COLORS['park'] if not is_simulated else '#c4b5fd'
                folium.GeoJson(
                    geometry,
                    style_function=lambda x, c=_park_color, fill_color=_park_fill, simulated=is_simulated: {
                        'fillColor': fill_color,
                        'color': c,
                        'weight': 2 if not simulated else 3,
                        'fillOpacity': 0.3 if not simulated else 0.22,
                        'dashArray': '6,4' if simulated else None,
                    },
                    tooltip=place_name,
                    popup=folium.Popup(popup_html, max_width=300)
                ).add_to(target_group)
                has_drawn_shape = True
            elif final_type == 'street' and geometry:
                _street_color = color
                folium.GeoJson(
                    geometry,
                    style_function=lambda x, c=_street_color, simulated=is_simulated: {
                        'color': c,
                        'weight': 5 if not simulated else 6,
                        'opacity': 0.8 if not simulated else 0.65,
                        'dashArray': '7,5' if simulated else None,
                    },
                    tooltip=place_name,
                    popup=folium.Popup(popup_html, max_width=300)
                ).add_to(target_group)
                has_drawn_shape = True

            # Marqueur ponctuel uniquement quand aucun polygone/trait n'a pu Ãªtre tracÃ©
            if not has_drawn_shape:
                if is_simulated:
                    folium.CircleMarker(
                        location=[row['lat'], row['lon']],
                        radius=max(6, min(radius, 12)),
                        color='#7c3aed',
                        fill=True,
                        fill_color='#a78bfa',
                        fill_opacity=0.55,
                        dash_array='4 4',
                        tooltip=f"[Simulation] {place_name}",
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

            # Le dÃ©filement chronologique ne duplique pas en cercle les actions dÃ©jÃ  tracÃ©es en forme
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

            if score_data['score_mixte'] > 80 and not is_business and not is_simulated:
                folium.Marker(
                    location=[row['lat'], row['lon']],
                    icon=folium.Icon(color='purple', icon='exclamation-triangle', prefix='fa'),
                    tooltip=f"âš ï¸ Point Critique: {place_name}",
                    popup=f"<b>Point critique dÃ©tectÃ©</b><br>{place_name}<br><small>PrioritÃ© Ã©levÃ©e pour intervention.</small>"
                ).add_to(group_pollution)

            # Marqueurs de dÃ©passement des moyennes horaires (cendrier / poubelle)
            if (not is_clean) and (not is_business) and (not is_simulated):
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
                                border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);">ðŸš¬</div>
                            """),
                            tooltip=f"Cendrier prioritaire: {place_name}",
                            popup=(
                                f"<b>ðŸš¬ Cendrier prioritaire</b><br>{place_name}<br>"
                                f"MÃ©gots/h: <b>{megots_h:.1f}</b> (moyenne: {avg_megots_h:.1f})"
                            ),
                        ).add_to(group_ashtray_hotspots)

                    if avg_kg_h > 0 and kg_h > avg_kg_h:
                        folium.Marker(
                            location=[row['lat'], row['lon']],
                            icon=folium.DivIcon(html="""
                                <div style="background:#2563eb;width:28px;height:28px;border-radius:14px;
                                display:flex;align-items:center;justify-content:center;color:white;font-size:15px;
                                border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);">ðŸ—‘ï¸</div>
                            """),
                            tooltip=f"Poubelle prioritaire: {place_name}",
                            popup=(
                                f"<b>ðŸ—‘ï¸ Poubelle prioritaire</b><br>{place_name}<br>"
                                f"kg/h: <b>{kg_h:.2f}</b> (moyenne: {avg_kg_h:.2f})"
                            ),
                        ).add_to(group_bin_hotspots)

    group_pollution.add_child(cluster_pollution)
    group_pollution.add_to(m)
    group_clean.add_to(m)
    group_business.add_to(m)
    group_simulated.add_to(m)
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

    timeline_layer = None
    if features_timeline:
        timeline_layer = TimestampedGeoJson(
            {'type': 'FeatureCollection', 'features': features_timeline},
            period='P1D',
            add_last_point=True,
            auto_play=bool(timeline_auto_play),
            loop=False,
            min_speed=0.2,
            max_speed=max(1.0, float(timeline_max_speed)),
            loop_button=True,
            date_options='YYYY-MM-DD',
            time_slider_drag_update=True,
            speed_slider=True,
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
                    "{i18n_text('ðŸ•’ DÃ©filement chronologique', 'ðŸ•’ Chronological playback')}"
                );
            }}
            {{% endmacro %}}
            """
        )
        m.add_child(timeline_toggle)

        timeline_toolbar = MacroElement()
        timeline_toolbar._template = Template(
            f"""
            {{% macro script(this, kwargs) %}}
            var mapRef = {{{{ this._parent.get_name() }}}};
            if (mapRef) {{
                var ctl = L.control({{position: 'topleft'}});
                ctl.onAdd = function() {{
                    var div = L.DomUtil.create('div', 'leaflet-bar');
                    div.style.background = 'rgba(255,255,255,0.96)';
                    div.style.borderRadius = '10px';
                    div.style.padding = '6px';
                    div.style.boxShadow = '0 2px 10px rgba(15,23,42,0.2)';
                    div.innerHTML =
                        '<div style="display:flex;gap:6px;align-items:center;">' +
                        '<button id="{timeline_layer.get_name()}_pause" style="border:1px solid #cbd5e1;background:#f8fafc;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">Pause</button>' +
                        '<button id="{timeline_layer.get_name()}_resume" style="border:1px solid #cbd5e1;background:#f8fafc;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">Reprise</button>' +
                        '</div>';
                    L.DomEvent.disableClickPropagation(div);
                    return div;
                }};
                ctl.addTo(mapRef);

                var getPlayButton = function() {{
                    return mapRef.getContainer().querySelector('.leaflet-bar-timecontrol a.timecontrol-play');
                }};
                var pauseBtn = document.getElementById('{timeline_layer.get_name()}_pause');
                var resumeBtn = document.getElementById('{timeline_layer.get_name()}_resume');
                if (pauseBtn) {{
                    pauseBtn.onclick = function(ev) {{
                        ev.preventDefault();
                        var playBtn = getPlayButton();
                        if (playBtn && playBtn.classList.contains('pause')) {{
                            playBtn.click();
                        }}
                    }};
                }}
                if (resumeBtn) {{
                    resumeBtn.onclick = function(ev) {{
                        ev.preventDefault();
                        var playBtn = getPlayButton();
                        if (playBtn && !playBtn.classList.contains('pause')) {{
                            playBtn.click();
                        }}
                    }};
                }}
            }}
            {{% endmacro %}}
            """
        )
        m.add_child(timeline_toolbar)
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

ACTION_TAG_OPTIONS = [
    "Benevole solitaire",
    "Association",
    "Ecole",
    "Entreprise",
    "Collectivite",
    "Simulation",
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
    clean_col = clean_col.map(normalize_bool_flag)
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


def filter_actions_by_window(df: pd.DataFrame, window_key: str) -> pd.DataFrame:
    """Filtre les actions par fenÃªtre temporelle standard (7/30/90 jours)."""
    if df.empty or window_key == "all":
        return df.copy()

    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map.get(window_key)
    if not days:
        return df.copy()

    filtered = df.copy()
    date_col = pd.to_datetime(filtered.get("date"), errors="coerce")
    if date_col.isna().all() and "submitted_at" in filtered.columns:
        date_col = pd.to_datetime(filtered.get("submitted_at"), errors="coerce")
    cutoff = pd.Timestamp(date.today()) - pd.Timedelta(days=days)
    mask = date_col >= cutoff
    return filtered[mask.fillna(False)].copy()


def compute_anomaly_notes(df: pd.DataFrame) -> list[str]:
    """DÃ©tecte des signaux faibles utiles pour le bloc 'anomalies Ã  surveiller'."""
    if df.empty:
        return []

    work_df = df.copy()
    notes: list[str] = []
    work_df["dechets_kg_num"] = pd.to_numeric(work_df.get("dechets_kg", 0), errors="coerce").fillna(0)
    work_df["megots_num"] = pd.to_numeric(work_df.get("megots", 0), errors="coerce").fillna(0)
    work_df["temps_h"] = pd.to_numeric(work_df.get("temps_min", 0), errors="coerce").fillna(0) / 60.0
    work_df["adresse_clean"] = work_df.get("adresse", pd.Series(dtype=str)).fillna("").astype(str)

    valid = work_df["temps_h"] > 0
    if valid.any():
        work_df.loc[valid, "megots_h"] = work_df.loc[valid, "megots_num"] / work_df.loc[valid, "temps_h"]
        work_df.loc[valid, "kg_h"] = work_df.loc[valid, "dechets_kg_num"] / work_df.loc[valid, "temps_h"]

        mean_megots_h = float(work_df.loc[valid, "megots_h"].mean())
        if mean_megots_h > 0:
            high_megots = work_df[work_df.get("megots_h", 0).fillna(0) >= mean_megots_h * 1.8]
            if not high_megots.empty:
                row = high_megots.sort_values("megots_h", ascending=False).iloc[0]
                notes.append(
                    f"ðŸš¬ IntensitÃ© mÃ©gots Ã©levÃ©e Ã  {row['adresse_clean'] or 'zone non renseignÃ©e'} "
                    f"({row['megots_h']:.0f}/h vs moyenne {mean_megots_h:.0f}/h)."
                )

        mean_kg_h = float(work_df.loc[valid, "kg_h"].mean())
        if mean_kg_h > 0:
            high_kg = work_df[work_df.get("kg_h", 0).fillna(0) >= mean_kg_h * 1.8]
            if not high_kg.empty:
                row = high_kg.sort_values("kg_h", ascending=False).iloc[0]
                notes.append(
                    f"ðŸ—‘ï¸ Charge dÃ©chets Ã©levÃ©e Ã  {row['adresse_clean'] or 'zone non renseignÃ©e'} "
                    f"({row['kg_h']:.1f} kg/h vs moyenne {mean_kg_h:.1f} kg/h)."
                )

    addr_counts = (
        work_df[work_df["adresse_clean"].str.strip() != ""]
        .groupby("adresse_clean")
        .size()
        .sort_values(ascending=False)
    )
    if not addr_counts.empty and int(addr_counts.iloc[0]) >= 2:
        notes.append(
            f"ðŸ“ RÃ©currence dÃ©tectÃ©e sur {addr_counts.index[0]} "
            f"({int(addr_counts.iloc[0])} passages sur la pÃ©riode)."
        )

    big_actions = work_df[work_df["dechets_kg_num"] >= 200]
    if not big_actions.empty:
        row = big_actions.sort_values("dechets_kg_num", ascending=False).iloc[0]
        notes.append(
            f"âš ï¸ Action trÃ¨s volumineuse signalÃ©e Ã  {row['adresse_clean'] or 'zone non renseignÃ©e'} "
            f"({row['dechets_kg_num']:.1f} kg)."
        )

    return notes[:4]


def estimate_eco_points(df: pd.DataFrame) -> float:
    """Estimate total eco-points from dataframe with graceful fallback."""
    if df.empty:
        return 0.0
    if "eco_points" in df.columns:
        return float(pd.to_numeric(df.get("eco_points", 0), errors="coerce").fillna(0).sum())

    waste_kg = pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0)
    megots = pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0)
    temps_min = pd.to_numeric(df.get("temps_min", 60), errors="coerce").fillna(60)
    points = 10 + (temps_min / 15.0) * 10 + (waste_kg * 5) + (megots / 100.0)
    return float(points.sum())


def compute_period_comparison(df: pd.DataFrame, period_mode: str) -> dict:
    """Compare current vs previous period in week/month mode."""
    if df.empty:
        return {
            "current": pd.DataFrame(),
            "previous": pd.DataFrame(),
            "current_label": "",
            "previous_label": "",
        }

    work = df.copy()
    work["date_dt"] = pd.to_datetime(work.get("date"), errors="coerce")
    if work["date_dt"].isna().all() and "submitted_at" in work.columns:
        work["date_dt"] = pd.to_datetime(work.get("submitted_at"), errors="coerce")
    work = work.dropna(subset=["date_dt"])
    if work.empty:
        return {
            "current": pd.DataFrame(),
            "previous": pd.DataFrame(),
            "current_label": "",
            "previous_label": "",
        }

    today_ts = pd.Timestamp(date.today())
    if period_mode == "month":
        current_start = today_ts.replace(day=1)
        previous_start = current_start - pd.offsets.MonthBegin(1)
        previous_end = current_start - pd.Timedelta(days=1)
        current_label = current_start.strftime("%m/%Y")
        previous_label = previous_start.strftime("%m/%Y")
    else:
        week_start = today_ts - pd.Timedelta(days=int(today_ts.weekday()))
        current_start = week_start
        previous_start = current_start - pd.Timedelta(days=7)
        previous_end = current_start - pd.Timedelta(days=1)
        current_label = f"Semaine du {current_start.strftime('%d/%m')}"
        previous_label = f"Semaine du {previous_start.strftime('%d/%m')}"

    current_mask = work["date_dt"] >= current_start
    previous_mask = (work["date_dt"] >= previous_start) & (work["date_dt"] <= previous_end)
    return {
        "current": work[current_mask].copy(),
        "previous": work[previous_mask].copy(),
        "current_label": current_label,
        "previous_label": previous_label,
    }


def build_report_data_checklist(df: pd.DataFrame) -> tuple[list[dict], bool]:
    """Return checklist entries and export readiness flag."""
    if df.empty:
        return ([], False)

    rows = len(df)
    missing_date = int(pd.to_datetime(df.get("date"), errors="coerce").isna().sum())
    missing_geo = int(
        (
            pd.to_numeric(df.get("lat"), errors="coerce").isna()
            | pd.to_numeric(df.get("lon"), errors="coerce").isna()
        ).sum()
    )
    missing_address = int(df.get("adresse", pd.Series(dtype=str)).fillna("").astype(str).str.strip().eq("").sum())
    missing_actor = int(df.get("association", pd.Series(dtype=str)).fillna("").astype(str).str.strip().eq("").sum())
    no_impact = int(
        (
            pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0) <= 0
        )
        & (
            pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0) <= 0
        )
    ).sum()

    checks = [
        {"label": "Dates renseignees", "missing": missing_date, "total": rows, "critical": True},
        {"label": "Coordonnees GPS", "missing": missing_geo, "total": rows, "critical": True},
        {"label": "Adresses explicites", "missing": missing_address, "total": rows, "critical": True},
        {"label": "Structure/porteur", "missing": missing_actor, "total": rows, "critical": False},
        {"label": "Impact quantifie (kg ou megots)", "missing": no_impact, "total": rows, "critical": False},
    ]
    is_ready = all((c["missing"] == 0) for c in checks if c["critical"])
    return checks, is_ready


def infer_partner_type(raw_type: str) -> str:
    """Normalize partner structure type for filtering cards."""
    txt = str(raw_type or "").strip().lower()
    if "commerc" in txt:
        return "Commerce engage"
    if "humanitaire" in txt or "social" in txt:
        return "Association sociale"
    if "ecolog" in txt or "environnement" in txt or "engag" in txt:
        return "Association ecologique"
    return "Autre structure"


def summarize_route_simulation(candidate_df: pd.DataFrame, nb_benevoles: int, temps_action_min: int, max_distance_km: float) -> dict:
    """Estimate effort and achievable impact before launching route generation."""
    avg_kg = float(pd.to_numeric(candidate_df.get("dechets_kg", 0), errors="coerce").fillna(0).mean()) if not candidate_df.empty else 0.0
    avg_megots = float(pd.to_numeric(candidate_df.get("megots", 0), errors="coerce").fillna(0).mean()) if not candidate_df.empty else 0.0
    efficiency_factor = max(0.7, (float(nb_benevoles) / 5.0) * (float(temps_action_min) / 60.0))
    distance_penalty = max(0.6, 1.0 - (float(max_distance_km) - 3) * 0.04)
    est_actions = max(1, int(round(efficiency_factor * distance_penalty)))
    est_kg = max(0.0, avg_kg * est_actions)
    est_megots = max(0, int(avg_megots * est_actions))
    volunteer_hours = (float(nb_benevoles) * float(temps_action_min)) / 60.0
    walking_km = max(1.0, min(float(max_distance_km), (float(temps_action_min) / 60.0) * 2.2))
    impact = calculate_impact(est_megots, est_kg)
    return {
        "est_actions": est_actions,
        "est_kg": est_kg,
        "est_megots": est_megots,
        "volunteer_hours": volunteer_hours,
        "walking_km": walking_km,
        "impact_eau_l": int(impact.get("eau_litres", 0)),
    }


def build_gpx_from_paths(paths: list[dict], track_name: str = "CleanmyMap Route") -> bytes:
    """Generate a minimal GPX payload from folium polyline segments."""
    coords: list[tuple[float, float]] = []
    for seg in paths or []:
        for pt in seg.get("coords", []):
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                continue
            lat, lon = float(pt[0]), float(pt[1])
            if not coords or abs(coords[-1][0] - lat) > 1e-8 or abs(coords[-1][1] - lon) > 1e-8:
                coords.append((lat, lon))

    gpx_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="CleanmyMap" xmlns="http://www.topografix.com/GPX/1/1">',
        "  <trk>",
        f"    <name>{html.escape(track_name)}</name>",
        "    <trkseg>",
    ]
    for lat, lon in coords:
        gpx_lines.append(f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}"></trkpt>')
    gpx_lines.extend(["    </trkseg>", "  </trk>", "</gpx>"])
    return "\n".join(gpx_lines).encode("utf-8")


def build_google_maps_link_from_paths(paths: list[dict]) -> str:
    """Build a Google Maps walking directions link from route segments."""
    coords: list[tuple[float, float]] = []
    for seg in paths or []:
        for pt in seg.get("coords", []):
            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                coords.append((float(pt[0]), float(pt[1])))
    if len(coords) < 2:
        return ""

    start = coords[0]
    end = coords[-1]
    waypoint_count = min(8, max(0, len(coords) - 2))
    waypoints = []
    if waypoint_count > 0:
        step = max(1, int(len(coords) / (waypoint_count + 1)))
        for i in range(step, len(coords) - 1, step):
            waypoints.append(f"{coords[i][0]:.6f},{coords[i][1]:.6f}")
            if len(waypoints) >= waypoint_count:
                break

    url = (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={start[0]:.6f},{start[1]:.6f}"
        f"&destination={end[0]:.6f},{end[1]:.6f}"
        "&travelmode=walking"
    )
    if waypoints:
        url += "&waypoints=" + requests.utils.quote("|".join(waypoints), safe="")
    return url


def compute_mean_ci(values: pd.Series, confidence: float = 0.95) -> tuple[float, float, float]:
    """Return mean and normal-approx confidence interval."""
    arr = pd.to_numeric(values, errors="coerce").dropna().astype(float)
    if arr.empty:
        return 0.0, 0.0, 0.0
    mean_v = float(arr.mean())
    if len(arr) <= 1:
        return mean_v, mean_v, mean_v
    z = 1.96 if confidence >= 0.95 else 1.64
    se = float(arr.std(ddof=1) / max(len(arr) ** 0.5, 1e-9))
    return mean_v, mean_v - z * se, mean_v + z * se

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
                f"propre={'oui' if normalize_bool_flag(row.get('est_propre', False)) else 'non'}"
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
        raw = sanitize_dataframe_text(raw)
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
    },
    {
        'adresse': 'Promenade PlantÃ©e, Paris 12e',
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
        'commentaire': 'Point de contrÃ´le visuel (zone propre)'
    }
]

for _item in TEST_DATA:
    _item.setdefault("source", "simulation")
    if not _item.get("tags"):
        _item["tags"] = serialize_action_tags(infer_action_tags(_item))

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
def _qp_scalar(key: str, default: str = "") -> str:
    """Retourne un paramÃ¨tre d'URL sous forme scalaire, compatible str/list."""
    value = st.query_params.get(key, default)
    if isinstance(value, list):
        return str(value[0]) if value else default
    return str(value) if value is not None else default


def _qp_list(key: str) -> list[str]:
    value = st.query_params.get(key, [])
    values = value if isinstance(value, list) else [value]
    flat: list[str] = []
    for raw in values:
        for part in re.split(r"[|,;/]+", str(raw or "")):
            token = part.strip()
            if token and token not in flat:
                flat.append(token)
    return flat


lieu_prefill = _qp_scalar("lieu", "")
if lieu_prefill:
    st.toast(f"ðŸ“ Lieu dÃ©tectÃ© via QR Code : {lieu_prefill}", icon="ðŸ“±")

tab_prefill = _qp_scalar("tab", "")
map_preset_prefill = _qp_scalar("preset", "")
map_query_prefill = _qp_scalar("q", "")
map_from_prefill = _qp_scalar("from_date", "")
map_to_prefill = _qp_scalar("to_date", "")
map_tags_prefill = _qp_list("tags")
map_source_prefill = _qp_scalar("source", "all").lower()
map_timeline_speed_prefill = _qp_scalar("tspeed", "6")
map_timeline_auto_prefill = _qp_scalar("tauto", "0")

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
all_public_df = normalize_actions_dataframe(all_public_df)
all_public_df = sanitize_dataframe_text(all_public_df)
if "est_propre" in all_public_df.columns:
    all_public_df["est_propre"] = all_public_df["est_propre"].map(normalize_bool_flag)

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
            {"Plateforme de pilotage terrain" if st.session_state.lang == "fr" else "Field operations platform"}
        </div>
        <h2 class="app-shell-title">
            {"Pilotez vos cleanwalks avec une <span class='accent'>vision terrain claire</span>" if st.session_state.lang == "fr" else "Run cleanwalks with a <span class='accent'>clear field vision</span>"}
        </h2>
        <p class="app-shell-subtitle">
            {"DÃ©clarez les actions, suivez l'impact en temps rÃ©el et priorisez les zones Ã  traiter pour coordonner bÃ©nÃ©voles, associations et collectivitÃ©s depuis un cockpit unique."
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
# Identifiants stables pour Ã©viter les rubriques vides aprÃ¨s changement de langue

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
    "home": i18n_text("Tableau de bord global et indicateurs clÃ©s.", "Global dashboard and key indicators."),
    "declaration": i18n_text("DÃ©clarez une action terrain en quelques secondes.", "Report a field action in seconds."),
    "map": i18n_text("Carte d'impact en direct et points prioritaires.", "Live impact map and priority hotspots."),
    "trash_spotter": i18n_text("Signalez rapidement une zone Ã  traiter.", "Quickly flag a polluted location."),
    "community": i18n_text("Coordonnez sorties, annonces et bÃ©nÃ©voles.", "Coordinate meetups, notices, and volunteers."),
    "gamification": i18n_text("Classements, badges et motivation collective.", "Leaderboards, badges, and team momentum."),
    "pdf": i18n_text("GÃ©nÃ©rez un rapport d'impact prÃªt Ã  partager.", "Generate a share-ready impact report."),
    "actors": i18n_text("Visualisez les partenaires engagÃ©s du territoire.", "See active local partners."),
    "route": i18n_text("Planification IA des itinÃ©raires de collecte.", "AI route planning for cleanups."),
    "recycling": i18n_text("Valorisez le tri et la seconde vie des dÃ©chets.", "Track sorting and second-life outcomes."),
    "climate": i18n_text("Ressources pÃ©dagogiques sur les enjeux climat.", "Educational climate insights."),
    "weather": i18n_text("Anticipez vos actions avec la mÃ©tÃ©o locale.", "Plan activities with local weather."),
    "compare": i18n_text("Comparez les performances entre territoires.", "Compare performance across territories."),
    "kit": i18n_text("QR codes et outils prÃªts pour le terrain.", "Field-ready QR and operation kit."),
    "guide": i18n_text("Guide pratique pour mobiliser durablement.", "Practical guide for sustained mobilization."),
    "elus": i18n_text("Pilotage orientÃ© collectivitÃ©s et Ã©lus.", "Planning tools for local authorities."),
    "sandbox": i18n_text("Espace de test sans impact production.", "Safe sandbox without production impact."),
    "admin": i18n_text("Validation, contrÃ´le qualitÃ© et exports.", "Validation, quality control, and exports."),
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
st.markdown(
    """
    <a class="skip-link" href="#main-content">Aller au contenu principal</a>
    <a class="skip-link" href="#global-search">Aller a la recherche globale</a>
    """,
    unsafe_allow_html=True,
)
st.markdown('<nav class="nav-shell" role="navigation" aria-label="Navigation principale">', unsafe_allow_html=True)
st.markdown(
    f'<p class="rubric-hero-title">{i18n_text("Toutes les rubriques disponibles", "All available sections")}</p>',
    unsafe_allow_html=True,
)
st.markdown(
    f'<p class="rubric-hero-subtitle">{i18n_text("Faites dÃ©filer horizontalement pour accÃ©der immÃ©diatement Ã  chaque rubrique.", "Scroll horizontally to access every section instantly.")}</p>',
    unsafe_allow_html=True,
)
st.caption(i18n_text("Accessibilite: navigation clavier avec Tab puis Entree.", "Accessibility: keyboard navigation with Tab then Enter."))
rubric_cards = []
for tab_id in nav_ids:
    active_class = " rubric-pill-active" if tab_id == active_tab_id else ""
    label = html.escape(id_to_label[tab_id])
    hint = html.escape(rubric_hints.get(tab_id, ""))
    rubric_cards.append(
        f'<form class="rubric-pill-form" method="get">'
        f'<input type="hidden" name="tab" value="{tab_id}"/>'
        f'<button class="rubric-pill{active_class}" type="submit" title="{hint}" aria-label="{label} - {hint}">'
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
        i18n_text("â† Rubrique prÃ©cÃ©dente", "â† Previous section"),
        key="rubric_prev_btn",
        use_container_width=True,
        type="secondary",
        disabled=active_index == 0,
    ):
        active_tab_id = nav_ids[active_index - 1]
with next_col:
    if st.button(
        i18n_text("Rubrique suivante â†’", "Next section â†’"),
        key="rubric_next_btn",
        use_container_width=True,
        type="secondary",
        disabled=active_index == len(nav_ids) - 1,
    ):
        active_tab_id = nav_ids[active_index + 1]

st.markdown('</div>', unsafe_allow_html=True)
st.markdown('</nav>', unsafe_allow_html=True)

st.markdown('<a id="global-search"></a>', unsafe_allow_html=True)
with st.expander("Recherche globale (adresse, asso, action, quartier)", expanded=False):
    global_query = st.text_input(
        "Recherche transversale",
        key="global_search_query",
        placeholder="Ex: republic, luxembourg, cleanwalk, asso...",
        help="Cherche dans toutes les actions publiees: adresse, quartier, association, type, commentaire.",
    )
    if global_query.strip():
        global_results = global_search_actions(all_public_df, global_query)
        if global_results.empty:
            render_empty_state(
                "Aucun resultat",
                "Aucun element ne correspond a votre recherche. Essayez une autre orthographe ou creez une action.",
                "Creer la premiere action",
                "declaration",
                key_suffix="global_search_empty",
            )
        else:
            st.caption(f"{len(global_results)} resultat(s) trouves.")
            st.dataframe(global_results, hide_index=True, width="stretch")
            gs1, gs2 = st.columns(2)
            with gs1:
                if st.button("Ouvrir la carte avec ce filtre", key="global_search_open_map", use_container_width=True):
                    st.session_state["map_global_query"] = global_query.strip()
                    st.session_state.active_tab_id = "map"
                    st.rerun()
            with gs2:
                if st.button("Declarer une action", key="global_search_open_decl", use_container_width=True):
                    st.session_state.active_tab_id = "declaration"
                    st.rerun()

# Synchronisation du state
st.session_state.active_tab_id = active_tab_id
st.session_state.active_tab = id_to_label[active_tab_id]

# Initialisation des containers
if st.session_state.get("last_skeleton_tab") != active_tab_id:
    render_loading_skeleton(active_tab_id, lines=4)
    st.session_state["last_skeleton_tab"] = active_tab_id

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

st.markdown('<a id="main-content"></a>', unsafe_allow_html=True)

with tab_kit:
    render_tab_header(
        icon="\U0001F4F1",
        title_fr="Kit Organisateur",
        title_en="Organizer Kit",
        subtitle_fr="GÃ©nÃ©rez un QR code terrain, des templates Ã©quipes et des supports prÃ©-remplis pour fluidifier vos cleanwalks.",
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
    st.subheader("Templates pre-remplis par type d'action")
    kit_templates = {
        "Rue passante": {"participants": 12, "teams": 3, "materiel": "gants, sacs, pinces, gilet"},
        "Parc urbain": {"participants": 18, "teams": 4, "materiel": "gants, sacs de tri, pinces, balisage"},
        "Quai / berge": {"participants": 10, "teams": 2, "materiel": "gants renforces, sacs, pinces, kit securite eau"},
        "Abords ecole": {"participants": 8, "teams": 2, "materiel": "gants, sacs, pinces, fiches sensibilisation"},
    }
    selected_kit_tpl = st.selectbox("Type d'action", list(kit_templates.keys()), key="kit_template_selector")
    if st.button("Appliquer ce template", key="kit_apply_template", use_container_width=True):
        tpl = kit_templates[selected_kit_tpl]
        st.session_state["kit_participants"] = int(tpl["participants"])
        st.session_state["kit_teams"] = int(tpl["teams"])
        st.session_state["kit_material_hint"] = str(tpl["materiel"])
        st.success("Template applique au kit terrain.")
        st.rerun()

    st.subheader("Templates imprimables et gestion multi-benevoles")
    nb_participants = st.number_input("Nombre de benevoles attendus", min_value=1, value=10, step=1, key="kit_participants")
    nb_equipes = st.number_input("Nombre d'equipes", min_value=1, value=3, step=1, key="kit_teams")
    default_material = st.session_state.get("kit_material_hint", "gants, sacs, pinces")

    planner = pd.DataFrame(
        {
            "equipe": [f"Equipe {((i % nb_equipes) + 1)}" for i in range(nb_participants)],
            "benevole": [f"Participant {i+1}" for i in range(nb_participants)],
            "telephone": ["" for _ in range(nb_participants)],
            "materiel": [default_material for _ in range(nb_participants)],
        }
    )
    st.dataframe(planner, width="stretch", hide_index=True)
    st.download_button(
        "Telecharger template equipes (CSV)",
        data=planner.to_csv(index=False).encode("utf-8"),
        file_name="template_equipes_cleanmymap.csv",
        mime="text/csv",
        width="stretch",
    )

    st.markdown("---")
    st.subheader("Checklists imprimables par role")
    role_checklists = {
        "Coordinateur": [
            "Verifier briefing securite",
            "Valider points de regroupement",
            "Lancer declaration finale equipe",
        ],
        "Referent securite": [
            "Verifier equipements de protection",
            "Rappeler zones interdites",
            "Remonter incident si necessaire",
        ],
        "Referent tri": [
            "Controler tri des flux",
            "Isoler dechets dangereux",
            "Valider depot exutoire",
        ],
        "Photographe / preuve": [
            "Photo avant / apres",
            "Tracer les points cles",
            "Consolider preuves terrain",
        ],
    }
    chosen_roles = st.multiselect(
        "Roles a inclure dans le kit",
        options=list(role_checklists.keys()),
        default=["Coordinateur", "Referent securite", "Referent tri"],
        key="kit_roles",
    )
    checklist_rows = []
    checklist_txt_parts = []
    for role in chosen_roles:
        checklist_txt_parts.append(f"{role}\n" + "\n".join([f"- [ ] {item}" for item in role_checklists[role]]))
        for item in role_checklists[role]:
            checklist_rows.append({"role": role, "checkpoint": item})
    checklist_df = pd.DataFrame(checklist_rows) if checklist_rows else pd.DataFrame(columns=["role", "checkpoint"])
    if not checklist_df.empty:
        st.dataframe(checklist_df, width="stretch", hide_index=True)
        st.download_button(
            "Telecharger checklists roles (CSV)",
            data=checklist_df.to_csv(index=False).encode("utf-8"),
            file_name="checklists_roles_terrain.csv",
            mime="text/csv",
            width="stretch",
        )
        st.download_button(
            "Telecharger checklists roles (TXT imprimable)",
            data=("\n\n".join(checklist_txt_parts)).encode("utf-8"),
            file_name="checklists_roles_terrain.txt",
            mime="text/plain",
            width="stretch",
        )
    else:
        st.caption("Selectionnez au moins un role pour generer les checklists.")

    st.markdown("---")
    st.subheader("Pack ZIP enrichi")
    st.caption("Contenu: QR principal, QR equipes, feuille equipes, brief securite, checklists roles, README.")
    with st.form("kit_zip_form"):
        event_name = st.text_input("Nom de l'evenement", value="Cleanwalk locale")
        event_place = st.text_input("Lieu de l'evenement", value=lieu_event if 'lieu_event' in locals() and lieu_event else "")
        event_date = st.date_input("Date evenement", value=date.today(), key="kit_event_date")
        safety_level = st.selectbox("Niveau de brief securite", ["Standard", "Renforce (zone routiere)", "Berge / zone humide"], key="kit_safety_level")
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

                for team_idx in range(1, int(nb_equipes) + 1):
                    team_url = (
                        f"{STREAMLIT_PUBLIC_URL}/?lieu={requests.utils.quote(event_place.strip())}"
                        f"&team={team_idx}&event={requests.utils.quote(event_name)}"
                    )
                    qr_team = qrcode.QRCode(version=1, box_size=8, border=3)
                    qr_team.add_data(team_url)
                    qr_team.make(fit=True)
                    qr_team_img = qr_team.make_image(fill_color="#0f766e", back_color="white")
                    qr_team_bytes = io.BytesIO()
                    qr_team_img.save(qr_team_bytes, format="PNG")
                    zf.writestr(f"06_qr_equipes/qr_equipe_{team_idx}.png", qr_team_bytes.getvalue())

                zf.writestr("02_feuille_equipes.csv", planner.to_csv(index=False))

                declaration_prefill = pd.DataFrame(
                    [
                        {
                            "nom": "Equipe 1",
                            "association": "A completer",
                            "type_lieu": selected_kit_tpl,
                            "adresse": event_place,
                            "date": str(event_date),
                            "benevoles": max(1, int(nb_participants // max(nb_equipes, 1))),
                            "temps_min": 60,
                            "megots": 0,
                            "dechets_kg": 0.0,
                            "commentaire": "Template pre-rempli",
                        }
                    ]
                )
                zf.writestr("03_template_declaration_prefill.csv", declaration_prefill.to_csv(index=False))

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
                    "- Declaration des donnees dans l'application\n"
                    "- Debrief equipe et axes d'amelioration\n"
                )
                zf.writestr("04_checklist_terrain.txt", checklist)

                safety_brief = (
                    f"BRIEF SECURITE - {event_name}\n"
                    f"Niveau: {safety_level}\n\n"
                    "- Toujours rester en binome\n"
                    "- Ne pas manipuler objet coupant ou suspect\n"
                    "- Gilet visible obligatoire en zone circulation\n"
                    "- Point de contact urgence: 112\n"
                    "- Referent securite: ______________________\n"
                )
                zf.writestr("05_brief_securite.txt", safety_brief)

                if not checklist_df.empty:
                    zf.writestr("07_checklists_roles.csv", checklist_df.to_csv(index=False))
                    zf.writestr("08_checklists_roles.txt", "\n\n".join(checklist_txt_parts))

                readme = (
                    "Pack evenement Clean my Map\n\n"
                    f"Nom: {event_name}\n"
                    f"Lieu: {event_place}\n"
                    f"Date: {event_date}\n"
                    f"Lien QR principal: {pack_url}\n"
                    f"Template action: {selected_kit_tpl}\n"
                    f"Equipes: {nb_equipes}\n"
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
        icon="ðŸ§­",
        title_fr="Parcours recommandÃ©",
        title_en="Recommended flow",
        body_fr="1) Choisissez une rubrique dans le carrousel, 2) lancez votre action, 3) revenez ici pour suivre la carte et les indicateurs en direct.",
        body_en="1) Pick a section in the ribbon, 2) run your action, 3) come back here to follow the map and live indicators.",
        tone="info",
    )
    home_scope_options = [
        ("7d", i18n_text("7 jours", "7 days")),
        ("30d", i18n_text("30 jours", "30 days")),
        ("90d", i18n_text("90 jours", "90 days")),
        ("all", i18n_text("Tout l'historique", "All history")),
    ]
    scope_labels = [label for _, label in home_scope_options]
    scope_to_key = {label: key for key, label in home_scope_options}
    selected_scope_label = st.radio(
        i18n_text("PÃ©riode d'analyse (KPI + carte synchronisÃ©s)", "Analysis window (synced KPI + map)"),
        options=scope_labels,
        index=1,
        horizontal=True,
        key="home_scope_radio",
    )
    selected_scope = scope_to_key[selected_scope_label]
    home_scope_df = filter_actions_by_window(all_public_df, selected_scope) if not all_public_df.empty else pd.DataFrame()

    hk1, hk2, hk3, hk4 = st.columns(4)
    hk1.metric(i18n_text("Actions", "Actions"), int(len(home_scope_df)))
    hk2.metric(
        i18n_text("kg collectÃ©s", "kg collected"),
        f"{float(pd.to_numeric(home_scope_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
    )
    hk3.metric(
        i18n_text("MÃ©gots", "Cigarette butts"),
        f"{int(pd.to_numeric(home_scope_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
    )
    hk4.metric(
        i18n_text("Zones propres", "Clean zones"),
        int(home_scope_df.get("est_propre", pd.Series(dtype=bool)).map(normalize_bool_flag).sum()),
    )

    home_filters = {i18n_text("Periode", "Period"): selected_scope_label}
    home_metrics = {
        i18n_text("Actions", "Actions"): int(len(home_scope_df)),
        i18n_text("kg collectes", "kg collected"): f"{float(pd.to_numeric(home_scope_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
        i18n_text("Megots", "Butts"): f"{int(pd.to_numeric(home_scope_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
        i18n_text("Zones propres", "Clean zones"): int(home_scope_df.get("est_propre", pd.Series(dtype=bool)).map(normalize_bool_flag).sum()),
    }
    render_print_current_view(
        view_key="home",
        title=i18n_text("Vue courante - Notre impact", "Current view - Our impact"),
        filters=home_filters,
        metrics=home_metrics,
        map_link=f"{STREAMLIT_PUBLIC_URL}/?tab=home",
    )
    render_standard_exports(home_scope_df, basename="home_scope_data", key_prefix="home_scope_export")

    top_home_col, resume_col = st.columns([2.4, 1.2], gap="large")
    with top_home_col:
        st.subheader(i18n_text("Actions rÃ©centes", "Recent actions"))
        recent_df = home_scope_df.copy() if not home_scope_df.empty else pd.DataFrame()
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
            render_empty_state(
                i18n_text("Aucune action recente", "No recent action yet"),
                i18n_text("Lancez une premiere declaration pour alimenter la timeline.", "Start a first declaration to populate the timeline."),
                i18n_text("Creer la premiere action", "Create the first action"),
                "declaration",
                key_suffix="home_recent_empty",
            )

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
                    "m_condition": "MÃ©langÃ© / ImpuretÃ©s",
                    "dechets_kg": float(last_action.get("dechets_kg") or 0.0),
                    "commentaire": last_action.get("commentaire", ""),
                    "subscribe_newsletter": False,
                    "user_email": "",
                }
                st.session_state["submission_draft_saved_at"] = datetime.now().strftime("%H:%M:%S")
            st.session_state.active_tab_id = "declaration"
            st.rerun()

    st.markdown("### " + i18n_text("Anomalies Ã  surveiller", "Anomalies to monitor"))
    anomaly_notes = compute_anomaly_notes(home_scope_df)
    if anomaly_notes:
        for note in anomaly_notes:
            st.caption(f"- {note}")
    else:
        st.caption(i18n_text("Aucun signal anormal dÃ©tectÃ© sur la pÃ©riode sÃ©lectionnÃ©e.", "No anomalous signal detected in the selected window."))

    st.markdown("---")
    st.subheader(i18n_text("Carte interactive des actions (temps rÃ©el)", "Live interactive action map"))

    home_actions_df = home_scope_df.dropna(subset=["lat", "lon"]).copy() if not home_scope_df.empty else pd.DataFrame()

    if not home_actions_df.empty:
        home_actions_df = calculate_trends(home_actions_df)
        home_map = get_cached_folium_map(home_actions_df, cache_key_prefix="home")
    else:
        render_empty_state(
            i18n_text("Aucune action geolocalisee", "No geolocated action yet"),
            i18n_text("Declarez une action pour afficher les premiers points sur la carte.", "Declare an action to display the first points on the map."),
            i18n_text("Declarer une action", "Declare an action"),
            "declaration",
            key_suffix="home_map_empty",
        )
        home_map = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="CartoDB positron")

    st_folium(home_map, width="stretch", height=520, returned_objects=[])

with tab_view:
    render_tab_header(
        icon="\U0001F5FA\ufe0f",
        title_fr="Carte Interactive des Actions",
        title_en="Interactive Action Map",
        subtitle_fr="Explorez les actions validÃ©es, les zones sensibles, la chronologie et les couches gÃ©ographiques en un seul espace.",
        subtitle_en="Explore validated actions, sensitive zones, timeline, and geographic layers in one workspace.",
        chips=[i18n_text("Cartographie", "Mapping"), i18n_text("Analyse", "Analytics"), i18n_text("Temps rÃ©el", "Live")],
        compact=True,
    )
    render_ui_callout(
        icon="ðŸ—ºï¸",
        title_fr="Guide visuel (3 Ã©tapes)",
        title_en="Visual guide (3 steps)",
        body_fr="1) Choisissez un prÃ©rÃ©glage. 2) Lisez le rÃ©sumÃ© et les zones clÃ©s. 3) Passez en mission ou partagez la vue.",
        body_en="1) Choose a preset. 2) Read summary and key areas. 3) Switch to mission or share the view.",
        tone="info",
    )
    
    # Chargement DB + imports (Google Sheet et Excel)
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = normalize_actions_dataframe(pd.DataFrame(public_actions))

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

    if "map_global_query" not in st.session_state and map_query_prefill:
        st.session_state["map_global_query"] = map_query_prefill
    if "map_source_filter" not in st.session_state:
        st.session_state["map_source_filter"] = map_source_prefill if map_source_prefill in {"all", "real", "simulation"} else "all"
    if "map_selected_tags" not in st.session_state:
        st.session_state["map_selected_tags"] = map_tags_prefill
    if "map_timeline_max_speed" not in st.session_state:
        try:
            st.session_state["map_timeline_max_speed"] = float(map_timeline_speed_prefill)
        except Exception:
            st.session_state["map_timeline_max_speed"] = 6.0
    if "map_timeline_auto_play" not in st.session_state:
        st.session_state["map_timeline_auto_play"] = str(map_timeline_auto_prefill).strip().lower() in {"1", "true", "yes", "on"}

    preset_items = [
        ("all", i18n_text("Vue complÃ¨te", "Full view")),
        ("pollution", i18n_text("Pollution", "Pollution")),
        ("clean", i18n_text("Zones propres", "Clean zones")),
        ("partners", i18n_text("Partenaires engagÃ©s", "Engaged partners")),
        ("recent", i18n_text("Actions rÃ©centes (30 j)", "Recent actions (30d)")),
        ("priority", i18n_text("Zones prioritaires", "Priority zones")),
    ]
    preset_to_label = {pid: label for pid, label in preset_items}
    label_to_preset = {label: pid for pid, label in preset_items}
    default_preset = map_preset_prefill if map_preset_prefill in preset_to_label else "all"
    if st.session_state.get("map_preset_selected") not in preset_to_label:
        st.session_state["map_preset_selected"] = default_preset

    selected_preset_label = st.selectbox(
        i18n_text("PrÃ©rÃ©glage de filtrage", "Filter preset"),
        options=[label for _, label in preset_items],
        index=[pid for pid, _ in preset_items].index(st.session_state.get("map_preset_selected", default_preset)),
        key="map_preset_select",
    )
    selected_preset = label_to_preset[selected_preset_label]
    st.session_state["map_preset_selected"] = selected_preset

    st.caption(i18n_text("PrÃ©rÃ©glages rapides", "Quick preset chips"))
    for row in [preset_items[:3], preset_items[3:]]:
        cols = st.columns(3, gap="small")
        for idx, (pid, label) in enumerate(row):
            with cols[idx]:
                if st.button(
                    label,
                    key=f"map_preset_chip_{pid}",
                    use_container_width=True,
                    type="primary" if selected_preset == pid else "secondary",
                ):
                    st.session_state["map_preset_selected"] = pid
                    st.session_state["map_preset_select"] = preset_to_label[pid]
                    st.rerun()

    filtered_map_df = apply_map_preset(map_df, selected_preset)
    source_filter_labels = {
        "all": i18n_text("Toutes les donnees", "All data"),
        "real": i18n_text("Donnees reelles", "Real data"),
        "simulation": i18n_text("Donnees simulees", "Simulated data"),
    }
    selected_source_filter = st.selectbox(
        i18n_text("Type de donnees", "Data type"),
        options=["all", "real", "simulation"],
        format_func=lambda x: source_filter_labels.get(x, x),
        key="map_source_filter",
    )
    if selected_source_filter != "all" and not filtered_map_df.empty:
        source_series = filtered_map_df.get("source", pd.Series(index=filtered_map_df.index, dtype=str)).map(normalize_source_kind)
        if selected_source_filter == "real":
            filtered_map_df = filtered_map_df[source_series != "simulation"]
        else:
            filtered_map_df = filtered_map_df[source_series == "simulation"]

    available_tags: list[str] = []
    if not map_df.empty and "tags" in map_df.columns:
        for raw_tags in map_df["tags"].fillna(""):
            for tag in parse_action_tags(raw_tags):
                if tag not in available_tags:
                    available_tags.append(tag)
    for default_tag in ACTION_TAG_OPTIONS:
        if default_tag not in available_tags:
            available_tags.append(default_tag)
    st.session_state["map_selected_tags"] = [
        tag for tag in parse_action_tags(st.session_state.get("map_selected_tags", [])) if tag in available_tags
    ]
    selected_tags = st.multiselect(
        i18n_text("Tags d'actions", "Action tags"),
        options=available_tags,
        key="map_selected_tags",
        help=i18n_text("Filtrez par categorie d'action (association, ecole, entreprise, etc.).", "Filter by action category (association, school, company, etc.)."),
    )
    if selected_tags and not filtered_map_df.empty:
        filtered_map_df = filtered_map_df[
            filtered_map_df.get("tags", pd.Series(index=filtered_map_df.index, dtype=str)).apply(
                lambda raw: any(tag in parse_action_tags(raw) for tag in selected_tags)
            )
        ]

    timeline_c1, timeline_c2 = st.columns(2, gap="small")
    with timeline_c1:
        timeline_max_speed = st.slider(
            i18n_text("Vitesse max timeline", "Timeline max speed"),
            min_value=1.0,
            max_value=12.0,
            value=float(st.session_state.get("map_timeline_max_speed", 6.0)),
            step=0.5,
            key="map_timeline_max_speed",
        )
    with timeline_c2:
        timeline_auto_play = st.checkbox(
            i18n_text("Lecture auto de la timeline", "Autoplay timeline"),
            value=bool(st.session_state.get("map_timeline_auto_play", False)),
            key="map_timeline_auto_play",
        )
    st.caption(i18n_text("Le controle chronologique reste desactive par defaut dans les couches; utilisez Pause/Reprise pour piloter l'animation.", "Timeline layer stays off by default; use Pause/Resume to control playback."))

    date_series = action_datetime_series(filtered_map_df)
    valid_date_series = date_series.dropna()
    date_filter_label = i18n_text("Periode", "Date range")
    selected_from_date = None
    selected_to_date = None
    if not valid_date_series.empty:
        min_action_date = valid_date_series.min().date()
        max_action_date = valid_date_series.max().date()
        if "map_from_date" not in st.session_state:
            parsed = pd.to_datetime(map_from_prefill, errors="coerce")
            st.session_state["map_from_date"] = parsed.date() if pd.notna(parsed) else min_action_date
        if "map_to_date" not in st.session_state:
            parsed = pd.to_datetime(map_to_prefill, errors="coerce")
            st.session_state["map_to_date"] = parsed.date() if pd.notna(parsed) else max_action_date

        d1, d2 = st.columns(2, gap="small")
        with d1:
            selected_from_date = st.date_input(
                f"{date_filter_label} - {i18n_text('debut', 'start')}",
                min_value=min_action_date,
                max_value=max_action_date,
                value=max(min_action_date, min(max_action_date, st.session_state.get("map_from_date", min_action_date))),
                key="map_from_date",
            )
        with d2:
            selected_to_date = st.date_input(
                f"{date_filter_label} - {i18n_text('fin', 'end')}",
                min_value=min_action_date,
                max_value=max_action_date,
                value=max(min_action_date, min(max_action_date, st.session_state.get("map_to_date", max_action_date))),
                key="map_to_date",
            )
        if selected_from_date > selected_to_date:
            selected_from_date, selected_to_date = selected_to_date, selected_from_date
        if not filtered_map_df.empty:
            filtered_map_df = filtered_map_df[(date_series.dt.date >= selected_from_date) & (date_series.dt.date <= selected_to_date)]

    map_global_query = str(st.session_state.get("map_global_query", "")).strip()
    if map_global_query and not filtered_map_df.empty:
        map_query = map_global_query.lower()
        map_search_cols = []
        for col in ["adresse", "association", "nom", "type_lieu", "commentaire"]:
            if col in filtered_map_df.columns:
                map_search_cols.append(filtered_map_df[col].fillna("").astype(str).str.lower())
        if map_search_cols:
            map_search_blob = map_search_cols[0]
            for extra_col in map_search_cols[1:]:
                map_search_blob = map_search_blob + " " + extra_col
            filtered_map_df = filtered_map_df[map_search_blob.str.contains(re.escape(map_query), na=False)]
            st.caption(f"Filtre recherche globale actif: '{map_global_query}' ({len(filtered_map_df)} resultat(s))")
            if st.button("Retirer le filtre de recherche", key="map_clear_global_query", use_container_width=True):
                st.session_state["map_global_query"] = ""
                st.rerun()

    share_params = {
        "tab": "map",
        "preset": selected_preset,
        "source": selected_source_filter,
        "tspeed": f"{float(timeline_max_speed):.1f}",
        "tauto": "1" if timeline_auto_play else "0",
    }
    if map_global_query:
        share_params["q"] = map_global_query
    if selected_tags:
        share_params["tags"] = ",".join(selected_tags)
    if selected_from_date:
        share_params["from_date"] = selected_from_date.isoformat()
    if selected_to_date:
        share_params["to_date"] = selected_to_date.isoformat()
    share_url = f"{STREAMLIT_PUBLIC_URL}/?{urlencode(share_params)}"
    st.text_input(
        i18n_text("Lien partageable (onglet + filtres + dates)", "Shareable link (tab + filters + dates)"),
        value=share_url,
        key=f"map_share_url_{selected_preset}_{selected_source_filter}",
    )

    if filtered_map_df.empty and not map_df.empty:
        render_empty_state(
            i18n_text("Aucun resultat pour ce filtre", "No result for this filter"),
            i18n_text("Revenez a la vue complete ou declarez une nouvelle action.", "Switch back to full view or declare a new action."),
            i18n_text("Creer la premiere action", "Create the first action"),
            "declaration",
            key_suffix="map_empty",
        )
    cache_tag_part = "_".join(selected_tags) if selected_tags else "alltags"
    cache_date_part = (
        f"{selected_from_date.isoformat()}_{selected_to_date.isoformat()}"
        if selected_from_date and selected_to_date
        else "alltime"
    )
    m = get_cached_folium_map(
        filtered_map_df,
        cache_key_prefix=f"map_{selected_preset}_{selected_source_filter}_{cache_tag_part}_{cache_date_part}",
        timeline_max_speed=float(timeline_max_speed),
        timeline_auto_play=bool(timeline_auto_play),
    )

    map_ref_df = filtered_map_df if not filtered_map_df.empty else map_df
    st.markdown("### " + i18n_text("RÃ©sumÃ© du prÃ©rÃ©glage actif", "Active preset insights"))
    i1, i2 = st.columns(2)
    i1.metric(i18n_text("Actions", "Actions"), int(len(map_ref_df)))
    i2.metric(
        i18n_text("kg collectÃ©s", "kg collected"),
        f"{float(pd.to_numeric(map_ref_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
    )
    i3, i4 = st.columns(2)
    i3.metric(
        i18n_text("MÃ©gots", "Cigarette butts"),
        f"{int(pd.to_numeric(map_ref_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
    )
    i4.metric(
        i18n_text("Zones propres", "Clean zones"),
        int(map_ref_df.get("est_propre", pd.Series(dtype=bool)).map(normalize_bool_flag).sum()),
    )
    real_count = int(
        map_ref_df.get("source", pd.Series(index=map_ref_df.index, dtype=str))
        .map(normalize_source_kind)
        .ne("simulation")
        .sum()
    ) if not map_ref_df.empty else 0
    simulated_count = int(
        map_ref_df.get("source", pd.Series(index=map_ref_df.index, dtype=str))
        .map(normalize_source_kind)
        .eq("simulation")
        .sum()
    ) if not map_ref_df.empty else 0
    i5, i6 = st.columns(2)
    i5.metric(i18n_text("Actions reelles", "Real actions"), real_count)
    i6.metric(i18n_text("Actions simulees", "Simulated actions"), simulated_count)

    current_map_metrics = {
        i18n_text("Actions", "Actions"): int(len(map_ref_df)),
        i18n_text("Actions reelles", "Real actions"): real_count,
        i18n_text("Actions simulees", "Simulated actions"): simulated_count,
        i18n_text("kg collectes", "kg collected"): f"{float(pd.to_numeric(map_ref_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
        i18n_text("Megots", "Butts"): f"{int(pd.to_numeric(map_ref_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
        i18n_text("Zones propres", "Clean zones"): int(map_ref_df.get("est_propre", pd.Series(dtype=bool)).map(normalize_bool_flag).sum()),
    }
    current_map_filters = {
        i18n_text("Preset", "Preset"): selected_preset_label,
        i18n_text("Type de donnees", "Data type"): source_filter_labels.get(selected_source_filter, selected_source_filter),
        i18n_text("Tags", "Tags"): ", ".join(selected_tags) if selected_tags else i18n_text("Tous", "All"),
        i18n_text("Periode", "Date range"): (
            f"{selected_from_date.strftime('%d/%m/%Y')} -> {selected_to_date.strftime('%d/%m/%Y')}"
            if selected_from_date and selected_to_date
            else i18n_text("Toutes dates", "All dates")
        ),
        i18n_text("Recherche globale", "Global search"): map_global_query if map_global_query else i18n_text("Aucune", "None"),
    }
    render_print_current_view(
        view_key="map",
        title=i18n_text("Vue courante - Carte interactive", "Current view - Interactive map"),
        filters=current_map_filters,
        metrics=current_map_metrics,
        map_link=share_url,
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
        top_hotspots["adresse"] = top_hotspots["adresse"].fillna("").replace("", "Zone non renseignÃ©e")
        top_hotspots_disp = top_hotspots.rename(
            columns={
                "adresse": i18n_text("Zone", "Area"),
                "actions": i18n_text("Actions", "Actions"),
                "kg": i18n_text("kg", "kg"),
                "megots": i18n_text("MÃ©gots", "Butts"),
            }
        )
        render_paginated_dataframe(
            top_hotspots_disp,
            key_prefix="map_hotspots_table",
            title=i18n_text("Top zones (pagine)", "Top areas (paginated)"),
            default_page_size=10,
        )
        render_standard_exports(top_hotspots_disp, basename="map_hotspots", key_prefix="map_hotspots")

    # --- CHOIX DU MODE DE VUE (2D vs 3D) ---
    view_mode = st.radio(
        "Mode de visualisation" if st.session_state.lang == "fr" else "Visualization Mode",
        options=["2D (Standard)", "3D (Immersif)"],
        horizontal=False,
        help="Le mode 3D nÃ©cessite plus de ressources mais offre une vue spectaculaire des hotspots." if st.session_state.lang == "fr" else "3D mode requires more resources but offers a spectacular view of hotspots."
    )

    if "3D" in view_mode:
        import pydeck as pdk
        st.info("ðŸ’¡ **Montagnes de mÃ©gots** : la hauteur des colonnes reprÃ©sente la densitÃ© de pollution cumulÃ©e." if st.session_state.lang == "fr" else "ðŸ’¡ **Cigarette Butt Mountains**: Column height represents cumulative pollution density.")
        if map_ref_df.empty:
            st.warning(i18n_text("Aucune donnÃ©e gÃ©olocalisÃ©e pour la vue 3D.", "No geolocated data for 3D view."))
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
        map_col, panel_col = st.columns([2.2, 1.0], gap="large")
        with map_col:
            map_event = st_folium(
                m,
                width="stretch",
                height=520,
                returned_objects=["last_object_clicked", "last_object_clicked_tooltip"],
                key="map_main_interactive",
            )
        with panel_col:
            st.markdown(
                f"""
                <div class="map-side-panel">
                    <div style="font-weight:800; color:var(--ink-1); margin-bottom:8px;">{i18n_text("LÃ©gende compacte", "Compact legend")}</div>
                    <div class="map-legend-compact">
                        <div class="map-legend-item"><span class="map-legend-dot" style="background:{MAP_COLORS['critical']};"></span>{i18n_text("Zone prioritaire", "Priority zone")}</div>
                        <div class="map-legend-item"><span class="map-legend-dot" style="background:{MAP_COLORS['clean']};"></span>{i18n_text("Zone propre", "Clean area")}</div>
                        <div class="map-legend-item"><span class="map-legend-dot" style="background:{MAP_COLORS['business']};"></span>{i18n_text("Acteur engagÃ©", "Engaged partner")}</div>
                        <div class="map-legend-item"><span class="map-legend-dot" style="background:{MAP_COLORS['street']};"></span>{i18n_text("Rue / Quai", "Street / quay")}</div>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.markdown("#### " + i18n_text("DÃ©tails du point sÃ©lectionnÃ©", "Selected point details"))
            selected_tooltip = (map_event or {}).get("last_object_clicked_tooltip")
            if selected_tooltip and not map_ref_df.empty:
                details_df = map_ref_df.copy()
                details_df["_display_name"] = details_df.apply(lambda r: format_google_maps_name(r), axis=1)
                selected_rows = details_df[details_df["_display_name"] == str(selected_tooltip)].copy()
                if selected_rows.empty:
                    selected_rows = details_df[
                        details_df.get("adresse", pd.Series(dtype=str)).fillna("").astype(str).str.contains(str(selected_tooltip), case=False, na=False)
                    ]
                if not selected_rows.empty:
                    sr = selected_rows.iloc[0]
                    st.metric(i18n_text("Association", "Organization"), str(sr.get("association", "N/A"))[:40])
                    st.caption(str(sr.get("adresse", i18n_text("Adresse inconnue", "Unknown address"))))
                    s1, s2 = st.columns(2)
                    s1.metric("kg", f"{float(pd.to_numeric(sr.get('dechets_kg', 0), errors='coerce') or 0):.1f}")
                    s2.metric(i18n_text("MÃ©gots", "Butts"), int(pd.to_numeric(sr.get("megots", 0), errors="coerce") or 0))
                    s3, s4 = st.columns(2)
                    s3.metric(i18n_text("BÃ©nÃ©voles", "Volunteers"), int(pd.to_numeric(sr.get("benevoles", 0), errors="coerce") or 0))
                    s4.metric(i18n_text("DurÃ©e", "Duration"), f"{int(pd.to_numeric(sr.get('temps_min', 0), errors='coerce') or 0)} min")
                    score_preview = calculate_scores(sr).get("score_mixte", 0)
                    st.caption(i18n_text(f"Score de saletÃ© : {score_preview:.1f}/100", f"Dirtiness score: {score_preview:.1f}/100"))
                else:
                    st.info(i18n_text("Aucun dÃ©tail exploitable pour ce point.", "No detail available for this point."))
            else:
                st.info(i18n_text("Cliquez un point sur la carte pour afficher son dÃ©tail.", "Click a map point to display details."))

with tab_trash_spotter:
    render_tab_header(
        icon="\U0001F4E2",
        title_fr="Trash Spotter",
        title_en="Trash Spotter",
        subtitle_fr="Signalez rapidement les points noirs pour mobiliser la communautÃ© et accÃ©lÃ©rer les interventions.",
        subtitle_en="Quickly report black spots to mobilize the community and accelerate interventions.",
        chips=[i18n_text("Signalement", "Reporting"), i18n_text("RÃ©activitÃ©", "Response")],
    )
    render_ui_callout(
        icon="âš¡",
        title_fr="Workflow terrain ultra-court",
        title_en="Ultra-short field workflow",
        body_fr="Photo + type de spot + position, puis suivi du statut: nouveau, en cours, rÃ©solu.",
        body_en="Photo + spot type + location, then status tracking: new, in progress, resolved.",
        tone="info",
    )

    col_ts1, col_ts2 = st.columns([1, 1])
    with col_ts1:
        st.subheader("ðŸ“ Signaler un spot")
        with st.form("spot_form_fast"):
            s_addr = st.text_input("Position (adresse ou GPS)", placeholder="Ex: 10 Rue de Rivoli ou 48.8584, 2.2945")
            s_type = st.selectbox("Type de dÃ©chet", ["DÃ©charge sauvage", "MÃ©gots en masse", "Plastiques", "Verre", "Autre"])
            s_pseudo = st.text_input("Votre pseudo", value=main_user_email, help="Optionnel mais recommandÃ© pour le suivi")
            s_photo = st.file_uploader("Photo du spot (obligatoire)", type=["png", "jpg", "jpeg"], key="spot_photo_required")
            s_btn = st.form_submit_button("ðŸ“¢ Signaler le spot (+10 Eco-Points)")
            
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
                        add_spot(lat_s, lon_s, s_addr, s_type, s_pseudo, photo_url=photo_path, status="new")
                        st.success("âœ… Spot ajoutÃ© au statut Nouveau. Merci pour votre vigilance.")
                        st.balloons()
                    else:
                        st.error("Impossible de localiser l'adresse.")

    with col_ts2:
        st.subheader("ðŸŒ Points noirs actifs")
        spots = get_active_spots()
        if spots:
            status_counts = pd.Series([str(s.get("status", "new")) for s in spots]).value_counts()
            st.caption(
                f"ðŸ†• {int(status_counts.get('new', 0))} | "
                f"ðŸ› ï¸ {int(status_counts.get('in_progress', 0))} | "
                f"âœ… {int(status_counts.get('cleaned', 0))}"
            )
            m_ts = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
            for sp in spots:
                sp_status = str(sp.get("status", "new"))
                status_label = {
                    "new": "Nouveau",
                    "active": "Nouveau",
                    "in_progress": "En cours",
                    "cleaned": "RÃ©solu",
                }.get(sp_status, sp_status)
                icon_color = "red" if sp_status in {"new", "active"} else "blue" if sp_status == "in_progress" else "green"
                popup_text = (
                    f"<b>{sp['type_dechet']}</b><br>"
                    f"SignalÃ© par {sp['reporter_name']}<br>"
                    f"Statut: <b>{status_label}</b>"
                )
                if sp.get("photo_url"):
                    popup_text += f"<br><small>Photo disponible</small>"
                folium.Marker(
                    [sp['lat'], sp['lon']],
                    popup=popup_text,
                    icon=folium.Icon(color=icon_color, icon='trash', prefix='fa')
                ).add_to(m_ts)
            st_folium(m_ts, width=400, height=350, key="ts_map_view")

            st.markdown("---")
            st.subheader("Validation terrain")
            st.caption("Passez le signalement en En cours, puis RÃ©solu une fois traitÃ© sur site.")
            for sp in spots[:8]:
                with st.container():
                    raw_status = str(sp.get("status", "new"))
                    status_class = "status-new" if raw_status in {"new", "active"} else "status-progress" if raw_status == "in_progress" else "status-resolved"
                    status_label = {
                        "new": "Nouveau",
                        "active": "Nouveau",
                        "in_progress": "En cours",
                        "cleaned": "RÃ©solu",
                    }.get(raw_status, raw_status)
                    st.markdown(
                        f"**{sp.get('type_dechet', 'Spot')}** - {sp.get('adresse', '')} "
                        f"<span class='status-badge {status_class}'>{status_label}</span>",
                        unsafe_allow_html=True,
                    )
                    st.caption(f"Signale par {sp.get('reporter_name', 'N/A')}")
                    if sp.get("photo_url"):
                        try:
                            st.image(sp["photo_url"], width=240)
                        except Exception:
                            st.caption("Photo non affichable")
                    s_c1, s_c2 = st.columns(2, gap="small")
                    with s_c1:
                        if raw_status in {"new", "active"} and st.button("Prendre en charge", key=f"progress_spot_{sp['id']}", use_container_width=True, type="secondary"):
                            update_spot_status(sp["id"], "in_progress")
                            st.success("Signalement passÃ© en cours de traitement.")
                            st.rerun()
                    with s_c2:
                        if raw_status in {"new", "active", "in_progress"} and st.button("Marquer rÃ©solu", key=f"close_spot_{sp['id']}", use_container_width=True):
                            update_spot_status(sp["id"], "cleaned")
                            st.success("âœ… Spot clÃ´turÃ©, merci pour la prise en charge.")
                            st.rerun()
        else:
            st.info("Aucun spot de pollution signalÃ© pour le moment.")

with tab_gamification:
    render_tab_header(
        icon="\U0001F3C6",
        title_fr="Eco-classement & recompenses",
        title_en="Eco Ranking & Rewards",
        subtitle_fr="Suivez la dynamique de la communaute, comparez les periodes et visualisez les objectifs de progression.",
        subtitle_en="Track community momentum, compare periods, and visualize progression targets.",
        chips=[i18n_text("Leaderboard", "Leaderboard"), i18n_text("Badges", "Badges")],
    )

    gami_df = all_public_df.copy() if not all_public_df.empty else pd.DataFrame()
    if not gami_df.empty:
        gami_df["date_dt"] = pd.to_datetime(gami_df.get("date"), errors="coerce")
        if gami_df["date_dt"].isna().all() and "submitted_at" in gami_df.columns:
            gami_df["date_dt"] = pd.to_datetime(gami_df.get("submitted_at"), errors="coerce")
        gami_df["dechets_kg_num"] = pd.to_numeric(gami_df.get("dechets_kg", 0), errors="coerce").fillna(0)
        gami_df["megots_num"] = pd.to_numeric(gami_df.get("megots", 0), errors="coerce").fillna(0)

    period_mode = st.radio(
        "Periode comparable",
        options=["Semaine", "Mois"],
        horizontal=True,
        key="gami_period_mode",
    )
    period_comp = compute_period_comparison(gami_df, "week" if period_mode == "Semaine" else "month")
    curr_df = period_comp["current"]
    prev_df = period_comp["previous"]

    cp1, cp2, cp3 = st.columns(3)
    cp1.metric(
        f"Actions ({period_comp.get('current_label', '-')})",
        int(len(curr_df)),
        delta=int(len(curr_df) - len(prev_df)),
    )
    cp2.metric(
        "kg collectes",
        f"{float(pd.to_numeric(curr_df.get('dechets_kg_num', 0), errors='coerce').fillna(0).sum()):.1f}",
        delta=f"{float(pd.to_numeric(curr_df.get('dechets_kg_num', 0), errors='coerce').fillna(0).sum() - pd.to_numeric(prev_df.get('dechets_kg_num', 0), errors='coerce').fillna(0).sum()):.1f}",
    )
    cp3.metric(
        "Eco-Points",
        f"{estimate_eco_points(curr_df):.0f}",
        delta=f"{estimate_eco_points(curr_df) - estimate_eco_points(prev_df):.0f}",
    )
    if period_comp.get("previous_label"):
        st.caption(f"Comparaison vs {period_comp['previous_label']}")

    cg1, cg2 = st.columns([2, 3])
    with cg1:
        st.subheader("Top contributeurs")
        lb = get_leaderboard(limit=5)
        if lb:
            for i, en in enumerate(lb):
                medal = "#1" if i == 0 else "#2" if i == 1 else "#3" if i == 2 else f"#{i+1}"
                st.markdown(
                    f"""
                    <div class="partner-mini-card">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                            <div><b>{medal} {en['nom']}</b></div>
                            <div style="font-weight:800;color:#059669;">{int(en.get('total_points', 0))} pts</div>
                        </div>
                        <div style="font-size:.78rem;color:var(--ink-3);margin-top:4px;">{int(en.get('nb_actions', 0))} actions validees</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            st.info("Pas encore de classement disponible.")

    with cg2:
        st.subheader("Badges et progression personnelle")
        pseudo_seed = main_user_email if "anonyme" not in _repair_mojibake_text(str(main_user_email)).lower() else ""
        curr_pseudo = st.text_input(
            "Saisissez votre pseudo pour voir vos badges",
            value=pseudo_seed,
        )

        badges_catalog = [
            {"id": "first_action", "name": "Premier Pas", "condition": ">= 1 action validee", "kind": "actions", "target": 1},
            {"id": "regular", "name": "Sentinelle de Paris", "condition": ">= 5 actions validees", "kind": "actions", "target": 5},
            {"id": "heavy_lifter", "name": "Hercule du Propre", "condition": ">= 50 kg collectes", "kind": "kg", "target": 50},
            {"id": "eco_hero", "name": "Eco-Heros", "condition": ">= 1000 Eco-Points", "kind": "points", "target": 1000},
        ]

        user_actions = pd.DataFrame()
        if curr_pseudo and not gami_df.empty and "nom" in gami_df.columns:
            user_actions = gami_df[
                gami_df["nom"].fillna("").astype(str).str.strip().str.lower() == curr_pseudo.strip().lower()
            ].copy()

        user_stats = {
            "nb_actions": int(len(user_actions)),
            "total_kg": float(pd.to_numeric(user_actions.get("dechets_kg_num", 0), errors="coerce").fillna(0).sum()),
            "total_points": float(estimate_eco_points(user_actions)),
        }
        unlocked_ids = {b["id"] for b in check_badges(user_stats)} if curr_pseudo else set()

        badge_rows = []
        for b in badges_catalog:
            badge_rows.append(
                {
                    "Badge": b["name"],
                    "Condition": b["condition"],
                    "Etat": "Debloque" if b["id"] in unlocked_ids else "A atteindre",
                }
            )
        st.dataframe(pd.DataFrame(badge_rows), hide_index=True, width="stretch")

        if curr_pseudo:
            next_badge = None
            for b in badges_catalog:
                if b["id"] not in unlocked_ids:
                    next_badge = b
                    break
            if next_badge is None:
                st.success("Tous les badges de base sont debloques.")
            else:
                if next_badge["kind"] == "actions":
                    current_val = user_stats["nb_actions"]
                elif next_badge["kind"] == "kg":
                    current_val = user_stats["total_kg"]
                else:
                    current_val = user_stats["total_points"]
                target_val = float(next_badge["target"])
                progress = 0.0 if target_val <= 0 else min(current_val / target_val, 1.0)
                st.caption(f"Objectif suivant: {next_badge['name']} ({next_badge['condition']})")
                st.progress(progress)
                st.caption(f"Progression: {current_val:.1f}/{target_val:.1f}")
        else:
            st.caption("Entrez un pseudo pour afficher votre progression.")

    st.divider()
    st.subheader("Defis hebdo par equipe")
    if not gami_df.empty:
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
                    kg=("dechets_kg_num", "sum"),
                    megots=("megots_num", "sum"),
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
                    f"{float(team_row['kg']):.1f} kg | {int(team_row['megots'])} megots | {int(team_row['actions'])} actions"
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
                    kg=("dechets_kg_num", "sum"),
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
        subtitle_fr="Coordonnez les sorties, partagez les annonces et engagez les bÃ©nÃ©voles autour d'actions locales.",
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
        title_fr="Zone d'entraÃ®nement",
        title_en="Sandbox",
        subtitle_fr="Testez des scÃ©narios fictifs sans impacter la base de donnÃ©es de production.",
        subtitle_en="Test fictional scenarios without impacting the production database.",
        chips=[i18n_text("Brouillon", "Draft"), i18n_text("Simulation", "Simulation")],
        compact=True,
    )
    st.markdown(
        """
        <div style="border:1px solid #f59e0b;background:#fffbeb;color:#92400e;border-radius:12px;padding:10px 12px;margin-bottom:10px;font-weight:700;">
            SANDBOX: donnees fictives uniquement - aucun impact sur la production
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.info("Cette zone est un bac a sable. Les donnees restent fictives et servent uniquement aux tests.")
    
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
        st.caption("Scenarios prets a lancer")
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

        reset_col1, reset_col2 = st.columns(2)
        with reset_col1:
            if st.button("Vider le brouillon", key="sandbox_clear_draft_btn", use_container_width=True):
                st.session_state['sandbox_actions'] = []
                st.rerun()
        with reset_col2:
            if st.button("Reset global sandbox", key="sandbox_global_reset_btn", use_container_width=True):
                st.session_state['sandbox_actions'] = []
                st.session_state["sb_target_kg"] = 20.0
                st.session_state["sb_target_megots"] = 1500
                st.success("Sandbox reinitialisee.")
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
        if not st.session_state.get("sandbox_actions"):
            render_empty_state(
                "Aucune action fictive",
                "Chargez un scenario pret a lancer ou creez une action de test.",
                "Charger un scenario",
                "sandbox",
                key_suffix="sandbox_empty",
            )
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
        title_fr="DÃ©clarer une action",
        title_en="Declare an Action",
        subtitle_fr="Soumettez une rÃ©colte, un lieu propre ou un acteur engagÃ© via un formulaire structurÃ© et guidÃ©.",
        subtitle_en="Submit a cleanup, a clean area, or an engaged actor using a clear and guided form.",
        chips=[i18n_text("Formulaire", "Form"), i18n_text("QualitÃ©", "Data quality")],
        compact=True,
    )
    render_ui_callout(
        icon="âœ…",
        title_fr="DÃ©claration en 3 Ã©tapes",
        title_en="3-step submission",
        body_fr="Renseignez d'abord le profil et le lieu, puis les quantitÃ©s d'impact, avant une validation finale pour sÃ©curiser la qualitÃ© des donnÃ©es.",
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
    _seed_decl_value("decl_benevoles", int(draft.get("benevoles", 1)))
    _seed_decl_value("decl_temps_min", int(draft.get("temps_min", 60)))
    _seed_decl_value("decl_m_weight", float(draft.get("m_weight", 0.0)))
    _seed_decl_value("decl_m_condition", draft.get("m_condition", "MÃ©langÃ© / ImpuretÃ©s"))
    _seed_decl_value("decl_dechets_kg", float(draft.get("dechets_kg", 0.0)))
    _seed_decl_value("decl_commentaire", draft.get("commentaire", ""))
    _seed_decl_value("decl_tags", parse_action_tags(draft.get("tags", [])))
    _seed_decl_value("decl_newsletter", bool(draft.get("subscribe_newsletter", True)))
    _seed_decl_value("decl_news_email", draft.get("user_email", ""))
    _seed_decl_value("decl_step", "1. Profil & lieu")
    _seed_decl_value("decl_action_date", date.today())
    _seed_decl_value("decl_geo_verified_for", "")
    _seed_decl_value("decl_geo_confirmed", False)
    if "decl_geo_preview" not in st.session_state:
        st.session_state["decl_geo_preview"] = {}
    if not isinstance(st.session_state.get("decl_tags"), list):
        st.session_state["decl_tags"] = parse_action_tags(st.session_state.get("decl_tags", ""))

    st.caption("Brouillon auto actif : vos champs sont sauvegardÃ©s en continu.")
    progress_step = st.radio(
        "Progression",
        ["1. Profil & lieu", "2. Donnees d'impact", "3. Validation"],
        horizontal=False,
        key="decl_step",
        format_func=lambda s: {
            "1. Profil & lieu": "1. Profil & lieu",
            "2. Donnees d'impact": "2. DonnÃ©es d'impact",
            "3. Validation": "3. Validation",
        }.get(s, s),
    )
    step_status = {
        "1. Profil & lieu": "ðŸŸ¢" if progress_step == "1. Profil & lieu" else "âšª",
        "2. Donnees d'impact": "ðŸŸ¢" if progress_step == "2. Donnees d'impact" else "âšª",
        "3. Validation": "ðŸŸ¢" if progress_step == "3. Validation" else "âšª",
    }
    step_progress = {"1. Profil & lieu": 33, "2. Donnees d'impact": 66, "3. Validation": 100}
    st.markdown(
        f"""
        <div class="decl-progress-sticky">
            <div class="decl-progress-track"><div class="decl-progress-fill" style="width:{step_progress.get(progress_step, 33)}%;"></div></div>
            <div class="decl-progress-steps">
                <span>{i18n_text("1. Profil", "1. Profile")}</span>
                <span>{i18n_text("2. Impact", "2. Impact")}</span>
                <span>{i18n_text("3. Validation", "3. Validate")}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    step2_key = "2. Donnees d'impact"
    st.caption(f"{step_status['1. Profil & lieu']} Ã‰tape 1 : identitÃ©, date, lieu")
    st.caption(f"{step_status[step2_key]} Ã‰tape 2 : quantitÃ©s et contexte")
    st.caption(f"{step_status['3. Validation']} Ã‰tape 3 : vÃ©rification finale")

    action_type = st.radio(
        "Que souhaitez-vous faire ?",
        ["Ajouter une recolte", "Declarer un lieu propre", "Declarer un acteur engage"],
        horizontal=False,
        key="decl_action_type",
        format_func=lambda s: {
            "Ajouter une recolte": "Ajouter une rÃ©colte",
            "Declarer un lieu propre": "DÃ©clarer un lieu propre",
            "Declarer un acteur engage": "DÃ©clarer un acteur engagÃ©",
        }.get(s, s),
    )
    zone_propre = (action_type == "Declarer un lieu propre")
    acteur_engage = (action_type == "Declarer un acteur engage")

    tag_help = i18n_text(
        "Classez l'action pour faciliter les filtres carte et les exports.",
        "Classify this action to improve map filters and exports.",
    )
    st.multiselect(
        i18n_text("Tags de classification", "Classification tags"),
        options=ACTION_TAG_OPTIONS,
        key="decl_tags",
        help=tag_help,
    )

    if progress_step == "1. Profil & lieu":
        st.text_input("Votre prenom / pseudo", key="decl_nom", placeholder="Ex: Sarah")
        if not str(st.session_state.get("decl_nom", "")).strip():
            st.caption("âš ï¸ Pseudo recommandÃ© pour le suivi de progression.")
        if not zone_propre:
            st.text_input("Association*", key="decl_association", placeholder="Ex: Clean Walk Paris 10")
            if not str(st.session_state.get("decl_association", "")).strip():
                st.caption("âš ï¸ Association obligatoire pour une dÃ©claration d'action.")
        st.date_input("Date de l'action*", key="decl_action_date", max_value=date.today())
        st.text_input(
            "Emplacement (Adresse ou GPS)*",
            key="decl_emplacement",
            placeholder="Ex: 48.8584, 2.2945 ou Tour Eiffel, Paris",
        )
        decl_emplacement = str(st.session_state.get("decl_emplacement", "")).strip()
        if not decl_emplacement:
            st.caption("âš ï¸ Emplacement obligatoire.")

        # Auto-complÃ©tion simple Ã  partir des adresses dÃ©jÃ  connues
        known_addresses = (
            sorted(
                {
                    str(a).strip()
                    for a in all_public_df.get("adresse", pd.Series(dtype=str)).fillna("").tolist()
                    if str(a).strip()
                }
            )
            if not all_public_df.empty
            else []
        )
        if decl_emplacement and len(decl_emplacement) >= 3 and known_addresses:
            suggestions = [a for a in known_addresses if decl_emplacement.lower() in a.lower()][:8]
            if suggestions:
                suggestion_choice = st.selectbox(
                    "Suggestions d'adresse",
                    options=[""] + suggestions,
                    key="decl_addr_suggestion",
                )
                if suggestion_choice:
                    st.session_state["decl_emplacement"] = suggestion_choice
                    st.session_state["decl_geo_verified_for"] = ""
                    st.session_state["decl_geo_confirmed"] = False
                    st.rerun()

        verify_col, hint_col = st.columns([1.2, 1.8], gap="small")
        with verify_col:
            if st.button("VÃ©rifier la gÃ©olocalisation", key="decl_verify_geo_btn", use_container_width=True, type="secondary"):
                lat_p, lon_p, addr_p = geocode_and_resolve(decl_emplacement)
                if lat_p is None or lon_p is None:
                    st.session_state["decl_geo_preview"] = {
                        "ok": False,
                        "input": decl_emplacement,
                        "message": i18n_text("Impossible de confirmer cette position.", "Unable to confirm this location."),
                    }
                    st.session_state["decl_geo_verified_for"] = ""
                    st.session_state["decl_geo_confirmed"] = False
                else:
                    st.session_state["decl_geo_preview"] = {
                        "ok": True,
                        "input": decl_emplacement,
                        "lat": float(lat_p),
                        "lon": float(lon_p),
                        "address": str(addr_p),
                    }
                    st.session_state["decl_geo_verified_for"] = decl_emplacement
                    st.session_state["decl_geo_confirmed"] = False
        with hint_col:
            st.caption("Conseil: vÃ©rifiez la position avant validation finale pour fiabiliser la carte.")

        geo_preview = st.session_state.get("decl_geo_preview", {})
        if geo_preview.get("input") == decl_emplacement:
            if geo_preview.get("ok"):
                st.success(
                    f"Position confirmÃ©e: {geo_preview.get('address', '')} "
                    f"({geo_preview.get('lat', 0):.5f}, {geo_preview.get('lon', 0):.5f})"
                )
                st.checkbox("Je confirme cette gÃ©olocalisation", key="decl_geo_confirmed")
            else:
                st.warning(str(geo_preview.get("message", "Position non confirmÃ©e.")))

        if decl_emplacement and st.session_state.get("decl_geo_verified_for", "") != decl_emplacement:
            st.caption("âš ï¸ Emplacement modifiÃ©: merci de relancer la vÃ©rification gÃ©ographique.")

        if acteur_engage:
            st.selectbox(
                "Type d'acteur*",
                ["Association ecologique", "Association humanitaire et sociale", "Commercant engage"],
                key="decl_type_acteur",
                format_func=lambda s: {
                    "Association ecologique": "Association Ã©cologique",
                    "Association humanitaire et sociale": "Association humanitaire et sociale",
                    "Commercant engage": "CommerÃ§ant engagÃ©",
                }.get(s, s),
            )
        elif zone_propre:
            st.info("Mode lieu propre : les mÃ©triques de dÃ©chets seront renseignÃ©es Ã  zÃ©ro.")
        else:
            st.selectbox("Type de lieu*", TYPE_LIEU_OPTIONS, key="decl_type_lieu")

    elif progress_step == "2. Donnees d'impact":
        if acteur_engage:
            st.text_area("Actions & Engagement (optionnel)", key="decl_commentaire", placeholder="DÃ©crivez pourquoi cet acteur est engagÃ©.")
        elif zone_propre:
            st.text_area("Commentaire (optionnel)", key="decl_commentaire", placeholder="PrÃ©cisions sur le lieu propre.")
        else:
            st.number_input("Nombre de bÃ©nÃ©voles*", min_value=1, step=1, key="decl_benevoles")
            st.number_input("DurÃ©e (minutes)*", min_value=1, step=5, key="decl_temps_min")
            if int(st.session_state.get("decl_temps_min", 1)) < 15:
                st.caption("Conseil: moins de 15 minutes produit souvent un signal statistique peu fiable.")
            st.number_input("Poids total mÃ©gots (grammes)", min_value=0.0, step=10.0, key="decl_m_weight")
            st.selectbox("Ã‰tat des mÃ©gots", ["Sec", "MÃ©langÃ© / ImpuretÃ©s", "Humide"], key="decl_m_condition")
            coeffs = {"Sec": 0.20, "MÃ©langÃ© / ImpuretÃ©s": 0.27, "Humide": 0.35}
            megots_preview = int(float(st.session_state.get("decl_m_weight", 0.0)) / coeffs[st.session_state.get("decl_m_condition", "MÃ©langÃ© / ImpuretÃ©s")]) if float(st.session_state.get("decl_m_weight", 0.0)) > 0 else 0
            if megots_preview > 0:
                st.info(f"Estimation : ~{megots_preview} mÃ©gots")
            st.number_input("DÃ©chets (total kg)", min_value=0.0, step=0.5, key="decl_dechets_kg")
            if float(st.session_state.get("decl_m_weight", 0.0)) <= 0 and float(st.session_state.get("decl_dechets_kg", 0.0)) <= 0:
                st.caption("Renseignez au moins un indicateur d'impact: mÃ©gots ou dÃ©chets (kg).")
            hints = get_weight_conversion_hints(float(st.session_state.get("decl_dechets_kg", 0.0)))
            st.caption(f"â‰ˆ {hints['sacs_30l']} sacs 30L â€¢ â‰ˆ {hints['bouteilles_1_5l']} bouteilles 1.5L")
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
            f"- **Auteur**: {st.session_state.get('decl_nom', '') or 'Anonyme'}\n"
            f"- **Tags**: {', '.join(parse_action_tags(st.session_state.get('decl_tags', []))) or 'Aucun'}"
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
            m_condition = st.session_state.get("decl_m_condition", "MÃ©langÃ© / ImpuretÃ©s")
            coeffs = {"Sec": 0.20, "MÃ©langÃ© / ImpuretÃ©s": 0.27, "Humide": 0.35}
            megots = int(m_weight / coeffs[m_condition]) if m_weight > 0 else 0
            subscribe_newsletter = bool(st.session_state.get("decl_newsletter", True))
            user_email = str(st.session_state.get("decl_news_email", "")).strip()
            selected_tags = parse_action_tags(st.session_state.get("decl_tags", []))

            if acteur_engage:
                type_lieu = st.session_state.get("decl_type_acteur", "Association ecologique")
                benevoles, temps_min, megots, dechets_kg = 1, 1, 0, 0.0
            elif zone_propre:
                association = association or "Independant"
                type_lieu = "Signalement Proprete"
                benevoles, temps_min, megots, dechets_kg = 1, 1, 0, 0.0
                commentaire = commentaire or "Zone signalee propre"

            if not selected_tags:
                selected_tags = infer_action_tags(
                    {
                        "association": association,
                        "benevoles": benevoles,
                        "source": "formulaire",
                    }
                )

            geo_is_confirmed = bool(st.session_state.get("decl_geo_confirmed", False)) and (
                st.session_state.get("decl_geo_verified_for", "") == emplacement_brut
            )

            if not emplacement_brut or not type_lieu or (not association and not zone_propre):
                st.error("Merci de remplir les champs obligatoires.")
            elif not geo_is_confirmed:
                st.error("Merci de verifier puis confirmer la geolocalisation avant de partager l'action.")
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
                    "source": "formulaire",
                    "tags": serialize_action_tags(selected_tags),
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
        "m_condition": st.session_state.get("decl_m_condition", "MÃ©langÃ© / ImpuretÃ©s"),
        "dechets_kg": st.session_state.get("decl_dechets_kg", 0.0),
        "commentaire": st.session_state.get("decl_commentaire", ""),
        "tags": parse_action_tags(st.session_state.get("decl_tags", [])),
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
        subtitle_fr="GÃ©nÃ©rez un rapport PDF exploitable pour le pilotage, la communication et les partenaires.",
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
            st.write("Options du rapport")
            report_profile = st.selectbox(
                "Profil de rapport",
                ["Mairie", "Association", "Sponsor"],
                key="report_profile_select",
            )
            is_rse_mode = report_profile == "Sponsor"
            compare_days = st.selectbox("Comparatif de periode", [30, 60, 90], format_func=lambda x: f"{x} jours")
            checklist_rows, report_ready = build_report_data_checklist(report_df)
            if checklist_rows:
                st.caption("Checklist donnees manquantes (avant generation)")
                for row in checklist_rows:
                    ok = int(row["missing"]) == 0
                    symbol = "OK" if ok else "A corriger"
                    st.caption(f"- {row['label']}: {symbol} ({row['missing']}/{row['total']} manquants)")
            st.markdown('</div>', unsafe_allow_html=True)

            if is_rse_mode:
                st.success("Mode sponsor active: le rapport inclura les metriques ESG et mecenat.")
                total_h = int((public_df['temps_min'] * public_df.get('benevoles', 1)).sum() / 60)
                st.metric("Temps de mecenat accumule", f"{total_h} h")
            elif report_profile == "Mairie":
                st.info("Profil mairie: focus zones prioritaires et pilotage territorial.")
            else:
                st.info("Profil association: focus mobilisation benevole et actions terrain.")

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

                highlights.append("Carte interactive avec prÃ©rÃ©glages partageables : pollution, zones propres, partenaires, rÃ©centes, prioritaires.")
                if recent_count > 0:
                    highlights.append(f"PrÃ©rÃ©glage actions rÃ©centes : {recent_count} action(s) sur les 30 derniers jours.")
                if partner_count > 0:
                    highlights.append(f"PrÃ©rÃ©glage partenaires engagÃ©s : {partner_count} point(s) cartographiÃ©s.")
                if clean_count > 0:
                    highlights.append(f"PrÃ©rÃ©glage zones propres : {clean_count} point(s) valorisÃ©s.")
                if pollution_count > 0:
                    highlights.append(f"PrÃ©rÃ©glage pollution/prioritÃ© : {pollution_count} point(s) Ã  surveiller.")
                if quality_flags > 0:
                    highlights.append(f"Validation admin en lot et prÃ©-validation : {quality_flags} signalement(s) atypique(s) dÃ©tectÃ©(s).")
                return highlights

            current_stats = _metric_pack(current_period_df)
            previous_stats = _metric_pack(previous_period_df)
            report_highlights = _collect_report_highlights(current_period_df if not current_period_df.empty else report_df)
        
        with c_rep1:
            st.markdown("### Comparatif pÃ©riode prÃ©cÃ©dente")
            cmp1, cmp2 = st.columns(2)
            cmp1.metric("Actions", current_stats["actions"], delta=current_stats["actions"] - previous_stats["actions"])
            cmp2.metric("kg collectÃ©s", f"{current_stats['kg']:.1f}", delta=f"{current_stats['kg'] - previous_stats['kg']:.1f}")
            cmp3, cmp4 = st.columns(2)
            cmp3.metric("MÃ©gots", f"{current_stats['megots']:,}", delta=f"{current_stats['megots'] - previous_stats['megots']:,}")
            cmp4.metric("BÃ©nÃ©voles", current_stats["benevoles"], delta=current_stats["benevoles"] - previous_stats["benevoles"])

            st.markdown("### NouveautÃ©s retenues dans ce rapport")
            if report_highlights:
                for hl in report_highlights[:6]:
                    st.caption(f"- {hl}")
            else:
                st.caption("- Pas de nouveautÃ© data-driven Ã  afficher sur la pÃ©riode.")

            st.markdown("### Previsualisation avant export")
            pv1, pv2, pv3 = st.columns(3)
            pv1.metric("Actions previsualisees", current_stats["actions"])
            pv2.metric("kg previsualises", f"{current_stats['kg']:.1f}")
            pv3.metric("Megots previsualises", f"{current_stats['megots']:,}")
            preview_cols = [c for c in ["date", "type_lieu", "adresse", "dechets_kg", "megots", "association"] if c in current_period_df.columns]
            if preview_cols:
                with st.expander("Apercu du contenu du rapport", expanded=False):
                    st.dataframe(
                        current_period_df.sort_values("date_dt", ascending=False).head(12)[preview_cols],
                        width="stretch",
                        hide_index=True,
                    )
            if not report_ready:
                st.warning("Des champs critiques sont manquants. Corrigez la checklist avant export final.")

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
                    pdf.cell(0, 7, _txt("NouveautÃ©s produit visibles (si pertinentes)"), ln=True)
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
                disabled=not report_ready,
            )

            st.divider()
            # PrÃ©paration du gÃ©nÃ©rateur
            report_gen = PDFReport(public_df)
            report_gen.is_rse = is_rse_mode
            report_gen.map_base_url = STREAMLIT_PUBLIC_URL
            report_gen.feature_flags = {"profile": report_profile, "checklist_ready": bool(report_ready)}
            pdf_bytes = report_gen.generate(dest='S')
            
            profile_slug = report_profile.lower().replace(" ", "_")
            label_btn = "â¬‡ï¸ TÃ©lÃ©charger le Rapport RSE (PDF)" if is_rse_mode else t("download_pdf")
            st.download_button(
                label_btn,
                data=pdf_bytes,
                file_name=f"cleanmymap_rapport_{profile_slug}_{'rse' if is_rse_mode else 'public'}.pdf",
                mime="application/pdf",
                width="stretch",
                disabled=not report_ready,
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
        subtitle_fr="Consultez toutes les actions recensÃ©es, leur contexte et les tendances historiques.",
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
        subtitle_fr="Planifiez un parcours strategique avec simulation d'effort, alternatives et export terrain.",
        subtitle_en="Plan a strategic route with effort simulation, alternatives, and field exports.",
        chips=[i18n_text("IA", "AI"), i18n_text("Parcours", "Routing")],
    )

    route_source_df = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))
    route_source_df = route_source_df.dropna(subset=["lat", "lon"]) if not route_source_df.empty else pd.DataFrame()

    if route_source_df.empty:
        st.warning("Aucune donnee disponible pour optimiser un trajet.")
    else:
        route_source_df = calculate_trends(route_source_df.copy())
        st.markdown("### Recommandation basee sur historique")
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
                nb_ben = st.slider("Nombre de benevoles presents", 1, 50, 5)
                temps_act = st.select_slider("Duree de l'action souhaitee", options=[30, 60, 90, 120, 180], value=60, format_func=lambda x: f"{x} min")
            with c2:
                arr_list = ["Tous les arrondissements"] + [f"Paris {i}e" for i in range(1, 21)]
                chosen_arr = st.selectbox("Zone d'intervention", arr_list)
                use_violets = st.checkbox("Prioriser les points noirs (violets)", value=True)

            sim = summarize_route_simulation(candidate_df, nb_ben, temps_act, max_distance_km)
            s1, s2, s3 = st.columns(3)
            s1.metric("Simulation actions", int(sim["est_actions"]))
            s2.metric("Effort estime", f"{sim['volunteer_hours']:.1f} h-benevoles")
            s3.metric("Distance marchee", f"{sim['walking_km']:.1f} km")
            st.caption(
                f"Projection: {sim['est_kg']:.1f} kg, {int(sim['est_megots'])} megots, {sim['impact_eau_l']:,} L d'eau preserves."
            )

            gen_btn = st.form_submit_button("Generer les itineraires", width="stretch")

        if gen_btn:
            with st.spinner("L'IA analyse les flux pietons et les points noirs..."):
                scored = candidate_df.copy()
                scored["_score"] = scored.apply(lambda r: float(calculate_scores(r).get("score_mixte", 0)), axis=1)
                scored = scored.sort_values("_score", ascending=False)
                if use_violets:
                    violet_subset = scored[scored["_score"] >= 60].copy()
                    if len(violet_subset) >= 4:
                        scored = violet_subset

                alt_inputs = []
                alt_inputs.append(("Option A - Hotspots", scored.copy()))
                if len(scored) > 6:
                    alt_inputs.append(("Option B - Equilibre", scored.iloc[1:].copy()))
                else:
                    alt_inputs.append(("Option B - Equilibre", scored.sample(frac=1.0, random_state=42).copy()))
                broad_subset = scored[scored["_score"] >= scored["_score"].quantile(0.6)].copy() if len(scored) > 4 else scored.copy()
                alt_inputs.append(("Option C - Couverture", broad_subset if not broad_subset.empty else scored.copy()))

                alternatives = []
                for label, alt_df in alt_inputs:
                    result = generate_ai_route(alt_df, nb_ben, temps_act, chosen_arr)
                    if result and result[0]:
                        paths, msg, logistics_df = result
                        alternatives.append({"label": label, "paths": paths, "message": msg, "logistics": logistics_df})

                if alternatives:
                    st.session_state["route_alternatives"] = alternatives
                    st.session_state["route_selected_label"] = alternatives[0]["label"]
                else:
                    st.error("Aucun itineraire n'a pu etre genere. Essayez un rayon plus large.")

        alternatives = st.session_state.get("route_alternatives", [])
        if alternatives:
            labels = [a["label"] for a in alternatives]
            default_label = st.session_state.get("route_selected_label", labels[0])
            selected_label = st.selectbox(
                "Alternatives d'itineraire",
                options=labels,
                index=labels.index(default_label) if default_label in labels else 0,
                key="route_alt_select",
            )
            st.session_state["route_selected_label"] = selected_label
            chosen_route = next((a for a in alternatives if a["label"] == selected_label), alternatives[0])

            st.success(f"Itineraire retenu: {chosen_route['label']} - {chosen_route['message']}")
            st.markdown("### Tableau de bord logistique")
            if isinstance(chosen_route.get("logistics"), pd.DataFrame):
                st.dataframe(chosen_route["logistics"], width="stretch", hide_index=True)

            route_paths = chosen_route.get("paths", [])
            if route_paths:
                start_coords = route_paths[0]["coords"][0]
                m_route = folium.Map(location=start_coords, zoom_start=15)
                for p in route_paths:
                    folium.PolyLine(
                        p["coords"],
                        color=p.get("color", "#2563eb"),
                        weight=p.get("weight", 5),
                        opacity=0.8,
                        tooltip=p.get("label", "Segment"),
                    ).add_to(m_route)
                folium.Marker(route_paths[0]["coords"][0], popup="Point de depart", icon=folium.Icon(color="green", icon="play")).add_to(m_route)
                folium.Marker(route_paths[-1]["coords"][-1], popup="Fin de mission", icon=folium.Icon(color="red", icon="stop")).add_to(m_route)
                st_folium(m_route, width=900, height=500, key="ai_strategic_map")

                export_name = selected_label.replace(" ", "_")
                gpx_bytes = build_gpx_from_paths(route_paths, track_name=selected_label)
                maps_url = build_google_maps_link_from_paths(route_paths)
                ex1, ex2 = st.columns(2)
                with ex1:
                    st.download_button(
                        "Exporter GPX",
                        data=gpx_bytes,
                        file_name=f"cleanmymap_route_{export_name}.gpx",
                        mime="application/gpx+xml",
                        use_container_width=True,
                    )
                with ex2:
                    if maps_url:
                        st.markdown(f"[Ouvrir dans Google Maps]({maps_url})")
                    else:
                        st.caption("Lien Google Maps indisponible pour cet itineraire.")

            st.info("Conseil: testez 2 alternatives avant depart pour choisir le meilleur compromis distance/impact.")

with tab_recycling:
    render_tab_header(
        icon="\u267b\ufe0f",
        title_fr="Seconde vie & sensibilisation",
        title_en="Second Life & Awareness",
        subtitle_fr="Suivez les flux collectes et orientez chaque matiere vers le bon exutoire local.",
        subtitle_en="Track collected flows and route each material to the right local outlet.",
        chips=[i18n_text("Impact", "Impact"), i18n_text("Pedagogie", "Education")],
    )

    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)

    if public_df.empty:
        st.info("Aucune donnee disponible pour l'instant.")
    else:
        total_megots = float(pd.to_numeric(public_df.get('megots', 0), errors='coerce').fillna(0).sum())
        total_kg = float(pd.to_numeric(public_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum())
        plastique_kg = float(pd.to_numeric(public_df.get('plastique_kg', total_kg * IMPACT_CONSTANTS.get('PLASTIQUE_URBAIN_RATIO', 0.5)), errors='coerce').fillna(0).sum())
        verre_kg = float(pd.to_numeric(public_df.get('verre_kg', total_kg * IMPACT_CONSTANTS.get('VERRE_URBAIN_RATIO', 0.3)), errors='coerce').fillna(0).sum())
        megots_kg = float(total_megots * IMPACT_CONSTANTS.get('POIDS_MOYEN_MEGOT_KG', 0.0002))

        flow_df = pd.DataFrame(
            [
                {"Flux": "Plastique", "Kg": plastique_kg},
                {"Flux": "Verre", "Kg": verre_kg},
                {"Flux": "Megots", "Kg": megots_kg},
            ]
        )

        st.markdown("### Suivi par flux")
        f1, f2, f3 = st.columns(3)
        f1.metric("Plastique collecte", f"{plastique_kg:.1f} kg")
        f2.metric("Verre collecte", f"{verre_kg:.1f} kg")
        f3.metric("Megots collectes", f"{int(total_megots):,}")
        st.bar_chart(flow_df.set_index("Flux")["Kg"], height=220)

        st.markdown("### Valorisation concrete")
        bancs_eq = int(plastique_kg / max(IMPACT_CONSTANTS.get("PLASTIQUE_POUR_BANC_KG", 50.0), 1e-6))
        pulls_eq = int(plastique_kg / max(IMPACT_CONSTANTS.get("PLASTIQUE_POUR_PULL_KG", 0.5), 1e-6))
        bouteilles_verre_eq = int(verre_kg / 0.35) if verre_kg > 0 else 0
        eau_preservee = int(total_megots * IMPACT_CONSTANTS.get("EAU_PROTEGEE_PER_MEGOT_L", 500))
        co2_evite = float(total_megots * IMPACT_CONSTANTS.get("CO2_PER_MEGOT_KG", 0.014))

        v1, v2, v3 = st.columns(3)
        v1.metric("Mobilier potentiel", f"{bancs_eq} banc(s)", delta=f"{pulls_eq:,} pulls polyester")
        v2.metric("Equivalent verre", f"{bouteilles_verre_eq:,} bouteilles")
        v3.metric("Impact megots", f"{eau_preservee:,} L eau", delta=f"{co2_evite:.1f} kg CO2e")

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

        st.markdown("### Recommandations locales d'exutoires")
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

        dominant_flow = flow_df.sort_values("Kg", ascending=False).iloc[0]["Flux"] if not flow_df.empty else "Plastique"
        st.caption(f"Flux dominant actuel: {dominant_flow}. Priorisez son exutoire local pour maximiser la valorisation.")

        st.markdown("### Modules terrain rapides (2 min)")
        tutorial_col1, tutorial_col2, tutorial_col3 = st.columns(3)
        with tutorial_col1:
            st.markdown("**1) Tri express sur le terrain**")
            st.caption("Separer megots / verre / metal / plastiques pour un bilan exploitable.")
        with tutorial_col2:
            st.markdown("**2) Securiser la collecte**")
            st.caption("Gants, pinces, sacs doubles et point de regroupement avant pesage.")
        with tutorial_col3:
            st.markdown("**3) Depot au bon endroit**")
            st.caption("Deposez chaque flux dans le point adapte et gardez une preuve photo si possible.")

with tab_climate:
    render_tab_header(
        icon="\U0001F30D",
        title_fr="Comprendre le dereglement climatique",
        title_en="Understanding Climate Disruption",
        subtitle_fr="Des modules courts pour comprendre puis agir immediatement sur le terrain.",
        subtitle_en="Short learning modules to understand and act immediately in the field.",
        compact=True,
    )

    st.markdown("### Modules courts (3-4 min)")
    climate_modules = [
        {
            "name": "Module 1 - Chaleur urbaine",
            "summary": "Les ilots de chaleur augmentent les risques sante et reduisent la capacite de mobilisation.",
            "actions": ["Prioriser matin/soir", "Ajouter des pauses fraicheur", "Cibler les zones mineralisees"],
        },
        {
            "name": "Module 2 - Pluie et ruissellement",
            "summary": "La pluie transporte megots et plastiques vers les reseaux d'eau.",
            "actions": ["Nettoyer avant episode pluvieux", "Signaler avaloirs encrasses", "Renforcer cendriers/corbeilles"],
        },
        {
            "name": "Module 3 - Biodiversite locale",
            "summary": "Moins de dechets limite les blessures et l'ingestion de plastiques par la faune urbaine.",
            "actions": ["Retirer dechets coupants", "Eviter zones de nidification en periode sensible", "Suivre les hotspots mensuellement"],
        },
        {
            "name": "Module 4 - Engagement quartier",
            "summary": "La regularite des actions cree un effet cumulatif visible sur 3 a 6 mois.",
            "actions": ["Fixer un rendez-vous mensuel", "Partager KPI publics", "Coordonner asso/mairie/commerces"],
        },
    ]

    selected_module = st.selectbox("Choisir un module", [m["name"] for m in climate_modules], key="climate_module_select")
    module_data = next((m for m in climate_modules if m["name"] == selected_module), climate_modules[0])
    st.info(module_data["summary"])
    for act in module_data["actions"]:
        st.markdown(f"- {act}")

    st.markdown("---")
    st.markdown("### Quiz de comprehension")
    q1 = st.radio(
        "1) Pourquoi nettoyer avant un episode pluvieux ?",
        [
            "Pour eviter le transport des dechets vers les egouts et cours d'eau",
            "Pour augmenter le nombre de photos sur l'application",
            "Pour reduire le temps de geolocalisation",
        ],
        key="climate_quiz_q1",
    )
    q2 = st.radio(
        "2) Quelle action stabilise le mieux l'impact quartier ?",
        [
            "Un calendrier mensuel regulier",
            "Une seule mega-action annuelle",
            "Uniquement des publications reseaux sociaux",
        ],
        key="climate_quiz_q2",
    )
    q3 = st.radio(
        "3) Quel flux agit directement sur la pollution diffuse de l'eau ?",
        [
            "Megots",
            "Papier propre",
            "Cartons reutilisables",
        ],
        key="climate_quiz_q3",
    )

    if st.button("Corriger le quiz", key="climate_quiz_submit", use_container_width=True):
        score = 0
        score += 1 if q1.startswith("Pour eviter") else 0
        score += 1 if q2.startswith("Un calendrier") else 0
        score += 1 if q3 == "Megots" else 0
        st.success(f"Score quiz: {score}/3")
        if score < 3:
            st.caption("Refaites le module puis retentez le quiz pour consolider la comprehension.")

    st.markdown("---")
    st.markdown("### Liens actionnables (passer a l'operationnel)")
    l1, l2, l3, l4 = st.columns(4)
    with l1:
        if st.button("Ouvrir Carte", key="climate_link_map", use_container_width=True):
            st.session_state.active_tab_id = "map"
            st.rerun()
    with l2:
        if st.button("Declarer action", key="climate_link_decl", use_container_width=True):
            st.session_state.active_tab_id = "declaration"
            st.rerun()
    with l3:
        if st.button("Planifier IA", key="climate_link_route", use_container_width=True):
            st.session_state.active_tab_id = "route"
            st.rerun()
    with l4:
        if st.button("Verifier Meteo", key="climate_link_weather", use_container_width=True):
            st.session_state.active_tab_id = "weather"
            st.rerun()

with tab_elus:
    render_tab_header(
        icon="\U0001F3DB\ufe0f",
        title_fr="Espace Territoires",
        title_en="Territories Dashboard",
        subtitle_fr="Analysez l'impact local, les zones de vigilance et les leviers de dÃ©cision pour votre collectivitÃ©.",
        subtitle_en="Analyze local impact, risk areas, and decision levers for your municipality.",
        chips=[i18n_text("Collectivites", "Municipalities"), i18n_text("Pilotage", "Steering")],
        compact=True,
    )
    st.write("ce portail permet de visualiser l'impact de l'action citoyenne sur votre commune.")
    
    # Extraire une liste de Villes/Codes Postaux basique Ã  partir des actions approuvÃ©es
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)
    all_submissions_df = pd.DataFrame(get_submissions_by_status(None))

    st.markdown("### Vue executive 1 page (priorites + ROI)")
    if approved_df.empty:
        st.info("Pas encore de donnees approuvees pour afficher la vue executive.")
    else:
        exec_df = approved_df.copy()
        exec_df["dechets_kg"] = pd.to_numeric(exec_df.get("dechets_kg", 0), errors="coerce").fillna(0.0)
        exec_df["megots"] = pd.to_numeric(exec_df.get("megots", 0), errors="coerce").fillna(0)
        exec_df["benevoles"] = pd.to_numeric(exec_df.get("benevoles", 1), errors="coerce").fillna(1)
        exec_df["temps_min"] = pd.to_numeric(exec_df.get("temps_min", 60), errors="coerce").fillna(60)
        exec_df["est_propre_flag"] = exec_df.get("est_propre", False).map(normalize_bool_flag)
        exec_df["effort_h"] = (exec_df["benevoles"] * exec_df["temps_min"] / 60.0).clip(lower=0.05)
        exec_df["adresse"] = exec_df.get("adresse", pd.Series(dtype=str)).fillna("Zone non renseignee").astype(str)

        x1, x2, x3, x4 = st.columns(4)
        x1.metric("Actions", int(len(exec_df)))
        x2.metric("Kg collectes", f"{float(exec_df['dechets_kg'].sum()):,.1f}")
        x3.metric("Megots retires", f"{int(exec_df['megots'].sum()):,}")
        x4.metric("Taux zones propres", f"{(float(exec_df['est_propre_flag'].mean()) * 100):.1f}%")

        hotspot_df = (
            exec_df.groupby("adresse", dropna=False)
            .agg(
                actions=("adresse", "count"),
                kg=("dechets_kg", "sum"),
                megots=("megots", "sum"),
                effort_h=("effort_h", "sum"),
            )
            .reset_index()
            .sort_values(["kg", "megots", "actions"], ascending=False)
        )
        hotspot_df["kg_hb"] = hotspot_df["kg"] / hotspot_df["effort_h"].replace(0, 1e-6)
        hotspot_df["priority"] = hotspot_df.apply(
            lambda r: "Critique" if (r["kg"] >= 20 or r["megots"] >= 1500) else "A surveiller" if (r["kg"] >= 8 or r["megots"] >= 600) else "Stable",
            axis=1,
        )
        st.dataframe(
            hotspot_df.head(8).rename(
                columns={
                    "adresse": "Zone",
                    "actions": "Actions",
                    "kg": "Kg",
                    "megots": "Megots",
                    "effort_h": "Effort h-benevoles",
                    "kg_hb": "Kg/h-benevole",
                    "priority": "Priorite",
                }
            ),
            hide_index=True,
            width="stretch",
        )

        st.markdown("#### Scenario 'si on agit ici'")
        scenario_zone = st.selectbox(
            "Zone cible",
            hotspot_df["adresse"].head(20).tolist(),
            key="elus_scenario_zone",
        )
        csc1, csc2 = st.columns(2)
        with csc1:
            scenario_ops = st.number_input("Operations supplementaires / mois", min_value=1, max_value=30, value=4, step=1, key="elus_scenario_ops")
        with csc2:
            scenario_reduction = st.slider("Reduction attendue de salete (%)", min_value=5, max_value=80, value=25, step=5, key="elus_scenario_reduction")

        zone_row = hotspot_df[hotspot_df["adresse"] == scenario_zone].head(1)
        if not zone_row.empty:
            base_kg = float(zone_row.iloc[0]["kg"])
            base_meg = float(zone_row.iloc[0]["megots"])
            reduction_factor = float(scenario_reduction) / 100.0
            gain_kg = base_kg * reduction_factor
            gain_meg = int(base_meg * reduction_factor)
            annual_gain_kg = gain_kg * 12.0
            annual_gain_meg = int(gain_meg * 12)
            annual_value = (annual_gain_kg / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]

            sc1, sc2, sc3 = st.columns(3)
            sc1.metric("Gain annuel estime (kg)", f"{annual_gain_kg:,.1f}")
            sc2.metric("Gain annuel estime (megots)", f"{annual_gain_meg:,}")
            sc3.metric("Valeur annuelle potentielle", f"{annual_value:,.0f} EUR")

        council_export = hotspot_df.head(20).copy()
        council_export["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        council_note = (
            "NOTE CONSEIL MUNICIPAL - Clean my Map\n"
            f"Date: {datetime.now().strftime('%Y-%m-%d')}\n"
            f"Actions observees: {len(exec_df)}\n"
            f"Kg retires: {float(exec_df['dechets_kg'].sum()):.1f}\n"
            f"Megots retires: {int(exec_df['megots'].sum())}\n"
            "Priorites recommandees: renforcer les zones critiques du tableau.\n"
        )
        eout1, eout2 = st.columns(2)
        with eout1:
            st.download_button(
                "Exporter tableau conseil (CSV)",
                data=council_export.to_csv(index=False).encode("utf-8"),
                file_name="vue_executive_territoire.csv",
                mime="text/csv",
                use_container_width=True,
            )
        with eout2:
            st.download_button(
                "Exporter note conseil (TXT)",
                data=council_note.encode("utf-8"),
                file_name="note_conseil_municipal.txt",
                mime="text/plain",
                use_container_width=True,
            )
    st.markdown("---")

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
        render_empty_state(
            "Aucune donnee territoire",
            "Les analyses executives seront disponibles des qu'une premiere action est approuvee.",
            "Creer la premiere action",
            "declaration",
            key_suffix="elus_empty",
        )

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
    guide_path = st.radio(
        "Parcours",
        ["Debutant", "Confirme"],
        horizontal=True,
        key="guide_path_mode",
    )
    st.subheader("Version 2 minutes (operationnelle)")
    g1, g2 = st.columns([2.3, 1], gap="large")
    with g1:
        if guide_path == "Debutant":
            st.markdown(
                "1. Ouvrir la **Carte interactive** et choisir un preset `Zones prioritaires`.\n"
                "2. Aller dans **Declarer une action** et remplir l'etape 1.\n"
                "3. Saisir les volumes collectes puis valider."
            )
        else:
            st.markdown(
                "1. Ouvrir la carte et filtrer `Actions recentes`.\n"
                "2. Planifier un parcours IA puis lancer l'action terrain.\n"
                "3. Declarer l'action et verifier les KPI dans `Notre Impact`."
            )

        done_steps = 0
        done_steps += 1 if st.checkbox("Mission identifiee", key="guide_step_mission") else 0
        done_steps += 1 if st.checkbox("Declaration prete", key="guide_step_declare") else 0
        done_steps += 1 if st.checkbox("Suivi impact compris", key="guide_step_impact") else 0
        st.progress(done_steps / 3)
        st.caption(f"Progression onboarding: {done_steps}/3")

        q1, q2, q3 = st.columns(3)
        with q1:
            if st.button("Aller a la declaration", key="guide_to_decl", use_container_width=True):
                st.session_state.active_tab_id = "declaration"
                st.rerun()
        with q2:
            if st.button("Aller a la carte", key="guide_to_map", use_container_width=True):
                st.session_state.active_tab_id = "map"
                st.rerun()
        with q3:
            if st.button("Aller au kit terrain", key="guide_to_kit", use_container_width=True):
                st.session_state.active_tab_id = "kit"
                st.rerun()

    with g2:
        st.metric("Temps estime", "2 min")
        st.info("Objectif: rendre le premier passage simple, clair et rapide.")
        st.caption("Debutant: prise en main guidee.")
        st.caption("Confirme: execution rapide + pilotage.")
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
        title_fr="Partenaires engagÃ©s",
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
            partner_rows["structure_type"] = partner_rows.get("type_lieu", pd.Series(dtype=str)).map(infer_partner_type)
            partner_rows["adresse_txt"] = partner_rows.get("adresse", pd.Series(dtype=str)).fillna("").astype(str)

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

            c_filter1, c_filter2 = st.columns([1.3, 1.7], gap="small")
            with c_filter1:
                type_options = sorted(partner_rows["structure_type"].dropna().astype(str).unique().tolist())
                selected_types = st.multiselect(
                    "Filtrer par type de structure",
                    options=type_options,
                    default=type_options,
                    key="partners_type_filter",
                )
            with c_filter2:
                partner_query = st.text_input("Rechercher un partenaire", placeholder="Nom, zone, commentaire...", key="partners_query")

            display_rows = partner_rows.copy()
            if selected_types:
                display_rows = display_rows[display_rows["structure_type"].isin(selected_types)]
            if partner_query.strip():
                q = partner_query.strip().lower()
                display_rows = display_rows[
                    display_rows.get("association", pd.Series(dtype=str)).fillna("").astype(str).str.lower().str.contains(q, na=False)
                    | display_rows.get("adresse_txt", pd.Series(dtype=str)).fillna("").astype(str).str.lower().str.contains(q, na=False)
                    | display_rows.get("commentaire", pd.Series(dtype=str)).fillna("").astype(str).str.lower().str.contains(q, na=False)
                ]

            if display_rows.empty:
                st.info("Aucune fiche partenaire pour ce filtre.")
            else:
                partner_cards = (
                    display_rows.groupby("association", dropna=False)
                    .agg(
                        structure=("structure_type", lambda s: str(s.mode().iloc[0]) if not s.mode().empty else "Autre structure"),
                        actions=("association", "count"),
                        kg=("dechets_kg", "sum"),
                        megots=("megots", "sum"),
                        zone=("adresse_txt", lambda s: next((x for x in s if str(x).strip()), "Zone non renseignee")),
                        website=("website_url", lambda s: next((x for x in s if str(x).strip()), "")),
                    )
                    .reset_index()
                    .sort_values(["actions", "kg"], ascending=False)
                )

                st.markdown("### Fiches partenaires")
                for _, pr in partner_cards.head(18).iterrows():
                    initials = "".join([w[0] for w in str(pr["association"]).split()[:2]]).upper() or "P"
                    quick_contact = str(pr.get("website", "")).strip()
                    if not quick_contact:
                        quick_contact = f"mailto:contact@cleanmymap.fr?subject=Contact partenaire%20{str(pr['association']).replace(' ', '%20')}"
                    st.markdown(
                        f"""
                        <div class="partner-mini-card">
                            <div class="partner-mini-head">
                                <span class="partner-logo">{initials[:2]}</span>
                                <div>
                                    <div style="font-weight:800;color:var(--ink-1);">{pr['association']}</div>
                                    <div style="font-size:.78rem;color:var(--ink-3);">{pr['structure']}</div>
                                </div>
                            </div>
                            <div style="font-size:.82rem;color:var(--ink-2);margin-bottom:6px;">Zone: {pr['zone']}</div>
                            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:.78rem;color:var(--ink-3);">
                                <span>{int(pr['actions'])} actions</span>
                                <span>{float(pr['kg']):.1f} kg</span>
                                <span>{int(pr['megots'])} megots</span>
                            </div>
                            <div style="margin-top:8px;">
                                <a href="{quick_contact}" target="_blank" style="font-size:.78rem;font-weight:700;color:#0f766e;text-decoration:none;">Contact rapide</a>
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
    with st.expander("Annuaire complet", expanded=False):
        show_partners()

# ------------------------------------------------------------------------
# ONGLET : MÃ‰TÃ‰O & ACTION
# ------------------------------------------------------------------------
with tab_weather:
    render_tab_header(
        icon="\U0001F324\ufe0f",
        title_fr="Meteo & planification",
        title_en="Weather & Planning",
        subtitle_fr="Identifiez les meilleures fenetres meteo, anticipez les alertes et reliez meteo et participation.",
        subtitle_en="Identify ideal windows, anticipate alerts, and relate weather to participation.",
        chips=[i18n_text("Prevision", "Forecast"), i18n_text("Timing", "Timing")],
    )

    @st.cache_data(ttl=1800)
    def get_weather_forecast(lat=48.8566, lon=2.3522):
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                f"&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
                f"&hourly=temperature_2m,precipitation,windspeed_10m"
                f"&past_days=3&timezone=Europe%2FParis&wind_speed_unit=kmh"
            )
            r = requests.get(url, timeout=8)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return None

    @st.cache_data(ttl=43200)
    def get_weather_archive(lat=48.8566, lon=2.3522, start_date=None, end_date=None):
        if not start_date or not end_date:
            return pd.DataFrame()
        try:
            url = (
                f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
                f"&start_date={start_date}&end_date={end_date}"
                f"&daily=precipitation_sum,temperature_2m_max,windspeed_10m_max"
                f"&timezone=Europe%2FParis&wind_speed_unit=kmh"
            )
            r = requests.get(url, timeout=10)
            if r.status_code != 200:
                return pd.DataFrame()
            d = r.json().get("daily", {})
            return pd.DataFrame(
                {
                    "date": pd.to_datetime(d.get("time", []), errors="coerce").dt.date,
                    "rain_mm": pd.to_numeric(d.get("precipitation_sum", []), errors="coerce"),
                    "temp_max": pd.to_numeric(d.get("temperature_2m_max", []), errors="coerce"),
                    "wind_kmh": pd.to_numeric(d.get("windspeed_10m_max", []), errors="coerce"),
                }
            ).dropna(subset=["date"])
        except Exception:
            return pd.DataFrame()

    weather_data = get_weather_forecast()
    col_w1, col_w2 = st.columns([2, 1])

    with col_w1:
        if weather_data and 'daily' in weather_data:
            daily = weather_data['daily']
            df_weather = pd.DataFrame(
                {
                    'Date': pd.to_datetime(daily.get('time', [])),
                    'Pluie (mm)': [p if p is not None else 0 for p in daily.get('precipitation_sum', [])],
                    'Temp. max': [t if t is not None else 0 for t in daily.get('temperature_2m_max', [])],
                    'Vent max (km/h)': [w if w is not None else 0 for w in daily.get('windspeed_10m_max', [])],
                }
            )
            if not df_weather.empty:
                df_weather['Score fenetre'] = (
                    100
                    - (pd.to_numeric(df_weather['Pluie (mm)'], errors='coerce').fillna(0) * 14)
                    - (pd.to_numeric(df_weather['Vent max (km/h)'], errors='coerce').fillna(0).clip(lower=12) - 12) * 1.6
                    - (pd.to_numeric(df_weather['Temp. max'], errors='coerce').fillna(0).sub(18).abs() * 1.7)
                ).clip(lower=0, upper=100)
                df_weather['Optimal'] = df_weather['Score fenetre'] >= 70

                best_row = df_weather.sort_values('Score fenetre', ascending=False).iloc[0]
                st.metric("Score fenetre ideale", f"{best_row['Score fenetre']:.0f}/100", delta=f"{best_row['Date'].strftime('%d/%m')}")

            fig_w, ax_p = plt.subplots(figsize=(9, 3.5))
            ax_t = ax_p.twinx()
            colors_bar = ['#22c55e' if o else '#f87171' for o in df_weather['Optimal']]
            ax_p.bar(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Pluie (mm)'], color=colors_bar, alpha=0.7)
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Temp. max'], color='#f97316', marker='o', linewidth=2, label='Temp')
            ax_t.plot(df_weather['Date'].dt.strftime('%d/%m'), df_weather['Vent max (km/h)'], color='#2563eb', marker='s', linewidth=1.7, label='Vent')
            ax_p.set_ylabel('Pluie (mm)', fontsize=9)
            ax_t.set_ylabel('Temp. max (C)', fontsize=9, color='#f97316')
            ax_p.axhline(2, color='#ef4444', linestyle='--', linewidth=1, alpha=0.6)
            ax_p.tick_params(axis='x', rotation=25, labelsize=8)
            plt.title("Fenetres d'action (vert = ideal)", fontsize=11, fontweight='bold', color='#1e293b')
            fig_w.tight_layout()
            st.pyplot(fig_w)
            plt.close(fig_w)

            st.markdown("#### Alertes meteo pour evenements planifies")
            upcoming_events = get_community_events(limit=30, include_past=False)
            if upcoming_events:
                event_rows = []
                meteo_by_date = {
                    d.date(): {"rain": r, "wind": w, "score": s}
                    for d, r, w, s in zip(
                        df_weather['Date'],
                        pd.to_numeric(df_weather['Pluie (mm)'], errors='coerce').fillna(0),
                        pd.to_numeric(df_weather['Vent max (km/h)'], errors='coerce').fillna(0),
                        pd.to_numeric(df_weather['Score fenetre'], errors='coerce').fillna(0),
                    )
                }
                for ev in upcoming_events:
                    try:
                        ev_date = pd.to_datetime(ev.get("event_date"), errors="coerce")
                        if pd.isna(ev_date):
                            continue
                        dkey = ev_date.date()
                        if dkey not in meteo_by_date:
                            continue
                        w = meteo_by_date[dkey]
                        alert = "OK"
                        if w["rain"] >= 4 or w["wind"] >= 45:
                            alert = "Alerte forte"
                        elif w["rain"] >= 2 or w["wind"] >= 30 or w["score"] < 60:
                            alert = "Vigilance"
                        event_rows.append(
                            {
                                "Date": ev_date.strftime("%d/%m/%Y"),
                                "Evenement": ev.get("title", "Sortie"),
                                "Pluie (mm)": round(float(w["rain"]), 1),
                                "Vent (km/h)": round(float(w["wind"]), 0),
                                "Score": int(w["score"]),
                                "Alerte": alert,
                            }
                        )
                    except Exception:
                        continue

                if event_rows:
                    st.dataframe(pd.DataFrame(event_rows), width="stretch", hide_index=True)
                    if any(r["Alerte"] == "Alerte forte" for r in event_rows):
                        st.warning("Au moins un evenement presente un risque meteo eleve (pluie/vent).")
                else:
                    st.caption("Aucun evenement planifie ne tombe dans la fenetre meteo disponible.")
            else:
                st.caption("Aucun evenement communautaire planifie.")

            st.markdown("#### Meteo vs participation passee")
            if not all_public_df.empty and "date" in all_public_df.columns:
                actions_hist = all_public_df.copy()
                actions_hist["date_dt"] = pd.to_datetime(actions_hist.get("date"), errors="coerce")
                actions_hist = actions_hist.dropna(subset=["date_dt"])
                actions_hist["date_only"] = actions_hist["date_dt"].dt.date
                actions_hist["benevoles_num"] = pd.to_numeric(actions_hist.get("benevoles", actions_hist.get("nb_benevoles", 1)), errors="coerce").fillna(1)

                if not actions_hist.empty:
                    min_date = actions_hist["date_only"].min()
                    max_date = actions_hist["date_only"].max()
                    archive_df = get_weather_archive(start_date=min_date, end_date=max_date)
                    if not archive_df.empty:
                        merged = actions_hist.merge(archive_df, left_on="date_only", right_on="date", how="left")
                        merged["meteo_favorable"] = (
                            (merged["rain_mm"].fillna(0) < 2)
                            & (merged["wind_kmh"].fillna(0) < 30)
                            & (merged["temp_max"].fillna(0).between(8, 30))
                        )
                        part_fav = float(merged.loc[merged["meteo_favorable"], "benevoles_num"].mean()) if (merged["meteo_favorable"] == True).any() else 0.0
                        part_bad = float(merged.loc[~merged["meteo_favorable"], "benevoles_num"].mean()) if (merged["meteo_favorable"] == False).any() else 0.0
                        wv1, wv2 = st.columns(2)
                        wv1.metric("Participation moyenne (meteo favorable)", f"{part_fav:.1f}")
                        wv2.metric("Participation moyenne (meteo defavorable)", f"{part_bad:.1f}", delta=f"{part_fav - part_bad:.1f}")
                    else:
                        st.caption("Comparaison historique indisponible (archive meteo non chargee).")

        else:
            st.info("Donnees meteo indisponibles (API Open-Meteo). Reessayez dans quelques instants.")

    with col_w2:
        st.markdown('<div class="premium-card">', unsafe_allow_html=True)
        st.subheader("Historique mensuel")
        if not all_public_df.empty and 'date' in all_public_df.columns:
            df_hist = all_public_df.copy()
            df_hist['date_dt'] = pd.to_datetime(df_hist['date'], errors='coerce')
            monthly_count = df_hist.dropna(subset=['date_dt']).groupby(df_hist['date_dt'].dt.month).size()
            if not monthly_count.empty:
                mn = {1:'Jan',2:'Fev',3:'Mar',4:'Avr',5:'Mai',6:'Jun',7:'Jul',8:'Aou',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
                for m, cnt in monthly_count.items():
                    bp = int(cnt / max(monthly_count) * 100)
                    st.markdown(
                        f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:4px;'>"
                        f"<span style='width:28px;font-size:11px;color:#64748b;'>{mn.get(m,'?')}</span>"
                        f"<div style='flex:1;background:#f1f5f9;border-radius:4px;height:14px;'>"
                        f"<div style='width:{bp}%;background:#10b981;height:14px;border-radius:4px;'></div></div>"
                        f"<span style='font-size:11px;color:#1e293b;font-weight:600;'>{cnt}</span></div>",
                        unsafe_allow_html=True,
                    )
        st.markdown('</div>', unsafe_allow_html=True)

with tab_compare:
    render_tab_header(
        icon="\U0001F3D9\ufe0f",
        title_fr="Comparaison territoriale",
        title_en="Territorial Comparison",
        subtitle_fr="Benchmark des zones avec indicateurs normalises par effort benevole.",
        subtitle_en="Zone benchmarking with effort-normalized volunteer indicators.",
        chips=[i18n_text("Benchmark", "Benchmark"), i18n_text("Priorisation", "Prioritization")],
    )

    df_cmp = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))

    if df_cmp.empty:
        st.info("Pas encore de donnees disponibles.")
    else:
        df_cmp['benevoles'] = pd.to_numeric(df_cmp.get('benevoles', df_cmp.get('nb_benevoles', 1)), errors='coerce').fillna(1)
        df_cmp['megots'] = pd.to_numeric(df_cmp.get('megots', 0), errors='coerce').fillna(0)
        df_cmp['dechets_kg'] = pd.to_numeric(df_cmp.get('dechets_kg', 0), errors='coerce').fillna(0)
        df_cmp['temps_min'] = pd.to_numeric(df_cmp.get('temps_min', 60), errors='coerce').fillna(60)
        df_cmp = df_cmp[df_cmp.get('est_propre', False) == False].copy()
        df_cmp['effort_h'] = (df_cmp['benevoles'] * df_cmp['temps_min'] / 60.0).clip(lower=0.05)
        df_cmp['kg_par_hb_action'] = df_cmp['dechets_kg'] / df_cmp['effort_h']
        df_cmp['megots_par_hb_action'] = df_cmp['megots'] / df_cmp['effort_h']

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

        df_cmp["territoire"] = df_cmp.get("adresse", pd.Series(dtype=str)).apply(_extract_territory)

        c1c, c2c = st.columns(2)
        with c1c:
            group_by = st.selectbox("Grouper par", ["Type de lieu", "Adresse (Top 20)", "Territoire (ville)"], key="cmp_group")
        with c2c:
            sort_by = st.selectbox(
                "Trier par",
                ["kg / h benevole (normalise)", "megots / h benevole (normalise)", "Score IPC", "Nombre d'actions"],
                key="cmp_sort",
            )

        if group_by == "Type de lieu":
            group_col = 'type_lieu'
        elif group_by == "Adresse (Top 20)":
            df_cmp['adresse_short'] = df_cmp.get('adresse', pd.Series(dtype=str)).fillna('').astype(str).str.slice(0, 40)
            group_col = 'adresse_short'
        else:
            group_col = 'territoire'

        if group_col not in df_cmp.columns:
            df_cmp[group_col] = 'Inconnu'

        agg_rows = []
        for zone, g in df_cmp.groupby(group_col, dropna=False):
            mean_kg_hb, low_kg_hb, high_kg_hb = compute_mean_ci(g['kg_par_hb_action'])
            mean_meg_hb, low_meg_hb, high_meg_hb = compute_mean_ci(g['megots_par_hb_action'])
            total_effort_h = float(g['effort_h'].sum())
            total_kg = float(g['dechets_kg'].sum())
            total_megots = float(g['megots'].sum())
            score_ipc = float(total_megots / max(total_effort_h, 1e-6))

            agg_rows.append(
                {
                    'zone': zone,
                    'actions': int(len(g)),
                    'total_kg': total_kg,
                    'total_megots': total_megots,
                    'effort_h': total_effort_h,
                    'kg_hb': mean_kg_hb,
                    'kg_hb_low': low_kg_hb,
                    'kg_hb_high': high_kg_hb,
                    'meg_hb': mean_meg_hb,
                    'meg_hb_low': low_meg_hb,
                    'meg_hb_high': high_meg_hb,
                    'score_ipc': score_ipc,
                }
            )

        grp = pd.DataFrame(agg_rows)
        if grp.empty:
            st.info("Pas assez de donnees pour comparer les territoires.")
        else:
            grp["population"] = grp["zone"].apply(lambda z: territory_reference.get(str(z).lower(), {}).get("population", None))
            grp["area_km2"] = grp["zone"].apply(lambda z: territory_reference.get(str(z).lower(), {}).get("area_km2", None))
            grp["kg_par_10k_hab"] = grp.apply(
                lambda r: round((r["total_kg"] / max(float(r["population"]), 1.0)) * 10000, 2) if pd.notna(r["population"]) else 0.0,
                axis=1,
            )
            grp["megots_par_km2"] = grp.apply(
                lambda r: round(r["total_megots"] / max(float(r["area_km2"]), 0.001), 1) if pd.notna(r["area_km2"]) else 0.0,
                axis=1,
            )

            sort_map = {
                "kg / h benevole (normalise)": "kg_hb",
                "megots / h benevole (normalise)": "meg_hb",
                "Score IPC": "score_ipc",
                "Nombre d'actions": "actions",
            }
            sort_col = sort_map[sort_by]
            grp = grp.sort_values(sort_col, ascending=False).reset_index(drop=True)

            st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
            max_val = max(float(grp[sort_col].max()), 0.001)
            for i, row in grp.head(15).iterrows():
                medal = "#1" if i == 0 else "#2" if i == 1 else "#3" if i == 2 else f"#{i+1}"
                bar_pct = int((float(row[sort_col]) / max_val) * 100)
                if sort_col == "kg_hb":
                    ci_text = f"IC95% [{row['kg_hb_low']:.2f}; {row['kg_hb_high']:.2f}]"
                elif sort_col == "meg_hb":
                    ci_text = f"IC95% [{row['meg_hb_low']:.1f}; {row['meg_hb_high']:.1f}]"
                else:
                    ci_text = "IC95% non applicable"

                st.markdown(
                    f"""
                    <div style="background:#f8fafc;border-radius:12px;padding:12px 16px;margin-bottom:8px;border-left:2px solid #cbd5e1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                            <div><b>{medal} {str(row['zone'])[:45]}</b></div>
                            <div style="text-align:right;font-size:12px;color:#64748b;">{int(row['actions'])} actions | {row['effort_h']:.1f} h-benevoles</div>
                        </div>
                        <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;">
                                <div style="width:{bar_pct}%;background:#10b981;height:8px;border-radius:4px;"></div>
                            </div>
                            <span style="font-size:12px;font-weight:700;color:#059669;">{sort_by}: {float(row[sort_col]):.2f}</span>
                        </div>
                        <div style="margin-top:4px;font-size:11px;color:#64748b;">{ci_text}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            st.markdown('</div>', unsafe_allow_html=True)

            st.divider()
            disp = grp.rename(
                columns={
                    "zone": "Zone",
                    "actions": "Actions",
                    "effort_h": "Effort h-benevoles",
                    "kg_hb": "kg/h benevole",
                    "meg_hb": "megots/h benevole",
                    "kg_hb_low": "IC95 kg/h low",
                    "kg_hb_high": "IC95 kg/h high",
                    "meg_hb_low": "IC95 meg/h low",
                    "meg_hb_high": "IC95 meg/h high",
                    "score_ipc": "Score IPC",
                    "kg_par_10k_hab": "kg/10k hab",
                    "megots_par_km2": "megots/km2",
                }
            )
            disp_table = disp[
                [
                    'Zone', 'Actions', 'Effort h-benevoles', 'kg/h benevole', 'IC95 kg/h low', 'IC95 kg/h high',
                    'megots/h benevole', 'IC95 meg/h low', 'IC95 meg/h high', 'Score IPC', 'kg/10k hab', 'megots/km2'
                ]
            ].copy()
            render_paginated_dataframe(disp_table, key_prefix="compare_benchmark_table", title="Benchmark detaille (pagine)", default_page_size=25)
            render_standard_exports(disp_table, basename="comparaison_territoriale_normalisee", key_prefix="compare_benchmark_export")

            with st.expander("Methodologie simplifiee", expanded=False):
                st.markdown(
                    "- Normalisation effort: toutes les performances sont rapportees aux heures-benevoles (benevoles x duree).\n"
                    "- Classement principal: moyenne par action des taux kg/h-benevole ou megots/h-benevole.\n"
                    "- Intervalle de confiance: IC95% via approximation normale (moyenne +/- 1.96 * erreur standard).\n"
                    "- Limite: les groupes avec peu d'actions ont des IC plus larges, a lire avec prudence."
                )

with tab_admin:
    render_tab_header(
        icon="\u2699\ufe0f",
        title_fr="Espace administrateur",
        title_en="Admin Workspace",
        subtitle_fr="Validez les contributions, pilotez la carte publique et exportez les donnÃ©es scientifiques.",
        subtitle_en="Validate submissions, manage the public map, and export scientific datasets.",
        chips=[i18n_text("Validation", "Moderation"), i18n_text("DonnÃ©es", "Data")],
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
            folium.TileLayer(
                'OpenStreetMap',
                name='Fond Clair (DÃ©faut)',
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
                            "{i18n_text('ðŸ•’ DÃ©filement chronologique', 'ðŸ•’ Chronological playback')}"
                        );
                    }}
                    {{% endmacro %}}
                    """
                )
                m_admin.add_child(timeline_admin_toggle)
            
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
        
        admin_public_table = approved_df[["date", "type_lieu", "adresse", "benevoles", "megots", "dechets_kg"]].copy()
        render_paginated_dataframe(
            admin_public_table,
            key_prefix="admin_public_actions_table",
            title="Actions validees (pagine)",
            default_page_size=25,
        )
        render_standard_exports(admin_public_table, basename="admin_actions_validees", key_prefix="admin_public_actions_export")

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
    admin_actor = str(main_user_email or "admin")
    if st.button("Se dÃ©connecter de l'espace Admin"):
        st.session_state["admin_authenticated"] = False
        st.rerun()

    # Le contenu admin doit Ãªtre en dehors du bloc 'if st.button'
    pending = get_submissions_by_status('pending')

    if not pending:
        render_empty_state(
            "Aucune demande en attente",
            "La file de validation est vide pour le moment.",
            "Aller a la declaration",
            "declaration",
            key_suffix="admin_pending_empty",
        )
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
        pre_df["niveau_risque"] = pre_df["priority"].map({1: "Faible", 2: "Moyen", 3: "Eleve"}).fillna("Moyen")
        count_pre = int((pre_df["decision"] == "Pre-validee").sum())
        count_review = int((pre_df["decision"] == "A verifier").sum())
        count_strong = int(((pre_df["decision"] == "A verifier (fort)") | (pre_df["decision"] == "Bloquante")).sum())

        k1, k2, k3 = st.columns(3)
        k1.metric("Pre-validees auto", count_pre)
        k2.metric("A verifier", count_review)
        k3.metric("A verifier (fort/bloquante)", count_strong)

        queue_counts = pre_df["niveau_risque"].value_counts()
        rq1, rq2, rq3 = st.columns(3)
        rq1.metric("Risque faible", int(queue_counts.get("Faible", 0)))
        rq2.metric("Risque moyen", int(queue_counts.get("Moyen", 0)))
        rq3.metric("Risque eleve", int(queue_counts.get("Eleve", 0)))

        pre_table = pre_df[["date", "nom", "type_lieu", "adresse", "decision", "niveau_risque", "score", "raisons"]].copy()
        render_paginated_dataframe(pre_table, key_prefix="admin_prevalidation_table", title="File de validation priorisee", default_page_size=25)
        render_standard_exports(pre_table, basename="admin_prevalidation_queue", key_prefix="admin_prevalidation_export")

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
                    before_snapshot = (
                        f"nom={row.get('nom','')} | type={row.get('type_lieu','')} | "
                        f"adresse={row.get('adresse','')} | megots={row.get('megots',0)} | kg={row.get('dechets_kg',0)}"
                    )
                    update_submission_status(row["id"], "approved")
                    add_admin_audit_log(
                        actor=admin_actor,
                        action="approve_bulk",
                        submission_id=row.get("id"),
                        before_snapshot=before_snapshot,
                        after_snapshot="status=approved",
                    )
                    if row.get("type_lieu") in actor_types:
                        auto_enrich_actor(row["id"], row.get("association", ""), row.get("type_lieu", ""), row.get("adresse", ""))
                    approved_count += 1
            st.success(f"{approved_count} demande(s) approuvee(s) en lot.")
            st.rerun()

        if b2.button("Refuser la selection", key="bulk_reject_btn", use_container_width=True, disabled=not (confirm_bulk and selected_ids)):
            rejected_count = 0
            for row in pending:
                if row.get("id") in selected_ids:
                    before_snapshot = (
                        f"nom={row.get('nom','')} | type={row.get('type_lieu','')} | "
                        f"adresse={row.get('adresse','')} | megots={row.get('megots',0)} | kg={row.get('dechets_kg',0)}"
                    )
                    update_submission_status(row["id"], "rejected")
                    add_admin_audit_log(
                        actor=admin_actor,
                        action="reject_bulk",
                        submission_id=row.get("id"),
                        before_snapshot=before_snapshot,
                        after_snapshot="status=rejected",
                    )
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
                st.markdown("#### Avant / apres correction")
                base_snapshot = {
                    "nom": str(row.get("nom", "")),
                    "association": str(row.get("association", "")),
                    "type_lieu": str(row.get("type_lieu", "")),
                    "adresse": str(row.get("adresse", "")),
                    "commentaire": str(row.get("commentaire", "")),
                    "benevoles": int(row.get("benevoles") or 0),
                    "temps_min": int(row.get("temps_min") or 0),
                    "megots": int(row.get("megots") or 0),
                    "dechets_kg": float(row.get("dechets_kg") or 0.0),
                }
                edit_state_key = f"admin_edit_state_{row['id']}"
                if edit_state_key not in st.session_state:
                    st.session_state[edit_state_key] = {"history": [base_snapshot], "idx": 0}
                edit_state = st.session_state[edit_state_key]
                hist = edit_state.get("history", [base_snapshot])
                idx = int(edit_state.get("idx", 0))
                if idx < 0:
                    idx = 0
                if idx >= len(hist):
                    idx = len(hist) - 1
                current_snapshot = hist[idx]
                st.caption(f"Historique edition: version {idx + 1}/{len(hist)}")

                with st.form(f"admin_edit_form_{row['id']}"):
                    widget_suffix = f"{row['id']}_{idx}"
                    ec1, ec2 = st.columns(2)
                    with ec1:
                        edit_nom = st.text_input("Nom", value=current_snapshot["nom"], key=f"admin_edit_nom_{widget_suffix}")
                        edit_association = st.text_input("Association", value=current_snapshot["association"], key=f"admin_edit_asso_{widget_suffix}")
                        edit_type_lieu = st.text_input("Type de lieu", value=current_snapshot["type_lieu"], key=f"admin_edit_type_{widget_suffix}")
                        edit_adresse = st.text_input("Adresse", value=current_snapshot["adresse"], key=f"admin_edit_addr_{widget_suffix}")
                        edit_comment = st.text_area("Commentaire", value=current_snapshot["commentaire"], key=f"admin_edit_comment_{widget_suffix}")
                    with ec2:
                        edit_benevoles = st.number_input("Benevoles", min_value=0, step=1, value=int(current_snapshot["benevoles"]), key=f"admin_edit_ben_{widget_suffix}")
                        edit_temps = st.number_input("Duree (min)", min_value=0, step=5, value=int(current_snapshot["temps_min"]), key=f"admin_edit_temps_{widget_suffix}")
                        edit_megots = st.number_input("Megots", min_value=0, step=10, value=int(current_snapshot["megots"]), key=f"admin_edit_meg_{widget_suffix}")
                        edit_kg = st.number_input("Dechets (kg)", min_value=0.0, step=0.1, value=float(current_snapshot["dechets_kg"]), key=f"admin_edit_kg_{widget_suffix}")

                    candidate_snapshot = {
                        "nom": str(edit_nom),
                        "association": str(edit_association),
                        "type_lieu": str(edit_type_lieu),
                        "adresse": str(edit_adresse),
                        "commentaire": str(edit_comment),
                        "benevoles": int(edit_benevoles),
                        "temps_min": int(edit_temps),
                        "megots": int(edit_megots),
                        "dechets_kg": float(edit_kg),
                    }

                    before_after_rows = [
                        {"champ": "Nom", "avant": base_snapshot["nom"], "apres": candidate_snapshot["nom"]},
                        {"champ": "Association", "avant": base_snapshot["association"], "apres": candidate_snapshot["association"]},
                        {"champ": "Type lieu", "avant": base_snapshot["type_lieu"], "apres": candidate_snapshot["type_lieu"]},
                        {"champ": "Adresse", "avant": base_snapshot["adresse"], "apres": candidate_snapshot["adresse"]},
                        {"champ": "Benevoles", "avant": base_snapshot["benevoles"], "apres": candidate_snapshot["benevoles"]},
                        {"champ": "Duree", "avant": base_snapshot["temps_min"], "apres": candidate_snapshot["temps_min"]},
                        {"champ": "Megots", "avant": base_snapshot["megots"], "apres": candidate_snapshot["megots"]},
                        {"champ": "Kg", "avant": base_snapshot["dechets_kg"], "apres": candidate_snapshot["dechets_kg"]},
                        {"champ": "Commentaire", "avant": base_snapshot["commentaire"], "apres": candidate_snapshot["commentaire"]},
                    ]
                    changes_df = pd.DataFrame(before_after_rows)
                    changed_only = changes_df[changes_df["avant"].astype(str) != changes_df["apres"].astype(str)]
                    if changed_only.empty:
                        st.caption("Aucune difference detectee.")
                    else:
                        st.dataframe(changed_only, hide_index=True, width="stretch")

                    b_hist1, b_hist2, b_hist3, b_hist4, b_hist5 = st.columns(5)
                    btn_snapshot = b_hist1.form_submit_button("Modifier", use_container_width=True)
                    btn_undo = b_hist2.form_submit_button("Annuler", use_container_width=True)
                    btn_redo = b_hist3.form_submit_button("Retablir", use_container_width=True)
                    btn_reset = b_hist4.form_submit_button("Reinitialiser", use_container_width=True)
                    save_edit = b_hist5.form_submit_button("Enregistrer", use_container_width=True)

                    if btn_snapshot:
                        new_history = hist[: idx + 1] + [candidate_snapshot]
                        st.session_state[edit_state_key] = {"history": new_history, "idx": len(new_history) - 1}
                        st.success("Version ajoutee a l'historique.")
                        st.rerun()
                    if btn_undo:
                        st.session_state[edit_state_key]["idx"] = max(0, idx - 1)
                        st.rerun()
                    if btn_redo:
                        st.session_state[edit_state_key]["idx"] = min(len(hist) - 1, idx + 1)
                        st.rerun()
                    if btn_reset:
                        st.session_state[edit_state_key] = {"history": [base_snapshot], "idx": 0}
                        st.rerun()
                    if save_edit:
                        update_submission_fields(
                            sub_id=row.get("id"),
                            nom=candidate_snapshot["nom"],
                            association=candidate_snapshot["association"],
                            type_lieu=candidate_snapshot["type_lieu"],
                            adresse=candidate_snapshot["adresse"],
                            benevoles=candidate_snapshot["benevoles"],
                            temps_min=candidate_snapshot["temps_min"],
                            megots=candidate_snapshot["megots"],
                            dechets_kg=candidate_snapshot["dechets_kg"],
                            commentaire=candidate_snapshot["commentaire"],
                        )
                        add_admin_audit_log(
                            actor=admin_actor,
                            action="manual_correction",
                            submission_id=row.get("id"),
                            before_snapshot=" | ".join([f"{r['champ']}={r['avant']}" for r in before_after_rows]),
                            after_snapshot=" | ".join([f"{r['champ']}={r['apres']}" for r in before_after_rows]),
                        )
                        st.session_state.pop(edit_state_key, None)
                        st.success("Corrections enregistrees.")
                        st.rerun()
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
                    before_snapshot = (
                        f"nom={row.get('nom','')} | type={row.get('type_lieu','')} | "
                        f"adresse={row.get('adresse','')} | megots={row.get('megots',0)} | kg={row.get('dechets_kg',0)}"
                    )
                    update_submission_status(row['id'], 'approved')
                    add_admin_audit_log(
                        actor=admin_actor,
                        action="approve_single",
                        submission_id=row.get("id"),
                        before_snapshot=before_snapshot,
                        after_snapshot="status=approved",
                    )
                    
                    # DÃ©clencher l'enrichissement automatique si c'est un acteur engagÃ©
                    if row.get('type_lieu') in actor_types:
                        with st.spinner(f"Recherche d'informations pour {row['association']}..."):
                            auto_enrich_actor(row['id'], row['association'], row['type_lieu'], row['adresse'])
                    
                    st.rerun()
                if r.button("âŒ Refuser", key=f"reject_{row['id']}", width="stretch"):
                    before_snapshot = (
                        f"nom={row.get('nom','')} | type={row.get('type_lieu','')} | "
                        f"adresse={row.get('adresse','')} | megots={row.get('megots',0)} | kg={row.get('dechets_kg',0)}"
                    )
                    update_submission_status(row['id'], 'rejected')
                    add_admin_audit_log(
                        actor=admin_actor,
                        action="reject_single",
                        submission_id=row.get("id"),
                        before_snapshot=before_snapshot,
                        after_snapshot="status=rejected",
                    )
                    st.rerun()

    st.markdown("---")
    st.subheader("Journal d'audit administrateur")
    audit_rows = get_admin_audit_logs(limit=200)
    if audit_rows:
        audit_df = pd.DataFrame(audit_rows)
        if not audit_df.empty:
            display_cols = [c for c in ["created_at", "actor", "action", "submission_id", "before_snapshot", "after_snapshot"] if c in audit_df.columns]
            audit_table = audit_df[display_cols].copy()
            render_paginated_dataframe(audit_table, key_prefix="admin_audit_table", title="Journal d'audit (pagine)", default_page_size=25)
            render_standard_exports(audit_table, basename="admin_audit_log", key_prefix="admin_audit_export")
    else:
        st.caption("Aucune action admin journalisee pour le moment.")

    st.divider()
    st.caption("Export rapide des actions validÃ©es")
    db_approved = get_submissions_by_status('approved')
    if db_approved:
        approved_export_df = pd.DataFrame(db_approved)
        render_standard_exports(approved_export_df, basename="actions_validees", key_prefix="admin_export_approved")










