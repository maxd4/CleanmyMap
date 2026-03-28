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
    ensure_admin_authenticated,
    render_admin_exports,
    render_admin_map_review,
    render_admin_moderation,
)

get_ux_events = getattr(db, "get_ux_events", lambda *args, **kwargs: [])
get_ux_error_stats = getattr(
    db,
    "get_ux_error_stats",
    lambda *args, **kwargs: {
        "total_events": 0,
        "invalid_fields": 0,
        "broken_actions": 0,
        "top_invalid_fields": [],
    },
)


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


def _render_admin_monitoring() -> None:
    st.markdown("### Monitoring UX")
    ux_stats = get_ux_error_stats(days=30)
    ux_c1, ux_c2, ux_c3 = st.columns(3)
    ux_c1.metric("Erreurs UX (30j)", int(ux_stats.get("total_events", 0)))
    ux_c2.metric("Champs invalides", int(ux_stats.get("invalid_fields", 0)))
    ux_c3.metric("Actions cassees", int(ux_stats.get("broken_actions", 0)))

    top_fields = pd.DataFrame(ux_stats.get("top_invalid_fields", []))
    if not top_fields.empty:
        st.caption("Champs les plus souvent invalides")
        st.dataframe(top_fields.rename(columns={"field_name": "champ", "occurrences": "erreurs"}), width="stretch", hide_index=True)

    with st.expander("Journal UX recent", expanded=False):
        ux_events_df = pd.DataFrame(get_ux_events(limit=200, days=30))
        if ux_events_df.empty:
            st.info("Aucun evenement UX enregistre sur la periode.")
        else:
            cols = ["created_at", "event_type", "tab_id", "action_name", "field_name", "message"]
            show_cols = [c for c in cols if c in ux_events_df.columns]
            st.dataframe(ux_events_df[show_cols], width="stretch", hide_index=True)


def render_admin_tab(ctx: AdminTabContext) -> None:
    ctx.render_tab_header(
        icon="⚙️",
        title_fr="Espace administrateur",
        title_en="Admin Workspace",
        subtitle_fr="Validez les contributions, pilotez la carte publique et exportez les données scientifiques.",
        subtitle_en="Validate submissions, manage the public map, and export scientific datasets.",
        chips=[ctx.i18n_text("Validation", "Moderation"), ctx.i18n_text("Données", "Data")],
        compact=True,
    )
    st.caption("Connexion Google obligatoire pour les administrateurs")

    ensure_admin_authenticated(
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

    approved_df = render_admin_map_review(
        AdminMapReviewContext(
            i18n_text=ctx.i18n_text,
            get_osmnx_graph=ctx.get_osmnx_graph,
            add_elevations_to_graph=ctx.add_elevations_to_graph,
            calculate_flow_sinks=ctx.calculate_flow_sinks,
        )
    )

    render_admin_exports(approved_df)
    _render_admin_monitoring()
    render_admin_moderation(
        AdminModerationContext(
            auto_enrich_actor=ctx.auto_enrich_actor,
            check_flood_risk=ctx.check_flood_risk,
        )
    )
