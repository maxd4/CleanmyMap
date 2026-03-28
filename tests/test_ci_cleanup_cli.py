from __future__ import annotations

from pathlib import Path

from scripts.ci_cleanup import main


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
    (root / "README.md").write_text("scripts.ui_inventory\ndocs/wiki\n", encoding="utf-8")
    (root / "docs" / "wiki" / "README.md").write_text("- MAINTENANCE\n- UI_INVENTORY\n", encoding="utf-8")
    (root / "docs" / "wiki" / "MAINTENANCE.md").write_text("ci_cleanup.py\n", encoding="utf-8")
    (root / "docs" / "wiki" / "CHANGELOG.md").write_text("# Changelog\n", encoding="utf-8")


def test_cli_check_exits_zero_on_clean_fixture(tmp_path: Path, capsys) -> None:
    _write_clean_fixture(tmp_path)
    code = main(["--root", str(tmp_path), "--check"])
    out = capsys.readouterr().out

    assert code == 0
    assert "Cleanup verification (read-only)" in out
    assert "Purpose: verify project hygiene rules without modifying files." in out


def test_cli_check_exits_non_zero_on_dirty_fixture(tmp_path: Path, capsys) -> None:
    _write_clean_fixture(tmp_path)
    (tmp_path / "docs" / "wiki" / "README.md").write_text("broken\n", encoding="utf-8")

    code = main(["--root", str(tmp_path), "--check"])
    out = capsys.readouterr().out

    assert code == 1
    assert "cleanup verification detected error rules" in out.lower()

