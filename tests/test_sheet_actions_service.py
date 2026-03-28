import pandas as pd

from src.services import sheet_actions as sa


def test_sheet_csv_url_extracts_google_sheet_id():
    url = "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0"
    assert sa.sheet_csv_url(url).endswith("/abc123/export?format=csv")


def test_anonymize_contributor_is_deterministic():
    one = sa.anonymize_contributor("Alice")
    two = sa.anonymize_contributor("alice")
    assert one == two
    assert one.startswith("brigadier_")


def test_fuzzy_address_match_returns_known_entry_when_close():
    matched = sa.fuzzy_address_match("12 Rue de Paris", ["12 Rue de Paris, Paris"], threshold=80)
    assert matched == "12 Rue de Paris, Paris"


def test_load_sheet_actions_builds_rows_without_network(monkeypatch):
    source_df = pd.DataFrame(
        [
            {
                "Date": "20/03/2026",
                "Adresse": "10 Rue Test Paris",
                "Type": "Rue",
                "Association": "Brigades",
                "Megots": 42,
                "Dechets": 3.5,
                "Benevoles": 2,
                "Liste lieux propres": "20 Rue Propre Paris",
            }
        ]
    )

    monkeypatch.setattr(sa.pd, "read_csv", lambda *_args, **_kwargs: source_df)

    def fake_parse_coords(value: str):
        return (48.85, 2.35) if value else (None, None)

    actions = sa.load_sheet_actions(
        sheet_url="https://docs.google.com/spreadsheets/d/abc123/edit#gid=0",
        approved_submissions=[],
        parse_coords=fake_parse_coords,
        sanitize_dataframe_text=lambda df: df,
    )

    assert len(actions) == 2
    assert actions[0]["source"] == "google_sheet"
    assert actions[0]["adresse"] == "10 Rue Test Paris"
    assert actions[1]["est_propre"] is True
