import sys
import os

project_dir = r"C:\Users\sophi\Desktop\MAXENCE\business\carte-interactive-clean-walk-main\carte-interactive-clean-walk-main"
sys.path.insert(0, project_dir)
os.chdir(project_dir)

from src.database import get_submissions_by_status

def check_db():
    try:
        submissions = get_submissions_by_status('approved')
        print(f"Number of approved submissions: {len(submissions)}")
        
        sources = {}
        for sub in submissions:
            src = sub.get('source', 'unknown')
            sources[src] = sources.get(src, 0) + 1
            
        print(f"Sources: {sources}")
        
    except Exception as e:
        print("Error reading from db:", e)

if __name__ == '__main__':
    check_db()
