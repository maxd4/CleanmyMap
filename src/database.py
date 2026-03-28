import os
import sqlite3
import pandas as pd
from datetime import datetime
from pathlib import Path

# --- CORE DATABASE SETUP & CONFIGURATION ---

def resolve_db_path():
    """Détermine le chemin absolu de la base de données."""
    env_path = os.getenv("SQLITE_DB_PATH")
    if env_path:
        return os.path.abspath(env_path)
    # Fallback par défaut dans le dossier data du projet
    root = Path(__file__).parent.parent
    data_dir = root / "data"
    data_dir.mkdir(exist_ok=True)
    return str(data_dir / "cleanmymap.db")

def get_db_path():
    return resolve_db_path()

def get_connection():
    """Crée une connexion SQLite vers la base de données."""
    conn = sqlite3.connect(get_db_path())
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def _alter_table_add_column(cursor, sql, column_id):
    """Ajout sécurisé de colonne (évite les erreurs si la colonne existe déjà)."""
    try:
        cursor.execute(sql)
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            from src.logging_utils import log_exception
            log_exception(component="database", action="migration", exc=e, message=f"Migration error for {column_id}")

def init_db():
    """Initialise le schéma de la base de données et applique les migrations."""
    conn = get_connection()
    c = conn.cursor()
    
    # Table principale des signalements/nettoyages (Submissions)
    c.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY,
            nom TEXT,
            association TEXT,
            type_lieu TEXT,
            adresse TEXT,
            adresse_depart TEXT,
            adresse_arrivee TEXT,
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
            lat_depart REAL,
            lon_depart REAL,
            lat_arrivee REAL,
            lon_arrivee REAL,
            commentaire TEXT,
            est_propre BOOLEAN,
            source TEXT,
            tags TEXT,
            status TEXT DEFAULT 'pending',
            description TEXT,
            website_url TEXT,
            eco_points INTEGER DEFAULT 0,
            validated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Migrations incrémentales
    cols = [
        ("description", "TEXT"), ("website_url", "TEXT"), ("tags", "TEXT"),
        ("adresse_depart", "TEXT"), ("adresse_arrivee", "TEXT"),
        ("lat_depart", "REAL"), ("lon_depart", "REAL"),
        ("lat_arrivee", "REAL"), ("lon_arrivee", "REAL"),
        ("eco_points", "INTEGER DEFAULT 0"), ("validated_at", "TIMESTAMP"),
        ("is_real", "BOOLEAN DEFAULT 1")
    ]

    for col, ctype in cols:
        _alter_table_add_column(c, f"ALTER TABLE submissions ADD COLUMN {col} {ctype}", f"submissions.{col}")

    # Autres tables (Admin, Community, Spots)
    c.execute("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT, content TEXT, image_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS spots (id TEXT PRIMARY KEY, lat REAL, lon REAL, adresse TEXT, type_dechet TEXT, photo_url TEXT, reporter_name TEXT, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS community_events (id TEXT PRIMARY KEY, title TEXT NOT NULL, event_date TEXT NOT NULL, location TEXT NOT NULL, description TEXT, organizer TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS event_rsvps (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, participant_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'yes', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(event_id, participant_name))")
    c.execute("CREATE TABLE IF NOT EXISTS admin_audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, action TEXT NOT NULL, submission_id TEXT, before_snapshot TEXT, after_snapshot TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS ux_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, tab_id TEXT, action_name TEXT, field_name TEXT, message TEXT, payload TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS volunteer_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT, category TEXT NOT NULL DEFAULT 'suggestion', content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    c.execute("CREATE TABLE IF NOT EXISTS mission_validations (id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id TEXT NOT NULL, voter_name TEXT NOT NULL, vote INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(submission_id, voter_name))")

    conn.commit()
    conn.close()

# --- REPOSITORIES PROXY (FACADE) ---

from src.repositories import submissions_repo, community_repo, admin_repo

# Submissions
def insert_submission(data, status='pending'): return submissions_repo.insert_submission(get_connection, data, status)
def update_submission_status(sub_id, status): return submissions_repo.update_submission_status(get_connection, sub_id, status)
def get_submissions_by_status(status=None): return submissions_repo.get_submissions_by_status(get_connection, status)
def get_total_approved_stats(): return submissions_repo.get_total_approved_stats(get_connection)
def get_user_impact_stats(user): return submissions_repo.get_user_impact_stats(get_connection, user)
def get_leaderboard(limit=10): return submissions_repo.get_leaderboard(get_connection, limit)

# Community
def add_message(author, content, img=None): return community_repo.add_message(get_connection, author, content, img)
def get_messages(limit=50): return community_repo.get_messages(get_connection, limit)
def add_spot(lat, lon, adr, typ, rep, img=None): return community_repo.add_spot(get_connection, lat, lon, adr, typ, rep, img)
def get_active_spots(): return community_repo.get_active_spots(get_connection)
def update_spot_status(sid, status): return community_repo.update_spot_status(get_connection, sid, status)
def add_community_event(t, d, l, desc="", org=""): return community_repo.add_community_event(get_connection, t, d, l, desc, org)
def get_community_events(limit=50, past=False): return community_repo.get_community_events(get_connection, limit, past)
def upsert_event_rsvp(eid, pname, status): return community_repo.upsert_event_rsvp(get_connection, eid, pname, status)
def get_event_rsvp_summary(eid): return community_repo.get_event_rsvp_summary(get_connection, eid)
def add_mission_validation(sid, vname, vote): return community_repo.add_mission_validation(get_connection, sid, vname, vote)
def get_mission_validation_summary(sid): return community_repo.get_mission_validation_summary(get_connection, sid)

# Admin
def add_admin_audit_log(actor, action, sid=None, b="", a=""): return admin_repo.add_admin_audit_log(get_connection, actor, action, sid, b, a)
def get_admin_audit_logs(limit=150): return admin_repo.get_admin_audit_logs(get_connection, limit)
def add_ux_event(t, tid="", an="", fn="", msg="", pl=""): return admin_repo.add_ux_event(get_connection, t, tid, an, fn, msg, pl)
def get_ux_error_stats(days=30): return admin_repo.get_ux_error_stats(get_connection, days)
def get_ux_events_raw(limit=100): return admin_repo.get_ux_events_raw(get_connection, limit)
def delete_test_data(): return admin_repo.delete_test_data(get_connection)
def add_subscriber(email): return admin_repo.add_subscriber(get_connection, email)


def get_all_subscribers(): return admin_repo.get_all_subscribers(get_connection)
