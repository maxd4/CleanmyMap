import sqlite3
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database import get_db_path, init_db


def check_db() -> None:
    init_db()
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    print("Runtime DB path:", db_path)
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", c.fetchall())

    try:
        c.execute("SELECT source, count(*) FROM submissions GROUP BY source;")
        print("Sources:", c.fetchall())
    except sqlite3.OperationalError as exc:
        print("Error reading submissions:", exc)
    finally:
        conn.close()


if __name__ == "__main__":
    check_db()
