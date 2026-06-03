import pandas as pd

from src.report_generator import PDFReport


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
