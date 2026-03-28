import pytest
from unittest.mock import MagicMock
from src.services.security_service import sanitize_user_input, get_session_identity, get_current_user_email
from src.security_utils import is_dangerous_payload

def test_is_dangerous_payload_detection():
    """Test pattern detection for common attack vectors."""
    assert is_dangerous_payload("<script>alert(1)</script>") is True
    assert is_dangerous_payload("SELECT * FROM users") is True
    assert is_dangerous_payload("Normal comment.") is False
    assert is_dangerous_payload("DROP TABLE actions") is True
    assert is_dangerous_payload("OR 1=1 --") is True

def test_sanitize_user_input_cleaning():
    """Test aggressive cleaning for dangerous payloads."""
    safe = sanitize_user_input("<b>Bold</b> text")
    assert safe == "&lt;b&gt;Bold&lt;/b&gt; text"
    
    dangerous = sanitize_user_input("<script>attack</script>")
    assert dangerous == "REDACTED_DANGER"

def test_get_session_identity_mocked(monkeypatch):
    """Test identity context creation with mocked Streamlit state."""
    # Since st is mocked in conftest, we can just check if session_uuid exists
    from src.services.security_service import st as mock_st
    mock_st.session_state = {}
    
    # Mocking get_current_user_email to return a test email
    monkeypatch.setattr("src.services.security_service.get_current_user_email", lambda: "test@example.com")
    
    identity = get_session_identity()
    assert identity["email"] == "test@example.com"
    assert identity["is_authenticated"] is True
    assert "session_uuid" in mock_st.session_state

def test_get_current_user_email_no_auth():
    """Test email retrieval fallback when no authentication exists."""
    from src.services.security_service import st as mock_st
    mock_st.user = None
    
    email = get_current_user_email()
    assert email is None
