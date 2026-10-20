import sqlite3

from src import database as db


EXPECTED_TABLES = {
    "submissions": {"id", "nom", "status", "description", "website_url", "eco_points", "validated_at", "is_real"},
    "users": {"id", "email", "role", "created_at"},
    "messages": {"id", "author", "content", "image_url", "created_at"},
    "subscribers": {"id", "email", "subscribed_at"},
    "spots": {"id", "lat", "lon", "adresse", "type_dechet", "photo_url", "reporter_name", "status", "created_at"},
    "community_events": {"id", "title", "event_date", "location", "description", "organizer", "created_at"},
    "event_rsvps": {"id", "event_id", "participant_name", "status", "created_at", "updated_at"},
    "admin_audit_log": {"id", "actor", "action", "submission_id", "before_snapshot", "after_snapshot", "created_at"},
    "ux_events": {"id", "event_type", "tab_id", "action_name", "field_name", "message", "payload", "created_at"},
    "volunteer_feedback": {"id", "author", "category", "content", "created_at"},
    "mission_validations": {"id", "submission_id", "voter_name", "vote", "created_at"},
}


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


def test_init_db_starts_empty_then_creates_expected_tables_and_columns(tmp_path, monkeypatch):
    db_path = tmp_path / "schema" / "cleanmymap.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_path))

    before = db.get_connection()
    assert before.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall() == []
    before.close()

    db.init_db()

    conn = sqlite3.connect(db_path)
    tables = {
        row[0]: {column[1] for column in conn.execute(f"PRAGMA table_info({row[0]})")}
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    }
    conn.close()

    assert set(tables) == set(EXPECTED_TABLES)
    for table, columns in EXPECTED_TABLES.items():
        assert columns <= tables[table]


def test_init_db_is_idempotent_and_tolerates_historical_columns(tmp_path, monkeypatch):
    db_path = tmp_path / "migrations" / "cleanmymap.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_path))
    db_path.parent.mkdir(parents=True)
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE submissions (id TEXT PRIMARY KEY, description TEXT)")
    conn.commit()
    conn.close()

    db.init_db()
    db.init_db()

    conn = sqlite3.connect(db_path)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(submissions)")}
    conn.close()
    assert {"id", "description", "website_url", "is_real"} <= columns


def test_non_duplicate_migration_error_uses_canonical_exception_logger(monkeypatch):
    calls: list[dict[str, object]] = []

    class FailingCursor:
        def execute(self, sql):
            raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("src.logging_utils.log_exception", lambda **payload: calls.append(payload))

    db._alter_table_add_column(FailingCursor(), "ALTER TABLE submissions ADD COLUMN x TEXT", "submissions.x")

    assert calls and calls[0]["component"] == "database"
    assert calls[0]["action"] == "migration"
    assert isinstance(calls[0]["exc"], sqlite3.OperationalError)
    assert calls[0]["message"] == "Migration error for submissions.x"


def test_facade_forwards_repository_parameters_and_connection_factory(monkeypatch):
    connection_factory = object()
    calls: list[tuple[object, ...]] = []

    def fake_get_user_impact_stats(get_connection, user):
        calls.append((get_connection, user))
        return {"nom": user, "total_points": 1, "total_kg": 2.0, "nb_actions": 3}

    monkeypatch.setattr(db, "get_connection", connection_factory)
    monkeypatch.setattr(db.submissions_repo, "get_user_impact_stats", fake_get_user_impact_stats)

    result = db.get_user_impact_stats("Camille")

    assert result["nom"] == "Camille"
    assert calls == [(connection_factory, "Camille")]
