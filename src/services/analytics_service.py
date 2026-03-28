from __future__ import annotations
from typing import Any, Mapping
from datetime import datetime
import pandas as pd
import numpy as np

def calculate_scores(row: Mapping[str, Any]) -> dict[str, Any]:
    """Calcule les scores de salete et de mixite (anciennete) pour une action."""
    megots = float(row.get('megots', 0))
    dechets_kg = float(row.get('dechets_kg', 0))
    
    temps = float(row.get('temps_min', 60)) / 60.0 
    ben = float(row.get('nb_benevoles', row.get('benevoles', 1)))
    
    effort = max(temps * ben, 0.5) 
    score_salete = (megots + (dechets_kg * 50)) / effort
    
    date_action = row.get('date')
    if pd.isna(date_action):
        jours = 365 
    else:
        try:
            date_dt = pd.to_datetime(date_action)
            if hasattr(date_dt, 'tz') and date_dt.tz is not None:
                date_dt = date_dt.tz_localize(None)
            jours = (datetime.now() - date_dt).days
        except (TypeError, ValueError, OverflowError):
            jours = 365

    norm_salete = min(score_salete / 500.0, 1.0) * 70
    norm_temps = min(max(jours, 0) / 540.0, 1.0) * 30 
    score_mixte = norm_salete + norm_temps
    
    points = 10.0 + (float(row.get('temps_min', 60)) / 15.0 * 10.0) + (dechets_kg * 5.0) + (megots / 100.0)
    
    return {
        'score_salete': float(score_salete),
        'score_mixte': float(score_mixte),
        'jours': float(jours),
        'eco_points': int(points)
    }

def compute_score_components(df: pd.DataFrame) -> pd.DataFrame:
    """Compute score components with vectorized operations for hot paths."""
    if df.empty:
        return pd.DataFrame(columns=["score_salete", "score_mixte", "jours", "eco_points"], index=df.index)

    megots = pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0.0)
    dechets_kg = pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0.0)
    temps_m = pd.to_numeric(df.get("temps_min", 60), errors="coerce").fillna(60.0)
    ben = pd.to_numeric(df.get("nb_benevoles", df.get("benevoles", 1)), errors="coerce").fillna(1.0)
    
    effort = (temps_m / 60.0 * ben).clip(lower=0.5)
    score_salete = (megots + (dechets_kg * 50.0)) / effort

    date_col = pd.to_datetime(df.get("date"), errors="coerce")
    jours = (pd.Timestamp.now() - date_col).dt.days.astype(float).fillna(365.0).clip(lower=0.0)

    norm_salete = np.minimum(score_salete / 500.0, 1.0) * 70.0
    norm_temps = np.minimum(jours / 540.0, 1.0) * 30.0
    score_mixte = norm_salete + norm_temps
    eco_points = 10.0 + (temps_m / 15.0 * 10.0) + (dechets_kg * 5.0) + (megots / 100.0)

    return pd.DataFrame({
        "score_salete": score_salete, "score_mixte": score_mixte,
        "jours": jours, "eco_points": eco_points
    }, index=df.index)

def calculate_impact(megots: float, dechets_kg: float) -> dict[str, Any]:
    """Calcule l'equivalence ecologique d'une action (eau, CO2, bouteilles)."""
    return {
        'eau_litres': int(megots * 500),
        'co2_kg': float(dechets_kg * 2.0),
        'bouteilles': int(dechets_kg * 40)
    }

def evaluate_badges(user_stats: Mapping[str, Any] | None) -> tuple[list[dict[str, str]], list[str]]:
    """Return unlocked badges based on user stats."""
    stats = dict(user_stats or {})
    badges = []
    warnings = []
    
    try:
        nb = int(pd.to_numeric(stats.get("nb_actions", 0), errors="coerce") or 0)
        points = int(pd.to_numeric(stats.get("total_points", 0), errors="coerce") or 0)
    except (TypeError, ValueError):
        nb, points = 0, 0
    
    kg_val = pd.to_numeric(stats.get("total_kg"), errors="coerce")
    kg = float(kg_val) if pd.notna(kg_val) else 0.0

    if nb >= 1: badges.append({"id": "first", "name": "Premier Pas", "desc": "1ere action valide."})
    if nb >= 5: badges.append({"id": "regular", "name": "Sentinelle", "desc": "5 actions."})
    if kg >= 50: badges.append({"id": "heavy", "name": "Hercule", "desc": "50kg+ ramasses."})
    if points >= 1000: badges.append({"id": "hero", "name": "Eco-Heros", "desc": "1000 pts."})
    
    if pd.isna(kg_val): warnings.append("KPI total_kg absent.")
    return badges, warnings
