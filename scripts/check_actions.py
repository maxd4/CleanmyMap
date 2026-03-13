import sys
import os
sys.path.insert(0, 'c:/Users/sophi/Desktop/MAXENCE/business/carte-interactive-clean-walk-main/carte-interactive-clean-walk-main')

import app
import pandas as pd

def check_actions():
    try:
        from app import all_imported_actions
        print("Total imported actions:", len(all_imported_actions))
        
        df = pd.DataFrame(all_imported_actions)
        if not df.empty and 'source' in df.columns:
            print(df['source'].value_counts())
        else:
            print("No source column or empty df.")
            print(df.columns.tolist() if not df.empty else "Empty DF")
            
        if not df.empty and 'date' in df.columns:
             # Find duplicated dates
             dups = df[df.duplicated(subset=['date', 'adresse'], keep=False)]
             if not dups.empty:
                print("Duplicates found:")
                print(dups[['date', 'adresse', 'source', 'megots', 'dechets_kg']])
             else:
                print("No duplicates by date/adresse found.")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_actions()
