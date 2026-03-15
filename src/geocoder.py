import re
import pandas as pd


def geocode_location(value: str):
    if pd.isna(value) or str(value).strip().lower() in {'', 'nan', 'none'}:
        return None, None

    text = str(value).strip()

    decimal = re.search(r'(-?\d+\.?\d*)\s*[,;\s]+\s*(-?\d+\.?\d*)', text)
    if decimal:
        lat, lon = float(decimal.group(1)), float(decimal.group(2))
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon

    dms = re.search(
        r'(\d+)[°\s]+(\d+)[\'\s]+(\d+(?:\.\d+)?)["\s]*([NS])\s*'
        r'(\d+)[°\s]+(\d+)[\'\s]+(\d+(?:\.\d+)?)["\s]*([EW])',
        text.upper(),
    )
    if dms:
        lat = float(dms.group(1)) + float(dms.group(2)) / 60 + float(dms.group(3)) / 3600
        if dms.group(4) == 'S':
            lat *= -1
        lon = float(dms.group(5)) + float(dms.group(6)) / 60 + float(dms.group(7)) / 3600
        if dms.group(8) == 'W':
            lon *= -1
        return lat, lon

    return None, None
