from src.map_utils import create_premium_popup, evaluate_badges, sanitize_popup_row


def test_create_premium_popup_escapes_dynamic_html_fields():
    row = {
        "est_propre": False,
        "type_lieu": '<script>alert("x")</script>',
        "association": '<img src=x onerror=alert("x")>',
        "commentaire": "<b>hello</b>",
        "adresse": "<script>addr</script>",
        "adresse_depart": '<img src=x onerror=1>',
        "adresse_arrivee": "<svg/onload=1>",
        "tags": '<svg/onload=1>,normal',
        "megots": 12,
        "dechets_kg": 2.5,
        "temps_min": 40,
        "benevoles": 3,
        "tendance": "<script>trend</script>",
        "date": "2026-03-27",
    }
    score_data = {"score_mixte": 44.5, "score_salete": 88.0, "jours": 2}

    popup_html = create_premium_popup(row, score_data, gap_alert="<b>alert</b><br>test")

    assert "<script>" not in popup_html
    assert "<img" not in popup_html
    assert "<svg" not in popup_html
    assert "&lt;script&gt;addr&lt;/script&gt;" in popup_html
    assert "&lt;svg/onload=1&gt;" in popup_html


def test_sanitize_popup_row_truncates_and_escapes():
    raw = {
        "adresse": '<script>alert("x")</script>' * 12,
        "type_lieu": '<img src=x onerror=alert("x")>',
        "association": None,
        "reporter_name": "<svg/onload=1>",
    }
    sanitized = sanitize_popup_row(raw)

    assert "<script>" not in sanitized.escaped["adresse"]
    assert "<img" not in sanitized.escaped["type_lieu"]
    assert "<svg" not in sanitized.escaped["reporter_name"]
    assert len(sanitized.row["adresse"]) <= 160
    assert sanitized.row["association"] == ""


def test_evaluate_badges_disables_kg_badge_when_total_kg_unavailable():
    badges, warnings = evaluate_badges({"nb_actions": 8, "total_points": 1200, "total_kg": "not_a_number"})
    badge_ids = {badge["id"] for badge in badges}

    assert "heavy_lifter" not in badge_ids
    assert "eco_hero" in badge_ids
    assert warnings
