import pandas as pd
import requests
import json
import uuid
import os
import re
import time
from datetime import datetime

# Supabase config
SUPABASE_URL = "https://mgvmuambbxmmkrjjlryo.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

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

def extract_coords(text):
    if not text or pd.isna(text): return None, None
    match = re.search(r'([-+]?\d*\.\d+|\d+)\s*[,;]\s*([-+]?\d*\.\d+|\d+)', str(text))
    if match:
        try:
            return float(match.group(1)), float(match.group(2))
        except:
            pass
    return None, None

def geocode_location(text):
    if not text or pd.isna(text) or text == "Lieu non spécifié": return None, None
    query = str(text).strip()
    
    # Nettoyage basique (typos courantes)
    query_clean = query.lower().replace("jaridn", "jardin").replace("quuai", "quai").replace("st ", "saint ")
    
    search_query = query_clean if "paris" in query_clean else f"{query_clean}, Paris, France"
    try:
        headers = {'User-Agent': 'CleanMyMap-Import-Script/1.0'}
        url = "https://nominatim.openstreetmap.org/search"
        params = {'q': search_query, 'format': 'json', 'limit': 1}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"  [!] Erreur geocodage pour '{query}': {e}")
    
    print(f"  [X] ECHEC de localisation pour : '{query}' (Vérifiez l'orthographe dans le Google Sheet)")
    return None, None

def run():
    print("Telechargement de la Google Sheet...")
    try:
        raw_df = pd.read_csv(SHEET_URL, encoding="utf-8")
    except Exception as e:
        print(f"Erreur telechargement: {e}")
        return

    raw_df.columns = raw_df.columns.str.strip()
    cols = {k: find_col(raw_df.columns, k) for k in COLUMN_KEYWORDS}
    
    actions = []
    print("Normalisation et injection intelligente des metadonnees...")
    
    for index, row in raw_df.iterrows():
        date_val = row[cols['date']] if cols['date'] else None
        
        is_propre = False
        if cols['propre'] and pd.notna(row[cols['propre']]):
            val = str(row[cols['propre']]).lower().strip()
            if val == 'oui': is_propre = True

        date_str = None
        try:
            action_date = pd.to_datetime(date_val, dayfirst=True, errors='coerce', format='mixed')
            if pd.notna(action_date):
                date_str = action_date.strftime("%Y-%m-%d")
            elif is_propre or pd.isna(date_val):
                date_str = datetime.now().strftime("%Y-%m-%d")
        except:
            if is_propre:
                date_str = datetime.now().strftime("%Y-%m-%d")
            else:
                continue

        if not date_str: continue

        lieu = str(row[cols['gps']]) if cols['gps'] and pd.notna(row[cols['gps']]) else "Lieu non spécifié"
        lat, lon = extract_coords(lieu)
        if lat is None:
            print(f"  [~] Geocodage de '{lieu}'...")
            lat, lon = geocode_location(lieu)
            time.sleep(0.5)

        # GESTION METADONNEES (Flags de presence)
        provided_fields = []
        
        # Poids Déchets
        kg = 0.0
        if cols['poids'] and pd.notna(row[cols['poids']]):
            try:
                val = str(row[cols['poids']]).replace(',', '.').strip()
                if val:
                    kg = float(val)
                    provided_fields.append("waste_kg")
            except: pass
            
        # Mégots
        butts = 0
        megots_kg_val = None
        if cols['megots'] and pd.notna(row[cols['megots']]):
            try:
                val = str(row[cols['megots']]).replace(',', '.').strip()
                if val:
                    megots_kg_val = float(val)
                    provided_fields.append("cigarette_butts")
                    qualite = str(row[cols['megots_qualite']]).lower() if cols['megots_qualite'] and pd.notna(row[cols['megots_qualite']]) else "propre"
                    factor = 1.0
                    if "mouill" in qualite: factor = 0.4
                    elif "humid" in qualite: factor = 0.65
                    butts = int(megots_kg_val * 4400 * factor)
            except: pass

        try:
            vols = int(row[cols['benevoles']]) if cols['benevoles'] and pd.notna(row[cols['benevoles']]) else 1
        except: vols = 1

        try:
            mins = int(row[cols['temps']]) if cols['temps'] and pd.notna(row[cols['temps']]) else 60
        except: mins = 60

        asso = str(row[cols['association']]) if cols['association'] and pd.notna(row[cols['association']]) else ""
        type_lieu = str(row[cols['type']]) if cols['type'] and pd.notna(row[cols['type']]) else ""

        # Meta JSON construction
        meta = {"provided": provided_fields}
        if asso and asso != "nan": meta["associationName"] = asso
        if type_lieu and type_lieu != "nan": meta["placeType"] = type_lieu
        if megots_kg_val is not None:
            cond = "propre"
            if "mouille" in str(row.get(cols['megots_qualite'], "")).lower(): cond = "mouille"
            elif "humide" in str(row.get(cols['megots_qualite'], "")).lower(): cond = "humide"
            meta["wasteBreakdown"] = {"megotsKg": megots_kg_val, "megotsCondition": cond}
        
        notes = f"[cmm-meta]{json.dumps(meta)}" if meta else None

        action = {
            "created_by_clerk_id": "legacy_import",
            "action_date": date_str,
            "location_label": lieu,
            "latitude": lat,
            "longitude": lon,
            "waste_kg": kg,
            "cigarette_butts": butts,
            "volunteers_count": max(1, vols),
            "duration_minutes": max(1, mins),
            "notes": notes,
            "status": "approved",
            "created_at": datetime.now().isoformat()
        }
        actions.append(action)

    if not actions:
        print("Fin: aucune action a importer.")
        return

    print(f"Injection de {len(actions)} actions dans Supabase (Hack Metadonnees)...")
    try:
        delete_url = f"{SUPABASE_URL}/rest/v1/actions?created_by_clerk_id=eq.legacy_import"
        requests.delete(delete_url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    except Exception as e:
        print(f"Erreur purge: {e}")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    batch_size = 100
    for i in range(0, len(actions), batch_size):
        batch = actions[i:i+batch_size]
        res = requests.post(f"{SUPABASE_URL}/rest/v1/actions", headers=headers, json=batch)
        if res.status_code not in (200, 201):
            print(f"Erreur HTTP {res.status_code}: {res.text}")
        else:
            print(f"Lot {i}-{i+len(batch)} injecte.")

    print("Import termine.")

if __name__ == "__main__":
    run()
