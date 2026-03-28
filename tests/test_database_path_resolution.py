from __future__ import annotations

from pathlib import Path

from src import database as db


def test_resolve_db_path_prefers_env(tmp_path: Path) -> None:
    env_path = tmp_path / "custom" / "runtime.db"
    resolved = db.resolve_db_path({"CLEANMYMAP_DB_PATH": str(env_path)})
    assert resolved == env_path


def test_resolve_db_path_fallback_posix(tmp_path: Path) -> None:
    resolved = db.resolve_db_path({}, home=tmp_path, platform_name="posix")
    assert resolved == tmp_path / ".local" / "state" / "cleanmymap" / "runtime" / "cleanmymap.db"


def test_get_connection_creates_parent_directory(tmp_path: Path, monkeypatch) -> None:
    db_file = tmp_path / "nested" / "runtime" / "cleanmymap.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_file))
    monkeypatch.setattr(db, "_LOGGED_DB_PATH", None)

    conn = db.get_connection()
    conn.close()

    assert db_file.parent.exists()
    assert db_file.exists()
