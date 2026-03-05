from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/edit#gid=0"
MAX_RETRIES = 3

COLUMN_KEYWORDS = {
    'gps': ['gps', 'adresse', 'lieu', 'coordo', 'localisation'],
    'megots': ['megots', 'mégots', 'nbr megots', 'nb megots', 'nombre megots'],
    'poids': ['poids', 'kg', 'dechets', 'déchets'],
    'temps': ['temps', 'min', 'durée', 'minutes', 'duree'],
    'date': ['date', 'jour', 'date de collecte'],
    'ville': ['ville', 'commune', 'localite'],
    'benevoles': ['ben', 'benevoles', 'bénévoles', 'nombre', 'participants'],
    'type': ['type', 'categorie', 'catégorie', 'type lieu'],
    'association': ['asso', 'association', 'nom association', 'structure'],
    'propre': ['liste lieux propres', 'liste_lieux_propres', 'lieux_propres', 'propres'],
}

TYPE_COLORS = {
    'Quai/Pont/Port': '#3498db',
    'Bois/Parc/Jardin/Square/Sentier': '#27ae60',
    'N° Boulevard/Avenue/Place': '#e67e22',
    'Monument': '#8e44ad',
    'Quartier': '#f39c12',
    'Non spécifié': '#95a5a6',
}

MAP_CONFIG = {
    'center_lat': 48.8566,
    'center_lon': 2.3522,
    'zoom': 12,
    'tiles': 'OpenStreetMap',
    'output_file': str(OUTPUT_DIR / 'carte_complete.html'),
}
