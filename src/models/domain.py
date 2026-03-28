from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class CriticalZoneStat:
    address: str
    count: int
    avg_repollution_days: int

    def to_public_dict(self) -> dict[str, int]:
        return {
            "count": int(self.count),
            "delai_moyen": int(self.avg_repollution_days),
        }


@dataclass(slots=True)
class ImpactPeriodStats:
    actions: int = 0
    kg: float = 0.0
    megots: int = 0
    benevoles: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "actions": int(self.actions),
            "kg": float(self.kg),
            "megots": int(self.megots),
            "benevoles": int(self.benevoles),
        }


@dataclass(slots=True)
class SubmissionPrecheck:
    decision: str
    priority: int
    score: int
    reasons: list[str]


@dataclass(slots=True)
class SheetActionRecord:
    payload: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return dict(self.payload)


@dataclass(slots=True, frozen=True)
class PendingPublicPreview:
    submission_id: str
    public_ref: str
    mission_type: str
    dechets_kg: float
    megots: int
    benevoles: int
    impact_level: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.submission_id,
            "public_ref": self.public_ref,
            "mission_type": self.mission_type,
            "dechets_kg": float(self.dechets_kg),
            "megots": int(self.megots),
            "benevoles": int(self.benevoles),
            "impact_level": self.impact_level,
        }
