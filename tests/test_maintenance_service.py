from pathlib import Path

from src.services.maintenance import run_cleanup_diagnostic


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
    (root / "docs" / "wiki" / "README.md").write_text(
        "- MAINTENANCE\n- UI_INVENTORY\n",
        encoding="utf-8",
    )
    (root / "docs" / "wiki" / "MAINTENANCE.md").write_text("ci_cleanup.py\n", encoding="utf-8")
    (root / "docs" / "wiki" / "CHANGELOG.md").write_text("# Changelog\n", encoding="utf-8")


def test_cleanup_diagnostic_wrapper_is_ok_for_clean_fixture(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)

    report = run_cleanup_diagnostic(tmp_path).to_dict()
    assert report["status"] == "ok"
    assert report["error_count"] == 0
    assert report["findings"] == []


def test_cleanup_diagnostic_wrapper_detects_bom_regression(tmp_path: Path) -> None:
    _write_clean_fixture(tmp_path)
    (tmp_path / "docs" / "wiki" / "README.md").write_bytes(b"\xef\xbb\xbfbad\n")

    report = run_cleanup_diagnostic(tmp_path).to_dict()
    assert report["status"] == "failed"
    assert any(f["code"] == "UTF8_BOM" for f in report["findings"])

