import sqlite3

def check_db():
    conn = sqlite3.connect('C:/Users/sophi/Desktop/MAXENCE/business/carte-interactive-clean-walk-main/carte-interactive-clean-walk-main/data/cleanmymap.db')
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", c.fetchall())
    
    try:
        c.execute("SELECT source, count(*) FROM submissions GROUP BY source;")
        print("Sources:", c.fetchall())
    except Exception as e:
        print("Error reading submissions:", e)

if __name__ == '__main__':
    check_db()
