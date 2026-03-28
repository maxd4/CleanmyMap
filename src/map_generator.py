import folium
from folium.plugins import MarkerCluster

from .config import MAP_CONFIG, TYPE_COLORS
from .map_utils import sanitize_popup_row


class MapGenerator:
    def __init__(self, df):
        self.df = df.dropna(subset=["lat", "lon"]).copy()

    def build(self):
        m = folium.Map(
            location=[MAP_CONFIG["center_lat"], MAP_CONFIG["center_lon"]],
            zoom_start=MAP_CONFIG["zoom"],
            tiles=MAP_CONFIG["tiles"],
        )
        cluster = MarkerCluster().add_to(m)
        for _, r in self.df.iterrows():
            safe = sanitize_popup_row(r.to_dict())
            safe_row = safe.row
            escaped = safe.escaped

            color = "#3498db" if bool(safe_row.get("est_propre", False)) else TYPE_COLORS.get(
                safe_row.get("type_lieu", "Non specifie"),
                "#95a5a6",
            )
            popup = folium.Popup(
                f"<b>{escaped.get('place_name') or 'Lieu'}</b><br>"
                f"Association: {escaped.get('association') or 'Inconnue'}<br>"
                f"Megots: {int(safe_row.get('megots', 0) or 0)}<br>"
                f"Dechets: {float(safe_row.get('dechets_kg', 0) or 0):.1f}kg",
                max_width=320,
            )
            folium.CircleMarker(
                [r["lat"], r["lon"]],
                radius=max(5, min(15, float(safe_row.get("megots", 0) or 0) / 200)),
                color="black",
                weight=1,
                fill=True,
                fill_color=color,
                fill_opacity=0.8,
                popup=popup,
                tooltip=escaped.get("type_lieu") or "Action",
            ).add_to(cluster)
        return m

    def save(self, path=None):
        out = path or MAP_CONFIG["output_file"]
        m = self.build()
        m.save(out)
        return out
