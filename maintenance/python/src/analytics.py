from __future__ import annotations

from datetime import timedelta
import pandas as pd


def _safe_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def compute_advanced_kpis(all_submissions_df: pd.DataFrame, filtered_approved_df: pd.DataFrame) -> dict:
    total_reports = len(all_submissions_df)
    approved_reports = int((all_submissions_df.get("status") == "approved").sum()) if "status" in all_submissions_df.columns else len(filtered_approved_df)
    completion_rate = (approved_reports / total_reports * 100.0) if total_reports else 0.0

    validation_delay_days = None
    if not all_submissions_df.empty and {"created_at", "validated_at"}.issubset(all_submissions_df.columns):
        temp = all_submissions_df.copy()
        temp = temp[temp.get("status").isin(["approved", "rejected"])]
        temp["created_at"] = _safe_datetime(temp["created_at"])
        temp["validated_at"] = _safe_datetime(temp["validated_at"])
        temp = temp.dropna(subset=["created_at", "validated_at"])
        if not temp.empty:
            delays = (temp["validated_at"] - temp["created_at"]).dt.total_seconds() / 86400.0
            validation_delay_days = float(delays.mean())

    filtered = filtered_approved_df.copy()
    filtered["dechets_kg"] = pd.to_numeric(filtered.get("dechets_kg"), errors="coerce").fillna(0)
    filtered["megots"] = pd.to_numeric(filtered.get("megots"), errors="coerce").fillna(0)
    total_kg = float(filtered["dechets_kg"].sum())
    total_megots = float(filtered["megots"].sum())
    estimated_cost_saved = (total_kg / 1000.0) * 150.0
    impact_per_euro = (total_kg / estimated_cost_saved) if estimated_cost_saved > 0 else 0.0

    return {
        "mission_completion_rate": completion_rate,
        "avg_validation_delay_days": validation_delay_days,
        "estimated_cost_saved_eur": estimated_cost_saved,
        "impact_kg_per_eur": impact_per_euro,
        "total_kg": total_kg,
        "total_megots": total_megots,
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
