from __future__ import annotations
import os
import streamlit as st
import pandas as pd
from datetime import date, datetime

# --- CORE CONFIG & LOGGING ---
import src.database as db
from src.config import GOOGLE_SHEET_URL, IMPACT_CONSTANTS
from src.utils import normalize_bool_flag, _txt
from src.logging_utils import log_exception
from src.text_utils import repair_mojibake_text, patch_streamlit_text_api, sanitize_dataframe_text
from src.ui.design_system import inject_base_css, inject_visual_polish
from src.ui.map_builder import build_interactive_folium_map
from src.ui.i18n import t, i18n_text
from src.ui.components.common import render_tab_header, render_ui_callout

# --- SERVICES ---
from src.services.admin_auth import AdminAuthPolicy
from src.services.impact_reporting import (
    build_public_pdf as build_public_pdf_service,
    get_critical_zones, get_eco_districts, get_eco_quartiers,
    build_certificat_eco_quartier, build_certificat_territorial
)
from src.services.community_validation import build_pending_public_previews
from src.services.geo_service import geocode_and_resolve, save_uploaded_image, parse_coords
from src.services.environment_service import check_flood_risk, get_osmnx_graph, add_elevations_to_graph, calculate_flow_sinks
from src.services.data_service import load_public_data_bundle, apply_map_preset
from src.services.security_service import get_current_user_email, get_session_identity
from src.report_generator import PDFReport
from src.security_utils import sanitize_html_text

# --- MAP UTILS RE-EXPORTS (FACADE) ---
from src.map_utils import (
    calculate_scores, get_marker_style, create_premium_popup,
    calculate_trends, get_heatmap_data, generate_ai_route,
    calculate_impact, evaluate_badges, compute_score_series,
    calculate_infrastructure_gap
)

# --- TAB IMPORTS ---
from src.ui.tabs.declaration_tab import render_declaration_tab
from src.ui.tabs.community_tab import render_community_tab
from src.ui.tabs.sandbox_tab import render_sandbox_tab
from src.ui.tabs.history_tab import render_history_tab
from src.ui.tabs.route_tab import render_route_tab
from src.ui.tabs.recycling_tab import render_recycling_tab
from src.ui.tabs.climate_tab import render_climate_tab
from src.ui.tabs.elus_tab import render_elus_tab
from src.ui.tabs.kit_tab import render_kit_tab
from src.ui.tabs.home_tab import render_home_tab
from src.ui.tabs.trash_spotter_tab import render_trash_spotter_tab
from src.ui.tabs.gamification_tab import render_gamification_tab
from src.ui.tabs.guide_tab import render_guide_tab
from src.ui.tabs.actors_tab import render_actors_tab
from src.ui.tabs.weather_tab import render_weather_tab
from src.ui.tabs.compare_tab import render_compare_tab
from src.ui.tabs.map_tab import render_map_tab
from src.ui.tabs.admin_tab import render_admin_tab
from src.ui.tabs.report_tab import render_report_tab
from src.ui import AdminTabContext, MapTabContext, ReportTabContext

# --- INITIALIZATION ---
db.init_db()
patch_streamlit_text_api(st)

if "lang" not in st.session_state: st.session_state.lang = "fr"
if "theme_mode" not in st.session_state: st.session_state.theme_mode = "light"

st.set_page_config(page_title=t("title"), page_icon="🗺️", layout="wide")
inject_base_css()
inject_visual_polish(st.session_state.theme_mode)

# --- IDENTITY & DATA LOADING ---
identity = get_session_identity()
all_imported_actions, all_public_df = load_public_data_bundle(
    GOOGLE_SHEET_URL, 
    parse_coords_fn=parse_coords, 
    sanitize_df_fn=sanitize_dataframe_text
)
ST_GLOBAL_URL = os.getenv("STREAMLIT_PUBLIC_URL", "http://localhost:8501")

# --- NAVIGATION DEBFINITION ---
tab_specs = [
    {"id": "home", "key": "tab_home"}, {"id": "declaration", "key": "tab_declaration"},
    {"id": "map", "key": "tab_map"}, {"id": "trash_spotter", "key": "tab_trash_spotter"},
    {"id": "community", "key": "tab_community"}, {"id": "gamification", "key": "tab_gamification"},
    {"id": "pdf", "key": "tab_pdf"}, {"id": "history", "key": "tab_history"},
    {"id": "route", "key": "tab_route"}, {"id": "recycling", "key": "tab_recycling"},
    {"id": "climate", "key": "tab_climate"}, {"id": "weather", "key": "tab_weather"},
    {"id": "compare", "key": "tab_compare"}, {"id": "kit", "key": "tab_kit"},
    {"id": "guide", "key": "tab_guide"}, {"id": "actors", "key": "tab_actors"},
    {"id": "elus", "key": "tab_elus"}, {"id": "sandbox", "key": "tab_sandbox"},
    {"id": "admin", "key": "tab_admin"}
]

active_tab_id = st.sidebar.selectbox(
    "Navigation", 
    options=[s["id"] for s in tab_specs], 
    format_func=lambda x: t(next(s["key"] for s in tab_specs if s["id"] == x))
)

# --- CONTEXT ASSEMBLY ---
ctx = {
    "render_tab_header": render_tab_header, "render_ui_callout": render_ui_callout,
    "i18n_text": i18n_text, "build_interactive_folium_map": build_interactive_folium_map,
    "IMPACT_CONSTANTS": IMPACT_CONSTANTS, "GOOGLE_SHEET_URL": GOOGLE_SHEET_URL,
    "STREAMLIT_PUBLIC_URL": ST_GLOBAL_URL, "TYPE_LIEU_OPTIONS": ["Rue/Trottoir", "Parc/Foret", "Plage", "Riviere/Lac", "Quai/Pont/Port", "Scolaire", "Autre"],
    "calculate_trends": calculate_trends, "calculate_impact": calculate_impact,
    "evaluate_badges": evaluate_badges, "get_critical_zones": get_critical_zones,
    "get_submissions_by_status": db.get_submissions_by_status, "get_active_spots": db.get_active_spots,
    "add_spot": db.add_spot, "update_spot_status": db.update_spot_status,
    "get_leaderboard": db.get_leaderboard, "get_user_impact_stats": db.get_user_impact_stats,
    "geocode_address": geocode_and_resolve, "save_uploaded_image": save_uploaded_image,
    "sanitize_html_text": sanitize_html_text, "log_exception": log_exception, "_txt": _txt,
    "PDFReport": PDFReport, "get_eco_districts": get_eco_districts, "get_eco_quartiers": get_eco_quartiers,
    "build_certificat_eco_quartier": build_certificat_eco_quartier, "build_certificat_territorial": build_certificat_territorial,
    "add_admin_audit_log": db.add_admin_audit_log, "normalize_bool_flag": normalize_bool_flag,
    "all_imported_actions": all_imported_actions, "all_public_df": all_public_df,
    "main_user_email": identity["email"] or "Benevole Anonyme", "identity": identity,
    "get_events_for_date": db.get_events_for_date, "mark_event_reminder": db.mark_event_reminder,
    "add_message": db.add_message, "get_community_events": db.get_community_events,
    "get_event_rsvp_summary": db.get_event_rsvp_summary, "upsert_event_rsvp": db.upsert_event_rsvp,
    "build_pending_public_previews": build_pending_public_previews, "add_mission_validation": db.add_mission_validation,
    "get_mission_validation_summary": db.get_mission_validation_summary, "add_community_event": db.add_community_event,
}

tab_renderers = {
    "home": render_home_tab, "map": render_map_tab, "declaration": render_declaration_tab,
    "trash_spotter": render_trash_spotter_tab, "gamification": render_gamification_tab,
    "community": render_community_tab, "sandbox": render_sandbox_tab, "pdf": render_report_tab,
    "history": render_history_tab, "route": render_route_tab, "recycling": render_recycling_tab,
    "climate": render_climate_tab, "elus": render_elus_tab, "kit": render_kit_tab,
    "guide": render_guide_tab, "actors": render_actors_tab, "weather": render_weather_tab,
    "compare": render_compare_tab, "admin": render_admin_tab,
}

# --- RENDERING ---
if active_tab_id in tab_renderers:
    renderer = tab_renderers[active_tab_id]
    if active_tab_id == "map":
        renderer(MapTabContext(
            render_tab_header=render_tab_header, render_ui_callout=render_ui_callout,
            i18n_text=i18n_text, get_submissions_by_status=db.get_submissions_by_status,
            all_imported_actions=all_imported_actions, get_critical_zones=get_critical_zones,
            calculate_trends=calculate_trends, apply_map_preset=apply_map_preset,
            map_preset_prefill="", streamlit_public_url=ST_GLOBAL_URL,
            build_interactive_folium_map=build_interactive_folium_map,
            track_ux_issue=getattr(st, "track_ux_issue", lambda *args: None),
            normalize_bool_flag=normalize_bool_flag
        ))
    elif active_tab_id == "admin":
        # Pass real secrets and allowed emails from environment if possible
        allowed_admin_emails = set(filter(None, os.getenv("CLEANMYMAP_ADMIN_EMAILS", "").split(",")))
        renderer(AdminTabContext(
            render_tab_header=render_tab_header, i18n_text=i18n_text,
            track_ux_issue=getattr(st, "track_ux_issue", lambda *args: None),
            google_user_email=get_current_user_email, admin_allowed_emails=allowed_admin_emails,
            admin_require_allowlist=bool(allowed_admin_emails), 
            admin_secret_code=os.getenv("CLEANMYMAP_ADMIN_SECRET_CODE", "ADMIN"),
            admin_login_max_attempts=int(os.getenv("CLEANMYMAP_AUTH_MAX_ATTEMPTS", "5")), 
            admin_auth_policy=AdminAuthPolicy(max_attempts=5, lockout_minutes=15),
            admin_lockout_minutes=15, add_admin_audit_log=db.add_admin_audit_log,
            get_osmnx_graph=get_osmnx_graph, add_elevations_to_graph=add_elevations_to_graph,
            calculate_flow_sinks=calculate_flow_sinks, auto_enrich_actor=lambda s,n,t,l: True,
            check_flood_risk=check_flood_risk, all_submissions_df=all_public_df, pdf_report_cls=PDFReport
        ))
    elif active_tab_id == "pdf":
         renderer(ReportTabContext(
             render_tab_header=render_tab_header, i18n_text=i18n_text,
             all_public_df=all_public_df, IMPACT_CONSTANTS=IMPACT_CONSTANTS,
             build_public_pdf=build_public_pdf_service, sanitize_html_text=sanitize_html_text
         ))
    else:
        renderer(ctx)

st.markdown("---")
