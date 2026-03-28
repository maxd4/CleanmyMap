from src import database as db


def test_get_user_impact_stats_uses_only_approved_actions(tmp_path, monkeypatch):
    db_path = tmp_path / "cleanmymap_test.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_path))
    db.init_db()

    db.insert_submission(
        {
            "id": "approved_1",
            "nom": "Camille",
            "dechets_kg": 4.0,
            "eco_points": 30,
        },
        status="approved",
    )
    db.insert_submission(
        {
            "id": "approved_2",
            "nom": "camille",
            "dechets_kg": 6.5,
            "eco_points": 45,
        },
        status="approved",
    )
    db.insert_submission(
        {
            "id": "pending_1",
            "nom": "Camille",
            "dechets_kg": 100.0,
            "eco_points": 999,
        },
        status="pending",
    )

    stats = db.get_user_impact_stats("Camille")

    assert stats["nom"] == "Camille"
    assert stats["nb_actions"] == 2
    assert stats["total_points"] == 75
    assert stats["total_kg"] == 10.5


def test_get_user_impact_stats_unknown_user_returns_zeros(tmp_path, monkeypatch):
    db_path = tmp_path / "cleanmymap_test_empty.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_path))
    db.init_db()

    stats = db.get_user_impact_stats("Inconnu")

    assert stats["nb_actions"] == 0
    assert stats["total_points"] == 0
    assert stats["total_kg"] == 0.0
