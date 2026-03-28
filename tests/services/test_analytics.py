import pytest
import pandas as pd
from src.services.analytics_service import calculate_scores, compute_score_components, calculate_impact, evaluate_badges

def test_calculate_scores_baseline(sample_action_row):
    """Test standard score calculation logic."""
    res = calculate_scores(sample_action_row)
    assert "score_salete" in res
    assert "score_mixte" in res
    assert res["eco_points"] > 0
    # Effort = (60/60 * 2) = 2.0
    # Score Saleté = (100 + 5.5 * 50) / 2.0 = 375 / 2 = 187.5
    assert res["score_salete"] == 187.5

def test_calculate_scores_low_effort():
    """Test effort clipping (min 0.5) to avoid division by zero."""
    row = {"megots": 100, "dechets_kg": 0, "temps_min": 1, "nb_benevoles": 1}
    res = calculate_scores(row)
    assert res["score_salete"] == 200.0 # 100 / 0.5

def test_compute_score_components_vectorized(sample_action_df):
    """Test vectorized dataframe scoring."""
    scored_df = compute_score_components(sample_action_df)
    assert len(scored_df) == 3
    assert all(col in scored_df.columns for col in ["score_salete", "score_mixte", "eco_points"])
    assert scored_df.iloc[0]["score_salete"] == 175.0 # (100 + 5*50) / (60/60 * 2) = 350 / 2

def test_calculate_impact():
    """Test ecological impact math."""
    res = calculate_impact(megots=10, dechets_kg=1.0)
    assert res["eau_litres"] == 5000
    assert res["co2_kg"] == 2.0
    assert res["bouteilles"] == 40

def test_evaluate_badges_unlocked():
    """Test badge progression thresholds."""
    stats = {"nb_actions": 5, "total_kg": 60, "total_points": 1200}
    badges, warnings = evaluate_badges(stats)
    badge_ids = [b["id"] for b in badges]
    assert "first" in badge_ids
    assert "regular" in badge_ids
    assert "heavy" in badge_ids
    assert "hero" in badge_ids
    assert not warnings

def test_evaluate_badges_empty():
    """Test badges logic with missing or empty stats."""
    # Test with None
    badges, warnings = evaluate_badges(None)
    assert len(badges) == 0
    
    # Test with empty dict
    badges, warnings = evaluate_badges({})
    assert len(badges) == 0
