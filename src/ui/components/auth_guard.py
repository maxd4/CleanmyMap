import streamlit as st
from typing import Callable, Any
from src.services.security_service import get_session_identity, validate_admin_access
from src.ui.i18n import i18n_text

def require_admin(func: Callable[[Any], Any]) -> Callable[[Any], Any]:
    """
    Decorator for tab renderer functions that requires admin privileges.
    If unauthorized, renders an access denied UI instead.
    """
    def wrapper(ctx: Any) -> Any:
        identity = get_session_identity()
        if not identity.get("is_authenticated") or not validate_admin_access():
            st.error(i18n_text("Accès refusé. Veuillez vous authentifier en tant qu'administrateur.", "Access denied. Please authenticate as an admin."))
            st.markdown(
                f"""
                <div style='background-color: #fce4e4; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 8px;'>
                    <h2>🚫 {i18n_text("Espace Restreint", "Restricted Area")}</h2>
                    <p>{i18n_text("Cette section est réservée aux administrateurs autorisés.", "This area is reserved for authorized administrators.")}</p>
                    <hr>
                    <p>{i18n_text("Identité détectée : ", "Detected identity: ")} <strong>{identity.get('email', 'Anonyme')}</strong></p>
                </div>
                """,
                unsafe_allow_html=True
            )
            return None
        return func(ctx)
    return wrapper

def with_session_identity(func: Callable[[Any], Any]) -> Callable[[Any], Any]:
    """
    Decorator to inject the finalized session identity into the tab context
    before rendering, ensuring consistent identity tracking.
    """
    def wrapper(ctx: Any) -> Any:
        # Inject the identity into the context if it's a dict
        if isinstance(ctx, dict):
            ctx["identity"] = get_session_identity()
        return func(ctx)
    return wrapper
