import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "cleanmymap.db"


def check_db() -> None:
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
