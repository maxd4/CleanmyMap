import folium
from folium.plugins import MarkerCluster
from .config import MAP_CONFIG, TYPE_COLORS


class MapGenerator:
    def __init__(self, df):
        self.df = df.dropna(subset=['lat', 'lon']).copy()

    def build(self):
        m = folium.Map(
            location=[MAP_CONFIG['center_lat'], MAP_CONFIG['center_lon']],
            zoom_start=MAP_CONFIG['zoom'],
            tiles=MAP_CONFIG['tiles'],
        )
        cluster = MarkerCluster().add_to(m)
        for _, r in self.df.iterrows():
            color = '#3498db' if bool(r.get('est_propre', False)) else TYPE_COLORS.get(r.get('type_lieu', 'Non spécifié'), '#95a5a6')
            popup = folium.Popup(
                f"<b>{r.get('lieu_complet', 'Lieu')}</b><br>"
                f"Association: {r.get('association', 'Inconnue')}<br>"
                f"Mégots: {int(r.get('megots', 0))}<br>"
                f"Déchets: {float(r.get('dechets_kg', 0)):.1f}kg",
                max_width=320,
            )
            folium.CircleMarker(
                [r['lat'], r['lon']],
                radius=max(5, min(15, float(r.get('megots', 0)) / 200)),
                color='black',
                weight=1,
                fill=True,
                fill_color=color,
                fill_opacity=0.8,
                popup=popup,
                tooltip=str(r.get('type_lieu', 'Action')),
            ).add_to(cluster)
        return m

    def save(self, path=None):
        out = path or MAP_CONFIG['output_file']
        m = self.build()
        m.save(out)
        return out
