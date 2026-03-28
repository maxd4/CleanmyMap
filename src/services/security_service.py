import streamlit as st
import uuid
from datetime import datetime, timedelta
from typing import TypedDict, Optional
from src.services.admin_auth import get_e2e_admin_email_fallback, AdminAuthPolicy
from src.logging_utils import log_event, log_exception
from src.security_utils import sanitize_html_text, is_dangerous_payload

class UserIdentity(TypedDict):
    email: Optional[str]
    session_id: str
    is_authenticated: bool
    is_admin: bool
    last_active: datetime

def get_current_user_email() -> Optional[str]:
    """Base function to retrieve the current user's email from Streamlit Auth."""
    user = getattr(st, "user", None)
    if user is not None:
        is_logged_in = getattr(user, "is_logged_in", None)
        if callable(is_logged_in): is_logged_in = is_logged_in()
        if is_logged_in:
            email = getattr(user, "email", None)
            if callable(email): email = email()
            if email: return str(email).strip().lower()

    # Fallback for E2E Tests
    fallback = get_e2e_admin_email_fallback()
    if fallback:
        # Avoid duplicate warning logs if this is called frequently
        return fallback
    return None

def get_session_identity() -> UserIdentity:
    """Provides a unified security context for the current session."""
    if "session_uuid" not in st.session_state:
        st.session_state["session_uuid"] = str(uuid.uuid4())
    
    email = get_current_user_email()
    is_authenticated = bool(email)
    
    # Simple admin check (can be replaced by a database-backed list)
    # For now, if authenticated, we treat them as authorized users.
    # Detailed admin checks are handled in AdminTabContext.
    is_admin = "admin_authorized" in st.session_state and st.session_state["admin_authorized"]

    return {
        "email": email,
        "session_id": st.session_state["session_uuid"],
        "is_authenticated": is_authenticated,
        "is_admin": is_admin,
        "last_active": datetime.now()
    }

def sanitize_user_input(value: str, label: str = "input") -> str:
    """
    Centralized sanitization gate for all user-provided strings.
    Detects dangerous payloads and escapes for safety.
    """
    if is_dangerous_payload(value):
        log_event(
            event="security_threat", severity="critical", component="security_service",
            action="sanitize_input", message=f"Dangerous payload detected in {label}",
            context={"value": value[:50]}
        )
        # We can either block or aggressively clean. Default: Aggressively clean.
        return "REDACTED_DANGER"
    return sanitize_html_text(value)

def validate_admin_access(policy: AdminAuthPolicy = AdminAuthPolicy()) -> bool:
    """Verifies if the current user is a valid authorized admin."""
    # Check session state for previous auth success
    if st.session_state.get("admin_authorized"):
        # We could also check for lockout or timeout here
        return True
    return False

def record_auth_failure() -> None:
    """Updates the session failure counter for brute-force protection."""
    attempts = st.session_state.get("admin_failed_attempts", 0) + 1
    st.session_state["admin_failed_attempts"] = attempts
    log_event(event="auth_failure", severity="warning", component="security_service", context={"attempts": attempts})
