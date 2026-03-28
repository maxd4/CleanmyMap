from src.data_quality import validate_feedback_input, validate_submission_inputs


def test_validate_submission_inputs_detects_out_of_range_values():
    errors = validate_submission_inputs(
        {
            "benevoles": 0,
            "temps_min": 2000,
            "megots": 300000,
            "dechets_kg": 3000,
            "emplacement_brut": "120.0, 200.0",
        }
    )
    assert len(errors) >= 4


def test_validate_submission_inputs_accepts_plausible_values():
    errors = validate_submission_inputs(
        {
            "benevoles": 4,
            "temps_min": 90,
            "megots": 230,
            "dechets_kg": 12.5,
            "emplacement_brut": "48.8566, 2.3522",
        }
    )
    assert errors == []


def test_validate_feedback_input_rejects_empty_message():
    assert validate_feedback_input("   ") == ["Merci de renseigner votre retour avant l'envoi."]


def test_validate_feedback_input_accepts_regular_message():
    assert validate_feedback_input("Le formulaire mobile est top, merci !") == []
