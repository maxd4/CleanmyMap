from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import ast
import hashlib
import json
from pathlib import Path
from typing import Any

from src.maintenance.cleanup_audit import run_cleanup_audit
from src.maintenance._common import TEXT_EXTENSIONS, IGNORED_DIRS, iter_text_files

DEFAULT_BASELINE_RELATIVE_PATH = Path("docs/wiki/ui_inventory.baseline.json")
MOJIBAKE_PATTERNS = (
    "\u00c3",
    "\u00e2\u20ac\u2122",
    "\u00e2\u20ac\u0153",
    "\u00e2\u20ac",
    "\u00e2\u20ac\u0161\u00ac",
    "\u00e2\u00c5\u201c",
    "\u00f0\u00c5\u00b8",
    "\u00c2",
    "\ufffd",
)


@dataclass(slots=True)
class MaintenanceFinding:
    code: str
    severity: str
    message: str


@dataclass(slots=True)
class MaintenanceReport:
    generated_at: str
    baseline_path: str
    inventory_summary: dict[str, Any]
    findings: list[MaintenanceFinding]

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["error_count"] = sum(1 for finding in self.findings if finding.severity == "error")
        payload["warning_count"] = sum(1 for finding in self.findings if finding.severity == "warning")
        payload["status"] = "ok" if payload["error_count"] == 0 else "failed"
        return payload


def _read_py_literal(path: Path, variable_name: str) -> Any:
    source = path.read_text(encoding="utf-8")
    module = ast.parse(source, filename=str(path))
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == variable_name:
                    return ast.literal_eval(node.value)
    raise ValueError(f"Variable '{variable_name}' not found in {path}.")


def _read_first_available_py_literal(path: Path, variable_names: tuple[str, ...]) -> Any:
    last_error: Exception | None = None
    for name in variable_names:
        try:
            return _read_py_literal(path, name)
        except ValueError as exc:
            last_error = exc
            continue
    if last_error is not None:
        raise last_error
    raise ValueError(f"No variable candidates provided for {path}.")


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _iter_text_files(root: Path) -> list[Path]:
    return iter_text_files(root)


def collect_text_quality_issues(root: Path) -> dict[str, int]:
    issues: dict[str, int] = {}
    for path in _iter_text_files(root):
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        count = sum(content.count(token) for token in MOJIBAKE_PATTERNS)
        if count > 0:
            rel = path.relative_to(root).as_posix()
            issues[rel] = count
    return dict(sorted(issues.items()))


def collect_ui_inventory(root: Path) -> dict[str, Any]:
    app_path = root / "app.py"
    if not app_path.exists():
        raise FileNotFoundError(f"Cannot find app.py under {root}")

    tab_items = _read_first_available_py_literal(app_path, ("TAB_ITEMS", "tab_items", "tab_specs"))
    i18n_texts = _read_first_available_py_literal(app_path, ("I18N_TEXTS", "TRANSLATIONS"))
    fr_dict = i18n_texts.get("fr", {}) if isinstance(i18n_texts, dict) else {}
    en_dict = i18n_texts.get("en", {}) if isinstance(i18n_texts, dict) else {}

    tabs: list[dict[str, str]] = []
    for item in tab_items:
        tab_key = item.get("key", "")
        tabs.append(
            {
                "id": item.get("id", ""),
                "key": tab_key,
                "label_fr": fr_dict.get(tab_key, ""),
                "label_en": en_dict.get(tab_key, ""),
            }
        )

    ui_dir = root / "src" / "ui"
    admin_components_dir = ui_dir / "admin_components"
    ui_modules = sorted([path.stem for path in ui_dir.glob("*.py") if path.name != "__init__.py"])
    admin_components = sorted([path.stem for path in admin_components_dir.glob("*.py") if path.name != "__init__.py"])

    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "app_py_sha256": _file_sha256(app_path),
        "tabs": tabs,
        "ui_modules": ui_modules,
        "admin_components": admin_components,
        "text_quality_issues": collect_text_quality_issues(root),
    }


def save_ui_inventory_baseline(root: Path, baseline_path: Path | None = None) -> Path:
    baseline = collect_ui_inventory(root)
    target_path = baseline_path or (root / DEFAULT_BASELINE_RELATIVE_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target_path


def load_ui_inventory_baseline(baseline_path: Path) -> dict[str, Any]:
    return json.loads(baseline_path.read_text(encoding="utf-8"))


def run_cleanup_diagnostic(root: Path, baseline_path: Path | None = None) -> MaintenanceReport:
    target_baseline = baseline_path or (root / DEFAULT_BASELINE_RELATIVE_PATH)
    audit = run_cleanup_audit(root)
    findings = [
        MaintenanceFinding(
            code=rule.rule_id.upper(),
            severity=rule.status,
            message=rule.message_fr,
        )
        for rule in audit.rules
        if rule.status in {"warning", "error"}
    ]

    summary = {
        "rules_count": len(audit.rules),
        "error_rules": audit.error_count,
        "warning_rules": audit.warning_count,
    }

    return MaintenanceReport(
        generated_at=audit.generated_at,
        baseline_path=str(target_baseline),
        inventory_summary=summary,
        findings=findings,
    )
