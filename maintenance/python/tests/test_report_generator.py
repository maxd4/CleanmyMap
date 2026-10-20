import pandas as pd
import pytest

from src import report_generator as report_module
from src.report_generator import PDFReport, safe_text


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
