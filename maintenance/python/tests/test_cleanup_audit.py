from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from src.maintenance.cleanup_audit import (
    compute_cooldown_remaining_seconds,
    run_cleanup_audit,
)


def _write_clean_fixture(root: Path, artifact_rule: str = "artifacts/") -> None:
    (root / "documentation" / "operations").mkdir(parents=True)
    (root / "documentation" / "pages_site").mkdir(parents=True)
    (root / ".gitignore").write_text(
        "\n".join(
            [
                artifact_rule,
                "streamlit.out.log",
                "streamlit.err.log",
                ".streamlit_pid.txt",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (root / "README.md").write_text("documentation/README.md\n", encoding="utf-8")
    (root / "documentation" / "README.md").write_text(
        "operations/README.md\npages_site/INDEX.md\n",
        encoding="utf-8",
    )
    (root / "documentation" / "operations" / "README.md").write_text(
        "MAINTENANCE.md\nCHANGELOG.md\n",
        encoding="utf-8",
    )
    (root / "documentation" / "pages_site" / "INDEX.md").write_text("INDEX.md\n", encoding="utf-8")


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


@pytest.mark.parametrize("artifact_rule", ["artifacts/", "**/artifacts/"])
def test_cleanup_audit_accepts_semantic_artifact_patterns(tmp_path: Path, artifact_rule: str) -> None:
    _write_clean_fixture(tmp_path, artifact_rule=artifact_rule)

    report = run_cleanup_audit(tmp_path).to_dict()

    assert report["status"] == "clean"
    assert next(rule for rule in report["rules"] if rule["rule_id"] == "runtime_artifacts")["status"] == "ok"


@pytest.mark.parametrize("missing_pattern", ["streamlit.out.log", "streamlit.err.log", ".streamlit_pid.txt"])
def test_cleanup_audit_requires_streamlit_protections(tmp_path: Path, missing_pattern: str) -> None:
    _write_clean_fixture(tmp_path)
    patterns = [line for line in (tmp_path / ".gitignore").read_text(encoding="utf-8").splitlines() if line != missing_pattern]
    (tmp_path / ".gitignore").write_text("\n".join(patterns) + "\n", encoding="utf-8")

    report = run_cleanup_audit(tmp_path).to_dict()
    runtime_rule = next(rule for rule in report["rules"] if rule["rule_id"] == "runtime_artifacts")

    assert runtime_rule["status"] == "error"
    assert missing_pattern in runtime_rule["technical_details"][0]


def test_cleanup_audit_detects_complete_absence_of_runtime_protection(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)
    (tmp_path / ".gitignore").write_text("# unrelated protection\n", encoding="utf-8")

    report = run_cleanup_audit(tmp_path).to_dict()
    runtime_rule = next(rule for rule in report["rules"] if rule["rule_id"] == "runtime_artifacts")

    assert runtime_rule["status"] == "error"
    assert "artifacts/ or **/artifacts/" in runtime_rule["technical_details"][0]


def test_cleanup_audit_detects_rule_violations(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)
    (tmp_path / ".gitignore").write_text("streamlit.out.log\n", encoding="utf-8")
    (tmp_path / "documentation" / "README.md").write_bytes(b"\xef\xbb\xbfbroken\n")
    (tmp_path / "documentation" / "operations" / "README.md").write_text("missing reference\n", encoding="utf-8")

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
