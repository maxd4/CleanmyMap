from __future__ import annotations

import json
from pathlib import Path

from scripts import ui_inventory


def _write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _make_minimal_ui_project(root: Path) -> None:
    _write_file(
        root / "app.py",
        "\n".join(
            [
                "TRANSLATIONS = {",
                "    'fr': {'tab_home': 'Accueil', 'tab_map': 'Carte', 'tab_admin': 'Admin'},",
                "    'en': {'tab_home': 'Home', 'tab_map': 'Map', 'tab_admin': 'Admin'},",
                "}",
                "tab_specs = [",
                "    {'id': 'home', 'key': 'tab_home'},",
                "    {'id': 'map', 'key': 'tab_map'},",
                "    {'id': 'admin', 'key': 'tab_admin'},",
                "]",
                "tab_placeholders = {}",
                "tab_home = tab_placeholders['home']",
                "tab_map = tab_placeholders['map']",
                "tab_admin = tab_placeholders['admin']",
                "with tab_home:",
                "    pass",
                "with tab_map:",
                "    render_map_tab(MapTabContext())",
                "with tab_admin:",
                "    render_admin_tab(AdminTabContext())",
            ]
        )
        + "\n",
    )

    _write_file(
        root / "src" / "ui" / "map.py",
        "def render_map_tab(ctx):\n    return None\n",
    )
    _write_file(
        root / "src" / "ui" / "report.py",
        "def render_report_tab(ctx):\n    return None\n",
    )
    _write_file(
        root / "src" / "ui" / "admin.py",
        "\n".join(
            [
                "from src.ui.admin_components.auth import ensure_admin_authenticated",
                "from src.ui.admin_components.map_review import render_admin_map_review",
                "from src.ui.admin_components.moderation import render_admin_moderation",
                "from src.ui.admin_components.exports import render_admin_exports",
                "",
                "def render_admin_tab(ctx):",
                "    ensure_admin_authenticated(ctx)",
                "    render_admin_map_review(ctx)",
                "    render_admin_moderation(ctx)",
                "    render_admin_exports(None)",
            ]
        )
        + "\n",
    )
    _write_file(
        root / "src" / "ui" / "admin_components" / "auth.py",
        "def ensure_admin_authenticated(ctx):\n    return 'ok'\n",
    )
    _write_file(
        root / "src" / "ui" / "admin_components" / "map_review.py",
        "def render_admin_map_review(ctx):\n    return None\n",
    )
    _write_file(
        root / "src" / "ui" / "admin_components" / "moderation.py",
        "def render_admin_moderation(ctx):\n    return None\n",
    )
    _write_file(
        root / "src" / "ui" / "admin_components" / "exports.py",
        "def render_admin_exports(df):\n    return None\n",
    )


def test_regenerate_writes_new_inventory_schema(tmp_path: Path) -> None:
    _make_minimal_ui_project(tmp_path)
    baseline = tmp_path / "docs" / "wiki" / "ui_inventory.baseline.json"
    current = tmp_path / "artifacts" / "ui_inventory.current.json"

    code = ui_inventory.main(
        [
            "regenerate",
            "--root",
            str(tmp_path),
            "--baseline",
            str(baseline),
            "--current",
            str(current),
            "--write-baseline",
        ]
    )

    assert code == 0
    assert baseline.exists()
    data = json.loads(baseline.read_text(encoding="utf-8"))
    assert "generated_at" in data
    assert "tabs" in data
    assert "renderers" in data
    assert "admin_components" in data
    assert "unreferenced_renderers" in data
    assert "missing_references" in data
    map_tab = next(tab for tab in data["tabs"] if tab["id"] == "map")
    assert map_tab["target_renderer"] == "render_map_tab"
    assert map_tab["target_module"] == "src.ui.map"
    component_ids = [entry["id"] for entry in data["admin_components"]]
    assert component_ids == ["auth", "map_review", "moderation", "exports"]


def test_check_returns_zero_when_baseline_matches(tmp_path: Path) -> None:
    _make_minimal_ui_project(tmp_path)
    baseline = tmp_path / "docs" / "wiki" / "ui_inventory.baseline.json"
    current = tmp_path / "artifacts" / "ui_inventory.current.json"
    diff = tmp_path / "artifacts" / "ui_inventory.diff.md"

    assert (
        ui_inventory.main(
            [
                "regenerate",
                "--root",
                str(tmp_path),
                "--baseline",
                str(baseline),
                "--current",
                str(current),
                "--write-baseline",
            ]
        )
        == 0
    )
    assert (
        ui_inventory.main(
            [
                "check",
                "--root",
                str(tmp_path),
                "--baseline",
                str(baseline),
                "--current",
                str(current),
                "--diff",
                str(diff),
            ]
        )
        == 0
    )


def test_check_returns_three_on_drift_and_writes_diff(tmp_path: Path) -> None:
    _make_minimal_ui_project(tmp_path)
    baseline = tmp_path / "docs" / "wiki" / "ui_inventory.baseline.json"
    current = tmp_path / "artifacts" / "ui_inventory.current.json"
    diff = tmp_path / "artifacts" / "ui_inventory.diff.md"

    assert (
        ui_inventory.main(
            [
                "regenerate",
                "--root",
                str(tmp_path),
                "--baseline",
                str(baseline),
                "--current",
                str(current),
                "--write-baseline",
            ]
        )
        == 0
    )

    app_path = tmp_path / "app.py"
    app_content = app_path.read_text(encoding="utf-8")
    app_path.write_text(
        app_content.replace(
            "{'id': 'admin', 'key': 'tab_admin'},",
            "{'id': 'community', 'key': 'tab_admin'},",
        ),
        encoding="utf-8",
    )

    code = ui_inventory.main(
        [
            "check",
            "--root",
            str(tmp_path),
            "--baseline",
            str(baseline),
            "--current",
            str(current),
            "--diff",
            str(diff),
        ]
    )

    assert code == 3
    assert diff.exists()
    assert "Drift detected" in diff.read_text(encoding="utf-8")


def test_cleanup_dry_run_reports_without_mutating_sources(tmp_path: Path) -> None:
    _make_minimal_ui_project(tmp_path)
    baseline = tmp_path / "docs" / "wiki" / "ui_inventory.baseline.json"
    current = tmp_path / "artifacts" / "ui_inventory.current.json"
    report = tmp_path / "artifacts" / "ui_inventory.cleanup.md"

    assert (
        ui_inventory.main(
            [
                "regenerate",
                "--root",
                str(tmp_path),
                "--baseline",
                str(baseline),
                "--current",
                str(current),
                "--write-baseline",
            ]
        )
        == 0
    )

    before = (tmp_path / "app.py").read_text(encoding="utf-8")
    code = ui_inventory.main(
        [
            "cleanup",
            "--root",
            str(tmp_path),
            "--baseline",
            str(baseline),
            "--current",
            str(current),
            "--report",
            str(report),
            "--dry-run",
        ]
    )
    after = (tmp_path / "app.py").read_text(encoding="utf-8")

    assert code == 0
    assert report.exists()
    assert "UI Cleanup Diagnostic" in report.read_text(encoding="utf-8")
    assert before == after


def test_check_returns_parse_error_code_on_invalid_python(tmp_path: Path) -> None:
    _make_minimal_ui_project(tmp_path)
    baseline = tmp_path / "docs" / "wiki" / "ui_inventory.baseline.json"
    current = tmp_path / "artifacts" / "ui_inventory.current.json"
    diff = tmp_path / "artifacts" / "ui_inventory.diff.md"

    assert (
        ui_inventory.main(
            [
                "regenerate",
                "--root",
                str(tmp_path),
                "--baseline",
                str(baseline),
                "--current",
                str(current),
                "--write-baseline",
            ]
        )
        == 0
    )

    (tmp_path / "src" / "ui" / "map.py").write_text("def render_map_tab(:\n", encoding="utf-8")
    code = ui_inventory.main(
        [
            "check",
            "--root",
            str(tmp_path),
            "--baseline",
            str(baseline),
            "--current",
            str(current),
            "--diff",
            str(diff),
        ]
    )
    assert code == 11
