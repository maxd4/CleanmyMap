from __future__ import annotations

import argparse
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_ROOT = PROJECT_ROOT / "legacy"
if str(LEGACY_ROOT) not in sys.path:
    sys.path.insert(0, str(LEGACY_ROOT))

# La racine du projet reste dans le path pour les scripts locaux
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.maintenance.cleanup_audit import run_cleanup_audit


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run cleanup verification (read-only) for repository maintenance hygiene."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root directory (default: current directory).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Return a non-zero exit code when cleanup expectations are not met.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    report = run_cleanup_audit(root_path=root).to_dict()

    print("[maintenance] Cleanup verification (read-only)")
    print("[maintenance] Purpose: verify project hygiene rules without modifying files.")
    print(f"[maintenance] Root: {root}")
    print(
        f"[maintenance] Status: {report['status']} "
        f"(errors={report['error_count']}, warnings={report['warning_count']}, rules={report['rule_count']})"
    )

    if report["rules"]:
        print("[maintenance] Rule results:")
        for rule in report["rules"]:
            print(f" - [{rule['status'].upper()}] {rule['rule_id']}: {rule['message_en']}")

    if args.check and report["error_count"] > 0:
        print("[maintenance] Check mode enabled: failing because cleanup verification detected error rules.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
