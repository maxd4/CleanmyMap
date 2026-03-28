import html
import re
from typing import Any
from urllib.parse import urlparse

# Basic XSS & SQL injection patterns for logging/detection
SUSPECT_PATTERNS = [
    r"<script", r"javascript:", r"onerror=", r"onload=",
    r"SELECT\s+.*\s+FROM", r"INSERT\s+INTO", r"DELETE\s+FROM",
    r"UPDATE\s+.*\s+SET", r"DROP\s+TABLE", r"OR\s+1=1", r"'\s*--"
]

def sanitize_html_text(value: Any, max_len: int | None = None) -> str:
    """Escape HTML-sensitive characters for safe injection in HTML templates."""
    text = "" if value is None else str(value).strip()
    if max_len is not None and max_len > 0:
        text = text[:max_len]
    return html.escape(text, quote=True)

def sanitize_html_multiline(value: Any, max_len: int | None = None) -> str:
    """Escape HTML and preserve line breaks."""
    return sanitize_html_text(value, max_len=max_len).replace("\n", "<br>")

def is_dangerous_payload(value: Any) -> bool:
    """Detect common attack patterns in raw input string."""
    if not isinstance(value, str): return False
    text = value.upper()
    return any(re.search(pat, text, re.IGNORECASE) for pat in SUSPECT_PATTERNS)

def sanitize_external_url(value: Any) -> str:
    """Allow only absolute HTTPS URLs."""
    url = "" if value is None else str(value).strip()
    if not url: return "#"
    parsed = urlparse(url)
    if parsed.scheme.lower() != "https" or not parsed.netloc: return "#"
    return html.escape(url, quote=True)
