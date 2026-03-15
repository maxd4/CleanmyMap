import pandas as pd
from src.data_processor import DataProcessor


def test_process_basic_dataframe():
    raw = pd.DataFrame(
        {
            'date': ['01/01/2025'],
            'adresse precise ou coordo GPS': ['48.8566, 2.3522'],
            'nbr megots': [100],
            'kg dechets': [5],
            'temps en min': [30],
            'nombre benevoles': [2],
            'type': ['N° Boulevard/Avenue/Place'],
            "nom d'association": ['Asso Test'],
        }
    )

    out = DataProcessor(raw).process()
    assert len(out) == 1
    assert out.loc[0, 'lat'] == 48.8566
    assert out.loc[0, 'lon'] == 2.3522
    assert out.loc[0, 'megots_par_heure_ben'] > 0
