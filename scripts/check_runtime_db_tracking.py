from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

BLOCKED_EXACT = {
    "data/cleanmymap.db",
    "data/cleanmymap.db-wal",
    "data/cleanmymap.db-shm",
}
BLOCKED_SUFFIXES = (".db", ".sqlite", ".sqlite3", ".db-wal", ".db-shm")


def _tracked_files(root: Path) -> list[str]:
    proc = subprocess.run(
        ["git", "-C", str(root), "ls-files"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip().replace("\\", "/") for line in proc.stdout.splitlines() if line.strip()]


def find_blocked_runtime_db_files(root: Path) -> list[str]:
    blocked: list[str] = []
    for rel in _tracked_files(root):
        low = rel.lower()
        if low in BLOCKED_EXACT:
            blocked.append(rel)
            continue
        if low.startswith("runtime/") and low.endswith(BLOCKED_SUFFIXES):
            blocked.append(rel)
            continue
        if low.endswith(BLOCKED_SUFFIXES) and "/data/seed/" not in f"/{low}":
            blocked.append(rel)
    return sorted(set(blocked))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fail if runtime SQLite files are tracked by git.")
    parser.add_argument("--root", default=".", help="Repository root (default: current directory).")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    blocked = find_blocked_runtime_db_files(root)

    print("[runtime-db] Checking tracked runtime SQLite files")
    if not blocked:
        print("[runtime-db] OK: no runtime SQLite files are tracked.")
        return 0

    print("[runtime-db] ERROR: tracked runtime SQLite files detected:")
    for path in blocked:
        print(f" - {path}")
    print("[runtime-db] Remove these files from git tracking (keep local runtime data outside version control).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
