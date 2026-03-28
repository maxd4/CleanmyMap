from src.models import (
    CriticalZoneStat,
    ImpactPeriodStats,
    PendingPublicPreview,
    SheetActionRecord,
    SubmissionPrecheck,
)


def test_critical_zone_stat_public_dict():
    zone = CriticalZoneStat(address="Rue A", count=4, avg_repollution_days=9)
    assert zone.to_public_dict() == {"count": 4, "delai_moyen": 9}


def test_impact_period_stats_as_dict():
    stats = ImpactPeriodStats(actions=3, kg=4.5, megots=120, benevoles=7)
    assert stats.as_dict()["kg"] == 4.5
    assert stats.as_dict()["megots"] == 120


def test_sheet_action_record_and_submission_precheck_models():
    payload = {"id": "x1", "adresse": "Paris"}
    record = SheetActionRecord(payload=payload)
    precheck = SubmissionPrecheck(decision="Pre-validee", priority=1, score=4, reasons=[])

    assert record.as_dict()["id"] == "x1"
    assert precheck.priority == 1


def test_pending_public_preview_model():
    preview = PendingPublicPreview(
        submission_id="sub_12345678",
        public_ref="sub_1234",
        mission_type="Parc",
        dechets_kg=3.2,
        megots=90,
        benevoles=4,
        impact_level="modere",
    )
    payload = preview.as_dict()
    assert payload["mission_type"] == "Parc"
    assert "adresse" not in payload
