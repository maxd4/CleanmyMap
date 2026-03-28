import pytest
import pandas as pd
import os
from unittest.mock import MagicMock, patch
from src.services.data_service import load_public_data_bundle

def test_data_bundle_merging():
    """Vérifie que le bundle fusionne correctement les sources et unifie les colonnes."""
    
    # Mock des dépendances
    mock_db_data = [
        {"id": "db1", "dechets_kg": "10.5", "nb_benevoles": 2, "megots": 100, "status": "approved"}
    ]
    mock_sheet_data = [
        {"id": "sheet1", "dechets_kg": "5", "benevoles": 3, "megots": "50", "source": "google_sheet"}
    ]
    
    with patch("src.services.data_service.get_submissions_by_status", return_value=mock_db_data), \
         patch("src.services.data_service.load_sheet_actions", return_value=mock_sheet_data), \
         patch("src.services.data_service.TEST_DATA", []), \
         patch.dict(os.environ, {"CLEANMYMAP_INCLUDE_DEMO_DATA": "0"}):
        
        # On passe des fonctions d'identité pour simplifier
        imported, df = load_public_data_bundle(
            "dummy_url", 
            parse_coords_fn=lambda x: (0,0), 
            sanitize_df_fn=lambda x: x
        )
        
        # Vérifications
        assert len(df) == 2
        assert "benevoles" in df.columns
        assert "nb_benevoles" in df.columns
        
        # Vérification du typage numérique
        assert df["dechets_kg"].dtype == float
        assert df["megots"].dtype in [int, float]
        
        # Vérification de l'unification des bénévoles
        # db1 avait nb_benevoles=2, sheet1 avait benevoles=3
        # L'unification doit mettre les deux à jour
        db1_row = df[df["id"] == "db1"].iloc[0]
        sheet1_row = df[df["id"] == "sheet1"].iloc[0]
        
        assert db1_row["benevoles"] == 2
        assert sheet1_row["benevoles"] == 3
        assert sheet1_row["nb_benevoles"] == 3

def test_data_bundle_empty_sources():
    """Gère proprement les sources vides."""
    with patch("src.services.data_service.get_submissions_by_status", return_value=[]), \
         patch("src.services.data_service.load_sheet_actions", return_value=[]), \
         patch("src.services.data_service.TEST_DATA", []), \
         patch.dict(os.environ, {"CLEANMYMAP_INCLUDE_DEMO_DATA": "0"}):
         
        imported, df = load_public_data_bundle("url", lambda x: (0,0), lambda x: x)
        assert df.empty
        assert imported == []
