from src.services.community_validation import build_pending_public_previews


def test_pending_public_previews_remove_sensitive_fields():
    pending_rows = [
        {
            "id": "abcdef123456",
            "type_lieu": "Rue passante",
            "adresse": "10 rue secrete",
            "association": "Assoc X",
            "date": "2026-03-28",
            "dechets_kg": 4.2,
            "megots": 180,
            "benevoles": 5,
        }
    ]

    previews = build_pending_public_previews(pending_rows)
    assert len(previews) == 1

    preview_dict = previews[0].as_dict()
    assert preview_dict["public_ref"] == "abcdef12"
    assert "adresse" not in preview_dict
    assert "association" not in preview_dict
    assert "date" not in preview_dict
    assert preview_dict["impact_level"] in {"leger", "modere", "eleve"}
