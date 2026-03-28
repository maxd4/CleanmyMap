from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import folium
import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

from src.logging_utils import log_exception

@dataclass(slots=True)
class MapTabContext:
    render_tab_header: Callable[..., None]
    render_ui_callout: Callable[..., None]
    i18n_text: Callable[[str, str], str]
    get_submissions_by_status: Callable[[str], list[dict[str, Any]]]
    all_imported_actions: list[dict[str, Any]]
    get_critical_zones: Callable[[pd.DataFrame], dict[str, dict[str, int]]]
    calculate_trends: Callable[[pd.DataFrame], pd.DataFrame]
    apply_map_preset: Callable[[pd.DataFrame, str], pd.DataFrame]
    map_preset_prefill: str
    streamlit_public_url: str
    build_interactive_folium_map: Callable[[pd.DataFrame], folium.Map]
    track_ux_issue: Callable[..., None]
    normalize_bool_flag: Callable[[Any], bool]


def render_map_tab(ctx: MapTabContext) -> None:
    ctx.render_tab_header(
        icon="\U0001F5FA\ufe0f",
        title_fr="Carte Interactive des Actions",
        title_en="Interactive Action Map",
        subtitle_fr="Explorez les actions validées, les zones sensibles, la chronologie et les couches géographiques en un seul espace.",
        subtitle_en="Explore validated actions, sensitive zones, timeline, and geographic layers in one workspace.",
        chips=[ctx.i18n_text("Cartographie", "Mapping"), ctx.i18n_text("Analyse", "Analytics"), ctx.i18n_text("Temps réel", "Live")],
        compact=True,
    )
    ctx.render_ui_callout(
        icon="🗺️",
        title_fr="Guide visuel (3 étapes)",
        title_en="Visual guide (3 steps)",
        body_fr="1) Choisissez un préréglage. 2) Lisez le résumé et les zones clés. 3) Passez en mission ou partagez la vue.",
        body_en="1) Choose a preset. 2) Read summary and key areas. 3) Switch to mission or share the view.",
        tone="info",
    )

    db_approved = ctx.get_submissions_by_status("approved")
    public_actions = ctx.all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    _ = ctx.get_critical_zones(public_df) if not public_df.empty else {}

    center_lat, center_lon = 48.8566, 2.3522
    map_df = pd.DataFrame()
    if not public_df.empty:
        map_df = public_df.dropna(subset=["lat", "lon"]).copy()
        if not map_df.empty:
            map_df = ctx.calculate_trends(map_df)
            center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()

    preset_items = [
        ("all", ctx.i18n_text("Vue complète", "Full view")),
        ("pollution", ctx.i18n_text("Pollution", "Pollution")),
        ("clean", ctx.i18n_text("Zones propres", "Clean zones")),
        ("partners", ctx.i18n_text("Partenaires engagés", "Engaged partners")),
        ("recent", ctx.i18n_text("Actions récentes (30 j)", "Recent actions (30d)")),
        ("priority", ctx.i18n_text("Zones prioritaires", "Priority zones")),
    ]
    preset_to_label = {pid: label for pid, label in preset_items}
    label_to_preset = {label: pid for pid, label in preset_items}
    default_preset = ctx.map_preset_prefill if ctx.map_preset_prefill in preset_to_label else "all"

    selected_preset_label = st.selectbox(
        ctx.i18n_text("Préréglage de filtrage", "Filter preset"),
        options=[label for _, label in preset_items],
        index=[pid for pid, _ in preset_items].index(default_preset),
        key="map_preset_select",
    )
    selected_preset = label_to_preset[selected_preset_label]
    share_url = f"{ctx.streamlit_public_url}/?tab=map&preset={selected_preset}"
    st.text_input(
        ctx.i18n_text("Lien partageable du préréglage", "Shareable preset link"),
        value=share_url,
        key=f"map_share_url_{selected_preset}",
    )

    filtered_map_df = ctx.apply_map_preset(map_df, selected_preset)
    if filtered_map_df.empty and not map_df.empty:
        st.info(ctx.i18n_text("Aucun résultat pour ce préréglage. Revenez à la vue complète.", "No result for this preset. Switch to full view."))

    try:
        m = ctx.build_interactive_folium_map(filtered_map_df)
    except (RuntimeError, ValueError, TypeError, KeyError) as map_exc:
        log_exception(
            component="ui.map",
            action="build_interactive_folium_map",
            exc=map_exc,
            message="Interactive map rendering failed",
            severity="error",
        )
        ctx.track_ux_issue(
            event_type="broken_action",
            tab_id="map",
            action_name="render_map",
            message=str(map_exc),
        )
        st.error(ctx.i18n_text("Erreur de rendu de la carte interactive.", "Interactive map render error."))
        m = folium.Map(location=[48.8566, 2.3522], zoom_start=11)

    map_ref_df = filtered_map_df if not filtered_map_df.empty else map_df
    st.markdown("### " + ctx.i18n_text("Résumé du préréglage actif", "Active preset insights"))
    i1, i2 = st.columns(2)
    i1.metric(ctx.i18n_text("Actions", "Actions"), int(len(map_ref_df)))
    i2.metric(
        ctx.i18n_text("kg collectés", "kg collected"),
        f"{float(pd.to_numeric(map_ref_df.get('dechets_kg', 0), errors='coerce').fillna(0).sum()):.1f}",
    )
    i3, i4 = st.columns(2)
    i3.metric(
        ctx.i18n_text("Mégots", "Cigarette butts"),
        f"{int(pd.to_numeric(map_ref_df.get('megots', 0), errors='coerce').fillna(0).sum()):,}",
    )
    i4.metric(
        ctx.i18n_text("Zones propres", "Clean zones"),
        int(map_ref_df.get("est_propre", pd.Series(dtype=bool)).map(ctx.normalize_bool_flag).sum()),
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
                    "adresse": ctx.i18n_text("Zone", "Area"),
                    "actions": ctx.i18n_text("Actions", "Actions"),
                    "kg": ctx.i18n_text("kg", "kg"),
                    "megots": ctx.i18n_text("Mégots", "Butts"),
                }
            ),
            hide_index=True,
            width="stretch",
        )

    view_mode = st.radio(
        "Mode de visualisation" if st.session_state.lang == "fr" else "Visualization Mode",
        options=["2D (Standard)", "3D (Immersif)"],
        horizontal=False,
        help="Le mode 3D nécessite plus de ressources mais offre une vue spectaculaire des hotspots." if st.session_state.lang == "fr" else "3D mode requires more resources but offers a spectacular view of hotspots.",
    )

    if "3D" in view_mode:
        import pydeck as pdk

        st.info(
            "💡 **Montagnes de mégots** : la hauteur des colonnes représente la densité de pollution cumulée."
            if st.session_state.lang == "fr"
            else "💡 **Cigarette Butt Mountains**: Column height represents cumulative pollution density."
        )
        if map_ref_df.empty:
            st.warning(ctx.i18n_text("Aucune donnée géolocalisée pour la vue 3D.", "No geolocated data for 3D view."))
            st_folium(m, width="stretch", height=520, returned_objects=[])
        else:
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
                get_fill_color="[255, (1 - value/100) * 255, 0, 180]",
                color_range=[
                    [16, 185, 129],
                    [59, 130, 246],
                    [249, 115, 22],
                    [239, 68, 68],
                ],
            )
            view_state = pdk.ViewState(
                latitude=center_lat,
                longitude=center_lon,
                zoom=12,
                pitch=45,
                bearing=0,
            )
            deck = pdk.Deck(
                layers=[layer_3d],
                initial_view_state=view_state,
                map_style="mapbox://styles/mapbox/dark-v10",
                tooltip={
                    "html": "<b>Densité :</b> {elevationValue} unités" if st.session_state.lang == "fr" else "<b>Density:</b> {elevationValue} units",
                    "style": {"color": "white", "backgroundColor": "#10b981"},
                },
            )
            st.pydeck_chart(deck, use_container_width=True)
    else:
        st_folium(m, width="stretch", height=520, returned_objects=[])
