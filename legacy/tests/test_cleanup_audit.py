from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from pathlib import Path

from src.maintenance.cleanup_audit import (
    compute_cooldown_remaining_seconds,
    run_cleanup_audit,
)


def _write_clean_fixture(root: Path) -> None:
    (root / "docs" / "wiki").mkdir(parents=True)
    (root / ".gitignore").write_text(
        "\n".join(
            [
                "artifacts/",
                "streamlit.out.log",
                "streamlit.err.log",
                ".streamlit_pid.txt",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (root / "README.md").write_text("scripts/ci_cleanup.py\ndocumentation/repo-docs/wiki\n", encoding="utf-8")
    (root / "docs" / "wiki" / "README.md").write_text("- MAINTENANCE\n", encoding="utf-8")
    (root / "docs" / "wiki" / "MAINTENANCE.md").write_text("ci_cleanup.py\n", encoding="utf-8")
    (root / "docs" / "wiki" / "CHANGELOG.md").write_text("# Changelog\n", encoding="utf-8")


def _hash_tree(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def test_cleanup_audit_returns_deterministic_structure(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)

    report = run_cleanup_audit(tmp_path).to_dict()
    assert report["status"] == "clean"
    assert report["error_count"] == 0
    assert report["rule_count"] == 3
    assert {rule["rule_id"] for rule in report["rules"]} == {
        "runtime_artifacts",
        "utf8_bom",
        "docs_wiring",
    }


def test_cleanup_audit_detects_rule_violations(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)
    (tmp_path / ".gitignore").write_text("streamlit.out.log\n", encoding="utf-8")
    (tmp_path / "docs" / "wiki" / "README.md").write_bytes(b"\xef\xbb\xbfbroken\n")
    (tmp_path / "docs" / "wiki" / "MAINTENANCE.md").write_text("missing reference\n", encoding="utf-8")

    report = run_cleanup_audit(tmp_path).to_dict()
    assert report["status"] == "issues"
    failed_ids = {rule["rule_id"] for rule in report["rules"] if rule["status"] == "error"}
    assert "runtime_artifacts" in failed_ids
    assert "utf8_bom" in failed_ids
    assert "docs_wiring" in failed_ids


def test_cleanup_audit_does_not_mutate_files(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)
    before = _hash_tree(tmp_path)
    _ = run_cleanup_audit(tmp_path)
    after = _hash_tree(tmp_path)
    assert before == after


def test_compute_cooldown_remaining_seconds() -> None:
    now = datetime(2026, 1, 1, 12, 0, 0)
    assert compute_cooldown_remaining_seconds(None, 45, now=now) == 0
    last = (now - timedelta(seconds=10)).isoformat()
    assert compute_cooldown_remaining_seconds(last, 45, now=now) == 35
    old = (now - timedelta(seconds=90)).isoformat()
    assert compute_cooldown_remaining_seconds(old, 45, now=now) == 0
