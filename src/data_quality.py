import re
from typing import Any


MAX_DECHETS_KG = 2000.0
MAX_MEGOTS = 200000
MAX_BENEVOLES = 2000
MAX_TEMPS_MIN = 24 * 60


def _extract_coords(text: str) -> tuple[float, float] | None:
    if not text:
        return None
    m = re.match(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$", text)
    if not m:
        return None
    return float(m.group(1)), float(m.group(2))


def validate_submission_inputs(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    benevoles = int(data.get("benevoles", 0) or 0)
    temps_min = int(data.get("temps_min", 0) or 0)
    megots = int(data.get("megots", 0) or 0)
    dechets_kg = float(data.get("dechets_kg", 0.0) or 0.0)
    emplacement = str(data.get("emplacement_brut", "") or "")

    if benevoles < 1 or benevoles > MAX_BENEVOLES:
        errors.append("Nombre de bénévoles incohérent.")
    if temps_min < 1 or temps_min > MAX_TEMPS_MIN:
        errors.append("Durée incohérente (1 min à 24h max).")
    if megots < 0 or megots > MAX_MEGOTS:
        errors.append("Nombre de mégots incohérent.")
    if dechets_kg < 0 or dechets_kg > MAX_DECHETS_KG:
        errors.append("Poids de déchets incohérent.")

    coords = _extract_coords(emplacement)
    if coords:
        lat, lon = coords
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            errors.append("Coordonnées GPS incohérentes (latitude/longitude hors plage).")

    # Détection simple d'incohérence d'unités (grammes saisis à la place de kg)
    if dechets_kg >= 100 and megots == 0 and benevoles <= 2:
        errors.append("Valeur élevée détectée : vérifiez l'unité (kg vs grammes).")

    return errors


def validate_feedback_input(feedback_text: Any) -> list[str]:
    errors: list[str] = []
    text = str(feedback_text or "").strip()
    if not text:
        errors.append("Merci de renseigner votre retour avant l'envoi.")
    elif len(text) > 4000:
        errors.append("Votre message est trop long (4000 caractères max).")
    return errors


def get_weight_conversion_hints(dechets_kg: float) -> dict[str, float]:
    return {
        "sacs_30l": round(dechets_kg / 6.0, 1),
        "bouteilles_1_5l": int(dechets_kg * 40),
    }
