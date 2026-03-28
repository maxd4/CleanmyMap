import sqlite3
import uuid
from datetime import datetime

def add_message(get_connection, author, content, image_url=None):
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO messages (author, content, image_url) VALUES (?, ?, ?)", (author, content, image_url))
    conn.commit()
    conn.close()

def get_messages(get_connection, limit=50):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM messages ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_spot(get_connection, lat, lon, adresse, type_dechet, reporter_name, photo_url=None, status="new"):
    conn = get_connection()
    c = conn.cursor()
    spot_id = str(uuid.uuid4())
    c.execute('''
        INSERT INTO spots (id, lat, lon, adresse, type_dechet, reporter_name, photo_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (spot_id, lat, lon, adresse, type_dechet, reporter_name, photo_url, status))
    conn.commit()
    conn.close()
    return spot_id

def get_active_spots(get_connection):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM spots WHERE status IN ('active', 'new', 'in_progress') ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_spot_status(get_connection, spot_id, status='cleaned'):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE spots SET status = ? WHERE id = ?", (status, spot_id))
    conn.commit()
    conn.close()

def add_community_event(get_connection, title, event_date, location, description="", organizer=""):
    conn = get_connection()
    c = conn.cursor()
    event_id = str(uuid.uuid4())
    c.execute('''
        INSERT INTO community_events (id, title, event_date, location, description, organizer)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (event_id, title, event_date, location, description, organizer))
    conn.commit()
    conn.close()
    return event_id

def get_community_events(get_connection, limit=50, include_past=False):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if include_past:
        c.execute("SELECT * FROM community_events ORDER BY event_date ASC LIMIT ?", (limit,))
    else:
        c.execute("SELECT * FROM community_events WHERE event_date >= date('now') ORDER BY event_date ASC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def upsert_event_rsvp(get_connection, event_id, participant_name, status):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO event_rsvps (event_id, participant_name, status) VALUES (?, ?, ?)
        ON CONFLICT(event_id, participant_name) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
    ''', (event_id, participant_name, status))
    conn.commit()
    conn.close()

def get_event_rsvp_summary(get_connection, event_id):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('''
        SELECT SUM(CASE WHEN status='yes' THEN 1 ELSE 0 END) as yes_count,
               SUM(CASE WHEN status='maybe' THEN 1 ELSE 0 END) as maybe_count,
               SUM(CASE WHEN status='no' THEN 1 ELSE 0 END) as no_count
        FROM event_rsvps WHERE event_id = ?
    ''', (event_id,))
    row = c.fetchone()
    conn.close()
    return {"yes": row["yes_count"] or 0, "maybe": row["maybe_count"] or 0, "no": row["no_count"] or 0}

def add_mission_validation(get_connection, submission_id, voter_name, vote):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO mission_validations (submission_id, voter_name, vote) VALUES (?, ?, ?)
        ON CONFLICT(submission_id, voter_name) DO UPDATE SET vote = excluded.vote, created_at = CURRENT_TIMESTAMP
    ''', (submission_id, voter_name, int(vote)))
    conn.commit()
    conn.close()

def get_mission_validation_summary(get_connection, submission_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT SUM(CASE WHEN vote > 0 THEN 1 ELSE 0 END), SUM(CASE WHEN vote < 0 THEN 1 ELSE 0 END), SUM(vote) FROM mission_validations WHERE submission_id = ?", (submission_id,))
    row = c.fetchone()
    conn.close()
    return {'up': row[0] or 0, 'down': row[1] or 0, 'score': row[2] or 0}
