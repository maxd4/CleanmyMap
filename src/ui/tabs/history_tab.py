import streamlit as st
import pandas as pd
from datetime import date, timedelta

def render_history_tab(ctx):
    """
    Renders the 'History' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    get_submissions_by_status = ctx['get_submissions_by_status']
    all_imported_actions = ctx['all_imported_actions']
    render_historical_rankings = ctx['render_historical_rankings']

    render_tab_header(
        icon="📜",
        title_fr="Mes Actions",
        title_en="My Actions",
        subtitle_fr="Retrouvez l'historique complet des nettoyages et l'impact de toutes les brigades.",
        subtitle_en="Browse the full cleanup history and the impact of all brigades.",
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
