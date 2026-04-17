from pathlib import Path
import sys

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_ROOT = PROJECT_ROOT / "legacy"
if str(LEGACY_ROOT) not in sys.path:
    sys.path.insert(0, str(LEGACY_ROOT))

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database import init_db, get_submissions_by_status


def check_actions() -> None:
    try:
        init_db()
        approved_actions = get_submissions_by_status("approved")
        print("Total approved actions:", len(approved_actions))

        df = pd.DataFrame(approved_actions)
        if not df.empty and "source" in df.columns:
            print(df["source"].value_counts())
        else:
            print("No source column or empty df.")
            print(df.columns.tolist() if not df.empty else "Empty DF")

        if not df.empty and "date" in df.columns:
            dups = df[df.duplicated(subset=["date", "adresse"], keep=False)]
            if not dups.empty:
                print("Duplicates found:")
                print(dups[["date", "adresse", "source", "megots", "dechets_kg"]])
            else:
                print("No duplicates by date/adresse found.")
    except Exception as exc:
        print("Error:", exc)


if __name__ == "__main__":
    check_actions()
