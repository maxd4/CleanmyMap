from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.maintenance._common import TEXT_EXTENSIONS, IGNORED_DIRS, iter_text_files
UTF8_BOM = b"\xef\xbb\xbf"


@dataclass(slots=True)
class CleanupAuditRuleResult:
    rule_id: str
    title_fr: str
    title_en: str
    status: str  # ok | warning | error
    message_fr: str
    message_en: str
    recommendations_fr: list[str] = field(default_factory=list)
    recommendations_en: list[str] = field(default_factory=list)
    technical_details: list[str] = field(default_factory=list)


@dataclass(slots=True)
class CleanupAuditReport:
    generated_at: str
    status: str  # clean | issues
    error_count: int
    warning_count: int
    rules: list[CleanupAuditRuleResult]

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["rule_count"] = len(self.rules)
        return payload


def compute_cooldown_remaining_seconds(
    last_run_iso: str | None,
    cooldown_seconds: int,
    now: datetime | None = None,
) -> int:
    if not last_run_iso:
        return 0
    try:
        last_run = datetime.fromisoformat(last_run_iso)
    except ValueError:
        return 0
    current = now or datetime.now()
    elapsed = (current - last_run).total_seconds()
    remaining = int(cooldown_seconds - elapsed)
    return max(0, remaining)


def _iter_text_files(root: Path) -> list[Path]:
    return iter_text_files(root)


def _rule_runtime_artifacts(root: Path) -> CleanupAuditRuleResult:
    gitignore_path = root / ".gitignore"
    required_entries = {
        "artifacts/",
        "streamlit.out.log",
        "streamlit.err.log",
        ".streamlit_pid.txt",
    }
    runtime_files = [
        path
        for path in [
            root / "streamlit.out.log",
            root / "streamlit.err.log",
            root / ".streamlit_pid.txt",
        ]
        if path.exists()
    ]
    artifacts_dir = root / "artifacts"
    if artifacts_dir.exists() and artifacts_dir.is_dir():
        runtime_files.extend([path for path in artifacts_dir.rglob("*") if path.is_file()])

    if not gitignore_path.exists():
        return CleanupAuditRuleResult(
            rule_id="runtime_artifacts",
            title_fr="Protection des fichiers runtime",
            title_en="Runtime files protection",
            status="error",
            message_fr="Le fichier .gitignore est manquant, la protection des artefacts runtime n'est pas garantie.",
            message_en="The .gitignore file is missing, runtime artifact protection is not guaranteed.",
            recommendations_fr=["Créer un .gitignore et y ajouter les artefacts runtime."],
            recommendations_en=["Create a .gitignore and add runtime artifact entries."],
        )

    lines = {line.strip() for line in gitignore_path.read_text(encoding="utf-8").splitlines() if line.strip()}
    missing_entries = sorted(entry for entry in required_entries if entry not in lines)

    if missing_entries:
        return CleanupAuditRuleResult(
            rule_id="runtime_artifacts",
            title_fr="Protection des fichiers runtime",
            title_en="Runtime files protection",
            status="error",
            message_fr="Certaines protections .gitignore manquent pour les artefacts d'exécution.",
            message_en="Some .gitignore protections are missing for runtime artifacts.",
            recommendations_fr=[
                "Ajouter les entrées manquantes dans .gitignore.",
                "Relancer le diagnostic pour confirmer la conformité.",
            ],
            recommendations_en=[
                "Add missing entries to .gitignore.",
                "Run the diagnostic again to confirm compliance.",
            ],
            technical_details=[f"Entrées manquantes: {', '.join(missing_entries)}"],
        )

    if runtime_files:
        rel_files = [path.relative_to(root).as_posix() for path in runtime_files[:10]]
        return CleanupAuditRuleResult(
            rule_id="runtime_artifacts",
            title_fr="Protection des fichiers runtime",
            title_en="Runtime files protection",
            status="warning",
            message_fr="La protection est en place, mais des fichiers runtime sont présents localement.",
            message_en="Protection is configured, but runtime files are present locally.",
            recommendations_fr=[
                "Conserver ces fichiers hors versioning.",
                "Nettoyer les artefacts locaux si nécessaire.",
            ],
            recommendations_en=[
                "Keep these files out of version control.",
                "Clean local artifacts if needed.",
            ],
            technical_details=[f"Fichiers détectés: {', '.join(rel_files)}"],
        )

    return CleanupAuditRuleResult(
        rule_id="runtime_artifacts",
        title_fr="Protection des fichiers runtime",
        title_en="Runtime files protection",
        status="ok",
        message_fr="Les protections runtime sont correctement configurées.",
        message_en="Runtime protections are correctly configured.",
    )


def _rule_utf8_bom(root: Path) -> CleanupAuditRuleResult:
    bom_files: list[str] = []
    for path in _iter_text_files(root):
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        if raw.startswith(UTF8_BOM):
            bom_files.append(path.relative_to(root).as_posix())

    if bom_files:
        return CleanupAuditRuleResult(
            rule_id="utf8_bom",
            title_fr="Encodage UTF-8 sans BOM",
            title_en="UTF-8 encoding without BOM",
            status="error",
            message_fr="Des fichiers texte contiennent un BOM UTF-8.",
            message_en="Some text files contain a UTF-8 BOM.",
            recommendations_fr=[
                "Convertir les fichiers signalés en UTF-8 sans BOM.",
                "Uniformiser l'encodage avant le prochain commit.",
            ],
            recommendations_en=[
                "Convert reported files to UTF-8 without BOM.",
                "Normalize encoding before the next commit.",
            ],
            technical_details=[f"Fichiers: {', '.join(bom_files[:20])}"],
        )

    return CleanupAuditRuleResult(
        rule_id="utf8_bom",
        title_fr="Encodage UTF-8 sans BOM",
        title_en="UTF-8 encoding without BOM",
        status="ok",
        message_fr="Aucun BOM UTF-8 détecté dans les fichiers texte contrôlés.",
        message_en="No UTF-8 BOM detected in scanned text files.",
    )


def _rule_required_docs(root: Path) -> CleanupAuditRuleResult:
    required_files = [
        root / "README.md",
        root / "docs" / "wiki" / "README.md",
        root / "docs" / "wiki" / "MAINTENANCE.md",
        root / "docs" / "wiki" / "CHANGELOG.md",
    ]
    missing_files = [path.relative_to(root).as_posix() for path in required_files if not path.exists()]
    if missing_files:
        return CleanupAuditRuleResult(
            rule_id="docs_wiring",
            title_fr="Documentation obligatoire",
            title_en="Required documentation wiring",
            status="error",
            message_fr="Des documents obligatoires sont absents.",
            message_en="Some required documentation files are missing.",
            recommendations_fr=[
                "Créer les pages README/wiki/changelog manquantes.",
                "Documenter les changements avant diffusion.",
            ],
            recommendations_en=[
                "Create missing README/wiki/changelog pages.",
                "Document changes before release.",
            ],
            technical_details=[f"Fichiers manquants: {', '.join(missing_files)}"],
        )

    readme = (root / "README.md").read_text(encoding="utf-8")
    wiki_index = (root / "docs" / "wiki" / "README.md").read_text(encoding="utf-8")
    wiki_maintenance = (root / "docs" / "wiki" / "MAINTENANCE.md").read_text(encoding="utf-8")

    missing_refs: list[str] = []
    if "scripts/ci_cleanup.py" not in readme:
        missing_refs.append("README: reference à scripts/ci_cleanup.py")
    if "docs/wiki" not in readme:
        missing_refs.append("README: reference à docs/wiki")
    if "MAINTENANCE" not in wiki_index.upper():
        missing_refs.append("wiki index: lien maintenance")
    if "ci_cleanup.py" not in wiki_maintenance:
        missing_refs.append("wiki maintenance: référence ci_cleanup.py")

    if missing_refs:
        return CleanupAuditRuleResult(
            rule_id="docs_wiring",
            title_fr="Documentation obligatoire",
            title_en="Required documentation wiring",
            status="error",
            message_fr="Le chaînage documentaire est incomplet (README/Wiki).",
            message_en="Documentation wiring is incomplete (README/Wiki).",
            recommendations_fr=[
                "Mettre à jour README et wiki ensemble pour chaque changement important.",
                "Ajouter les références de maintenance manquantes.",
            ],
            recommendations_en=[
                "Update README and wiki together for each significant change.",
                "Add missing maintenance references.",
            ],
            technical_details=missing_refs,
        )

    return CleanupAuditRuleResult(
        rule_id="docs_wiring",
        title_fr="Documentation obligatoire",
        title_en="Required documentation wiring",
        status="ok",
        message_fr="Le chaînage README/Wiki est cohérent.",
        message_en="README/Wiki wiring is consistent.",
    )


def run_cleanup_audit(root_path: Path) -> CleanupAuditReport:
    root = root_path.resolve()
    rules = [
        _rule_runtime_artifacts(root),
        _rule_utf8_bom(root),
        _rule_required_docs(root),
    ]
    error_count = sum(1 for rule in rules if rule.status == "error")
    warning_count = sum(1 for rule in rules if rule.status == "warning")
    status = "clean" if error_count == 0 else "issues"

    return CleanupAuditReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        status=status,
        error_count=error_count,
        warning_count=warning_count,
        rules=rules,
    )

