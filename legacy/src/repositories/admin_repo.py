import sqlite3

def add_admin_audit_log(get_connection, actor, action, submission_id=None, before_snapshot="", after_snapshot=""):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO admin_audit_log (actor, action, submission_id, before_snapshot, after_snapshot)
        VALUES (?, ?, ?, ?, ?)
    ''', (actor, action, submission_id, before_snapshot, after_snapshot))
    conn.commit()
    conn.close()

def get_admin_audit_logs(get_connection, limit=150):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM admin_audit_log ORDER BY created_at DESC, id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_ux_event(get_connection, event_type, tab_id="", action_name="", field_name="", message="", payload=""):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO ux_events (event_type, tab_id, action_name, field_name, message, payload)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (event_type, tab_id, action_name, field_name, message, payload))
    conn.commit()
    conn.close()

def delete_test_data(get_connection):

    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM submissions WHERE is_real = 0")
    deleted = c.rowcount
    conn.commit()
    conn.close()
    return deleted

def get_ux_error_stats(get_connection, days=30):

    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    window = f"-{int(days)} day"
    c.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN event_type='invalid_field' THEN 1 ELSE 0 END) AS invalid, SUM(CASE WHEN event_type='broken_action' THEN 1 ELSE 0 END) AS broken FROM ux_events WHERE created_at >= datetime('now', ?)", (window,))
    row = c.fetchone()
    c.execute("SELECT field_name, COUNT(*) AS occurrences FROM ux_events WHERE event_type='invalid_field' AND created_at >= datetime('now', ?) AND field_name IS NOT NULL GROUP BY field_name ORDER BY occurrences DESC LIMIT 10", (window,))
    top = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"total_events": row["total"] or 0, "invalid_fields": row["invalid"] or 0, "broken_actions": row["broken"] or 0, "top_invalid_fields": top}

def get_ux_events_raw(get_connection, limit=100):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM ux_events ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_subscriber(get_connection, email):

    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO subscribers (email) VALUES (?)", (email.strip().lower(),))
    conn.commit()
    conn.close()

def get_all_subscribers(get_connection):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT email FROM subscribers")
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows]
