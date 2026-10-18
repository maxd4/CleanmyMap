import numpy as np
import pandas as pd

from src.analytics import compute_advanced_kpis


def _submissions(rows: list[dict[str, object]]) -> pd.DataFrame:
    return pd.DataFrame(rows)


def test_empty_frames_keep_measurements_unavailable() -> None:
    result = compute_advanced_kpis(pd.DataFrame(), pd.DataFrame())

    assert result["total_kg"] is None
    assert result["total_megots"] is None
    assert result["estimated_cost_saved_eur"] is None
    assert result["measurement_quality"]["dechets_kg"]["state"] == "unavailable"
    assert result["measurement_quality"]["megots"]["state"] == "unavailable"


def test_explicit_zero_is_observed_and_complete_measurements_keep_historical_totals() -> None:
    result = compute_advanced_kpis(
        _submissions([{"status": "approved"}]),
        pd.DataFrame({"dechets_kg": [0.0, 2.5], "megots": [0, 12]}),
    )

    assert result["total_kg"] == 2.5
    assert result["total_megots"] == 12.0
    assert result["estimated_cost_saved_eur"] == 0.375
    assert result["measurement_quality"]["dechets_kg"]["zero_count"] == 1
    assert result["measurement_quality"]["dechets_kg"]["is_exhaustive"] is True


def test_missing_nan_and_invalid_values_are_not_converted_to_zero() -> None:
    result = compute_advanced_kpis(
        pd.DataFrame(),
        pd.DataFrame(
            {
                "dechets_kg": [None, np.nan, "inconnu", -1.0, np.inf, 2.5],
                "megots": [None, np.nan, "inconnu", -4, np.inf, 12],
            }
        ),
    )

    kg_quality = result["measurement_quality"]["dechets_kg"]
    megots_quality = result["measurement_quality"]["megots"]
    assert result["total_kg"] is None
    assert result["total_megots"] is None
    assert result["observed_total_kg"] == 2.5
    assert result["observed_total_megots"] == 12.0
    assert kg_quality["state"] == "partial"
    assert kg_quality["missing_count"] == 2
    assert kg_quality["invalid_count"] == 3
    assert kg_quality["negative_count"] == 1
    assert kg_quality["valid_count"] == 1
    assert megots_quality["missing_count"] == 2
    assert megots_quality["invalid_count"] == 3


def test_invalid_and_partial_validation_dates_do_not_look_exhaustive() -> None:
    result = compute_advanced_kpis(
        _submissions(
            [
                {
                    "status": "approved",
                    "created_at": "2026-01-01",
                    "validated_at": "2026-01-02",
                },
                {
                    "status": "approved",
                    "created_at": None,
                    "validated_at": "2026-01-03",
                },
                {
                    "status": "approved",
                    "created_at": "not-a-date",
                    "validated_at": "2026-01-03",
                },
                {
                    "status": "approved",
                    "created_at": "2026-01-05",
                    "validated_at": "2026-01-04",
                },
            ]
        ),
        pd.DataFrame({"dechets_kg": [1.0], "megots": [0]}),
    )

    quality = result["validation_quality"]
    assert result["avg_validation_delay_days"] is None
    assert result["observed_avg_validation_delay_days"] == 1.0
    assert quality["state"] == "partial"
    assert quality["eligible_count"] == 4
    assert quality["valid_count"] == 1
    assert quality["missing_created_at_count"] == 1
    assert quality["invalid_created_at_count"] == 1
    assert quality["negative_delay_count"] == 1


def test_validation_delay_remains_available_when_all_eligible_dates_are_valid() -> None:
    result = compute_advanced_kpis(
        _submissions(
            [
                {
                    "status": "approved",
                    "created_at": "2026-01-01",
                    "validated_at": "2026-01-03",
                },
                {
                    "status": "rejected",
                    "created_at": "2026-01-10",
                    "validated_at": "2026-01-11",
                },
            ]
        ),
        pd.DataFrame({"dechets_kg": [0.0], "megots": [0]}),
    )

    assert result["avg_validation_delay_days"] == 1.5
    assert result["observed_avg_validation_delay_days"] == 1.5
    assert result["validation_quality"]["state"] == "available"
    assert result["validation_quality"]["is_exhaustive"] is True
