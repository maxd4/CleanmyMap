from .config import GOOGLE_SHEET_URL
from .data_loader import DataLoader
from .data_processor import DataProcessor
from .map_generator import MapGenerator


def run_pipeline(sheet_url: str = GOOGLE_SHEET_URL):
    raw = DataLoader(sheet_url).load()
    clean = DataProcessor(raw).process()
    out = MapGenerator(clean).save()
    return {
        'rows_raw': len(raw),
        'rows_clean': len(clean),
        'geocoded_points': int(clean['lat'].notna().sum()),
        'output': out,
    }


if __name__ == '__main__':
    stats = run_pipeline()
    print(f"✅ Lignes brutes: {stats['rows_raw']}")
    print(f"✅ Actions nettoyées: {stats['rows_clean']}")
    print(f"✅ Points géocodés: {stats['geocoded_points']}")
    print(f"🗺️ Carte: {stats['output']}")
