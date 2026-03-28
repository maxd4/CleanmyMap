from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Sequence

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.ui_inventory import main as ui_inventory_main


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Deprecated shim. Use `python -m scripts.ui_inventory regenerate --write-baseline`."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root directory (default: current directory).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional custom baseline path (maps to --baseline in new CLI).",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    print(
        "[maintenance] DEPRECATION: `scripts/regenerate_ui_inventory_baseline.py` "
        "is deprecated. Use `python -m scripts.ui_inventory regenerate --write-baseline`."
    )

    forward_args = [
        "regenerate",
        "--root",
        args.root,
        "--write-baseline",
    ]
    if args.output:
        forward_args.extend(["--baseline", args.output])

    return ui_inventory_main(forward_args)


if __name__ == "__main__":
    raise SystemExit(main())
