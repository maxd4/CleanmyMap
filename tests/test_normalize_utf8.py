from __future__ import annotations

from pathlib import Path

import scripts.normalize_utf8 as normalize_utf8
from scripts.normalize_utf8 import analyze_file, normalize_repo, repair_mojibake_text


def test_repair_mojibake_text_fixes_common_sequence() -> None:
    fixed, changed = repair_mojibake_text("Texte ’ propre")
    assert changed is True
    assert "’" not in fixed
    assert "'" in fixed


def test_analyze_file_detects_bom(tmp_path: Path) -> None:
    target = tmp_path / "sample.md"
    target.write_bytes(b"\xef\xbb\xbfBonjour")

    result = analyze_file(target)
    assert result.had_bom is True
    assert result.changed is True


def test_normalize_repo_write_rewrites_text_without_bom(tmp_path: Path) -> None:
    target = tmp_path / "README.md"
    target.write_bytes(b"\xef\xbb\xbfTexte \xe2\x80\x99 propre")

    results = normalize_repo(tmp_path, write=True, candidates=[target])
    assert len(results) == 1
    assert results[0].changed is True
    assert target.read_text(encoding="utf-8") == "Texte ' propre"


def test_repair_mojibake_text_recovers_utf8_from_double_encoded_sequence() -> None:
    fixed, changed = repair_mojibake_text("FranÃ§ais")
    assert changed is True
    assert fixed == "Français"


def test_main_check_and_write_modes_with_monkeypatched_git_listing(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "sample.md"
    target.write_bytes(b"\xef\xbb\xbfTexte \xc3\xa9")

    monkeypatch.setattr(normalize_utf8, "_git_tracked_files", lambda _root: [target])

    check_code = normalize_utf8.main(["--root", str(tmp_path), "--check"])
    assert check_code == 1

    write_code = normalize_utf8.main(["--root", str(tmp_path), "--write"])
    assert write_code == 0

    second_check_code = normalize_utf8.main(["--root", str(tmp_path), "--check"])
    assert second_check_code == 0
