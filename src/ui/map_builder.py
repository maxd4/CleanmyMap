"""
Map assembly and rendering logic for CleanMyMap.
"""
import streamlit as st
import folium
import pandas as pd
from datetime import datetime
from branca.element import Template, MacroElement
from folium.plugins import TimestampedGeoJson, MarkerCluster, HeatMap

from src.map_utils import (
    calculate_scores,
    get_marker_style,
    create_premium_popup,
    detect_osm_type,
    fetch_osm_geometry,
    MAP_COLORS,
    get_heatmap_data,
    calculate_impact,
    sanitize_popup_row,
    calculate_infrastructure_gap,
    get_paris_bins
)

def build_interactive_folium_map(
    map_df,
    center_lat=48.8566,
    center_lon=2.3522,
    zoom_start=12,
    show_heatmap=False,
    show_osm_layers=True,
    show_time_slider=False,
    cluster_markers=True,
    show_official_bins=False,
):
    """
    Construit et retourne un objet folium.Map enrichi.
    """
    # 1. Initialisation de la carte
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=zoom_start,
        tiles=None,  # On gère les tuiles manuellement pour le switch clair/sombre
        control_scale=True,
    )

    # 2. Gestion du thème (via session_state)
    theme = st.session_state.get("theme_mode", "light")
    if theme == "dark":
        folium.TileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            name="CartoDB Dark Matter",
            attr="&copy; OpenStreetMap contributors &copy; CARTO",
        ).add_to(m)
    else:
        folium.TileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            name="CartoDB Voyager",
            attr="&copy; OpenStreetMap contributors &copy; CARTO",
        ).add_to(m)

    # 3. Récupération des corbeilles si option activée
    official_bins = []
    if show_official_bins:
        official_bins = get_paris_bins()
        for b in official_bins:
            folium.CircleMarker(
                location=[b["lat"], b["lon"]],
                radius=3,
                color="#7f8c8d",
                fill=True,
                fill_opacity=0.4,
                popup=f"Corbeille ({b['type']})",
            ).add_to(m)

    # 4. Couche HeatMap (Pollution)
    if show_heatmap:
        heat_data = get_heatmap_data(map_df)
        if heat_data:
            HeatMap(
                heat_data,
                name="Zones de Pollution",
                min_opacity=0.3,
                radius=25,
                blur=15,
                gradient={0.4: "blue", 0.65: "lime", 1: "red"},
            ).add_to(m)

    # 5. Couches OSM (Géométries parcs/rues)
    if show_osm_layers:
        osm_group = folium.FeatureGroup(name="Détails Terrain (OSM)")
        for _, row in map_df.iterrows():
            if not row.get("lat") or not row.get("lon"):
                continue
            
            osm_type = detect_osm_type(row)
            if osm_type in ["park", "street"]:
                # Distance cible basée sur la durée de l'action pour les rues
                target_dist = (float(row.get("temps_min", 60)) / 60.0) * 1000.0 if osm_type == "street" else None
                geom, final_type = fetch_osm_geometry(
                    row["lat"], row["lon"], osm_type, 
                    target_distance_m=target_dist, 
                    place_hint=str(row.get("adresse", ""))
                )
                
                if geom:
                    score_data = calculate_scores(row)
                    color, _, _ = get_marker_style(row, score_data)
                    
                    if final_type == "park":
                        folium.GeoJson(
                            geom,
                            style_function=lambda x, c=color: {
                                "fillColor": c,
                                "color": c,
                                "weight": 2,
                                "fillOpacity": 0.4,
                            },
                            tooltip=f"Zone traitée: {row.get('adresse', 'Parc')}",
                        ).add_to(osm_group)
                    else: # street
                        folium.GeoJson(
                            geom,
                            style_function=lambda x, c=color: {
                                "color": c,
                                "weight": 5,
                                "opacity": 0.7,
                            },
                            tooltip=f"Rue nettoyée: {row.get('adresse', 'Rue')}",
                        ).add_to(osm_group)
        osm_group.add_to(m)

    # 6. Marqueurs Individuels (Cluster ou Simple)
    marker_target = MarkerCluster(name="Signalements") if cluster_markers else m
    
    for _, row in map_df.iterrows():
        if not row.get("lat") or not row.get("lon"):
            continue
            
        score_data = calculate_scores(row)
        color, radius, icon_type = get_marker_style(row, score_data)
        
        # Alerte infrastructure gap
        gap_alert = ""
        is_gap, dist = calculate_infrastructure_gap(row["lat"], row["lon"], official_bins)
        if is_gap:
            gap_alert = f"Attention: Aucune poubelle a moins de {int(dist)}m !"

        popup_html = create_premium_popup(row, score_data, gap_alert=gap_alert)
        
        folium.Marker(
            location=[row["lat"], row["lon"]],
            icon=folium.Icon(color="white", icon_color=color, icon=icon_type, prefix="fa"),
            popup=folium.Popup(popup_html, max_width=300),
            tooltip=f"{row.get('association', 'Action')} - {row.get('date', '')}",
        ).add_to(marker_target)

    if cluster_markers:
        marker_target.add_to(m)

    # 7. TimeSlider (Optionnel)
    if show_time_slider:
        features = []
        for _, row in map_df.iterrows():
            if not row.get("lat") or not row.get("lon") or pd.isna(row.get("date")):
                continue
            
            score_data = calculate_scores(row)
            color, _, _ = get_marker_style(row, score_data)
            
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row["lon"], row["lat"]]},
                "properties": {
                    "time": pd.to_datetime(row["date"]).isoformat(),
                    "style": {"color": color, "fillColor": color, "radius": 10},
                    "icon": icon_type,
                }
            })
            
        if features:
            TimestampedGeoJson(
                {"type": "FeatureCollection", "features": features},
                period="P1M",
                add_last_point=True,
                auto_play=False,
                loop=False,
                max_speed=1,
                loop_button=True,
                date_options="YYYY-MM",
                time_slider_drag_update=True,
            ).add_to(m)

    # 8. Légende Mobile/Premium (MacroElement)
    legend_html = f"""
    {{% macro html(this, kwargs) %}}
    <div style="
        position: fixed; 
        bottom: 50px; left: 50px; width: 180px; height: 160px; 
        background-color: white; border:2px solid grey; z-index:9999; font-size:12px;
        padding: 10px; border-radius: 10px; opacity: 0.9;
        font-family: 'Outfit', sans-serif;
    ">
        <div style="font-weight: 800; margin-bottom: 8px; text-transform: uppercase; font-size: 10px; color: #64748b;">Legende</div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <i class="fa fa-circle" style="color:{MAP_COLORS['critical']}; margin-right: 8px;"></i> Point Noir (>80)
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <i class="fa fa-circle" style="color:{MAP_COLORS['medium']}; margin-right: 8px;"></i> Zone Insalubre (50-80)
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <i class="fa fa-circle" style="color:{MAP_COLORS['low']}; margin-right: 8px;"></i> Passage Recor (0-50)
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <i class="fa fa-leaf" style="color:{MAP_COLORS['clean']}; margin-right: 8px;"></i> Zone Propre
        </div>
        <div style="display: flex; align-items: center;">
            <i class="fa fa-star" style="color:{MAP_COLORS['business']}; margin-right: 8px;"></i> Établissement Engage
        </div>
    </div>
    {{% endmacro %}}
    """
    macro = MacroElement()
    macro._template = Template(legend_html)
    m.get_root().add_child(macro)

    folium.LayerControl().add_to(m)
    return m
