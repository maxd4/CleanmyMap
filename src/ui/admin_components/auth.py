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
)


@dataclass(slots=True)
class AdminAuthContext:
    track_ux_issue: Callable[..., None]
    google_user_email: Callable[[], str | None]
    admin_allowed_emails: set[str]
    admin_require_allowlist: bool
    admin_secret_code: str
    admin_login_max_attempts: int
    admin_auth_policy: Any
    admin_lockout_minutes: int
    add_admin_audit_log: Callable[..., Any]


def ensure_admin_authenticated(ctx: AdminAuthContext) -> str:
    admin_email = ctx.google_user_email()
    if not admin_email:
        ctx.track_ux_issue(
            event_type="warning",
            tab_id="admin",
            action_name="admin_access_denied",
            message="missing_google_auth",
        )
        st.error("Connexion Google obligatoire pour accéder à l'espace admin.")
        st.stop()

    if not is_allowlist_config_valid(ctx.admin_allowed_emails, require_allowlist=ctx.admin_require_allowlist):
        ctx.track_ux_issue(
            event_type="warning",
            tab_id="admin",
            action_name="admin_access_denied",
            message="allowlist_not_configured",
        )
        st.error("Accès admin bloqué : configurez CLEANMYMAP_ADMIN_EMAILS avant d'ouvrir l'espace admin.")
        st.stop()

    if not is_allowed_admin_email(admin_email, ctx.admin_allowed_emails):
        ctx.track_ux_issue(
            event_type="warning",
            tab_id="admin",
            action_name="admin_access_denied",
            message=f"unauthorized_email:{admin_email}",
        )
        st.error("Votre compte Google n'est pas autorisé pour l'espace admin.")
        st.stop()

    admin_secret_code = ctx.admin_secret_code
    if not admin_secret_code:
        try:
            admin_secret_code = st.secrets.get("CLEANMYMAP_ADMIN_SECRET_CODE", "")
        except (AttributeError, KeyError, TypeError, RuntimeError, ValueError) as exc:
            log_exception(
                component="admin_auth",
                action="read_secret_from_streamlit",
                exc=exc,
                message="Failed to read admin secret from Streamlit secrets",
                severity="warning",
            )
            ctx.track_ux_issue(
                event_type="warning",
                tab_id="admin",
                action_name="admin_secret_read",
                message="st.secrets_read_failed",
            )
            admin_secret_code = ""

    if not admin_secret_code:
        st.error("Mot de passe administrateur non configuré (CLEANMYMAP_ADMIN_SECRET_CODE).")
        st.stop()

    if st.session_state.get("admin_authenticated_email") != admin_email:
        st.session_state["admin_authenticated"] = False
        st.session_state["admin_authenticated_email"] = admin_email
        st.session_state["admin_failed_attempts"] = 0
        st.session_state["admin_lock_until"] = None

    st.session_state.setdefault("admin_authenticated", False)
    st.session_state.setdefault("admin_failed_attempts", 0)
    st.session_state.setdefault("admin_lock_until", None)

    lock_until_raw = st.session_state.get("admin_lock_until")
    lock_until_dt = parse_lock_until(lock_until_raw)
    if lock_until_raw and lock_until_dt is None:
        st.session_state["admin_lock_until"] = None

    now_dt = datetime.now()
    if lock_until_dt and now_dt < lock_until_dt:
        remaining = remaining_lock_minutes(lock_until_dt, now=now_dt)
        ctx.track_ux_issue(
            event_type="warning",
            tab_id="admin",
            action_name="admin_auth_locked",
            message=f"locked_{remaining}m",
            payload=admin_email,
        )
        st.error(f"Trop de tentatives. Réessayez dans {remaining} minute(s).")
        st.stop()

    if not st.session_state["admin_authenticated"]:
        secret_input = st.text_input("Code secret administrateur", type="password", key="admin_pwd_input")
        if st.button("Se connecter à l'espace Admin", width="stretch"):
            if compare_digest(str(secret_input or ""), str(admin_secret_code)):
                st.session_state["admin_authenticated"] = True
                st.session_state["admin_failed_attempts"] = 0
                st.session_state["admin_lock_until"] = None
                ctx.add_admin_audit_log(actor=admin_email, action="admin_login_success")
                st.rerun()
            else:
                st.session_state["admin_failed_attempts"] += 1
                remaining = ctx.admin_login_max_attempts - int(st.session_state["admin_failed_attempts"])
                lock_until = compute_next_lock_until(
                    failed_attempts=int(st.session_state["admin_failed_attempts"]),
                    policy=ctx.admin_auth_policy,
                    now=now_dt,
                )
                st.session_state["admin_lock_until"] = lock_until.isoformat()
                if remaining <= 0:
                    ctx.add_admin_audit_log(actor=admin_email, action="admin_login_lockout")
                    st.error(f"Trop de tentatives. Verrouillage {ctx.admin_lockout_minutes} minute(s).")
                else:
                    ctx.add_admin_audit_log(actor=admin_email, action="admin_login_failed")
                    wait_seconds = max(1, int((lock_until - now_dt).total_seconds()))
                    st.error(f"Code incorrect. Tentatives restantes: {remaining}. Réessayez dans {wait_seconds}s.")
        st.stop()

    st.success(f"Accès administrateur validé ✅ ({admin_email})")
    if st.button("Se déconnecter de l'espace Admin"):
        st.session_state["admin_authenticated"] = False
        st.session_state["admin_failed_attempts"] = 0
        st.session_state["admin_lock_until"] = None
        st.rerun()

    return admin_email
