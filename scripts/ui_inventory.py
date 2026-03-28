from __future__ import annotations

import argparse
import ast
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import unified_diff
from pathlib import Path
from typing import Any, Iterable, Sequence

from src.services.maintenance import (
    DEFAULT_BASELINE_RELATIVE_PATH,
    collect_ui_inventory,
)

EXIT_OK = 0
EXIT_DRIFT = 3
EXIT_RUNTIME_ERROR = 10
EXIT_PARSE_ERROR = 11
EXIT_CONFIG_ERROR = 12

DEFAULT_CURRENT_RELATIVE_PATH = Path("artifacts/ui_inventory.current.json")
DEFAULT_DIFF_RELATIVE_PATH = Path("artifacts/ui_inventory.diff.md")
DEFAULT_CLEANUP_RELATIVE_PATH = Path("artifacts/ui_inventory.cleanup.md")

COMPARE_KEYS = (
    "schema_version",
    "tabs",
    "renderers",
    "admin_components",
    "unreferenced_renderers",
    "missing_references",
)

ADMIN_COMPONENT_ENTRYPOINTS = {
    "auth": "ensure_admin_authenticated",
    "map_review": "render_admin_map_review",
    "moderation": "render_admin_moderation",
    "exports": "render_admin_exports",
}


@dataclass(frozen=True)
class RendererRef:
    module: str
    function: str
    file: str

    def to_dict(self) -> dict[str, str]:
        return {"module": self.module, "function": self.function, "file": self.file}


def _resolve_path(root: Path, path_value: str | Path) -> Path:
    candidate = Path(path_value)
    if candidate.is_absolute():
        return candidate
    return (root / candidate).resolve()


def _read_ast(path: Path) -> ast.Module:
    try:
        return ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    except (OSError, UnicodeError, SyntaxError) as exc:
        raise RuntimeError(f"Unable to parse {path}: {exc}") from exc


def _read_literal(path: Path, variable_names: Sequence[str]) -> Any:
    module = _read_ast(path)
    for variable in variable_names:
        for node in module.body:
            if not isinstance(node, ast.Assign):
                continue
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == variable:
                    return ast.literal_eval(node.value)
    names = ", ".join(variable_names)
    raise RuntimeError(f"None of [{names}] found in {path}.")


def _iter_renderer_defs(py_path: Path) -> Iterable[str]:
    module = _read_ast(py_path)
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name.startswith("render_"):
            yield node.name


def _discover_renderers(root: Path) -> list[RendererRef]:
    renderers: list[RendererRef] = []
    search_roots = (root / "src" / "ui", root / "src" / "pages")
    for search_root in search_roots:
        if not search_root.exists():
            continue
        for py_path in sorted(search_root.rglob("*.py")):
            if py_path.name == "__init__.py":
                continue
            rel = py_path.relative_to(root).as_posix()
            module = rel[:-3].replace("/", ".")
            for function_name in _iter_renderer_defs(py_path):
                renderers.append(RendererRef(module=module, function=function_name, file=rel))
    return sorted(renderers, key=lambda item: (item.module, item.function))


def _get_name(node: ast.AST | None) -> str | None:
    if node is None:
        return None
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def _extract_tab_var_to_id(module: ast.Module) -> dict[str, str]:
    tab_vars: dict[str, str] = {}
    for node in module.body:
        if not isinstance(node, ast.Assign):
            continue
        if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
            continue
        target_name = node.targets[0].id
        value = node.value

        if isinstance(value, ast.Subscript) and isinstance(value.value, ast.Name) and value.value.id == "tab_placeholders":
            tab_id = None
            if isinstance(value.slice, ast.Constant) and isinstance(value.slice.value, str):
                tab_id = value.slice.value
            if tab_id:
                tab_vars[target_name] = tab_id
                continue

        if isinstance(value, ast.Name) and value.id in tab_vars:
            tab_vars[target_name] = tab_vars[value.id]
    return tab_vars


def _find_renderer_call_name(block_body: Sequence[ast.stmt]) -> str | None:
    for stmt in block_body:
        for inner in ast.walk(stmt):
            if isinstance(inner, ast.Call):
                call_name = _get_name(inner.func)
                if call_name and call_name.startswith("render_") and call_name != "render_tab_header":
                    return call_name
    return None


def _extract_tab_targets(app_path: Path) -> dict[str, str]:
    module = _read_ast(app_path)
    tab_var_to_id = _extract_tab_var_to_id(module)
    targets: dict[str, str] = {}

    for node in module.body:
        if not isinstance(node, ast.With):
            continue
        if not node.items:
            continue
        container_name = _get_name(node.items[0].context_expr)
        if not container_name or container_name not in tab_var_to_id:
            continue
        tab_id = tab_var_to_id[container_name]
        renderer_name = _find_renderer_call_name(node.body)
        targets[tab_id] = renderer_name or f"inline::{tab_id}"
    return targets


def _extract_local_renderer_functions(app_path: Path) -> set[str]:
    module = _read_ast(app_path)
    local_names: set[str] = set()
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name.startswith("render_"):
            local_names.add(node.name)
    return local_names


def _extract_admin_components(root: Path) -> list[dict[str, Any]]:
    admin_components_dir = root / "src" / "ui" / "admin_components"
    admin_py = root / "src" / "ui" / "admin.py"
    admin_source = admin_py.read_text(encoding="utf-8") if admin_py.exists() else ""

    result: list[dict[str, Any]] = []
    for component_id, function_name in ADMIN_COMPONENT_ENTRYPOINTS.items():
        file_path = admin_components_dir / f"{component_id}.py"
        module_path = f"src.ui.admin_components.{component_id}"
        available = False
        if file_path.exists():
            available = function_name in set(_iter_renderer_defs(file_path)) or function_name in file_path.read_text(
                encoding="utf-8"
            )
        referenced = function_name in admin_source
        result.append(
            {
                "id": component_id,
                "module": module_path,
                "function": function_name,
                "available": bool(available),
                "referenced": bool(referenced),
            }
        )
    return result


def build_ui_inventory(root: Path) -> dict[str, Any]:
    root = root.resolve()
    app_path = root / "app.py"
    if not app_path.exists():
        raise RuntimeError(f"Missing app.py under {root}")

    legacy_inventory = collect_ui_inventory(root)
    tab_specs = _read_literal(app_path, ("tab_specs", "TAB_ITEMS", "tab_items"))
    tab_targets = _extract_tab_targets(app_path)
    local_renderers = _extract_local_renderer_functions(app_path)
    renderers = _discover_renderers(root)
    renderers_by_function = {item.function: item for item in renderers}

    tabs: list[dict[str, str]] = []
    missing_references: set[str] = set()
    used_renderer_functions: set[str] = set()

    for spec in tab_specs:
        tab_id = str(spec.get("id", ""))
        label_key = str(spec.get("key", ""))
        target_renderer = tab_targets.get(tab_id, f"inline::{tab_id}")
        target_module = "app.py"
        if target_renderer in local_renderers:
            target_renderer = f"inline::{tab_id}"
        if target_renderer.startswith("render_"):
            renderer_ref = renderers_by_function.get(target_renderer)
            if renderer_ref is None:
                missing_references.add(target_renderer)
                target_module = "missing"
            else:
                target_module = renderer_ref.module
                used_renderer_functions.add(target_renderer)
        tabs.append(
            {
                "id": tab_id,
                "label_key": label_key,
                "target_renderer": target_renderer,
                "target_module": target_module,
            }
        )

    admin_components = _extract_admin_components(root)
    for component in admin_components:
        if component["referenced"]:
            used_renderer_functions.add(component["function"])
        if component["referenced"] and not component["available"]:
            missing_references.add(component["function"])

    unreferenced_renderers = sorted(
        [
            {"module": r.module, "function": r.function}
            for r in renderers
            if r.function not in used_renderer_functions
        ],
        key=lambda item: (item["module"], item["function"]),
    )

    inventory: dict[str, Any] = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tabs": tabs,
        "renderers": [renderer.to_dict() for renderer in renderers],
        "admin_components": admin_components,
        "unreferenced_renderers": unreferenced_renderers,
        "missing_references": sorted(missing_references),
        # Legacy keys retained for compatibility with ci_cleanup.py / maintenance service.
        "app_py_sha256": legacy_inventory.get("app_py_sha256"),
        "ui_modules": legacy_inventory.get("ui_modules", []),
        "text_quality_issues": legacy_inventory.get("text_quality_issues", {}),
        "tabs_legacy": legacy_inventory.get("tabs", []),
        "admin_components_legacy": legacy_inventory.get("admin_components", []),
    }
    return inventory


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _normalize_for_compare(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = {key: payload.get(key) for key in COMPARE_KEYS}
    return normalized


def _write_diff_report(diff_path: Path, baseline: dict[str, Any], current: dict[str, Any]) -> None:
    diff_path.parent.mkdir(parents=True, exist_ok=True)
    baseline_lines = json.dumps(_normalize_for_compare(baseline), ensure_ascii=False, indent=2, sort_keys=True).splitlines()
    current_lines = json.dumps(_normalize_for_compare(current), ensure_ascii=False, indent=2, sort_keys=True).splitlines()
    diff_lines = list(unified_diff(baseline_lines, current_lines, fromfile="baseline", tofile="current", lineterm=""))
    if not diff_lines:
        report = "# UI Inventory Drift Report\n\nNo drift detected.\n"
    else:
        report = "\n".join(
            [
                "# UI Inventory Drift Report",
                "",
                "Drift detected between baseline and current UI inventory.",
                "",
                "```diff",
                *diff_lines,
                "```",
                "",
            ]
        )
    diff_path.write_text(report, encoding="utf-8")


def _command_regenerate(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    baseline_path = _resolve_path(root, args.baseline)
    current_path = _resolve_path(root, args.current)

    inventory = build_ui_inventory(root)
    _write_json(current_path, inventory)
    print(f"[ui-inventory] Current inventory written to: {current_path}")

    if args.write_baseline:
        _write_json(baseline_path, inventory)
        print(f"[ui-inventory] Baseline regenerated: {baseline_path}")
    else:
        print("[ui-inventory] Baseline not updated (use --write-baseline to persist).")

    return EXIT_OK


def _command_check(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    baseline_path = _resolve_path(root, args.baseline)
    current_path = _resolve_path(root, args.current)
    diff_path = _resolve_path(root, args.diff)

    inventory = build_ui_inventory(root)
    _write_json(current_path, inventory)
    print(f"[ui-inventory] Current inventory written to: {current_path}")

    if not baseline_path.exists():
        print(f"[ui-inventory] ERROR: baseline missing: {baseline_path}")
        return EXIT_CONFIG_ERROR

    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    _write_diff_report(diff_path, baseline, inventory)

    if _normalize_for_compare(baseline) != _normalize_for_compare(inventory):
        print(f"[ui-inventory] Drift detected. Report: {diff_path}")
        return EXIT_DRIFT

    print("[ui-inventory] No drift detected.")
    return EXIT_OK


def _command_cleanup(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    baseline_path = _resolve_path(root, args.baseline)
    current_path = _resolve_path(root, args.current)
    report_path = _resolve_path(root, args.report)

    inventory = build_ui_inventory(root)
    _write_json(current_path, inventory)

    findings: list[str] = []
    if inventory.get("missing_references"):
        findings.append(
            "Références manquantes: " + ", ".join(str(x) for x in inventory["missing_references"])
        )
    if inventory.get("unreferenced_renderers"):
        orphaned = [f"{entry['module']}::{entry['function']}" for entry in inventory["unreferenced_renderers"]]
        findings.append("Renderers potentiellement orphelins: " + ", ".join(orphaned))

    if baseline_path.exists():
        baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
        current_tab_ids = {entry.get("id", "") for entry in inventory.get("tabs", [])}
        baseline_tab_ids = {entry.get("id", "") for entry in baseline.get("tabs", [])}
        stale_tabs = sorted(tab_id for tab_id in baseline_tab_ids if tab_id and tab_id not in current_tab_ids)
        if stale_tabs:
            findings.append("Tabs présents en baseline mais absents du code courant: " + ", ".join(stale_tabs))

    mode = "apply" if args.apply else "dry-run"
    lines = [
        "# UI Cleanup Diagnostic",
        "",
        f"- Generated at: {datetime.now(timezone.utc).isoformat()}",
        f"- Mode: {mode}",
        f"- Root: {root.as_posix()}",
        f"- Current inventory: {current_path.as_posix()}",
        f"- Baseline: {baseline_path.as_posix()}",
        "",
    ]
    if findings:
        lines.append("## Findings")
        lines.extend([f"- {item}" for item in findings])
    else:
        lines.extend(["## Findings", "- Aucun nettoyage requis."])

    if args.apply and findings:
        lines.extend(
            [
                "",
                "## Apply note",
                "- Aucun fichier source n'a été modifié automatiquement.",
                "- Corrigez les points listés puis relancez `check`.",
            ]
        )

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[ui-inventory] Cleanup diagnostic report: {report_path}")
    if findings:
        print("[ui-inventory] Cleanup findings detected.")
        return EXIT_DRIFT if args.check else EXIT_OK
    print("[ui-inventory] Cleanup check passed.")
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="UI inventory and cleanup command surface.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    regen = subparsers.add_parser("regenerate", help="Generate the current UI inventory and optionally update baseline.")
    regen.add_argument("--root", default=".", help="Project root directory.")
    regen.add_argument("--baseline", default=str(DEFAULT_BASELINE_RELATIVE_PATH), help="Baseline JSON path.")
    regen.add_argument("--current", default=str(DEFAULT_CURRENT_RELATIVE_PATH), help="Current inventory JSON path.")
    regen.add_argument("--write-baseline", action="store_true", help="Persist generated inventory to baseline path.")
    regen.set_defaults(handler=_command_regenerate)

    check = subparsers.add_parser("check", help="Compare current inventory against baseline.")
    check.add_argument("--root", default=".", help="Project root directory.")
    check.add_argument("--baseline", default=str(DEFAULT_BASELINE_RELATIVE_PATH), help="Baseline JSON path.")
    check.add_argument("--current", default=str(DEFAULT_CURRENT_RELATIVE_PATH), help="Current inventory JSON path.")
    check.add_argument("--diff", default=str(DEFAULT_DIFF_RELATIVE_PATH), help="Drift diff markdown output path.")
    check.set_defaults(handler=_command_check)

    cleanup = subparsers.add_parser(
        "cleanup",
        help="Run non-destructive cleanup diagnostic for UI inventory references.",
    )
    cleanup.add_argument("--root", default=".", help="Project root directory.")
    cleanup.add_argument("--baseline", default=str(DEFAULT_BASELINE_RELATIVE_PATH), help="Baseline JSON path.")
    cleanup.add_argument("--current", default=str(DEFAULT_CURRENT_RELATIVE_PATH), help="Current inventory JSON path.")
    cleanup.add_argument("--report", default=str(DEFAULT_CLEANUP_RELATIVE_PATH), help="Cleanup report markdown output path.")
    cleanup.add_argument("--dry-run", action="store_true", help="Run diagnostic only (default behavior).")
    cleanup.add_argument("--apply", action="store_true", help="Attempt cleanup apply flow (non-destructive note only).")
    cleanup.add_argument("--check", action="store_true", help="Return exit code 3 when findings are detected.")
    cleanup.set_defaults(handler=_command_cleanup)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.handler(args))
    except RuntimeError as exc:
        print(f"[ui-inventory] ERROR: {exc}")
        return EXIT_PARSE_ERROR
    except Exception as exc:  # noqa: BLE001
        print(f"[ui-inventory] UNEXPECTED ERROR: {exc}")
        return EXIT_RUNTIME_ERROR


if __name__ == "__main__":
    raise SystemExit(main())
