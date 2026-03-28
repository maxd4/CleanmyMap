from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Callable
import pandas as pd
import streamlit as st
import src.database as db
from src.ui.admin_components import (
    AdminAuthContext,
    AdminMapReviewContext,
    AdminModerationContext,
    render_admin_login_form,
    render_admin_exports,
    render_admin_map_review,
    render_admin_moderation,
)
from src.ui.admin_components.partner_dashboard import render_partner_dashboard

@dataclass(slots=True)
class AdminTabContext:
    render_tab_header: Callable[..., None]
    i18n_text: Callable[[str, str], str]
    track_ux_issue: Callable[..., None]
    google_user_email: Callable[[], str | None]
    admin_allowed_emails: set[str]
    admin_require_allowlist: bool
    admin_secret_code: str
    admin_login_max_attempts: int
    admin_auth_policy: Any
    admin_lockout_minutes: int
    add_admin_audit_log: Callable[..., Any]
    get_osmnx_graph: Callable[..., Any]
    add_elevations_to_graph: Callable[..., Any]
    calculate_flow_sinks: Callable[..., list[dict[str, Any]]]
    auto_enrich_actor: Callable[..., bool]
    check_flood_risk: Callable[..., bool]
    all_submissions_df: pd.DataFrame
    pdf_report_cls: Any

def _render_admin_monitoring() -> None:
    st.markdown("---")
    st.markdown("### 📊 Monitoring UX & Intégrité Système")
    
    get_ux_error_stats = getattr(db, "get_ux_error_stats", None)
    get_ux_events_raw = getattr(db, "get_ux_events_raw", None)
    
    if not get_ux_error_stats:
        st.warning("Service de monitoring indisponible.")
        return

    ux_stats = get_ux_error_stats(days=30)
    
    # Indicateur de Santé (Google Sheet)
    recent_events = get_ux_events_raw(limit=50) if get_ux_events_raw else []
    broken_sheet = any(e.get("action_name") == "load_sheet_actions" and e.get("event_type") == "broken_action" for e in recent_events[:10])
    
    h1, h2 = st.columns([1, 3])
    with h1:
        if broken_sheet:
            st.error("❌ Flux Google Sheet : ERREUR")
        else:
            st.success("✅ Flux Google Sheet : OK")
    
    # Métriques Clés
    ux_c1, ux_c2, ux_c3 = st.columns(3)
    ux_c1.metric("Erreurs (30j)", int(ux_stats.get("total_events", 0)))
    ux_c2.metric("Champs invalides", int(ux_stats.get("invalid_fields", 0)))
    ux_c3.metric("Actions cassées", int(ux_stats.get("broken_actions", 0)))

    # Détails des champs et Logs
    d1, d2 = st.columns([1, 2])
    with d1:
        st.write("**Top champs à problèmes**")
        top_fields = ux_stats.get("top_invalid_fields", [])
        if top_fields:
            st.table(pd.DataFrame(top_fields))
        else:
            st.caption("Aucun champ problématique détecté.")
            
    with d2:
        st.write("**Derniers événements UX**")
        if recent_events:
            events_df = pd.DataFrame(recent_events)[["created_at", "event_type", "tab_id", "message"]]
            st.dataframe(events_df, hide_index=True, use_container_width=True)
        else:
            st.caption("Aucun événement récent.")

    # Maintenance des Données
    st.markdown("---")
    st.markdown("### 🧹 Maintenance des Données")
    
    m1, m2 = st.columns([2, 1])
    with m1:
        st.write("Supprimez définitivement les actions marquées comme 'Test' (`is_real=0`) de la base de données.")
        confirm_purge = st.checkbox("Je confirme vouloir supprimer toutes les données de test", key="confirm_purge_checkbox")
    
    with m2:
        if st.button("🔥 Purger les données de test", use_container_width=True, disabled=not confirm_purge, type="primary"):
            delete_fn = getattr(db, "delete_test_data", None)
            if delete_fn:
                count = delete_fn()
                st.success(f"{count} enregistrement(s) de test supprimé(s).")
                st.rerun()
            else:
                st.error("Fonction de purge non disponible.")



def render_admin_tab(ctx: AdminTabContext) -> None:
    """
    Renders the Admin tab. Protected by render_admin_login_form middleware.
    """
    ctx.render_tab_header(
        icon="⚙️",
        title_fr="Administration", 
        title_en="Administration",
        subtitle_fr="Modération des signalements, monitoring et outils de maintenance.",
        subtitle_en="Report moderation, monitoring, and maintenance tools.",
        chips=[ctx.i18n_text("Gestion", "Management"), ctx.i18n_text("Sécurité", "Security")],
        compact=True,
    )


    # Secondary Auth Layer
    render_admin_login_form(
        AdminAuthContext(
            track_ux_issue=ctx.track_ux_issue,
            google_user_email=ctx.google_user_email,
            admin_allowed_emails=ctx.admin_allowed_emails,
            admin_require_allowlist=ctx.admin_require_allowlist,
            admin_secret_code=ctx.admin_secret_code,
            admin_login_max_attempts=ctx.admin_login_max_attempts,
            admin_auth_policy=ctx.admin_auth_policy,
            admin_lockout_minutes=ctx.admin_lockout_minutes,
            add_admin_audit_log=ctx.add_admin_audit_log,
        )
    )

    # Main Admin Workspace (rendered only if auth succeeds and session doesn't stop)
    tab_mod, tab_map, tab_kpi, tab_exp = st.tabs([
        ctx.i18n_text("Modération", "Moderation"),
        ctx.i18n_text("Revue Carte", "Map Review"),
        ctx.i18n_text("Dashboard KPI", "KPI Dashboard"),
        ctx.i18n_text("Exports & Logs", "Exports & Logs")
    ])

    with tab_mod:
        # Determine the current admin identity
        admin_email = ctx.google_user_email() or "Admin Local"
        
        render_admin_moderation(AdminModerationContext(
            auto_enrich_actor=ctx.auto_enrich_actor,
            check_flood_risk=ctx.check_flood_risk,
            add_admin_audit_log=ctx.add_admin_audit_log,
            admin_user=admin_email,
        ))


    with tab_map:
        approved_df = render_admin_map_review(AdminMapReviewContext(
            i18n_text=ctx.i18n_text,
            get_osmnx_graph=ctx.get_osmnx_graph,
            add_elevations_to_graph=ctx.add_elevations_to_graph,
            calculate_flow_sinks=ctx.calculate_flow_sinks,
        ))

    with tab_kpi:
        render_partner_dashboard(ctx.all_submissions_df, approved_df, ctx.pdf_report_cls)

    with tab_exp:
        render_admin_exports(approved_df)
        _render_admin_monitoring()
