import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cleanmymap.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    # Table pour les utilisateurs administratifs
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'admin'
        )
    ''')
    
    # Table pour le mur communautaire (messages)
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Ajout rétrocompatible de la colonne image_url si la table existe déjà sans cette colonne
    try:
        c.execute("ALTER TABLE messages ADD COLUMN image_url TEXT")
    except sqlite3.OperationalError:
        # Colonne déjà existante, on ignore l'erreur
        pass
    
    # Table pour les alertes (météo, crues, etc.)
    c.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Table pour les soumissions (actions de nettoyage)
    # status: 'pending', 'approved', 'rejected'
    # source: 'formulaire', 'google_sheet'
    c.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY,
            nom TEXT,
            association TEXT,
            type_lieu TEXT,
            adresse TEXT,
            date TEXT,
            benevoles INTEGER,
            temps_min INTEGER,
            megots INTEGER,
            dechets_kg REAL,
            plastique_kg REAL,
            verre_kg REAL,
            metal_kg REAL,
            gps TEXT,
            lat REAL,
            lon REAL,
            commentaire TEXT,
            est_propre BOOLEAN,
            source TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Table pour les abonnés à la newsletter
    c.execute('''
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def insert_submission(data, status='pending'):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT OR IGNORE INTO submissions (
            id, nom, association, type_lieu, adresse, date, benevoles, temps_min,
            megots, dechets_kg, plastique_kg, verre_kg, metal_kg, gps, lat, lon,
            commentaire, est_propre, source, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('id'), data.get('nom'), data.get('association'), data.get('type_lieu'),
        data.get('adresse'), data.get('date'), data.get('benevoles'), data.get('temps_min'),
        data.get('megots'), data.get('dechets_kg'), data.get('plastique_kg', 0.0),
        data.get('verre_kg', 0.0), data.get('metal_kg', 0.0), data.get('gps'),
        data.get('lat'), data.get('lon'), data.get('commentaire'), data.get('est_propre', False),
        data.get('source', 'formulaire'), status, data.get('submitted_at', datetime.now().isoformat())
    ))
    conn.commit()
    conn.close()

def update_submission_status(sub_id, new_status):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE submissions SET status = ? WHERE id = ?", (new_status, sub_id))
    conn.commit()
    conn.close()

def get_submissions_by_status(status=None):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if status is None:
        c.execute("SELECT * FROM submissions ORDER BY created_at DESC")
    else:
        c.execute("SELECT * FROM submissions WHERE status = ? ORDER BY created_at DESC", (status,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_total_approved_stats():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT 
            SUM(megots) as total_megots, 
            SUM(dechets_kg) as total_dechets, 
            SUM(benevoles) as total_benevoles
        FROM submissions 
        WHERE status = 'approved' AND est_propre = 0
    """)
    row = c.fetchone()
    conn.close()
    return {
        'megots': row[0] or 0,
        'dechets_kg': row[1] or 0.0,
        'benevoles': row[2] or 0
    }

def add_message(author, content, image_url=None):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO messages (author, content, image_url) VALUES (?, ?, ?)",
        (author, content, image_url),
    )
    conn.commit()
    conn.close()

def get_messages():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM messages ORDER BY created_at DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_subscriber(email):
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO subscribers (email) VALUES (?)", (email.strip().lower(),))
    conn.commit()
    conn.close()

def get_all_subscribers():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT email FROM subscribers")
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows]

def get_top_contributors(limit=3):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT nom, COUNT(*) as nb_actions, SUM(dechets_kg) as total_kg 
        FROM submissions 
        WHERE status = 'approved' 
        GROUP BY nom 
        ORDER BY total_kg DESC 
        LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
