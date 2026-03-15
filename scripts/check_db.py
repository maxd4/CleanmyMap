import sqlite3
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "cleanmymap.db"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database import init_db


def check_db() -> None:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", c.fetchall())

    try:
        c.execute("SELECT source, count(*) FROM submissions GROUP BY source;")
        print("Sources:", c.fetchall())
    except Exception as exc:
        print("Error reading submissions:", exc)
    finally:
        conn.close()


if __name__ == "__main__":
    check_db()
