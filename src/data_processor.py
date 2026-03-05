import pandas as pd
from .config import COLUMN_KEYWORDS
from .geocoder import geocode_location


class DataProcessor:
    def __init__(self, raw_df: pd.DataFrame):
        self.raw_df = raw_df.copy()

    def _find_col(self, key: str):
        keywords = COLUMN_KEYWORDS[key]
        for col in self.raw_df.columns:
            low = col.lower()
            if any(k in low for k in keywords):
                return col
        return None

    def process(self) -> pd.DataFrame:
        cols = {k: self._find_col(k) for k in COLUMN_KEYWORDS}
        df = pd.DataFrame()

        if cols['date']:
            df['date'] = pd.to_datetime(self.raw_df[cols['date']], errors='coerce', dayfirst=True)
        else:
            df['date'] = pd.NaT

        source_lieu = self.raw_df[cols['gps']] if cols['gps'] else ''
        df['lieu_complet'] = source_lieu.astype(str)

        coords = df['lieu_complet'].apply(geocode_location)
        df['lat'] = [c[0] for c in coords]
        df['lon'] = [c[1] for c in coords]

        df['type_lieu'] = self.raw_df[cols['type']].astype(str) if cols['type'] else 'Non spécifié'
        df['association'] = self.raw_df[cols['association']].astype(str) if cols['association'] else 'Indépendant'
        df['ville'] = self.raw_df[cols['ville']].astype(str) if cols['ville'] else 'Paris'

        df['megots'] = pd.to_numeric(self.raw_df[cols['megots']], errors='coerce').fillna(0) if cols['megots'] else 0
        df['dechets_kg'] = pd.to_numeric(self.raw_df[cols['poids']], errors='coerce').fillna(0) if cols['poids'] else 0
        df['temps_min'] = pd.to_numeric(self.raw_df[cols['temps']], errors='coerce').fillna(1).replace(0, 1) if cols['temps'] else 1
        df['nb_benevoles'] = pd.to_numeric(self.raw_df[cols['benevoles']], errors='coerce').fillna(1).replace(0, 1) if cols['benevoles'] else 1

        df['est_propre'] = False
        if cols['propre']:
            propres = self.raw_df[cols['propre']].fillna('').astype(str).str.strip()
            df['est_propre'] = propres.ne('')

        heures_ben = (df['temps_min'] / 60) * df['nb_benevoles'].replace(0, 1)
        df['megots_par_heure_ben'] = df['megots'] / heures_ben
        df['kg_par_heure_ben'] = df['dechets_kg'] / heures_ben

        return df.dropna(subset=['date']).sort_values('date').reset_index(drop=True)
