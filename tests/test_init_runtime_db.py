from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from scripts.init_runtime_db import main


def test_init_runtime_db_with_seed(tmp_path: Path) -> None:
    db_path = tmp_path / "runtime" / "cleanmymap.db"
    seed_path = tmp_path / "seed.json"
    seed_payload = {
        "users": [{"id": 1, "email": "admin@test.local", "role": "admin"}],
        "submissions": [
            {
                "id": "seed-1",
                "nom": "Demo",
                "status": "approved",
                "source": "seed",
            }
        ],
    }
    seed_path.write_text(json.dumps(seed_payload), encoding="utf-8")

    exit_code = main(["--db-path", str(db_path), "--seed", str(seed_path), "--reset-seeded-tables"])
    assert exit_code == 0

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    users_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM submissions")
    submissions_count = cur.fetchone()[0]
    conn.close()

    assert users_count == 1
    assert submissions_count == 1
