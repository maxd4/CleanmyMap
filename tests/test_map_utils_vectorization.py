from __future__ import annotations

import pandas as pd

from src.map_utils import (
    build_heatmap_series,
    calculate_trends,
    compute_score_series,
    get_heatmap_data,
    haversine_distance_km,
)


def test_compute_score_series_returns_expected_shape() -> None:
    df = pd.DataFrame(
        [
            {"megots": 100, "dechets_kg": 2.0, "temps_min": 60, "benevoles": 2, "date": "2026-03-20"},
            {"megots": 50, "dechets_kg": 1.0, "temps_min": 45, "benevoles": 1, "date": "2026-03-21"},
        ]
    )
    score_series = compute_score_series(df, metric="score_mixte")

    assert len(score_series) == len(df)
    assert score_series.notna().all()


def test_calculate_trends_marks_improvement_for_lower_recent_score() -> None:
    df = pd.DataFrame(
        [
            {"lat": 48.8566, "lon": 2.3522, "date": "2026-03-28", "megots": 20, "dechets_kg": 0.5, "temps_min": 60, "benevoles": 2},
            {"lat": 48.85661, "lon": 2.35221, "date": "2026-03-20", "megots": 300, "dechets_kg": 5.0, "temps_min": 60, "benevoles": 2},
        ]
    )
    out = calculate_trends(df)

    recent = out.sort_values("date", ascending=False).iloc[0]["tendance"]
    recent_label = str(recent).lower()
    assert ("amelioration" in recent_label) or ("amélioration" in recent_label) or ("amã©lioration" in recent_label)


def test_get_heatmap_data_returns_only_pollution_rows() -> None:
    df = pd.DataFrame(
        [
            {"lat": 48.85, "lon": 2.35, "est_propre": False, "megots": 100, "dechets_kg": 2.0, "temps_min": 60, "benevoles": 2, "date": "2026-03-20"},
            {"lat": 48.86, "lon": 2.36, "est_propre": True, "megots": 0, "dechets_kg": 0.0, "temps_min": 60, "benevoles": 1, "date": "2026-03-20"},
        ]
    )
    heat = get_heatmap_data(df)

    assert len(heat) == 1
    assert heat[0][0] == 48.85
    assert 0.0 <= heat[0][2] <= 1.0


def test_build_heatmap_series_matches_get_heatmap_data_content() -> None:
    df = pd.DataFrame(
        [
            {"lat": 48.85, "lon": 2.35, "est_propre": False, "megots": 100, "dechets_kg": 2.0, "temps_min": 60, "benevoles": 2, "date": "2026-03-20"},
            {"lat": 48.86, "lon": 2.36, "est_propre": "oui", "megots": 0, "dechets_kg": 0.0, "temps_min": 60, "benevoles": 1, "date": "2026-03-20"},
        ]
    )
    heat_df = build_heatmap_series(df)
    heat_points = get_heatmap_data(df)

    assert list(heat_df.columns) == ["lat", "lon", "intensity"]
    assert len(heat_df) == 1
    assert heat_df.iloc[0]["lat"] == heat_points[0][0]
    assert heat_df.iloc[0]["lon"] == heat_points[0][1]


def test_haversine_distance_km_is_zero_for_same_point() -> None:
    lat = pd.Series([48.8566])
    lon = pd.Series([2.3522])
    distance = haversine_distance_km(lat, lon, 48.8566, 2.3522)
    assert float(distance.iloc[0]) < 0.001
