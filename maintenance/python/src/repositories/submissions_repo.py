from __future__ import annotations
import sqlite3
from datetime import datetime
import pandas as pd
from typing import Mapping, Any

def insert_submission(get_connection, data, status='pending'):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT OR IGNORE INTO submissions (
            id, nom, association, type_lieu, adresse, adresse_depart, adresse_arrivee, date, benevoles, temps_min,
            megots, dechets_kg, plastique_kg, verre_kg, metal_kg, gps, lat, lon, lat_depart, lon_depart, lat_arrivee, lon_arrivee,
            commentaire, est_propre, source, tags, status, description, website_url, eco_points, is_real, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('id'), data.get('nom'), data.get('association'), data.get('type_lieu'),
        data.get('adresse'), data.get('adresse_depart', data.get('adresse')), data.get('adresse_arrivee'),
        data.get('date'), data.get('benevoles'), data.get('temps_min'),
        data.get('megots'), data.get('dechets_kg'), data.get('plastique_kg', 0.0),
        data.get('verre_kg', 0.0), data.get('metal_kg', 0.0), data.get('gps'),
        data.get('lat'), data.get('lon'),
        data.get('lat_depart', data.get('lat')), data.get('lon_depart', data.get('lon')),
        data.get('lat_arrivee'), data.get('lon_arrivee'),
        data.get('commentaire'), data.get('est_propre', False),
        data.get('source', 'formulaire'), data.get('tags', ''), status, data.get('description'),
        data.get('website_url'), data.get('eco_points', 0), int(data.get('is_real', True)),
        data.get('submitted_at', datetime.now().isoformat())
    ))

    conn.commit()
    conn.close()

def update_submission_status(get_connection, sub_id, new_status):
    conn = get_connection()
    c = conn.cursor()
    if new_status in ('approved', 'rejected'):
        c.execute("UPDATE submissions SET status = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, sub_id))
    else:
        c.execute("UPDATE submissions SET status = ?, validated_at = NULL WHERE id = ?", (new_status, sub_id))
    conn.commit()
    conn.close()

def get_submissions_by_status(get_connection, status=None):
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

def get_total_approved_stats(get_connection):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT SUM(megots), SUM(dechets_kg), SUM(benevoles) FROM submissions WHERE status = 'approved' AND est_propre = 0")
    row = c.fetchone()
    conn.close()
    return {'megots': row[0] or 0, 'dechets_kg': row[1] or 0.0, 'benevoles': row[2] or 0}

def get_user_impact_stats(get_connection, user_name):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT COALESCE(SUM(eco_points), 0) AS total_points, COALESCE(SUM(dechets_kg), 0) AS total_kg, COUNT(*) AS nb_actions
        FROM submissions WHERE status = 'approved' AND LOWER(COALESCE(nom, '')) = LOWER(?)
    """, (str(user_name or "").strip(),))
    row = c.fetchone()
    conn.close()
    return {
        "nom": str(user_name or "").strip(),
        "total_points": int(row["total_points"] or 0),
        "total_kg": float(row["total_kg"] or 0.0),
        "nb_actions": int(row["nb_actions"] or 0),
    }

def get_leaderboard(get_connection, limit=10):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT nom, SUM(eco_points) as total_points, COUNT(*) as nb_actions
        FROM submissions WHERE status = 'approved' GROUP BY nom ORDER BY total_points DESC LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
