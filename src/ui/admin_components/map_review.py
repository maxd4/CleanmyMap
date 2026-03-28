from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable

import folium
import pandas as pd
import streamlit as st
from branca.element import MacroElement, Template
from folium.plugins import TimestampedGeoJson
from streamlit_folium import st_folium

from src.repositories.submissions_repository import fetch_approved_submissions
from src.security_utils import sanitize_html_multiline, sanitize_html_text
from src.services.impact_reporting import get_critical_zones, normalize_bool_flag


@dataclass(slots=True)
class AdminMapReviewContext:
    i18n_text: Callable[[str, str], str]
    get_osmnx_graph: Callable[..., Any]
    add_elevations_to_graph: Callable[..., Any]
    calculate_flow_sinks: Callable[..., list[dict[str, Any]]]


def render_admin_map_review(ctx: AdminMapReviewContext) -> pd.DataFrame:
    st.subheader("Carte publique (actions validées)")
    approved_records = fetch_approved_submissions()
    approved_df = pd.DataFrame(approved_records)

    if approved_df.empty:
        st.info("Aucune action validée pour le moment.")
        return approved_df

    critical_zones = get_critical_zones(approved_df)
    map_df = approved_df.dropna(subset=["lat", "lon"]).copy()

    if not map_df.empty:
        center_lat, center_lon = map_df["lat"].mean(), map_df["lon"].mean()
        m_admin = folium.Map(location=[center_lat, center_lon], zoom_start=11, tiles=None)
        folium.TileLayer("OpenStreetMap", name="Fond Clair (Défaut)", show=True).add_to(m_admin)
        folium.TileLayer(
            tiles="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            name="Fond Sombre",
            attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            show=False,
        ).add_to(m_admin)
        folium.TileLayer(
            tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            name="Vue Satellite",
            attr="Tiles &copy; Esri",
            show=False,
        ).add_to(m_admin)

        features: list[dict[str, Any]] = []
        for row in map_df.itertuples(index=False):
            row_data = row._asdict()
            is_critical = row_data.get("adresse", "") in critical_zones
            is_clean = normalize_bool_flag(row_data.get("est_propre", False))
            is_business = row_data.get("type_lieu") == "Établissement Engagé (Label)"

            icon = "circle"
            if is_critical:
                color = "red"
                radius = 15
            elif is_business:
                color = "#FFD700"
                radius = 18
                icon = "star"
            elif is_clean:
                color = "green"
                radius = 8
            else:
                color = "blue"
                radius = 10

            safe_type = sanitize_html_text(row_data.get("type_lieu", "Lieu"), max_len=80)
            safe_asso = sanitize_html_text(row_data.get("association", "Inconnu"), max_len=120)
            safe_comment = sanitize_html_multiline(row_data.get("commentaire", ""), max_len=220)
            megots_val = int(pd.to_numeric(row_data.get("megots", 0), errors="coerce") or 0)
            dechets_val = float(pd.to_numeric(row_data.get("dechets_kg", 0), errors="coerce") or 0.0)

            popup_html = (
                f"<b>{safe_type}</b><br>Asso: {safe_asso}<br>"
                f"Mégots: {megots_val}<br>Déchets: {dechets_val:.1f} kg<br>"
                f"Statut: {'✨ Propre' if is_clean else '🗑️ Nettoyé'}"
            )
            if is_business:
                popup_html = f"<b>🎖️ {safe_type}</b><br>Nom: {safe_asso}<br>{safe_comment}"

            raw_date = row_data.get("date", "")
            if not raw_date or str(raw_date).lower() in {"nan", "none", ""}:
                submitted_at = str(row_data.get("submitted_at", "") or "")
                raw_date = submitted_at.split("T", 1)[0] if submitted_at else datetime.now().strftime("%Y-%m-%d")

            features.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [row_data["lon"], row_data["lat"]]},
                    "properties": {
                        "time": raw_date,
                        "popup": popup_html,
                        "icon": icon,
                        "iconstyle": {"color": color, "fillColor": color, "fillOpacity": 0.6, "radius": radius},
                        "style": {"color": color},
                    },
                }
            )

        timeline_admin_layer = None
        if features:
            timeline_admin_layer = TimestampedGeoJson(
                {"type": "FeatureCollection", "features": features},
                period="P1D",
                add_last_point=True,
                auto_play=False,
                loop=False,
                max_speed=1,
                loop_button=True,
                date_options="YYYY-MM-DD",
                time_slider_drag_update=True,
            )
            timeline_admin_layer.add_to(m_admin)

        layer_control_admin = folium.LayerControl(position="topright", collapsed=True)
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
                        "{ctx.i18n_text('🕒 Défilement chronologique', '🕒 Chronological playback')}"
                    );
                }}
                {{% endmacro %}}
                """
            )
            m_admin.add_child(timeline_admin_toggle)

        show_flow_ai = st.checkbox("Afficher l'IA de flux (entonnoirs à pollution)", value=False)
        if show_flow_ai:
            with st.spinner("analyse des pentes et du ruissellement en cours..."):
                flow_graph = ctx.get_osmnx_graph(center_lat, center_lon, 1000)
                elevated_graph = ctx.add_elevations_to_graph(flow_graph)
                sinks = ctx.calculate_flow_sinks(elevated_graph, map_df)
                for sink in sinks:
                    sink_type = sanitize_html_text(sink.get("type", "Zone"), max_len=80)
                    sink_desc = sanitize_html_text(sink.get("description", ""), max_len=200)
                    folium.Marker(
                        location=[sink["lat"], sink["lon"]],
                        icon=folium.Icon(color="purple", icon="bullseye", prefix="fa"),
                        popup=f"<b>{sink_type}</b><br>{sink_desc}",
                    ).add_to(m_admin)
            st.success(f"{len(sinks)} entonnoirs détectés")

        st_folium(m_admin, width=900, height=500, returned_objects=[])

    st.dataframe(
        approved_df[["date", "type_lieu", "adresse", "benevoles", "megots", "dechets_kg"]],
        width="stretch",
        hide_index=True,
    )
    return approved_df
