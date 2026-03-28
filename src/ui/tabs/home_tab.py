import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
from datetime import date, datetime

def render_home_tab(ctx):
    """
    Renders the 'Home' tab (Notre Impact).
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    render_ui_callout = ctx['render_ui_callout']
    i18n_text = ctx['i18n_text']
    all_public_df = ctx['all_public_df']
    get_submissions_by_status = ctx['get_submissions_by_status']
    main_user_email = ctx.get('main_user_email', "Bénévole Anonyme")
    TYPE_LIEU_OPTIONS = ctx['TYPE_LIEU_OPTIONS']
    calculate_trends = ctx['calculate_trends']
    build_interactive_folium_map = ctx['build_interactive_folium_map']

    render_tab_header(
        icon="🏠",
        title_fr="Bienvenue sur CleanMyMap",
        title_en="Welcome to CleanMyMap",
        subtitle_fr="L'espace dédié aux brigades citoyennes pour agir, mesurer et partager leur impact sur l'environnement.",
        subtitle_en="The space for citizen brigades to act, measure, and share their impact on the environment.",
        chips=[i18n_text("Collectif", "Collective"), i18n_text("Impact", "Impact")],
        compact=False,
    )


    render_ui_callout(
        icon="💧",
        title_fr="Parcours recommandé",
        title_en="Recommended flow",
        body_fr="1) Choisissez une rubrique dans le carrousel, 2) lancez votre action, 3) revenez ici pour suivre la carte et les indicateurs en direct.",
        body_en="1) Pick a section in the ribbon, 2) run your action, 3) come back here to follow the map and live indicators.",
        tone="info",
    )

    # --- MISSION CONTROL : IMPACT GLOBAL ---
    calculate_impact = ctx['calculate_impact']
    
    # Calcul des métriques globales aggregées pour l'Impact Collectif
    if not all_public_df.empty:
        total_kg = all_public_df["dechets_kg"].sum()
        total_megots = int(all_public_df["megots"].sum())
        total_ben = int(all_public_df["benevoles"].sum())
        
        # Impact écologique calculé via le service
        impact = calculate_impact(total_megots, total_kg)
        total_eau = impact['eau_litres']
        total_co2 = impact['co2_kg']
    else:
        total_kg, total_megots, total_ben, total_eau, total_co2 = 0.0, 0, 0, 0, 0.0

    # Affichage des métriques style Dashboard Premium
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric(i18n_text("Déchets Retirés", "Waste Removed"), f"{total_kg:.1f} kg", delta=f"{len(all_public_df)} actions")
    with m2:
        st.metric(i18n_text("Mégots Collectés", "Butts Collected"), f"{total_megots:,}".replace(",", " "))
    with m3:
        st.metric(i18n_text("Bénévoles Mobilisés", "Volunteers"), f"{total_ben}")
    with m4:
        st.metric(i18n_text("Eau Préservée", "Water Protected"), f"{total_eau:,} L".replace(",", " "), delta=f"-{total_co2:.1f} kg CO2", delta_color="normal")

    st.markdown("---")

    top_home_col, resume_col = st.columns([2.4, 1.2], gap="large")

    with top_home_col:
        st.subheader(i18n_text("Actions récentes", "Recent actions"))
        recent_df = all_public_df.copy() if not all_public_df.empty else pd.DataFrame()
        if not recent_df.empty:
            date_candidates = ["date", "submitted_at", "created_at"]
            chosen_date_col = next((col for col in date_candidates if col in recent_df.columns), None)
            if chosen_date_col:
                recent_df["_sort_date"] = pd.to_datetime(recent_df[chosen_date_col], errors="coerce")
                recent_df = recent_df.sort_values("_sort_date", ascending=False)
            recent_preview = recent_df.head(6)
            for _, action in recent_preview.iterrows():
                action_name = action.get("nom") or i18n_text("Bénévole", "Volunteer")
                action_place = action.get("adresse") or action.get("type_lieu") or i18n_text("Lieu non précisé", "Unknown place")
                action_kg = float(action.get("dechets_kg") or 0.0)
                action_megots = int(action.get("megots") or 0)
                action_date = str(action.get("date") or action.get("submitted_at") or "")[:10]
                st.markdown(
                    f"- **{action_name}** - {action_place}  \n"
                    f"  {action_date} | {action_kg:.1f} kg | {action_megots} mégots"
                )
        else:
            st.info(i18n_text("Aucune action récente à afficher.", "No recent action yet."))

    with resume_col:
        st.subheader(i18n_text("Reprise rapide", "Quick resume"))
        st.caption(i18n_text("Reprenez votre dernier formulaire sans repartir de zéro.", "Resume your latest form without starting from scratch."))
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
    st.subheader(i18n_text("Carte interactive des actions (temps réel)", "Live interactive action map"))

    home_actions_df = all_public_df.dropna(subset=["lat", "lon"]).copy() if not all_public_df.empty else pd.DataFrame()

    if not home_actions_df.empty:
        home_actions_df = calculate_trends(home_actions_df)
        home_map = build_interactive_folium_map(home_actions_df)
    else:
        st.info(i18n_text("Aucune action géolocalisée à afficher pour le moment.", "No geolocated action to display yet."))
        home_map = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="CartoDB positron")

    st_folium(home_map, width=None, height=520, returned_objects=[], key="home_map_display")
