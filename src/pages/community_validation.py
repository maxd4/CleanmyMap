from __future__ import annotations

from typing import Any

import streamlit as st

from src.security_utils import sanitize_html_text


SENSITIVE_PENDING_KEYS = {"adresse", "association", "date", "submitted_at", "created_at"}


def _normalize_preview(preview: Any) -> dict[str, Any]:
    if hasattr(preview, "as_dict"):
        data = preview.as_dict()
    elif isinstance(preview, dict):
        data = dict(preview)
    else:
        data = {}
    return data


def render_mission_validation(pending_actions, vote_func, summary_func):
    st.subheader("Validation communautaire des missions")
    st.caption("Vue anonymisee : uniquement un apercu non sensible est affiche au public.")

    normalized = [_normalize_preview(item) for item in list(pending_actions or [])[:10]]
    normalized = [item for item in normalized if item]

    if not normalized:
        st.info("Aucune mission en attente pour le moment.")
        return

    leaked_sensitive = [item for item in normalized if SENSITIVE_PENDING_KEYS.intersection(item.keys())]
    if leaked_sensitive:
        st.error("Configuration invalide: des champs sensibles pending ont ete bloques cote public.")
        return

    voter = st.text_input("Votre pseudo pour voter", key="community_voter")

    for action in normalized:
        sid = action.get("id")
        mission_type = sanitize_html_text(action.get("mission_type") or action.get("type_lieu") or "Mission", max_len=80)
        public_ref = sanitize_html_text(action.get("public_ref") or "N/A", max_len=20)
        impact_level = sanitize_html_text(action.get("impact_level") or "leger", max_len=16)
        dechets_kg = float(action.get("dechets_kg") or 0.0)
        megots = int(action.get("megots") or 0)
        benevoles = int(action.get("benevoles") or 0)

        st.markdown(f"**Mission {public_ref}** - {mission_type}")
        st.caption(
            f"Impact estime: {impact_level} | {dechets_kg:.1f} kg | {megots} megots | {benevoles} benevoles"
        )

        summary = summary_func(sid)
        col1, col2, col3 = st.columns([1, 1, 2])
        with col1:
            if st.button("Utile", key=f"up_{sid}", width="stretch"):
                if voter.strip():
                    vote_func(sid, voter.strip(), 1)
                    st.success("Vote enregistre")
                else:
                    st.warning("Pseudo requis pour voter.")
        with col2:
            if st.button("A revoir", key=f"down_{sid}", width="stretch"):
                if voter.strip():
                    vote_func(sid, voter.strip(), -1)
                    st.success("Vote enregistre")
                else:
                    st.warning("Pseudo requis pour voter.")
        with col3:
            st.write(
                f"Score communautaire: **{summary.get('score', 0)}** "
                f"(Utile {summary.get('up', 0)} / A revoir {summary.get('down', 0)})"
            )

        st.markdown("---")
