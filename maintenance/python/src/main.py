from .config import GOOGLE_SHEET_URL
from .data_loader import DataLoader
from .data_processor import DataProcessor
from .map_generator import MapGenerator
from .posthog_client import get_client


def run_pipeline(sheet_url: str = GOOGLE_SHEET_URL):
    posthog = get_client()
    raw = DataLoader(sheet_url).load()
    clean = DataProcessor(raw).process()
    out = MapGenerator(clean).save()
    stats = {
        'rows_raw': len(raw),
        'rows_clean': len(clean),
        'geocoded_points': int(clean['lat'].notna().sum()),
        'output': out,
    }
    posthog.capture(
        'pipeline',
        'pipeline_run',
        properties={
            'rows_raw': stats['rows_raw'],
            'rows_clean': stats['rows_clean'],
            'geocoded_points': stats['geocoded_points'],
        },
    )
    posthog.shutdown()
    return stats


if __name__ == '__main__':
    stats = run_pipeline()
    print(f"✅ Lignes brutes: {stats['rows_raw']}")
    print(f"✅ Actions nettoyées: {stats['rows_clean']}")
    print(f"✅ Points géocodés: {stats['geocoded_points']}")
    print(f"🗺️ Carte: {stats['output']}")
