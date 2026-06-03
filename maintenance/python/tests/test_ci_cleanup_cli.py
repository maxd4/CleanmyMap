from __future__ import annotations

from pathlib import Path

from scripts.ci_cleanup import main


def _write_clean_fixture(root: Path) -> None:
    (root / "documentation" / "operations").mkdir(parents=True)
    (root / "documentation" / "pages_site").mkdir(parents=True)
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


def test_cli_check_exits_zero_on_clean_fixture(tmp_path: Path, capsys) -> None:
    _write_clean_fixture(tmp_path)
    code = main(["--root", str(tmp_path), "--check"])
    out = capsys.readouterr().out

    assert code == 0
    assert "Cleanup verification (read-only)" in out
    assert "Purpose: verify project hygiene rules without modifying files." in out


def test_cli_check_exits_non_zero_on_dirty_fixture(tmp_path: Path, capsys) -> None:
    _write_clean_fixture(tmp_path)
    (tmp_path / "documentation" / "README.md").write_text("broken\n", encoding="utf-8")

    code = main(["--root", str(tmp_path), "--check"])
    out = capsys.readouterr().out

    assert code == 1
    assert "cleanup verification detected error rules" in out.lower()
