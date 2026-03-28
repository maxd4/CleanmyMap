import os
from datetime import date, datetime
import pandas as pd
import streamlit as st
from src.fixtures.test_data import TEST_DATA
from src.services.sheet_actions import load_sheet_actions as load_sheet_actions_service
from src.database import get_submissions_by_status
from src.utils import normalize_bool_flag
from src.logging_utils import log_perf

def load_sheet_actions(sheet_url: str, parse_coords_fn, sanitize_df_fn):
    """
    Charge les actions du Google Sheet via le service dédié.
    """
    db_approved = get_submissions_by_status('approved')
    try:
        actions = load_sheet_actions_service(
            sheet_url=sheet_url,
            approved_submissions=db_approved,
            parse_coords=parse_coords_fn,
            sanitize_dataframe_text=sanitize_df_fn,
        )
        if not actions:
            from src.database import add_ux_event
            add_ux_event(
                event_type="broken_action",
                action_name="load_sheet_actions",
                message="Google Sheet import returned 0 rows (possible mapping failure or empty sheet)",
                tab_id="home"
            )
        return actions
    except Exception as e:
        from src.database import add_ux_event
        add_ux_event(
            event_type="broken_action",
            action_name="load_sheet_actions",
            message=f"Google Sheet import CRASHED: {str(e)}",
            tab_id="home"
        )
        return []


@st.cache_data(ttl=300, show_spinner="Chargement des données collectives...")
def load_public_data_bundle(sheet_url: str, parse_coords_fn, sanitize_df_fn):

    """
    Charge l'ensemble des données publiques (BDD + Google Sheets + Demo).
    """
    db_approved_local = get_submissions_by_status('approved')
    sheet_actions_local = load_sheet_actions(sheet_url, parse_coords_fn, sanitize_df_fn)
    
    # Par défaut, on inclut les données de démo si la variable n'est pas explicitement à 0
    raw_demo = os.getenv("CLEANMYMAP_INCLUDE_DEMO_DATA", "1").strip().lower()
    include_demo = raw_demo in {"1", "true", "yes", "on"}
    
    imported_actions = sheet_actions_local + (TEST_DATA if include_demo else [])
    
    # Fusion et Normalisation
    public_df = pd.DataFrame(db_approved_local + imported_actions)
    public_df = sanitize_df_fn(public_df)

    if public_df.empty:
        return imported_actions, public_df

    # Force le typage numérique pour les calculs d'impact (évite les erreurs de sommation)
    numeric_cols = ["dechets_kg", "megots", "benevoles", "nb_benevoles", "temps_min"]
    for col in numeric_cols:
        if col in public_df.columns:
            public_df[col] = pd.to_numeric(public_df[col], errors="coerce").fillna(0)

    # Unification des colonnes de bénévoles (historique vs nouveau schéma)
    if "benevoles" in public_df.columns and "nb_benevoles" in public_df.columns:
        # Fusionne les deux si les deux existent (priorité benevoles si non-nul)
        public_df["benevoles"] = public_df["benevoles"].replace(0, pd.NA).fillna(public_df["nb_benevoles"]).fillna(0)
        public_df["nb_benevoles"] = public_df["benevoles"]
    elif "nb_benevoles" in public_df.columns:
        public_df["benevoles"] = public_df["nb_benevoles"]
    elif "benevoles" in public_df.columns:
        public_df["nb_benevoles"] = public_df["benevoles"]

    if "est_propre" in public_df.columns:
        public_df["est_propre"] = public_df["est_propre"].map(normalize_bool_flag)
            
    return imported_actions, public_df


def apply_map_preset(map_df: pd.DataFrame, preset_id: str) -> pd.DataFrame:
    """
    Filtre le DataFrame de la carte selon un preset UI prédéfini.
    """
    if map_df.empty:
        return map_df

    started_at = datetime.now()
    
    clean_col = map_df["est_propre"] if "est_propre" in map_df.columns else pd.Series([False] * len(map_df), index=map_df.index)
    clean_col = clean_col.map(normalize_bool_flag)
    
    type_col = map_df["type_lieu"] if "type_lieu" in map_df.columns else pd.Series([""] * len(map_df), index=map_df.index)
    type_col = type_col.fillna("").astype(str)
    
    date_col = pd.to_datetime(map_df.get("date"), errors="coerce")
    if date_col.isna().all() and "submitted_at" in map_df.columns:
        date_col = pd.to_datetime(map_df.get("submitted_at"), errors="coerce")

    if preset_id == "pollution":
        result = map_df[(~clean_col) & (type_col != "Établissement Engagé (Label)")].copy()
    elif preset_id == "clean":
        result = map_df[clean_col].copy()
    elif preset_id == "partners":
        result = map_df[type_col.astype(str).str.contains("Engag", case=False, na=False)].copy()
    elif preset_id == "recent":
        cutoff = pd.Timestamp(date.today()) - pd.Timedelta(days=30)
        recent_mask = date_col >= cutoff
        result = map_df[recent_mask.fillna(False)].copy()
    elif preset_id == "priority":
        # Note: Mixing metrics or complex logic could go here
        result = map_df
    else:
        result = map_df

    log_perf(
        "data_service",
        "apply_map_preset",
        (datetime.now() - started_at).total_seconds() * 1000.0,
        {"preset_id": preset_id, "rows_in": int(len(map_df)), "rows_out": int(len(result))},
    )
    return result
