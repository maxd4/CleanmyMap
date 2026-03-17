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
    
    # Table pour les soumissions (actions de nettoyage et acteurs engagés)
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
            description TEXT,
            website_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Ajout rétrocompatible des colonnes si nécessaire
    try:
        c.execute("ALTER TABLE submissions ADD COLUMN description TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE submissions ADD COLUMN website_url TEXT")
    except sqlite3.OperationalError:
        pass

    # Table pour les abonnés à la newsletter
    c.execute('''
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Table pour les "Spots" (Clone Trash Spotter - Signalement rapide)
    c.execute('''
        CREATE TABLE IF NOT EXISTS spots (
            id TEXT PRIMARY KEY,
            lat REAL,
            lon REAL,
            adresse TEXT,
            type_dechet TEXT,
            photo_url TEXT,
            reporter_name TEXT,
            status TEXT DEFAULT 'active', -- 'active' ou 'cleaned'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Table pour les sorties communautaires
    c.execute('''
        CREATE TABLE IF NOT EXISTS community_events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            event_date TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            organizer TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # RSVP par evenement
    c.execute('''
        CREATE TABLE IF NOT EXISTS event_rsvps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            participant_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'yes',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, participant_name)
        )
    ''')

    # Journal des relances J-1, une seule par evenement et par date
    c.execute('''
        CREATE TABLE IF NOT EXISTS event_reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL,
            reminder_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, reminder_date)
        )
    ''')

    # Table pour les récompenses et badges
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT,
            badge_name TEXT,
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS mission_validations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id TEXT NOT NULL,
            voter_name TEXT NOT NULL,
            vote INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(submission_id, voter_name)
        )
    ''')

    # Ajout de la colonne eco_points à submissions si elle n'existe pas
    try:
        c.execute("ALTER TABLE submissions ADD COLUMN eco_points INTEGER DEFAULT 0")
    except sqlite3.OperationalError: pass

    # Date de validation (pour KPI de délai de modération)
    try:
        c.execute("ALTER TABLE submissions ADD COLUMN validated_at TIMESTAMP")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

def insert_submission(data, status='pending'):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT OR IGNORE INTO submissions (
            id, nom, association, type_lieu, adresse, date, benevoles, temps_min,
            megots, dechets_kg, plastique_kg, verre_kg, metal_kg, gps, lat, lon,
            commentaire, est_propre, source, status, description, website_url, eco_points, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('id'), data.get('nom'), data.get('association'), data.get('type_lieu'),
        data.get('adresse'), data.get('date'), data.get('benevoles'), data.get('temps_min'),
        data.get('megots'), data.get('dechets_kg'), data.get('plastique_kg', 0.0),
        data.get('verre_kg', 0.0), data.get('metal_kg', 0.0), data.get('gps'),
        data.get('lat'), data.get('lon'), data.get('commentaire'), data.get('est_propre', False),
        data.get('source', 'formulaire'), status, data.get('description'), 
        data.get('website_url'), data.get('eco_points', 0), data.get('submitted_at', datetime.now().isoformat())
    ))
    conn.commit()
    conn.close()

def update_submission_status(sub_id, new_status):
    conn = get_connection()
    c = conn.cursor()
    if new_status in ('approved', 'rejected'):
        c.execute(
            "UPDATE submissions SET status = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_status, sub_id),
        )
    else:
        c.execute(
            "UPDATE submissions SET status = ?, validated_at = NULL WHERE id = ?",
            (new_status, sub_id),
        )
    conn.commit()
    conn.close()

def update_submission_data(sub_id, description, website_url):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "UPDATE submissions SET description = ?, website_url = ? WHERE id = ?",
        (description, website_url, sub_id)
    )
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
def add_spot(lat, lon, adresse, type_dechet, reporter_name, photo_url=None):
    conn = get_connection()
    c = conn.cursor()
    import uuid
    spot_id = str(uuid.uuid4())
    c.execute('''
        INSERT INTO spots (id, lat, lon, adresse, type_dechet, reporter_name, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (spot_id, lat, lon, adresse, type_dechet, reporter_name, photo_url))
    conn.commit()
    conn.close()
    return spot_id

def update_spot_status(spot_id, status='cleaned'):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE spots SET status = ? WHERE id = ?", (status, spot_id))
    conn.commit()
    conn.close()

def get_active_spots():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM spots WHERE status = 'active' ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_community_event(title, event_date, location, description="", organizer=""):
    conn = get_connection()
    c = conn.cursor()
    import uuid
    event_id = str(uuid.uuid4())
    c.execute(
        """
        INSERT INTO community_events (id, title, event_date, location, description, organizer)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (event_id, title, event_date, location, description, organizer),
    )
    conn.commit()
    conn.close()
    return event_id

def get_community_events(limit=50, include_past=False):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if include_past:
        c.execute(
            "SELECT * FROM community_events ORDER BY event_date ASC LIMIT ?",
            (limit,),
        )
    else:
        c.execute(
            "SELECT * FROM community_events WHERE event_date >= date('now') ORDER BY event_date ASC LIMIT ?",
            (limit,),
        )
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def upsert_event_rsvp(event_id, participant_name, status):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO event_rsvps (event_id, participant_name, status)
        VALUES (?, ?, ?)
        ON CONFLICT(event_id, participant_name) DO UPDATE SET
            status = excluded.status,
            updated_at = CURRENT_TIMESTAMP
        """,
        (event_id, participant_name, status),
    )
    conn.commit()
    conn.close()

def get_event_rsvp_summary(event_id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(
        """
        SELECT
            SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END) as yes_count,
            SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END) as maybe_count,
            SUM(CASE WHEN status = 'no' THEN 1 ELSE 0 END) as no_count
        FROM event_rsvps
        WHERE event_id = ?
        """,
        (event_id,),
    )
    row = c.fetchone()
    conn.close()
    return {
        "yes": (row["yes_count"] or 0) if row else 0,
        "maybe": (row["maybe_count"] or 0) if row else 0,
        "no": (row["no_count"] or 0) if row else 0,
    }

def get_events_for_date(target_date):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(
        "SELECT * FROM community_events WHERE event_date = ? ORDER BY created_at ASC",
        (target_date,),
    )
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def mark_event_reminder(event_id, reminder_date):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute(
            "INSERT INTO event_reminders (event_id, reminder_date) VALUES (?, ?)",
            (event_id, reminder_date),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def calculate_user_points(user_name):
    conn = get_connection()
    c = conn.cursor()
    # Somme des points des actions approuvées
    c.execute("SELECT SUM(eco_points) FROM submissions WHERE nom = ? AND status = 'approved'", (user_name,))
    points = c.fetchone()[0] or 0
    conn.close()
    return points

def get_leaderboard(limit=10):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT nom, SUM(eco_points) as total_points, COUNT(*) as nb_actions
        FROM submissions 
        WHERE status = 'approved' 
        GROUP BY nom 
        ORDER BY total_points DESC 
        LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_mission_validation(submission_id, voter_name, vote):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO mission_validations (submission_id, voter_name, vote)
        VALUES (?, ?, ?)
        ON CONFLICT(submission_id, voter_name) DO UPDATE SET
            vote = excluded.vote,
            created_at = CURRENT_TIMESTAMP
        """,
        (submission_id, voter_name, int(vote)),
    )
    conn.commit()
    conn.close()


def get_mission_validation_summary(submission_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """
        SELECT
            SUM(CASE WHEN vote > 0 THEN 1 ELSE 0 END) as up,
            SUM(CASE WHEN vote < 0 THEN 1 ELSE 0 END) as down,
            COALESCE(SUM(vote), 0) as score
        FROM mission_validations
        WHERE submission_id = ?
        """,
        (submission_id,),
    )
    row = c.fetchone()
    conn.close()
    return {
        'up': row[0] or 0,
        'down': row[1] or 0,
        'score': row[2] or 0,
    }
