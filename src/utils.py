import pandas as pd

def normalize_bool_flag(value) -> bool:
    """Normalize bool-ish values coming from forms, sheets or DB."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {
        "1",
        "true",
        "vrai",
        "yes",
        "oui",
        "y",
        "clean",
        "propre",
        "zone propre",
        "signalement propre",
    }

def _txt(value) -> str:
    """Sanitize text by forcing latin-1 safe characters."""
    text = "" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")
