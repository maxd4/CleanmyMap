import streamlit as st
import pandas as pd

def render_route_tab(ctx):
    """
    Renders the 'Route' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    all_imported_actions = ctx['all_imported_actions']
    get_submissions_by_status = ctx['get_submissions_by_status']
    calculate_trends = ctx['calculate_trends']
    get_critical_zones = ctx['get_critical_zones']
    geocode_and_resolve = ctx['geocode_and_resolve']

    render_tab_header(
        icon="🗺️",
        title_fr="Itinéraire de nettoyage",
        title_en="Cleanup Route Generator",
        subtitle_fr="Planifiez un parcours stratégique selon l'historique de pollution et vos ressources terrain.",
        subtitle_en="Plan a strategic route based on pollution history and field resources.",
        chips=[i18n_text("IA", "AI"), i18n_text("Parcours", "Routing")],
        compact=True,
    )


    route_source_df = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))
    route_source_df = route_source_df.dropna(subset=["lat", "lon"]) if not route_source_df.empty else pd.DataFrame()

    if route_source_df.empty:
        st.warning("Aucune donnee disponible pour optimiser un trajet.")
    else:
        route_source_df = calculate_trends(route_source_df.copy())
        st.markdown("### 💧 Recommandation basée sur l'historique")
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
                "Point de départ (adresse ou GPS, optionnel)",
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
            else:
                st.success(f"Point de départ validé : {center_input}")
                # AI Routing logic would go here
                st.info("L'IA analyse les zones critiques à proximité...")
