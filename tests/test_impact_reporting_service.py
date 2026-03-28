import pandas as pd

from src.services import impact_reporting as ir


def test_get_critical_zones_detects_recurrence():
    df = pd.DataFrame(
        [
            {"date": "2026-01-01", "adresse": "Rue A", "est_propre": False},
            {"date": "2026-01-10", "adresse": "Rue A", "est_propre": False},
            {"date": "2026-01-20", "adresse": "Rue A", "est_propre": False},
            {"date": "2026-01-12", "adresse": "Rue B", "est_propre": False},
        ]
    )

    out = ir.get_critical_zones(df)
    assert "Rue A" in out
    assert out["Rue A"]["count"] == 3
    assert out["Rue A"]["delai_moyen"] >= 1
    assert "Rue B" not in out


def test_build_public_pdf_returns_bytes(tmp_path, monkeypatch):
    monkeypatch.setattr(ir, "OUTPUT_DIR", tmp_path)
    df = pd.DataFrame(
        [
            {
                "date": "2026-03-20",
                "adresse": "Paris",
                "est_propre": False,
                "megots": 100,
                "dechets_kg": 5.0,
                "benevoles": 3,
                "temps_min": 45,
                "type_lieu": "Rue",
            }
        ]
    )

    payload = ir.build_public_pdf(df, app_url="https://example.com", critical_zones={"Paris": {"count": 3, "delai_moyen": 7}}, lang="fr")
    assert isinstance(payload, (bytes, bytearray))
    assert len(payload) > 200


def test_get_eco_quartiers_and_districts_filters_recent_clean_data():
    df = pd.DataFrame(
        [
            {"date": "2026-03-01", "adresse": "1 Place Alpha Paris", "est_propre": True, "dechets_kg": 0},
            {"date": "2026-03-02", "adresse": "1 Place Alpha Paris", "est_propre": True, "dechets_kg": 0},
            {"date": "2026-03-03", "adresse": "2 Rue Beta Lyon", "est_propre": False, "dechets_kg": 2},
        ]
    )

    quartiers = ir.get_eco_quartiers(df)
    districts = ir.get_eco_districts(df)

    assert "1 Place Alpha Paris" in quartiers
    assert "Paris" in districts
    assert "Lyon" not in districts


def test_get_user_badge_progression_levels():
    df = pd.DataFrame([
        {"nom": "Alice", "est_propre": False, "adresse": "78 Versailles"} for _ in range(10)
    ])
    badge = ir.get_user_badge("alice", df)
    assert "Niv." in badge
