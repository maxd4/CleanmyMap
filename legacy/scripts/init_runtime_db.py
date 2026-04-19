from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_ROOT = PROJECT_ROOT / "legacy"
if str(LEGACY_ROOT) not in sys.path:
    sys.path.insert(0, str(LEGACY_ROOT))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

_ALLOWED_TABLES = {
    "users",
    "messages",
    "submissions",
    "spots",
    "community_events",
    "volunteer_feedback",
}
_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Initialize runtime SQLite database and optionally load deterministic anonymized seed data."
    )
    parser.add_argument("--seed", help="Path to anonymized seed JSON file.")
    parser.add_argument("--db-path", help="Override runtime DB path (same as CLEANMYMAP_DB_PATH).")
    parser.add_argument(
        "--reset-seeded-tables",
        action="store_true",
        help="Delete rows in seed target tables before loading seed (deterministic reset).",
    )
    return parser.parse_args(argv)


def _validate_identifier(name: str) -> None:
    if not _IDENTIFIER_RE.match(name):
        raise ValueError(f"Invalid SQL identifier: {name}")


def _load_seed_payload(seed_path: Path) -> dict[str, list[dict[str, Any]]]:
    payload = json.loads(seed_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Seed JSON root must be an object mapping table name -> row list.")

    normalized: dict[str, list[dict[str, Any]]] = {}
    for table, rows in payload.items():
        if table not in _ALLOWED_TABLES:
            raise ValueError(f"Unsupported seed table: {table}")
        if not isinstance(rows, list):
            raise ValueError(f"Seed table '{table}' must contain a list of rows.")
        normalized_rows: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError(f"Seed row in table '{table}' must be an object.")
            for column in row.keys():
                _validate_identifier(str(column))
            normalized_rows.append(dict(row))
        normalized[table] = normalized_rows
    return normalized


def _seed_table(conn, table: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    inserted = 0
    for row in rows:
        columns = sorted(row.keys())
        if not columns:
            continue
        col_sql = ", ".join(columns)
        placeholders = ", ".join(["?"] * len(columns))
        values = [row[col] for col in columns]
        conn.execute(
            f"INSERT OR REPLACE INTO {table} ({col_sql}) VALUES ({placeholders})",
            values,
        )
        inserted += 1
    return inserted


def _load_seed(conn, payload: dict[str, list[dict[str, Any]]], reset_seeded_tables: bool) -> dict[str, int]:
    if reset_seeded_tables:
        for table in sorted(payload.keys()):
            conn.execute(f"DELETE FROM {table}")

    stats: dict[str, int] = {}
    for table in sorted(payload.keys()):
        stats[table] = _seed_table(conn, table, payload[table])
    return stats


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    if args.db_path:
        os.environ["CLEANMYMAP_DB_PATH"] = str(Path(args.db_path).expanduser())

    from src import database as db

    db.DB_PATH = str(db.resolve_db_path())
    db.init_db()
    db_path = db.get_db_path()
    print(f"[init-runtime-db] Runtime DB: {db_path}")

    if not args.seed:
        print("[init-runtime-db] Schema initialized (no seed provided).")
        return 0

    seed_path = Path(args.seed).expanduser().resolve()
    if not seed_path.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")

    payload = _load_seed_payload(seed_path)
    conn = db.get_connection()
    try:
        stats = _load_seed(conn, payload, reset_seeded_tables=bool(args.reset_seeded_tables))
        conn.commit()
    finally:
        conn.close()

    summary = ", ".join(f"{table}={count}" for table, count in sorted(stats.items())) or "no rows"
    print(f"[init-runtime-db] Seed loaded from {seed_path}")
    print(f"[init-runtime-db] Insert summary: {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
