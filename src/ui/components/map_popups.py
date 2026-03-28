from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Mapping
import pandas as pd
import numpy as np
from src.security_utils import sanitize_html_text, sanitize_html_multiline
from src.text_utils import repair_mojibake_text

@dataclass(frozen=True, slots=True)
class SanitizedPopupRow:
    """Normalized row values for popup rendering and escaped text fragments for HTML."""
    row: dict[str, Any]
    escaped: dict[str, str]

# Constants previously in map_utils
MAP_COLORS = {
    'clean': '#3498db',      # Bleu (Zone propre)
    'low': '#27ae60',        # Vert (Standard/Faible)
    'medium': '#e67e22',     # Orange (Moyen/Ancien)
    'critical': '#8e44ad',    # Violet (Point noir)
    'business': '#FFD700',   # Or
    'park': '#2ecc71',       # Vert OSM (Parcs)
    'street': '#95a5a6'      # Gris OSM (Rues)
}

def format_google_maps_name(row):
    """Formate le nom du lieu pour qu'il ressemble a un affichage Google Maps."""
    import re
    adresse = str(row.get('adresse', '')).strip()
    type_lieu = str(row.get('type_lieu', '')).strip()
    assoc = str(row.get('association', '')).strip()
    if "Etablissement" in type_lieu:
        return f"{assoc} ({adresse})"
    adresse_clean = re.sub(r',\s*\d{5}.*$', '', adresse)
    if type_lieu and type_lieu != "Lieu" and type_lieu not in adresse:
        return f"{type_lieu}, {adresse_clean}"
    return adresse_clean

def get_marker_style(row, score_data):
    """Determine la couleur et le rayon du marqueur selon les scores."""
    is_clean = row.get('est_propre', False)
    is_business = row.get('type_lieu') == "Etablissement Engage (Label)"
    if is_business:
        return MAP_COLORS['business'], 18, 'star'
    if is_clean:
        return MAP_COLORS['clean'], 12, 'leaf'
    score = score_data['score_mixte']
    jours = score_data['jours']
    if score > 80:
        return MAP_COLORS['critical'], 16, 'circle'
    elif score > 50 or jours > 365:
        return MAP_COLORS['medium'], 13, 'circle'
    else:
        return MAP_COLORS['low'], 10, 'circle'

def sanitize_popup_row(row: Mapping[str, Any] | None) -> SanitizedPopupRow:
    source = dict(row or {})
    clean_row = dict(source)
    escaped: dict[str, str] = {}
    limits = {
        "adresse": 160, "association": 120, "commentaire": 320, "type_lieu": 80,
        "tendance": 80, "adresse_depart": 160, "adresse_arrivee": 160,
        "type_dechet": 80, "reporter_name": 80, "place_name": 180,
    }
    for field, max_len in limits.items():
        val = source.get(field)
        text = str(val).replace("\x00", "").strip() if val is not None and not (isinstance(val, float) and np.isnan(val)) else ""
        if text.lower() in {"nan", "none", "null"}: text = ""
        clean_text = text[:max_len]
        clean_row[field] = clean_text
        escaped[field] = sanitize_html_text(clean_text, max_len=max_len)
    
    place_name = format_google_maps_name(clean_row)[:180]
    clean_row["place_name"] = place_name
    escaped["place_name"] = sanitize_html_text(place_name, max_len=180)
    return SanitizedPopupRow(row=clean_row, escaped=escaped)

def create_premium_popup(row, score_data, gap_alert="", calculate_impact_fn=None):
    """Generate popup HTML from a submission row with escaped dynamic fields."""
    row = sanitize_popup_row(row).row
    is_clean = row.get("est_propre", False)
    is_business = row.get("type_lieu") == "Etablissement Engage (Label)"

    safe_address = sanitize_html_text(row.get("adresse", "Lieu inconnu"), max_len=160)
    safe_association = sanitize_html_text(row.get("association", "Action"), max_len=120)
    safe_comment = sanitize_html_multiline(row.get("commentaire", "Lieu labellise pour son engagement."), max_len=320)
    safe_type_lieu = sanitize_html_text(row.get("type_lieu", "Lieu"), max_len=80)
    safe_trend = sanitize_html_text(row.get("tendance", "Premier passage"), max_len=80)
    safe_gap = sanitize_html_text(gap_alert.replace("<br>", " "), max_len=220)

    color, _, _ = get_marker_style(row, score_data)
    gap_html = f'<div style="background:#fff7ed;padding:8px;border-radius:8px;border:1px dashed #fb923c;margin-top:10px;font-size:10px;color:#c2410c;text-align:center;">Besoin d\'equipement<br>{safe_gap}</div>' if safe_gap else ""

    if is_clean:
        safe_avatar = safe_association[:1].upper() if safe_association else "B"
        return repair_mojibake_text(f"""
        <div style="font-family:'Outfit',sans-serif;width:260px;border-radius:12px;overflow:hidden;box-shadow:0 10px 20px rgba(0,0,0,0.1);border:2px solid #3498db33;">
            <div style="background:linear-gradient(135deg,#ebf8ff,#e0fdf4);color:#2980b9;padding:15px;text-align:center;border-bottom:1px solid #3498db11;">
                <div style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1e40af;">Zone Impeccable</div>
            </div>
            <div style="padding:15px;background:white;">
                <div style="font-size:13px;color:#475569;margin-bottom:12px;">{safe_address}</div>
                <div style="background: #f0fdf4; padding:10px; border-radius:10px; border:1px solid #dcfce7; display:flex; align-items:center; gap:10px;">
                    <div style="background:#22c55e;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">{safe_avatar}</div>
                    <div><div style="font-size:10px;color:#166534;text-transform:uppercase;font-weight:700;">Valide par</div><div style="font-size:13px;font-weight:600;color:#14532d;">{safe_association or "Benevole"}</div></div>
                </div>
            </div>
        </div>
        """)

    if is_business:
        return repair_mojibake_text(f"""
        <div style="font-family:'Outfit',sans-serif;width:280px;border-radius:12px;overflow:hidden;box-shadow:0 10px 20px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#f1c40f,#f39c12);color:white;padding:15px;font-weight:700;">Etablissement Engage</div>
            <div style="padding:15px;background:white;">
                <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:5px;">{safe_association or "Commerce"}</div>
                <div style="font-size:12px;color:#64748b;font-style:italic;">{safe_comment}</div>
            </div>
        </div>
        """)

    megots = int(row.get("megots", 0))
    dechets = float(row.get("dechets_kg", 0))
    impact = calculate_impact_fn(megots, dechets) if calculate_impact_fn else {}
    eau_estimee = int(impact.get("eau_litres", 0))
    
    return repair_mojibake_text(f"""
    <div style="font-family:'Outfit',sans-serif;width:260px;border-radius:16px;overflow:hidden;box-shadow:0 12px 24px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,{color},{color}dd);color:white;padding:12px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:14px;font-weight:700;">{safe_association[:25] if safe_association else "Action"}</span>
                <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px;font-size:9px;text-transform:uppercase;">{safe_type_lieu[:15]}</span>
            </div>
        </div>
        <div style="padding:12px;background:white;">
            <div style="background:#f8fafc;padding:6px 10px;border-radius:8px;margin-bottom:10px;font-size:11px;color:#475569;">{safe_address}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                <div style="background:#f1f5f9;padding:8px;border-radius:8px;text-align:center;">
                    <div style="font-size:18px;font-weight:800;color:#1e293b;">{megots}</div><div style="font-size:9px;color:#64748b;text-transform:uppercase;">Megots</div>
                </div>
                <div style="background:#f1f5f9;padding:8px;border-radius:8px;text-align:center;">
                    <div style="font-size:18px;font-weight:800;color:#1e293b;">{dechets:.1f}</div><div style="font-size:9px;color:#64748b;text-transform:uppercase;">Kg dechets</div>
                </div>
            </div>
            <div style="text-align:center;background:linear-gradient(135deg,#0284c7,#0ea5e9);border-radius:8px;padding:8px;">
                <span style="color:white;font-weight:700;font-size:11px;">Eau preservee: {eau_estimee:,} L</span>
            </div>
            {gap_html}
        </div>
    </div>
    """)
