from __future__ import annotations

from datetime import timedelta
import pandas as pd


def _safe_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _parse_datetime_series(series: pd.Series) -> tuple[pd.Series, pd.Series, pd.Series]:
    parsed_values: list[pd.Timestamp | pd.NaT] = []
    aware_values: list[bool] = []
    invalid_values: list[bool] = []

    for value in series.tolist():
        try:
            if bool(pd.isna(value)):
                parsed_values.append(pd.NaT)
                aware_values.append(False)
                invalid_values.append(False)
                continue
            parsed = pd.to_datetime(value, errors="coerce")
            if bool(pd.isna(parsed)):
                parsed_values.append(pd.NaT)
                aware_values.append(False)
                invalid_values.append(True)
                continue
            timestamp = pd.Timestamp(parsed)
            is_aware = timestamp.tzinfo is not None and timestamp.utcoffset() is not None
        except (OverflowError, TypeError, ValueError):
            parsed_values.append(pd.NaT)
            aware_values.append(False)
            invalid_values.append(True)
            continue

        parsed_values.append(timestamp)
        aware_values.append(is_aware)
        invalid_values.append(False)

    return (
        pd.Series(parsed_values, index=series.index, dtype="object"),
        pd.Series(aware_values, index=series.index, dtype="bool"),
        pd.Series(invalid_values, index=series.index, dtype="bool"),
    )


def _summarize_numeric_measure(df: pd.DataFrame, column: str) -> dict[str, object]:
    source = df[column] if column in df.columns else pd.Series(pd.NA, index=df.index, dtype="object")
    numeric = pd.to_numeric(source, errors="coerce")
    missing = source.isna()
    non_finite = numeric.isin([float("inf"), float("-inf")])
    non_numeric = source.notna() & (numeric.isna() | non_finite)
    negative = numeric.notna() & ~non_finite & numeric.lt(0)
    valid = numeric.notna() & ~non_finite & ~negative
    valid_count = int(valid.sum())
    row_count = len(source)
    has_observation = valid_count > 0
    is_exhaustive = row_count > 0 and valid_count == row_count
    observed_total = float(numeric[valid].sum()) if has_observation else None

    if not has_observation:
        state = "unavailable"
    elif is_exhaustive:
        state = "available"
    else:
        state = "partial"

    return {
        "state": state,
        "column_present": column in df.columns,
        "row_count": row_count,
        "valid_count": valid_count,
        "missing_count": int(missing.sum()),
        "invalid_count": int((non_numeric | negative).sum()),
        "negative_count": int(negative.sum()),
        "zero_count": int((valid & numeric.eq(0)).sum()),
        "is_exhaustive": is_exhaustive,
        "observed_total": observed_total,
    }


def _summarize_validation_delays(df: pd.DataFrame) -> tuple[float | None, float | None, dict[str, object]]:
    required = {"created_at", "validated_at", "status"}
    if not required.issubset(df.columns):
        return None, None, {
            "state": "unavailable",
            "eligible_count": 0,
            "valid_count": 0,
            "missing_created_at_count": 0,
            "invalid_created_at_count": 0,
            "missing_validated_at_count": 0,
            "invalid_validated_at_count": 0,
            "timezone_mismatch_count": 0,
            "negative_delay_count": 0,
            "is_exhaustive": False,
        }

    eligible = df[df["status"].isin(["approved", "rejected"])]
    created_source = eligible["created_at"]
    validated_source = eligible["validated_at"]
    created, created_aware, created_invalid = _parse_datetime_series(created_source)
    validated, validated_aware, validated_invalid = _parse_datetime_series(validated_source)
    created_missing = created_source.isna()
    validated_missing = validated_source.isna()
    both_present = created.notna() & validated.notna()
    timezone_mismatch = both_present & created_aware.ne(validated_aware)
    delay_values: list[float | None] = []
    for created_value, validated_value, mismatch in zip(created, validated, timezone_mismatch, strict=True):
        if pd.isna(created_value) or pd.isna(validated_value) or mismatch:
            delay_values.append(None)
            continue
        try:
            if created_value.tzinfo is not None:
                created_value = created_value.tz_convert("UTC")
                validated_value = validated_value.tz_convert("UTC")
            delay_values.append((validated_value - created_value).total_seconds() / 86400.0)
        except (OverflowError, TypeError, ValueError):
            delay_values.append(None)
    delays = pd.Series(delay_values, index=eligible.index, dtype="float64")
    negative_delay = both_present & ~timezone_mismatch & delays.lt(0)
    valid = delays.notna() & ~negative_delay
    valid_count = int(valid.sum())
    eligible_count = len(eligible)
    is_exhaustive = eligible_count > 0 and valid_count == eligible_count
    observed_average = float(delays[valid].mean()) if valid_count else None

    if not valid_count:
        state = "unavailable"
    elif is_exhaustive:
        state = "available"
    else:
        state = "partial"

    quality = {
        "state": state,
        "eligible_count": eligible_count,
        "valid_count": valid_count,
        "missing_created_at_count": int(created_missing.sum()),
        "invalid_created_at_count": int(created_invalid.sum()),
        "missing_validated_at_count": int(validated_missing.sum()),
        "invalid_validated_at_count": int(validated_invalid.sum()),
        "timezone_mismatch_count": int(timezone_mismatch.sum()),
        "negative_delay_count": int(negative_delay.sum()),
        "is_exhaustive": is_exhaustive,
    }
    exhaustive_average = observed_average if is_exhaustive else None
    return exhaustive_average, observed_average, quality


def compute_advanced_kpis(all_submissions_df: pd.DataFrame, filtered_approved_df: pd.DataFrame) -> dict:
    total_reports = len(all_submissions_df)
    approved_reports = int((all_submissions_df.get("status") == "approved").sum()) if "status" in all_submissions_df.columns else len(filtered_approved_df)
    completion_rate = (approved_reports / total_reports * 100.0) if total_reports else 0.0

    validation_delay_days, observed_validation_delay_days, validation_quality = _summarize_validation_delays(all_submissions_df)

    kg_quality = _summarize_numeric_measure(filtered_approved_df, "dechets_kg")
    megots_quality = _summarize_numeric_measure(filtered_approved_df, "megots")
    observed_total_kg = kg_quality["observed_total"]
    observed_total_megots = megots_quality["observed_total"]
    total_kg = observed_total_kg if kg_quality["is_exhaustive"] else None
    total_megots = observed_total_megots if megots_quality["is_exhaustive"] else None
    estimated_cost_saved = (total_kg / 1000.0) * 150.0 if total_kg is not None else None
    impact_per_euro = (total_kg / estimated_cost_saved) if estimated_cost_saved and estimated_cost_saved > 0 else (0.0 if total_kg == 0.0 else None)

    return {
        "mission_completion_rate": completion_rate,
        "avg_validation_delay_days": validation_delay_days,
        "estimated_cost_saved_eur": estimated_cost_saved,
        "impact_kg_per_eur": impact_per_euro,
        "total_kg": total_kg,
        "total_megots": total_megots,
        "observed_total_kg": observed_total_kg,
        "observed_total_megots": observed_total_megots,
        "observed_avg_validation_delay_days": observed_validation_delay_days,
        "measurement_quality": {
            "dechets_kg": kg_quality,
            "megots": megots_quality,
        },
        "validation_quality": validation_quality,
    }


def previous_period(df: pd.DataFrame, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    if df.empty:
        return df
    span = end - start
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - span
    work = df.copy()
    work["date"] = pd.to_datetime(work.get("date"), errors="coerce")
    return work[(work["date"] >= prev_start) & (work["date"] <= prev_end)]
