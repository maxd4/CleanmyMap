import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.import_sheet import extract_coords


def test_extract_coords_preserves_signed_and_leading_dot_decimals():
    assert extract_coords(".5, 2.3") == (0.5, 2.3)
    assert extract_coords("+.5; -.5") == (0.5, -0.5)
    assert extract_coords("+12.5, -2") == (12.5, -2.0)


def test_extract_coords_rejects_malformed_pairs_without_scanning_as_a_new_pair():
    assert extract_coords(".5., 2.3") == (None, None)
    assert extract_coords("1,,2") == (None, None)
    assert extract_coords("1 2") == (None, None)
    assert extract_coords(f"{'9' * 100_000} invalid") == (None, None)
    assert extract_coords(f"{' ' * 100_000}not coordinates") == (None, None)
