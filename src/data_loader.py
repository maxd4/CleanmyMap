import pandas as pd
from .config import MAX_RETRIES


class DataLoader:
    def __init__(self, sheet_url: str):
        self.sheet_url = sheet_url

    @staticmethod
    def _sheet_to_csv_url(sheet_url: str) -> str:
        sheet_id = sheet_url.split('/d/')[1].split('/')[0]
        return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"

    def load(self) -> pd.DataFrame:
        csv_url = self._sheet_to_csv_url(self.sheet_url)
        last_error = None
        for _ in range(MAX_RETRIES):
            try:
                df = pd.read_csv(csv_url)
                df.columns = df.columns.str.strip()
                return df
            except Exception as exc:  # noqa: BLE001
                last_error = exc
        raise RuntimeError(f"Impossible de charger la sheet: {last_error}")
