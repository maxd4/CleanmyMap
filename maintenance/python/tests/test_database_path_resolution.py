from __future__ import annotations

from pathlib import Path

import pytest

from src import database as db


def test_resolve_db_path_prefers_env(tmp_path: Path) -> None:
    env_path = tmp_path / "custom" / "runtime.db"
    resolved = db.resolve_db_path({"CLEANMYMAP_DB_PATH": str(env_path)})
    assert resolved == env_path


def test_resolve_db_path_uses_sqlite_fallback_when_primary_is_absent(tmp_path: Path) -> None:
    env_path = tmp_path / "fallback" / "runtime.db"

    resolved = db.resolve_db_path({"SQLITE_DB_PATH": str(env_path)})

    assert resolved == env_path


def test_resolve_db_path_primary_environment_variable_wins_over_fallback(tmp_path: Path) -> None:
    primary = tmp_path / "primary.db"
    fallback = tmp_path / "fallback.db"

    resolved = db.resolve_db_path({"CLEANMYMAP_DB_PATH": str(primary), "SQLITE_DB_PATH": str(fallback)})

    assert resolved == primary


def test_resolve_db_path_fallback_posix(tmp_path: Path) -> None:
    resolved = db.resolve_db_path({}, home=tmp_path, platform_name="posix")
    assert resolved == tmp_path / ".local" / "state" / "cleanmymap" / "runtime" / "cleanmymap.db"


def test_resolve_db_path_uses_xdg_state_home_on_posix(tmp_path: Path) -> None:
    state_home = tmp_path / "xdg-state"

    resolved = db.resolve_db_path({"XDG_STATE_HOME": str(state_home)}, home=tmp_path, platform_name="posix")

    assert resolved == state_home / "cleanmymap" / "runtime" / "cleanmymap.db"


def test_resolve_db_path_uses_localappdata_on_windows(tmp_path: Path) -> None:
    local_app_data = tmp_path / "LocalAppData"

    resolved = db.resolve_db_path({"LOCALAPPDATA": str(local_app_data)}, home=tmp_path, platform_name="windows")

    assert resolved == local_app_data / "CleanMyMap" / "runtime" / "cleanmymap.db"


def test_resolve_db_path_uses_windows_home_when_localappdata_is_absent(tmp_path: Path) -> None:
    resolved = db.resolve_db_path({}, home=tmp_path, platform_name="nt")

    assert resolved == tmp_path / "AppData" / "Local" / "CleanMyMap" / "runtime" / "cleanmymap.db"


def test_get_connection_creates_parent_directory(tmp_path: Path, monkeypatch) -> None:
    db_file = tmp_path / "nested" / "runtime" / "cleanmymap.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_file))
    monkeypatch.setattr(db.get_connection, "_logged_db_path", None, raising=False)

    conn = db.get_connection()
    conn.close()

    assert db_file.parent.exists()
    assert db_file.exists()


def test_get_connection_enables_foreign_keys_and_logs_path_once(tmp_path: Path, monkeypatch) -> None:
    db_file = tmp_path / "runtime" / "cleanmymap.db"
    events: list[dict[str, object]] = []
    monkeypatch.setattr(db, "DB_PATH", str(db_file))
    monkeypatch.setattr(db.get_connection, "_logged_db_path", None, raising=False)
    monkeypatch.setattr("src.logging_utils.log_event", lambda **payload: events.append(payload))

    first = db.get_connection()
    second = db.get_connection()

    assert first.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    assert second.execute("PRAGMA foreign_keys").fetchone()[0] == 1
    assert events == [{
        "event": "db_path_resolved",
        "severity": "info",
        "component": "database",
        "context": {"path": str(db_file)},
    }]
    first.close()
    second.close()


def test_get_connection_logs_again_for_a_new_path(tmp_path: Path, monkeypatch) -> None:
    first_path = tmp_path / "first.db"
    second_path = tmp_path / "second.db"
    events: list[dict[str, object]] = []
    monkeypatch.setattr(db.get_connection, "_logged_db_path", None, raising=False)
    monkeypatch.setattr("src.logging_utils.log_event", lambda **payload: events.append(payload))

    monkeypatch.setattr(db, "DB_PATH", str(first_path))
    first = db.get_connection()
    first.close()
    monkeypatch.setattr(db, "DB_PATH", str(second_path))
    second = db.get_connection()
    second.close()

    assert [event["context"] for event in events] == [{"path": str(first_path)}, {"path": str(second_path)}]


def test_get_connection_remains_usable_when_path_logging_fails(tmp_path: Path, monkeypatch) -> None:
    db_file = tmp_path / "runtime" / "cleanmymap.db"
    monkeypatch.setattr(db, "DB_PATH", str(db_file))
    monkeypatch.setattr(db.get_connection, "_logged_db_path", None, raising=False)

    def fail_logging(**payload):
        raise RuntimeError("logger unavailable")

    monkeypatch.setattr("src.logging_utils.log_event", fail_logging)

    conn = db.get_connection()

    assert conn.execute("SELECT 1").fetchone() == (1,)
    conn.close()
