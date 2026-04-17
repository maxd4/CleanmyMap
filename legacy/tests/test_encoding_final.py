import unittest
import os
import pandas as pd
import json
from src.text_utils import repair_mojibake_text

class TestEncodingSafeguards(unittest.TestCase):
    def test_csv_utf8_roundtrip(self):
        """Vérifie qu'un CSV avec des accents et emojis reste intact après écriture/lecture."""
        test_file = "test_utf8.csv"
        data = {
            "text": ["Accenté : éàçô", "Emoji : 📍♻️⚠️", "Quotes : ' \" « » "],
            "val": [1, 2, 3]
        }
        df = pd.DataFrame(data)
        
        # Test writing
        df.to_csv(test_file, index=False, encoding="utf-8")
        
        # Test reading
        df_read = pd.read_csv(test_file, encoding="utf-8")
        
        try:
            self.assertEqual(df_read.iloc[0]["text"], "Accenté : éàçô")
            self.assertEqual(df_read.iloc[1]["text"], "Emoji : 📍♻️⚠️")
            self.assertEqual(df_read.iloc[2]["text"], "Quotes : ' \" « » ")
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_json_utf8_roundtrip(self):
        """Vérifie que le JSON conserve les caractères non-ASCII."""
        test_file = "test_utf8.json"
        data = {"msg": "C'est l'été à Paris ☀️"}
        
        with open(test_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
            
        with open(test_file, "r", encoding="utf-8") as f:
            data_read = json.load(f)
            
        try:
            self.assertEqual(data_read["msg"], "C'est l'été à Paris ☀️")
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

if __name__ == "__main__":
    unittest.main()
