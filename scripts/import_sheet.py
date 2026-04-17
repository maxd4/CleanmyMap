import pandas as pd
import requests
import json
import uuid
import os
from datetime import datetime

# Supabase config
SUPABASE_URL = "https://mgvmuambbxmmkrjjlryo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndm11YW1iYnhtbWtyampscnlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDczMTIxMywiZXhwIjoyMDkwMzA3MjEzfQ.oOnuuC2FrgzHgoXgeVIq1mCyVDJBz7TSYYUPGowwY2Q"

# Google Sheet CSV URL
SHEET_URL = "https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/export?format=csv"

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
    'propre': ['propre', 'lieux propres', 'liste lieux propres', 'liste_lieux_propres', 'lieux_propres'],
    'megots_qualite': ['qualite', 'etat', 'étât', 'condition'],
}

def find_col(columns, key):
    keywords = COLUMN_KEYWORDS[key]
    for col in columns:
        low = col.lower()
        if any(k in low for k in keywords):
            return col
    return None

def run():
    print("Telechargement de la Google Sheet...")
    raw_df = pd.read_csv(SHEET_URL, encoding="utf-8")
    raw_df.columns = raw_df.columns.str.strip()

    cols = {k: find_col(raw_df.columns, k) for k in COLUMN_KEYWORDS}
    
    actions = []
    
    print("Normalisation et filtrage...")
    for index, row in raw_df.iterrows():
        date_val = row[cols['date']] if cols['date'] else None
        
        try:
            action_date = pd.to_datetime(date_val, dayfirst=True)
            if pd.isna(action_date):
                continue
            date_str = action_date.strftime("%Y-%m-%d")
        except Exception:
            continue

        lieu = str(row[cols['gps']]) if cols['gps'] and pd.notna(row[cols['gps']]) else "Lieu non spécifié"
        try:
            kg = float(row[cols['poids']]) if cols['poids'] and pd.notna(row[cols['poids']]) else 0.0
        except:
            kg = 0.0
            
        try:
            # Gestion de la conversion Masse -> Nombre pour les mégots
            megots_kg = float(row[cols['megots']]) if cols['megots'] and pd.notna(row[cols['megots']]) else 0.0
            qualite = str(row[cols['megots_qualite']]).lower() if cols['megots_qualite'] and pd.notna(row[cols['megots_qualite']]) else "propre"
            
            # Coefficients de conversion (Masse -> Nombre estimé)
            # Réference ~4400 mégots par kg à sec (0.22g/unité)
            factor = 1.0
            if "mouill" in qualite: factor = 0.4
            elif "humid" in qualite: factor = 0.65
            
            butts = int(megots_kg * 4400 * factor)
        except:
            butts = 0

        try:
            vols = int(row[cols['benevoles']]) if cols['benevoles'] and pd.notna(row[cols['benevoles']]) else 1
        except:
            vols = 1

        try:
            mins = int(row[cols['temps']]) if cols['temps'] and pd.notna(row[cols['temps']]) else 60
        except:
            mins = 60

        asso = str(row[cols['association']]) if cols['association'] and pd.notna(row[cols['association']]) else ""
        type_lieu = str(row[cols['type']]) if cols['type'] and pd.notna(row[cols['type']]) else ""

        # Auto-détection du type de lieu si vide
        if not type_lieu:
            lower_lieu = lieu.lower()
            if any(k in lower_lieu for k in ["luxembourg", "vincennes", "boulogne", "chaumont", "tuileries", "parc", "jardin", "square"]):
                type_lieu = "Bois/Parc/Jardin/Square/Sentier"
            elif any(k in lower_lieu for k in ["rue", "allée", "villa", "ruelle", "impasse"]):
                type_lieu = "N° Rue/Allée/Villa/Ruelle/Impasse"
            elif any(k in lower_lieu for k in ["quai", "pont", "port"]):
                type_lieu = "Quai/Pont/Port"
            elif any(k in lower_lieu for k in ["boulevard", "avenue", "place"]):
                type_lieu = "N° Boulevard/Avenue/Place"
            elif any(k in lower_lieu for k in ["gare", "station", "portique"]):
                type_lieu = "Gare/Station/Portique"

        # Decouverte si lieu propre (clean_place)
        is_propre = False
        if cols['propre'] and pd.notna(row[cols['propre']]):
            val = str(row[cols['propre']]).lower().strip()
            # Seul le choix explicite 'oui' déclenche le mode lieu propre.
            # Un menu déroulant non renseigné ou un 'non' est ignoré.
            if val == 'oui':
                is_propre = True

        if is_propre:
            kg = 0.0
            butts = 0

        # Notes avec métadonnées JSON standard (cmm-meta)
        meta = {}
        if asso and asso != "nan":
            meta["associationName"] = asso
        if type_lieu:
            meta["placeType"] = type_lieu
        
        # Sauvegarde de la masse et condition réelle pour le breakdown
        if 'megots_kg' in locals() and megots_kg > 0:
            cond = "propre"
            if "mouill" in qualite: cond = "mouille"
            elif "humid" in qualite: cond = "humide"
            meta["wasteBreakdown"] = {
                "megotsKg": megots_kg,
                "megotsCondition": cond
            }
        
        notes = ""
        if meta:
            notes = f"[cmm-meta]{json.dumps(meta)}"

        action = {
            "created_by_clerk_id": "legacy_import",
            "action_date": date_str,
            "location_label": lieu,
            "latitude": None,
            "longitude": None,
            "waste_kg": kg,
            "cigarette_butts": butts,
            "volunteers_count": max(1, vols),
            "duration_minutes": max(1, mins),
            "notes": notes if notes else None,
            "status": "approved",
            "created_at": datetime.utcnow().isoformat()
        }
        actions.append(action)

    print(f"{len(actions)} actions validees pour import.")
    if not actions:
        return

    # Delete previous legacy_import to avoid duplicates if re-run
    print("Nettoyage des anciens imports legacy...")
    try:
        delete_url = f"{SUPABASE_URL}/rest/v1/actions?created_by_clerk_id=eq.legacy_import"
        requests.delete(
            delete_url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
        )
    except Exception as e:
        print(f"Erreur purge: {e}")

    # Insert into Supabase
    print("Insertion dans Supabase...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # BATCH INSERT by 100
    batch_size = 100
    for i in range(0, len(actions), batch_size):
        batch = actions[i:i+batch_size]
        res = requests.post(f"{SUPABASE_URL}/rest/v1/actions", headers=headers, json=batch)
        if res.status_code not in (200, 201):
            print(f"Erreur HTTP {res.status_code} sur lot {i}: {res.text}")
        else:
            print(f"Lot {i}-{i+len(batch)} injecte avec succes.")

    print("Import termine.")

if __name__ == "__main__":
    run()
