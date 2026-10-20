import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import import_sheet
from scripts.import_sheet import extract_coords


@pytest.fixture(autouse=True)
def block_external_requests(monkeypatch):
    """Make every test fail closed unless it installs an explicit fake."""

    def blocked(*args, **kwargs):
        raise AssertionError("external HTTP is forbidden in import_sheet tests")

    monkeypatch.setattr(import_sheet.pd, "read_csv", blocked)
    monkeypatch.setattr(import_sheet, "SUPABASE_KEY", "synthetic-test-key")
    for method in ("get", "post", "delete"):
        monkeypatch.setattr(import_sheet.requests, method, blocked)


def _response(status_code=200, payload=None, text=""):
    return SimpleNamespace(
        status_code=status_code,
        text=text,
        json=lambda: payload,
    )


def _base_row(**overrides):
    row = {
        "GPS": "48.8566, 2.3522",
        "Mégots": "0",
        "Poids déchets": "0",
        "Durée minutes": "60",
        "Date de collecte": "01/02/2024",
        "Nombre de bénévoles": "2",
        "Catégorie": "quai",
        "Association": "Collectif test",
        "Lieux propres": "non",
        "Qualité": "propre",
    }
    return {**row, **overrides}


def test_extract_coords_preserves_signed_and_leading_dot_decimals():
    assert extract_coords(".5, 2.3") == (0.5, 2.3)
    assert extract_coords("+.5; -.5") == (0.5, -0.5)
    assert extract_coords("+12.5, -2") == (12.5, -2.0)


@pytest.mark.parametrize("value", [None, pd.NA, ""])
def test_extract_coords_returns_missing_coordinates_for_empty_values(value):
    assert extract_coords(value) == (None, None)


def test_extract_coords_rejects_malformed_pairs_without_scanning_as_a_new_pair():
    assert extract_coords(".5., 2.3") == (None, None)
    assert extract_coords("1,,2") == (None, None)
    assert extract_coords("1 2") == (None, None)
    assert extract_coords(f"{'9' * 100_000} invalid") == (None, None)
    assert extract_coords(f"{' ' * 100_000}not coordinates") == (None, None)


@pytest.mark.parametrize(
    ("key", "column"),
    [
        ("gps", "Adresse de collecte"),
        ("megots", "Nombre de mégots"),
        ("poids", "Déchets kg"),
        ("temps", "Durée en minutes"),
        ("date", "Date de collecte"),
        ("ville", "Commune"),
        ("benevoles", "Nombre de participants"),
        ("type", "Catégorie du lieu"),
        ("association", "Nom association"),
        ("propre", "Liste lieux propres"),
        ("megots_qualite", "État des mégots"),
    ],
)
def test_find_col_recognizes_historical_column_variants(key, column):
    assert import_sheet.find_col(["irrelevant", column], key) == column


def test_find_col_returns_none_for_missing_optional_column():
    assert import_sheet.find_col(["Date", "GPS"], "association") is None


@pytest.mark.parametrize("value", [None, pd.NA, "Lieu non spécifié", ""])
def test_geocode_location_skips_empty_or_unspecified_values(value, monkeypatch):
    calls = []
    monkeypatch.setattr(import_sheet.requests, "get", lambda *args, **kwargs: calls.append(args))

    assert import_sheet.geocode_location(value) == (None, None)
    assert calls == []


def test_geocode_location_normalizes_query_and_returns_coordinates(monkeypatch):
    calls = []
    monkeypatch.setattr(
        import_sheet.requests,
        "get",
        lambda url, **kwargs: calls.append((url, kwargs)) or _response(payload=[{"lat": "48.9", "lon": "2.4"}]),
    )

    assert import_sheet.geocode_location("Jaridn, St Denis") == (48.9, 2.4)
    assert calls[0][0] == "https://nominatim.openstreetmap.org/search"
    assert calls[0][1]["params"] == {
        "q": "jardin, saint denis, Paris, France",
        "format": "json",
        "limit": 1,
    }
    assert calls[0][1]["headers"]["User-Agent"].startswith("CleanMyMap-")


@pytest.mark.parametrize(
    "response",
    [
        _response(payload=[]),
        _response(status_code=503, payload=[{"lat": "1", "lon": "2"}], text="unavailable"),
        RuntimeError("network unavailable"),
        _response(payload=[{"lat": "not-a-number", "lon": "2"}]),
    ],
)
def test_geocode_location_returns_no_invented_result_on_failures(response, monkeypatch):
    def fake_get(*args, **kwargs):
        if isinstance(response, Exception):
            raise response
        return response

    monkeypatch.setattr(import_sheet.requests, "get", fake_get)

    assert import_sheet.geocode_location("Parc synthétique") == (None, None)


def test_run_normalizes_rows_and_preserves_presence_metadata(monkeypatch, capsys):
    frame = pd.DataFrame(
        [
            _base_row(
                GPS="48.8566, 2.3522",
                Mégots="0.5",
                **{"Poids déchets": "1,5", "Durée minutes": "invalid"},
                **{"Date de collecte": "15/03/2024", "Nombre de bénévoles": "0"},
                **{"Lieux propres": "non", "Qualité": "mouillé"},
            ),
            _base_row(
                GPS="Jardin synthétique",
                Mégots="0.2",
                **{"Poids déchets": "not-a-number", "Date de collecte": "02/04/2024"},
                **{"Nombre de bénévoles": "invalid", "Durée minutes": ""},
                **{"Association": "", "Catégorie": "parc", "Qualité": "humide"},
            ),
            _base_row(**{"Date de collecte": "31/02/2024", "Lieux propres": "non"}),
        ]
    )
    posted = []
    deleted = []
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet, "geocode_location", lambda value: (48.8, 2.3))
    monkeypatch.setattr(import_sheet.time, "sleep", lambda seconds: None)
    monkeypatch.setattr(import_sheet.requests, "delete", lambda url, **kwargs: deleted.append((url, kwargs)) or _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda url, **kwargs: posted.append((url, kwargs)) or _response(201))
    monkeypatch.setattr(import_sheet, "SUPABASE_KEY", "synthetic-key")

    import_sheet.run()

    assert len(deleted) == 1
    assert deleted[0][0].endswith("created_by_clerk_id=eq.legacy_import")
    assert len(posted) == 1
    payload = posted[0][1]["json"]
    assert len(payload) == 2

    first, second = payload
    assert first["action_date"] == "2024-03-15"
    assert first["latitude"] == 48.8566
    assert first["longitude"] == 2.3522
    assert first["waste_kg"] == 1.5
    assert first["cigarette_butts"] == int(0.5 * 4400 * 0.4)
    assert first["volunteers_count"] == 1
    assert first["duration_minutes"] == 60
    first_meta = json.loads(first["notes"][len("[cmm-meta]") :])
    assert first_meta["provided"] == ["waste_kg", "cigarette_butts"]
    assert first_meta["associationName"] == "Collectif test"
    assert first_meta["placeType"] == "quai"
    assert first_meta["wasteBreakdown"] == {"megotsKg": 0.5, "megotsCondition": "propre"}

    assert second["action_date"] == "2024-04-02"
    assert (second["latitude"], second["longitude"]) == (48.8, 2.3)
    assert second["waste_kg"] == 0.0
    assert second["cigarette_butts"] == int(0.2 * 4400 * 0.65)
    assert second["volunteers_count"] == 1
    assert second["duration_minutes"] == 60
    second_meta = json.loads(second["notes"][len("[cmm-meta]") :])
    assert second_meta["provided"] == ["cigarette_butts"]
    assert second_meta["placeType"] == "parc"
    assert second_meta["wasteBreakdown"]["megotsCondition"] == "humide"
    assert "31/02/2024" not in capsys.readouterr().out


def test_run_uses_today_for_clean_place_with_missing_date(monkeypatch):
    frame = pd.DataFrame([_base_row(**{"Date de collecte": None, "Lieux propres": "oui", "Mégots": None})])
    posted = []
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: posted.append(kwargs["json"]) or _response(200))
    monkeypatch.setattr(import_sheet, "SUPABASE_KEY", "synthetic-key")

    import_sheet.run()

    action = posted[0][0]
    assert action["action_date"] == import_sheet.datetime.now().strftime("%Y-%m-%d")
    assert action["cigarette_butts"] == 0
    assert json.loads(action["notes"][len("[cmm-meta]") :])["provided"] == ["waste_kg"]


def test_run_supports_missing_optional_columns_and_skips_invalid_dates(monkeypatch):
    frame = pd.DataFrame(
        [
            {"Date": "01/01/2024", "GPS": "48.1, 2.1"},
            {"Date": "31/02/2024", "GPS": "48.2, 2.2"},
        ]
    )
    posted = []
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: posted.append(kwargs["json"]) or _response(201))
    monkeypatch.setattr(import_sheet, "SUPABASE_KEY", "synthetic-key")

    import_sheet.run()

    assert len(posted) == 1
    action = posted[0][0]
    assert action["action_date"] == "2024-01-01"
    assert action["location_label"] == "48.1, 2.1"
    assert action["waste_kg"] == 0.0
    assert action["cigarette_butts"] == 0
    assert json.loads(action["notes"][len("[cmm-meta]") :]) == {"provided": []}


def test_run_handles_empty_input_without_mutation(monkeypatch, capsys):
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: pd.DataFrame())
    calls = []
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: calls.append("delete"))
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: calls.append("post"))

    import_sheet.run()

    assert calls == []
    assert "aucune action" in capsys.readouterr().out


def test_run_uses_date_fallback_only_for_the_clean_place_on_datetime_error(monkeypatch):
    frame = pd.DataFrame(
        [
            _base_row(**{"Date de collecte": "raise-clean", "Lieux propres": "oui"}),
            _base_row(**{"Date de collecte": "raise-skip", "Lieux propres": "non"}),
        ]
    )
    original_to_datetime = import_sheet.pd.to_datetime
    posted = []

    def fake_to_datetime(value, *args, **kwargs):
        if str(value).startswith("raise-"):
            raise ValueError("invalid date fixture")
        return original_to_datetime(value, *args, **kwargs)

    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.pd, "to_datetime", fake_to_datetime)
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: posted.append(kwargs["json"]) or _response(201))

    import_sheet.run()

    assert len(posted[0]) == 1
    assert posted[0][0]["action_date"] == import_sheet.datetime.now().strftime("%Y-%m-%d")


def test_run_keeps_zero_defaults_when_optional_numeric_values_are_empty_or_invalid(monkeypatch):
    frame = pd.DataFrame(
        [
            _base_row(**{"Date de collecte": "2024-01-01", "Poids déchets": "", "Mégots": ""}),
            _base_row(**{"Date de collecte": "2024-01-02", "Poids déchets": "1,2", "Mégots": "invalid"}),
        ]
    )
    posted = []
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: posted.append(kwargs["json"]) or _response(201))

    import_sheet.run()

    empty_values, invalid_butts = posted[0]
    assert empty_values["waste_kg"] == 0.0
    assert empty_values["cigarette_butts"] == 0
    assert json.loads(empty_values["notes"][len("[cmm-meta]") :])["provided"] == []
    assert invalid_butts["waste_kg"] == 1.2
    assert invalid_butts["cigarette_butts"] == 0
    assert json.loads(invalid_butts["notes"][len("[cmm-meta]") :])["provided"] == ["waste_kg"]


def test_run_reports_download_failure_without_mutation(monkeypatch, capsys):
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: (_ for _ in ()).throw(ValueError("bad csv")))
    calls = []
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: calls.append("delete"))
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: calls.append("post"))

    import_sheet.run()

    assert calls == []
    assert "Erreur telechargement: bad csv" in capsys.readouterr().out


def test_run_batches_actions_and_uses_synthetic_headers(monkeypatch):
    frame = pd.DataFrame([_base_row(**{"Date de collecte": "2024-01-01"}) for _ in range(101)])
    batches = []
    deletes = []
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.requests, "delete", lambda url, **kwargs: deletes.append((url, kwargs)) or _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda url, **kwargs: batches.append((url, kwargs)) or _response(201))
    monkeypatch.setattr(import_sheet, "SUPABASE_KEY", "synthetic-key")

    import_sheet.run()

    assert len(deletes) == 1
    assert [len(item[1]["json"]) for item in batches] == [100, 1]
    assert all(item[1]["headers"]["apikey"] == "synthetic-key" for item in batches)
    assert all(item[1]["headers"]["Authorization"] == "Bearer synthetic-key" for item in batches)


def test_run_continues_after_delete_failure_and_reports_http_post_failure(monkeypatch, capsys):
    frame = pd.DataFrame([_base_row()])
    posts = []
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("delete refused")))
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: posts.append(kwargs) or _response(500, text="insert refused"))

    import_sheet.run()

    output = capsys.readouterr().out
    assert len(posts) == 1
    assert "Erreur purge: delete refused" in output
    assert "Erreur HTTP 500: insert refused" in output
    assert "Import termine." in output


def test_run_propagates_post_transport_failure(monkeypatch):
    frame = pd.DataFrame([_base_row()])
    monkeypatch.setattr(import_sheet.pd, "read_csv", lambda *args, **kwargs: frame.copy())
    monkeypatch.setattr(import_sheet.requests, "delete", lambda *args, **kwargs: _response())
    monkeypatch.setattr(import_sheet.requests, "post", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("post unavailable")))

    with pytest.raises(RuntimeError, match="post unavailable"):
        import_sheet.run()
