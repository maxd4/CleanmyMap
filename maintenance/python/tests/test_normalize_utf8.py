from __future__ import annotations

from pathlib import Path

import pytest

import scripts.normalize_utf8 as normalize_utf8


def test_repair_mojibake_text_fixes_common_sequence() -> None:
    mojibake_fragment = b"\xe2\x80\x99".decode("latin-1")
    fixed, changed = normalize_utf8.repair_mojibake_text(f"Texte {mojibake_fragment} propre")
    assert changed is True
    assert mojibake_fragment not in fixed
    assert "'" in fixed


def test_analyze_file_detects_bom(tmp_path: Path) -> None:
    target = tmp_path / "sample.md"
    target.write_bytes(b"\xef\xbb\xbfBonjour")

    result = normalize_utf8.analyze_file(target)
    assert result.had_bom is True
    assert result.changed is True


def test_normalize_repo_write_removes_bom_and_preserves_valid_unicode(tmp_path: Path) -> None:
    target = tmp_path / "README.md"
    target.write_bytes(b"\xef\xbb\xbfTexte \xe2\x80\x99 propre")

    results = normalize_utf8.normalize_repo(tmp_path, write=True, candidates=[target])
    assert len(results) == 1
    assert results[0].changed is True
    assert target.read_text(encoding="utf-8") == "Texte ’ propre"


def test_repair_mojibake_text_recovers_utf8_from_double_encoded_sequence() -> None:
    fixed, changed = normalize_utf8.repair_mojibake_text("Fran" + b"\xc3\x83\xc2\xa7".decode("latin-1") + "ais")
    assert changed is True
    assert fixed == "Fran\u00e7ais"


def test_repair_mojibake_text_preserves_valid_french_unicode() -> None:
    clean_text = "Texte français : l’action — « propre » · 20 °C, déjà validé."

    fixed, changed = normalize_utf8.repair_mojibake_text(clean_text)

    assert changed is False
    assert fixed == clean_text


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Caf\xe9".encode("cp1252"), "Café"),
        ("Crème brûlée".encode("latin-1"), "Crème brûlée"),
    ],
)
def test_analyze_file_decodes_cp1252_and_latin1_fallbacks(tmp_path: Path, raw: bytes, expected: str) -> None:
    target = tmp_path / "legacy.txt"
    target.write_bytes(raw)

    result = normalize_utf8.analyze_file(target)

    assert result.encoding_issue is True
    assert result.normalized_text == expected
    assert result.changed is True


def test_analyze_file_replaces_bytes_that_cannot_form_valid_text(tmp_path: Path) -> None:
    target = tmp_path / "invalid.txt"
    target.write_bytes(b"prefix\x81suffix")

    result = normalize_utf8.analyze_file(target)

    assert result.encoding_issue is True
    assert result.normalized_text == "prefix\x81suffix"


def test_normalize_repo_ignores_binary_and_non_text_extensions(tmp_path: Path) -> None:
    binary = tmp_path / "image.bin"
    binary.write_bytes(b"\x00\xff\x00")
    source = tmp_path / "source.py"
    source.write_bytes(b"print('ok')")

    results = normalize_utf8.normalize_repo(tmp_path, write=False, candidates=[binary, source])

    assert [result.path for result in results] == [source]
    assert binary.read_bytes() == b"\x00\xff\x00"


def test_normalize_repo_does_not_rewrite_unchanged_text(tmp_path: Path) -> None:
    target = tmp_path / "clean.md"
    content = "Texte français déjà valide\n"
    target.write_text(content, encoding="utf-8")

    results = normalize_utf8.normalize_repo(tmp_path, write=True, candidates=[target])

    assert results[0].changed is False
    assert target.read_text(encoding="utf-8") == content


def test_git_listing_empty_or_invalid_paths_is_safe(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(normalize_utf8.subprocess, "run", lambda *args, **kwargs: type("Completed", (), {"stdout": ""})())
    assert normalize_utf8._git_tracked_files(tmp_path) == []

    monkeypatch.setattr(normalize_utf8.subprocess, "run", lambda *args, **kwargs: type("Completed", (), {"stdout": "missing.md\n"})())
    assert normalize_utf8._git_tracked_files(tmp_path) == []


def test_main_reports_only_the_configured_number_of_changes(tmp_path: Path, monkeypatch, capsys) -> None:
    targets = []
    for index in range(3):
        target = tmp_path / f"file-{index}.md"
        target.write_bytes(b"\xef\xbb\xbfchanged")
        targets.append(target)
    monkeypatch.setattr(normalize_utf8, "_git_tracked_files", lambda _root: targets)

    assert normalize_utf8.main(["--root", str(tmp_path), "--check", "--max-report", "1"]) == 1
    output = capsys.readouterr().out
    assert output.count(" - file-") == 1
    assert "2 additional changed files omitted" in output


def test_main_rejects_check_and_write_together(tmp_path: Path):
    with pytest.raises(SystemExit) as raised:
        normalize_utf8.main(["--root", str(tmp_path), "--check", "--write"])
    assert raised.value.code == 2


def test_normalize_repo_propagates_read_and_write_errors(tmp_path: Path, monkeypatch) -> None:
    target = tmp_path / "failure.md"
    target.write_bytes(b"\xef\xbb\xbfneeds change")
    with monkeypatch.context() as patcher:
        patcher.setattr(Path, "read_bytes", lambda _path: (_ for _ in ()).throw(OSError("read denied")))
        with pytest.raises(OSError, match="read denied"):
            normalize_utf8.normalize_repo(tmp_path, write=False, candidates=[target])

    target.write_bytes(b"\xef\xbb\xbfneeds change")
    with monkeypatch.context() as patcher:
        patcher.setattr(Path, "write_text", lambda *args, **kwargs: (_ for _ in ()).throw(OSError("write denied")))
        with pytest.raises(OSError, match="write denied"):
            normalize_utf8.normalize_repo(tmp_path, write=True, candidates=[target])


def test_analyze_file_preserves_valid_french_document(tmp_path: Path) -> None:
    target = tmp_path / "document.md"
    clean_text = "# Méthode — l’action « terrain » · validée à 20 °C\n"
    target.write_bytes(clean_text.encode("utf-8"))

    result = normalize_utf8.analyze_file(target)

    assert result.changed is False
    assert result.normalized_text == clean_text


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
