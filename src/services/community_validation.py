from __future__ import annotations

from typing import Any, Iterable

import pandas as pd

from src.models import PendingPublicPreview


def _safe_text(value: Any, max_len: int) -> str:
    if value is None:
        return ""
    text = str(value).replace("\x00", "").strip()
    if text.lower() in {"", "nan", "none", "null"}:
        return ""
    return text[:max_len]


def _safe_int(value: Any) -> int:
    parsed = pd.to_numeric(value, errors="coerce")
    if pd.isna(parsed):
        return 0
    return int(max(0, int(parsed)))


def _safe_float(value: Any) -> float:
    parsed = pd.to_numeric(value, errors="coerce")
    if pd.isna(parsed):
        return 0.0
    return float(max(0.0, float(parsed)))


def _impact_level(megots: int, dechets_kg: float) -> str:
    score = dechets_kg * 4.0 + (megots / 80.0)
    if score >= 25:
        return "eleve"
    if score >= 10:
        return "modere"
    return "leger"


def build_pending_public_previews(
    pending_actions: Iterable[dict[str, Any]] | None,
    *,
    limit: int = 10,
) -> list[PendingPublicPreview]:
    previews: list[PendingPublicPreview] = []

    for action in list(pending_actions or [])[: max(0, limit)]:
        submission_id = str(action.get("id") or "")
        public_ref = submission_id[:8] if submission_id else "N/A"
        mission_type = _safe_text(action.get("type_lieu") or "Mission citoyenne", max_len=80)
        dechets_kg = _safe_float(action.get("dechets_kg"))
        megots = _safe_int(action.get("megots"))
        benevoles = _safe_int(action.get("benevoles") or action.get("nb_benevoles"))

        previews.append(
            PendingPublicPreview(
                submission_id=submission_id,
                public_ref=public_ref,
                mission_type=mission_type or "Mission citoyenne",
                dechets_kg=dechets_kg,
                megots=megots,
                benevoles=benevoles,
                impact_level=_impact_level(megots=megots, dechets_kg=dechets_kg),
            )
        )

    return previews
