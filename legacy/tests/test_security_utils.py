from src.security_utils import (
    sanitize_external_url,
    sanitize_html_multiline,
    sanitize_html_text,
)


def test_sanitize_html_text_escapes_tags():
    assert sanitize_html_text("<script>alert(1)</script>") == "&lt;script&gt;alert(1)&lt;/script&gt;"


def test_sanitize_html_multiline_keeps_line_breaks():
    assert sanitize_html_multiline("a\nb") == "a<br>b"


def test_sanitize_external_url_blocks_javascript_scheme():
    assert sanitize_external_url("javascript:alert(1)") == "#"


def test_sanitize_external_url_blocks_http_and_keeps_https():
    assert sanitize_external_url("http://example.com") == "#"
    assert sanitize_external_url("https://example.com/path?q=1") == "https://example.com/path?q=1"
