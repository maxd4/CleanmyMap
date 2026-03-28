import pandas as pd

from src.map_generator import MapGenerator


def test_map_generator_escapes_popup_and_tooltip_fields():
    df = pd.DataFrame(
        [
            {
                "lat": 48.85,
                "lon": 2.35,
                "lieu_complet": "<script>alert(1)</script>",
                "association": "<img src=x onerror=1>",
                "type_lieu": "<svg/onload=1>",
                "megots": 200,
                "dechets_kg": 3.5,
                "est_propre": False,
            }
        ]
    )

    html_map = MapGenerator(df).build().get_root().render()

    assert "<script>alert(1)</script>" not in html_map
    assert "<img src=x onerror=1>" not in html_map
    assert "<svg/onload=1>" not in html_map
