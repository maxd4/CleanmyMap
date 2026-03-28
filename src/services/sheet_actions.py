from __future__ import annotations

import hashlib
from datetime import datetime

import pandas as pd
from thefuzz import fuzz, process

from src.models import SheetActionRecord
from src.logging_utils import log_exception


def sheet_csv_url(sheet_url: str) -> str:
    """Convert Google Sheet URL to direct CSV export URL."""
    if "/d/" not in sheet_url:
        raise ValueError("Google Sheet URL invalide: segment '/d/' manquant")
    tail = sheet_url.split("/d/", 1)[1]
    sheet_id = tail.split("/", 1)[0].strip()
    if not sheet_id:
        raise ValueError("Google Sheet URL invalide: sheet id absent")
    return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"


def find_matching_column(df: pd.DataFrame, keywords: list[str]) -> str | None:
    """Find first column that contains one of the provided keywords."""
    lowered_keywords = [k.lower() for k in keywords]
    for col in df.columns:
        low_col = str(col).lower()
        if any(k in low_col for k in lowered_keywords):
            return str(col)
    return None


def fuzzy_address_match(new_address: str, existing_list: list[str], threshold: int = 90) -> str:
    """Match an address against known addresses to avoid duplicates."""
    if not new_address:
        return ""

    clean_new = str(new_address).strip()
    if not clean_new:
        return ""

    if not existing_list:
        return clean_new

    if clean_new in existing_list:
        return clean_new

    unique_existing = list({str(addr).strip() for addr in existing_list if addr})
    if not unique_existing:
        return clean_new

    match, score = process.extractOne(clean_new, unique_existing, scorer=fuzz.token_sort_ratio)
    return match if score >= threshold else clean_new


def anonymize_contributor(name: str) -> str:
    """Generate deterministic opaque contributor id."""
    if not name:
        return "citoyen_anonyme"
    digest = hashlib.md5(str(name).strip().lower().encode()).hexdigest()  # nosec - deterministic ID only
    return f"brigadier_{digest[:10]}"


def load_sheet_actions(
    sheet_url: str,
    approved_submissions: list[dict],
    parse_coords,
    sanitize_dataframe_text,
) -> list[dict]:
    """Load and normalize actions from the public Google Sheet."""
    try:
        raw = pd.read_csv(sheet_csv_url(sheet_url))
        raw.columns = raw.columns.str.strip()
        raw = sanitize_dataframe_text(raw)
    except (pd.errors.ParserError, OSError, ValueError, TypeError) as exc:
        log_exception(
            component="sheet_actions",
            action="load_sheet_actions",
            exc=exc,
            message="Unable to load Google Sheet actions",
            context={"sheet_url": sheet_url[:200]},
            severity="warning",
        )
        return []

    c_date = find_matching_column(raw, ["date", "jour"])
    c_addr = find_matching_column(raw, ["adresse", "gps", "lieu", "coordo"])
    c_type = find_matching_column(raw, ["type", "categorie", "catégorie"])
    c_assoc = find_matching_column(raw, ["association", "asso"])
    c_megots = find_matching_column(raw, ["megots", "mégots", "nbr megots"])
    c_dechets = find_matching_column(raw, ["dechets", "déchets", "kg", "poids"])
    c_ben = find_matching_column(raw, ["benevoles", "bénévoles", "participants", "nombre benevoles"])
    c_propre = find_matching_column(raw, ["liste lieux propres", "lieux_propres", "propres"])

    known_pool = [str(a.get("adresse", "")) for a in approved_submissions if a.get("adresse")]
    now_value = datetime.now().isoformat(timespec="seconds")

    out: list[SheetActionRecord] = []
    for _, row in raw.iterrows():
        raw_addr = str(row.get(c_addr, "") if c_addr else "").strip()
        if not raw_addr or raw_addr.lower() in {"nan", "none"}:
            continue

        adresse = fuzzy_address_match(raw_addr, known_pool)
        if adresse not in known_pool:
            known_pool.append(adresse)

        lat, lon = parse_coords(adresse)
        dt = pd.to_datetime(row.get(c_date), errors="coerce", dayfirst=True) if c_date else pd.NaT
        date_str = dt.date().isoformat() if pd.notna(dt) else ""

        out.append(
            SheetActionRecord(
                {
                "id": f"sheet_{len(out)}_{date_str}_{adresse[:20]}",
                "nom": "Referent association",
                "association": str(row.get(c_assoc, "Independant") if c_assoc else "Independant"),
                "type_lieu": str(row.get(c_type, "Non specifie") if c_type else "Non specifie"),
                "adresse": adresse,
                "date": date_str,
                "benevoles": int(pd.to_numeric(row.get(c_ben, 1), errors="coerce") or 1),
                "temps_min": 1,
                "megots": int(pd.to_numeric(row.get(c_megots, 0), errors="coerce") or 0),
                "dechets_kg": float(pd.to_numeric(row.get(c_dechets, 0), errors="coerce") or 0),
                "gps": adresse,
                "lat": lat,
                "lon": lon,
                "commentaire": "Import Google Sheet",
                "submitted_at": now_value,
                "est_propre": False,
                "source": "google_sheet",
                "plastique_kg": 0.0,
                "verre_kg": 0.0,
                "metal_kg": 0.0,
                }
            )
        )

    if c_propre:
        uniques = raw[c_propre].fillna("").astype(str).str.strip()
        for raw_place in sorted({v for v in uniques if v and v.lower() not in {"nan", "none"}}):
            place = fuzzy_address_match(raw_place, known_pool)
            if place not in known_pool:
                known_pool.append(place)
            lat, lon = parse_coords(place)
            out.append(
                SheetActionRecord(
                    {
                    "id": f"sheet_propre_{place[:20]}",
                    "nom": "Referent association",
                    "association": "Signalement",
                    "type_lieu": "Non specifie",
                    "adresse": place,
                    "date": "",
                    "benevoles": 0,
                    "temps_min": 0,
                    "megots": 0,
                    "dechets_kg": 0.0,
                    "gps": place,
                    "lat": lat,
                    "lon": lon,
                    "commentaire": "Zone propre signalee (Google Sheet)",
                    "submitted_at": now_value,
                    "est_propre": True,
                    "source": "google_sheet",
                    "plastique_kg": 0.0,
                    "verre_kg": 0.0,
                    "metal_kg": 0.0,
                    }
                )
            )

    return [item.as_dict() for item in out]
