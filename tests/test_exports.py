import pandas as pd

from src.services.exports import build_eprtr_export_df


def test_build_eprtr_export_df_generates_long_format_rows():
    approved_df = pd.DataFrame(
        [
            {
                "date": "2026-03-20",
                "lat": 48.85,
                "lon": 2.35,
                "megots": 100,
                "dechets_kg": 4.2,
                "anonymized_id": "brigadier_a",
            }
        ]
    )

    out = build_eprtr_export_df(approved_df)
    assert len(out) == 2
    assert set(out["pollutant_name"]) == {"mégots (cigarette butts)", "déchets divers (mixed waste)"}
    assert {"latitude", "longitude", "contributor_id"}.issubset(out.columns)


def test_build_eprtr_export_df_handles_empty_input():
    out = build_eprtr_export_df(pd.DataFrame())
    assert out.empty
