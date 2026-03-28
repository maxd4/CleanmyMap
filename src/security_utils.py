import html
from typing import Any
from urllib.parse import urlparse


def sanitize_html_text(value: Any, max_len: int | None = None) -> str:
    """Escape HTML-sensitive characters for safe injection in HTML templates."""
    text = "" if value is None else str(value).strip()
    if max_len is not None and max_len > 0:
        text = text[:max_len]
    return html.escape(text, quote=True)


def sanitize_html_multiline(value: Any, max_len: int | None = None) -> str:
    """Escape HTML and preserve line breaks for controlled HTML rendering."""
    return sanitize_html_text(value, max_len=max_len).replace("\n", "<br>")


def sanitize_external_url(value: Any) -> str:
    """Allow only absolute HTTPS URLs for external links."""
    url = "" if value is None else str(value).strip()
    if not url:
        return "#"

    parsed = urlparse(url)
    if parsed.scheme.lower() != "https":
        return "#"
    if not parsed.netloc:
        return "#"

    return html.escape(url, quote=True)
