import pandas as pd
import pytest

from src import report_generator as report_module
from src.report_generator import PDFReport, safe_text


def _rich_report_df():
    return pd.DataFrame(
        [
            {
                "ville": "Paris",
                "date": "2026-01-15",
                "megots": 120,
                "dechets_kg": 8.5,
                "nb_benevoles": 1,
                "temps_min": 30,
                "association": "Brigades Vertes",
                "lieu_complet": "1er arrondissement",
                "type_lieu": "Engagé",
                "record_type": "spot",
                "source": "spotter",
                "status": "pending",
                "est_propre": False,
                "latitude": 48.8566,
                "longitude": 2.3522,
                "geometry_kind": "polyline",
                "actor_name": "Alice",
                "rsvp_yes": 2,
                "rsvp_maybe": 1,
                "rsvp_no": 0,
                "recyclable_kg": 2.0,
            },
            {
                "ville": "Paris",
                "date": "2026-03-15",
                "megots": 500,
                "dechets_kg": 12.0,
                "nb_benevoles": 3,
                "temps_min": 90,
                "association": "Brigades Vertes",
                "lieu_complet": "2e arrondissement",
                "type_lieu": "N° Boulevard/Avenue/Place",
                "record_type": "clean_place",
                "source": "community",
                "status": "approved",
                "est_propre": True,
                "latitude": 48.8570,
                "longitude": 2.3600,
                "manual_drawing_kind": "polygon",
                "actor_name": "Alice",
                "created_at": "2026-03-14",
                "approved_at": "2026-03-16",
                "rsvp_yes": "invalid",
            },
            {
                "ville": "Paris",
                "date": "2026-05-15",
                "megots": 900,
                "dechets_kg": 20.0,
                "nb_benevoles": 7,
                "temps_min": 120,
                "association": "Entreprise Solidaire",
                "lieu_complet": "Quartier sans arrondissement",
                "type_lieu": "Entreprise partenaire",
                "record_type": "spot",
                "source": "community",
                "status": "rejected",
                "est_propre": "non",
                "latitude": "invalide",
                "longitude": 2.37,
                "actor_name": "Bob",
                "submitted_at": "2026-05-14",
                "updated_at": "2026-05-13",
                "rsvp_yes": 4,
                "rsvp_maybe": 0,
                "rsvp_no": 1,
                "dechets_recycles_kg": 1.5,
            },
            {
                "ville": "Paris",
                "date": "2026-08-15",
                "megots": "pas un nombre",
                "dechets_kg": "inconnu",
                "nb_benevoles": 2,
                "temps_min": 60,
                "association": "",
                "lieu_complet": "4e arrondissement",
                "type_lieu": "Parc",
                "record_type": "other",
                "source": "other",
                "status": "new",
                "est_propre": False,
                "latitude": 48.86,
                "longitude": 2.38,
                "actor_name": "",
            },
        ]
    )


def test_pdf_report_generate_returns_bytes():
    df = pd.DataFrame(
        [
            {
                "ville": "Paris",
                "date": "2026-03-20",
                "megots": 120,
                "dechets_kg": 8.5,
                "nb_benevoles": 5,
                "benevoles": 5,
                "temps_min": 90,
                "association": "Brigades Vertes",
                "lieu_complet": "Place de la Bastille",
                "type_lieu": "N° Boulevard/Avenue/Place",
                "adresse": "Place de la Bastille, Paris",
            }
        ]
    )

    out = PDFReport(df).generate(dest="S")
    assert isinstance(out, (bytes, bytearray))
    assert len(out) > 100


def test_safe_text_repairs_mojibake_and_normalizes_non_strings():
    mojibake = "Fran" + chr(0xC3) + chr(0xA7) + "ais"
    assert safe_text(mojibake) == "Fran" + chr(0xE7) + "ais"
    assert safe_text(chr(0xAB) + " valeur " + chr(0xBB) + chr(0xA0)) == chr(0xAB) + " valeur " + chr(0xBB) + " "
    assert safe_text(42) == "42"


def test_pdf_report_falls_back_to_helvetica_when_unicode_fonts_are_absent(monkeypatch):
    monkeypatch.setattr(report_module.os.path, "exists", lambda _path: False)

    report = PDFReport(pd.DataFrame())

    assert report._unicode_font_enabled is False
    assert report._font_family == "Helvetica"
    report.add_page()
    report.set_font(report._font_family, "", 10)
    report.cell(0, 8, "Résumé d’action — fallback")
    pdf = report.output(dest="S")
    assert (pdf if isinstance(pdf, bytes) else pdf.encode("latin-1")).startswith(b"%PDF-")


def test_pdf_report_falls_back_when_font_registration_fails(monkeypatch):
    def fail_add_font(self, *args, **kwargs):
        raise OSError("font registration failed")

    monkeypatch.setattr(PDFReport, "add_font", fail_add_font)

    report = PDFReport(pd.DataFrame())

    assert report._unicode_font_enabled is False
    assert report._font_family == "Helvetica"


def test_generate_accepts_all_legacy_column_variants(monkeypatch):
    captured = []
    monkeypatch.setattr(PDFReport, "_add_all_content", lambda self, ville, city_df: captured.append(city_df.copy()))
    monkeypatch.setattr(PDFReport, "create_cover", lambda self, ville, city_df: None)
    monkeypatch.setattr(PDFReport, "output", lambda self, *args, **kwargs: b"%PDF-legacy")
    data = pd.DataFrame([{
        "ville": "Paris", "date": "2026-01-01", "nbr megots": 3, "kg dechets": 1.5,
        "nom d'association": "Association", "temps en min": 30, "nombre benevoles": 2,
        "adresse precise ou coordo GPS": "Rue Unicode", "type": "Parc",
    }])

    assert PDFReport(data).generate(dest="S") == b"%PDF-legacy"
    normalized = captured[-1]
    assert normalized.loc[0, "megots"] == 3
    assert normalized.loc[0, "dechets_kg"] == 1.5
    assert normalized.loc[0, "association"] == "Association"
    assert normalized.loc[0, "temps_min"] == 30
    assert normalized.loc[0, "nb_benevoles"] == 2
    assert normalized.loc[0, "adresse"] == "Rue Unicode"
    assert normalized.loc[0, "type_lieu"] == "Parc"


def test_governance_and_spatial_sections_handle_missing_period_and_empty_data():
    report = PDFReport(pd.DataFrame())
    report.add_page()
    report.create_governance_block(pd.DataFrame())
    report.create_spatial_analysis("Paris", pd.DataFrame())

    pdf = report.output(dest="S")
    pdf = pdf if isinstance(pdf, bytes) else pdf.encode("latin-1")
    assert pdf.startswith(b"%PDF-")
    assert report.page_no() >= 3


def test_long_registry_repeats_headers_after_page_break():
    rows = [{
        "id": f"action-{index}", "date": pd.Timestamp("2026-01-01") + pd.Timedelta(days=index),
        "lieu_complet": f"Lieu très long {index}", "association": "Association",
        "megots": index, "dechets_kg": index / 10, "temps_min": 30,
        "nb_benevoles": 2, "est_propre": False,
    } for index in range(225)]
    report = PDFReport(pd.DataFrame(rows))
    report.create_detailed_registry(pd.DataFrame(rows))

    assert report.page_no() > 2
    pdf = report.output(dest="S")
    pdf = pdf if isinstance(pdf, bytes) else pdf.encode("latin-1")
    assert pdf.startswith(b"%PDF-")


def test_external_counter_failure_is_reported_as_unavailable(monkeypatch):
    database = __import__("src.database", fromlist=["get_active_spots"])
    monkeypatch.setattr(database, "get_active_spots", lambda: (_ for _ in ()).throw(RuntimeError("sqlite unavailable")))

    metrics = PDFReport(pd.DataFrame())._compute_web_rubrique_metrics(pd.DataFrame())

    assert metrics["active_spots_count"] is None
    assert metrics["db_note"] == "Données community/spot sqlite indisponibles (RuntimeError)."


def test_web_metrics_keep_missing_external_values_uninvented():
    report = PDFReport(pd.DataFrame())
    report.is_dummy = True

    assert report._extract_arrondissement_label("1er") == "1e"
    assert report._extract_arrondissement_label("20eme") == "20e"
    assert report._extract_arrondissement_label("0e") == "Non renseigné"
    assert report._extract_arrondissement_label("21e") == "Non renseigné"

    metrics = report._compute_web_rubrique_metrics(
        pd.DataFrame(
            [
                {
                    "record_type": "clean_place",
                    "source": "spotter",
                    "type_lieu": "catégorie inconnue",
                    "geometry_kind": "polyline",
                    "manual_drawing_kind": "polygon",
                    "est_propre": True,
                }
            ]
        )
    )

    assert metrics["clean_places_count"] == 1
    assert metrics["spots_count"] == 0
    assert metrics["drawing_count"] == 1
    assert metrics["active_spots_count"] is None
    assert metrics["upcoming_events_count"] is None
    assert metrics["upcoming_rsvp_yes"] is None

    empty_metrics = report._compute_web_rubrique_metrics(pd.DataFrame())
    assert empty_metrics["clean_places_count"] == 0
    assert empty_metrics["spots_count"] == 0
    assert empty_metrics["community_source_count"] == 0
    assert empty_metrics["active_spots_count"] is None


def test_decision_chapters_use_na_for_unavailable_external_data(monkeypatch):
    report = PDFReport(pd.DataFrame())
    report.is_dummy = True
    blocks = []

    def capture_block(title, observations, decisions, **kwargs):
        blocks.append((title, observations, decisions, kwargs))

    monkeypatch.setattr(report, "_render_decision_block", capture_block)
    report.create_rubrique_decision_chapters(pd.DataFrame())

    rendered_text = "\n".join(
        str(part) for block in blocks for part in block[:3]
    ).lower()
    assert len(blocks) == 12
    assert "événements à venir: n/a" in rendered_text
    assert "rsvp oui cumules: n/a" in rendered_text
    assert "actions=0" in rendered_text
    assert "nan" not in rendered_text
    assert "inf" not in rendered_text


def test_generate_normalizes_legacy_columns_invalid_numbers_and_unknown_values(monkeypatch):
    captured = []

    def capture_content(self, ville, city_df):
        captured.append(city_df.copy())

    monkeypatch.setattr(PDFReport, "_add_all_content", capture_content)
    monkeypatch.setattr(PDFReport, "create_cover", lambda self, ville, city_df: None)
    monkeypatch.setattr(PDFReport, "output", lambda self, *args, **kwargs: b"%PDF-1.4")

    df = pd.DataFrame(
        [
            {
                "ville": "Paris",
                "date": "2026-01-01",
                "nbr megots": "pas un nombre",
                "benevoles": "3",
                "type": "catégorie inconnue",
                "est_propre": "peut-être",
                "lieu_complet": "Lieu non classé",
            }
        ]
    )

    out = PDFReport(df).generate(dest="S")
    normalized = captured[-1]

    assert out == b"%PDF-1.4"
    assert normalized.loc[0, "megots"] == 0
    assert normalized.loc[0, "dechets_kg"] == 0
    assert normalized.loc[0, "temps_min"] == 0
    assert normalized.loc[0, "nb_benevoles"] == 3
    assert normalized.loc[0, "benevoles"] == 3
    assert normalized.loc[0, "type_lieu"] == "catégorie inconnue"
    assert bool(normalized.loc[0, "est_propre"]) is False


def test_empty_dataframe_generates_a_structurally_valid_pdf():
    out = PDFReport(pd.DataFrame()).generate(dest="S")
    pdf = out if isinstance(out, bytes) else out.encode("latin-1")

    assert pdf.startswith(b"%PDF-")
    assert len(pdf) > 100


def test_summary_table_renders_structured_pdf_output():
    report = PDFReport(pd.DataFrame())
    report.add_page()
    report._render_summary_table(
        "Tableau de synthèse",
        [("Indicateur", 74, "L"), ("Valeur", 38, "C"), ("Lecture", 78, "L")],
        [("Une valeur très longue à tronquer", "0 kg", "Valeur manquante")],
    )

    out = report.output(dest="S")
    pdf = out if isinstance(out, bytes) else out.encode("latin-1")
    assert pdf.startswith(b"%PDF-")
    assert report.page_no() == 1


@pytest.mark.parametrize("failure", [PermissionError("output denied"), RuntimeError("render failed")])
def test_generate_propagates_output_failures(monkeypatch, failure):
    monkeypatch.setattr(PDFReport, "_add_all_content", lambda self, ville, city_df: None)
    monkeypatch.setattr(PDFReport, "create_cover", lambda self, ville, city_df: None)

    def fail_output(self, *args, **kwargs):
        raise failure

    monkeypatch.setattr(PDFReport, "output", fail_output)

    with pytest.raises(type(failure), match=str(failure)):
        PDFReport(pd.DataFrame()).generate(dest="S")


def test_generate_reports_filesystem_error_for_unavailable_output_directory(monkeypatch, tmp_path):
    monkeypatch.setattr(PDFReport, "_add_all_content", lambda self, ville, city_df: None)
    monkeypatch.setattr(PDFReport, "create_cover", lambda self, ville, city_df: None)
    monkeypatch.setattr(report_module, "OUTPUT_DIR", str(tmp_path / "missing" / "reports"))

    with pytest.raises(OSError):
        PDFReport(pd.DataFrame()).generate(dest="F")


def test_report_renders_rich_temporal_spatial_and_partial_data(monkeypatch, tmp_path):
    monkeypatch.setattr(report_module, "OUTPUT_DIR", str(tmp_path))
    report = PDFReport(_rich_report_df())
    report.is_rse = True

    output = report.generate(dest="S")
    pdf = output if isinstance(output, bytes) else output.encode("latin-1")

    assert pdf.startswith(b"%PDF-")
    assert len(pdf) > 20_000
    assert report.toc_data
    assert not list(tmp_path.glob("*.png"))


def test_web_metrics_reads_external_counts_without_inventing_values(monkeypatch):
    report = PDFReport(pd.DataFrame())
    database = __import__("src.database", fromlist=["get_active_spots"])
    monkeypatch.setattr(database, "get_active_spots", lambda: [{"id": "spot-1"}])
    monkeypatch.setattr(
        database,
        "get_community_events",
        lambda limit=50, past=False: [{"id": "event-1"}, {"id": None}],
    )
    monkeypatch.setattr(database, "get_event_rsvp_summary", lambda event_id: {"yes": "3"})

    metrics = report._compute_web_rubrique_metrics(pd.DataFrame({"record_type": ["spot"]}))

    assert metrics["active_spots_count"] == 1
    assert metrics["upcoming_events_count"] == 2
    assert metrics["upcoming_rsvp_yes"] == 3
    assert metrics["db_note"] is None


def test_report_exercises_error_and_empty_rendering_branches(monkeypatch, tmp_path):
    monkeypatch.setattr(report_module, "OUTPUT_DIR", str(tmp_path))
    report = PDFReport(pd.DataFrame())
    report.add_page()
    report.create_performance_analysis("Paris", pd.DataFrame({
        "date": pd.to_datetime(["2026-01-01"]),
        "megots": [0],
        "dechets_kg": [0.0],
        "nb_benevoles": [0],
        "temps_min": [0],
    }))
    report.create_trends_analysis("Paris", pd.DataFrame({
        "date": pd.to_datetime(["2026-01-01", "2026-02-01"]),
        "megots": [10, 20],
        "dechets_kg": [1.0, 2.0],
    }))
    report.create_spatial_analysis("Paris", pd.DataFrame({"type_lieu": ["Parc"]}))
    report.create_volunteer_analysis(pd.DataFrame({
        "nb_benevoles": [0, 2],
        "megots": [0, 10],
    }))

    pdf = report.output(dest="S")
    pdf = pdf if isinstance(pdf, bytes) else pdf.encode("latin-1")
    assert pdf.startswith(b"%PDF-")
