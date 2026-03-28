from __future__ import annotations

from pathlib import Path

import scripts.check_runtime_db_tracking as runtime_check


def test_find_blocked_runtime_db_files_detects_tracked_db(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        runtime_check,
        "_tracked_files",
        lambda _root: ["README.md", "data/cleanmymap.db", "runtime/local.db", "data/seed/runtime_seed_anonymized.json"],
    )

    blocked = runtime_check.find_blocked_runtime_db_files(tmp_path)
    assert "data/cleanmymap.db" in blocked
    assert "runtime/local.db" in blocked
    assert all(not path.endswith("runtime_seed_anonymized.json") for path in blocked)
