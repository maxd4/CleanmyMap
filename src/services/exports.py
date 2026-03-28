from __future__ import annotations

import pandas as pd

from src.data_quality import validate_submission_inputs


def build_eprtr_export_df(approved_df: pd.DataFrame) -> pd.DataFrame:
    """Build a normalized E-PRTR long-format export from approved actions."""
    if approved_df.empty:
        return pd.DataFrame(
            columns=[
                "reporting_year",
                "latitude",
                "longitude",
                "pollutant_name",
                "quantity",
                "unit",
                "method_code",
                "method_type",
                "contributor_id",
            ]
        )

    science_df = approved_df.copy()
    science_df["reporting_year"] = pd.to_datetime(science_df.get("date"), errors="coerce").dt.year
    base_cols = ["reporting_year", "lat", "lon", "anonymized_id"]

    megots_series = pd.to_numeric(science_df.get("megots", 0), errors="coerce").fillna(0)
    dechets_series = pd.to_numeric(science_df.get("dechets_kg", 0), errors="coerce").fillna(0.0)

    megots_rows = science_df.loc[megots_series > 0, base_cols].copy()
    megots_rows["pollutant_name"] = "mégots (cigarette butts)"
    megots_rows["quantity"] = megots_series[megots_series > 0]
    megots_rows["unit"] = "units"
    megots_rows["method_code"] = "M"
    megots_rows["method_type"] = "measurement"

    dechets_rows = science_df.loc[dechets_series > 0, base_cols].copy()
    dechets_rows["pollutant_name"] = "déchets divers (mixed waste)"
    dechets_rows["quantity"] = dechets_series[dechets_series > 0]
    dechets_rows["unit"] = "kg"
    dechets_rows["method_code"] = "M"
    dechets_rows["method_type"] = "measurement"

    eper_df = pd.concat([megots_rows, dechets_rows], ignore_index=True)
    if eper_df.empty:
        return pd.DataFrame(
            columns=[
                "reporting_year",
                "latitude",
                "longitude",
                "pollutant_name",
                "quantity",
                "unit",
                "method_code",
                "method_type",
                "contributor_id",
            ]
        )
    return eper_df.rename(
        columns={
            "lat": "latitude",
            "lon": "longitude",
            "anonymized_id": "contributor_id",
        }
    )


def build_submission_validation_errors(submission: dict) -> list[str]:
    """Adapter wrapper to keep validation calls centralized in service layer."""
    return validate_submission_inputs(submission)

