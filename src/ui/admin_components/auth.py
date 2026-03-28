from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from hmac import compare_digest
from typing import Any, Callable
import streamlit as st
from src.logging_utils import log_exception
from src.services.admin_auth import (
    compute_next_lock_until,
    is_allowlist_config_valid,
    is_allowed_admin_email,
    parse_lock_until,
    remaining_lock_minutes,
    AdminAuthPolicy
)
from src.services.security_service import get_current_user_email, record_auth_failure

@dataclass(slots=True)
class AdminAuthContext:
    track_ux_issue: Callable[..., None]
    google_user_email: Callable[[], str | None]
    admin_allowed_emails: set[str]
    admin_require_allowlist: bool
    admin_secret_code: str
    admin_login_max_attempts: int
    admin_auth_policy: AdminAuthPolicy
    admin_lockout_minutes: int
    add_admin_audit_log: Callable[..., Any]

def render_admin_login_form(ctx: AdminAuthContext) -> str:
    """
    Renders the secondary secret code login form for Admin access.
    Returns the admin email if successfully authenticated, otherwise stops execution.
    """
    admin_email = get_current_user_email()
    if not admin_email:
        st.error("Connexion Google obligatoire pour accéder à l'espace admin.")
        st.stop()

    # Allowlist check
    if not is_allowlist_config_valid(ctx.admin_allowed_emails, ctx.admin_require_allowlist):
        st.error("Configuration Admin incomplète (CLEANMYMAP_ADMIN_EMAILS manquant).")
        st.stop()

    if not is_allowed_admin_email(admin_email, ctx.admin_allowed_emails):
        st.error(f"Compte {admin_email} non autorisé.")
        st.stop()

    # Secret code retrieval
    admin_secret_code = ctx.admin_secret_code or st.secrets.get("CLEANMYMAP_ADMIN_SECRET_CODE", "")
    if not admin_secret_code:
        st.error("Code secret admin non configuré.")
        st.stop()

    # Reset state if user changed
    if st.session_state.get("admin_authenticated_email") != admin_email:
        st.session_state.update({
            "admin_authorized": False,
            "admin_authenticated_email": admin_email,
            "admin_failed_attempts": 0,
            "admin_lock_until": None
        })

    # Lockout check
    lock_until = parse_lock_until(st.session_state.get("admin_lock_until"))
    now = datetime.now()
    if lock_until and now < lock_until:
        rem = remaining_lock_minutes(lock_until, now)
        st.error(f"Trop de tentatives. Réessayez dans {rem} minute(s).")
        st.stop()

    if not st.session_state.get("admin_authorized"):
        st.info("⚠️ Cet espace est protégé par un code secret secondaire.")
        with st.form("admin_login_form"):
            pwd = st.text_input("Code secret administrateur", type="password")
            if st.form_submit_button("S'authentifier", use_container_width=True):
                if compare_digest(str(pwd or ""), str(admin_secret_code)):
                    st.session_state["admin_authorized"] = True
                    st.session_state["admin_failed_attempts"] = 0
                    st.session_state["admin_lock_until"] = None
                    ctx.add_admin_audit_log(actor=admin_email, action="admin_login_success")
                    st.rerun()
                else:
                    record_auth_failure()
                    attempts = st.session_state["admin_failed_attempts"]
                    rem_attempts = ctx.admin_login_max_attempts - attempts
                    lock = compute_next_lock_until(attempts, ctx.admin_auth_policy, now)
                    st.session_state["admin_lock_until"] = lock.isoformat()
                    st.error(f"Code incorrect. Tentatives restantes : {max(0, rem_attempts)}")
                    if rem_attempts <= 0:
                        ctx.add_admin_audit_log(actor=admin_email, action="admin_login_lockout")
                    st.rerun()
        st.stop()

    st.success(f"Connecté en tant que : {admin_email}")
    if st.button("Se déconnecter de l'espace Admin", use_container_width=True):
        st.session_state["admin_authorized"] = False
        st.rerun()

    return admin_email
