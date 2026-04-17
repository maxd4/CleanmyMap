from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_ROOT = PROJECT_ROOT / "legacy"
if str(LEGACY_ROOT) not in sys.path:
    sys.path.insert(0, str(LEGACY_ROOT))

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database import init_db, get_submissions_by_status


def check_db() -> None:
    try:
        init_db()
        submissions = get_submissions_by_status("approved")
        print(f"Number of approved submissions: {len(submissions)}")

        sources: dict[str, int] = {}
        for sub in submissions:
            src = sub.get("source", "unknown")
            sources[src] = sources.get(src, 0) + 1

        print(f"Sources: {sources}")
    except Exception as exc:
        print("Error reading from db:", exc)


if __name__ == "__main__":
    check_db()
