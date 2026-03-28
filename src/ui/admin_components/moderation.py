from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import pandas as pd
import streamlit as st

from src.database import update_submission_status
from src.models import SubmissionPrecheck
from src.repositories.submissions_repository import fetch_pending_submissions


@dataclass(slots=True)
class AdminModerationContext:
    auto_enrich_actor: Callable[..., bool]
    check_flood_risk: Callable[..., bool]


def _prevalidate_submission(entry: dict[str, Any]) -> SubmissionPrecheck:
    reasons: list[str] = []
    score = 0

    address_ok = bool(str(entry.get("adresse", "")).strip())
    type_ok = bool(str(entry.get("type_lieu", "")).strip())
    owner_ok = bool(str(entry.get("nom", "")).strip() or str(entry.get("association", "")).strip())
    if address_ok and type_ok and owner_ok:
        score += 1
    else:
        reasons.append("champs essentiels incomplets")

    est_propre = bool(entry.get("est_propre", False))
    dechets = float(entry.get("dechets_kg") or 0.0)
    megots = int(entry.get("megots") or 0)
    if est_propre:
        if dechets <= 0 and megots <= 0:
            score += 1
        else:
            reasons.append("zone propre avec metriques non nulles")
    else:
        if dechets > 0 or megots > 0:
            score += 1
        else:
            reasons.append("aucun impact quantifie")

    lat = entry.get("lat")
    lon = entry.get("lon")
    geo_ok = False
    try:
        if lat is not None and lon is not None:
            geo_ok = -90 <= float(lat) <= 90 and -180 <= float(lon) <= 180
    except (TypeError, ValueError):
        geo_ok = False
    if geo_ok:
        score += 1
    else:
        reasons.append("coordonnees absentes ou invalides")

    benevoles = int(entry.get("benevoles") or 0)
    duree = int(entry.get("temps_min") or 0)
    plausible = dechets <= 400 and megots <= 80000 and benevoles <= 300 and duree <= 720
    if plausible:
        score += 1
    else:
        reasons.append("valeurs atypiques (controle manuel recommande)")

    if not address_ok or not type_ok:
        return SubmissionPrecheck("Bloquante", 3, score, reasons)
    if not plausible:
        return SubmissionPrecheck("A verifier (fort)", 2, score, reasons)
    if score >= 3:
        return SubmissionPrecheck("Pre-validee", 1, score, reasons)
    return SubmissionPrecheck("A verifier", 2, score, reasons)


def render_admin_moderation(ctx: AdminModerationContext) -> None:
    st.markdown("---")

    pending = fetch_pending_submissions()
    if not pending:
        st.info("Aucune demande en attente.")
        return

    st.markdown("### Pre-validation automatique")

    actor_types = [
        "Association ecologique",
        "Association humanitaire et sociale",
        "Commercant engage",
        "Association écologique",
        "Commerçant engagé",
    ]

    prevalidation_rows: list[dict[str, Any]] = []
    for row in pending:
        result = _prevalidate_submission(row)
        prevalidation_rows.append(
            {
                "id": row.get("id"),
                "date": row.get("date"),
                "type_lieu": row.get("type_lieu"),
                "adresse": row.get("adresse"),
                "nom": row.get("nom"),
                "decision": result.decision,
                "score": result.score,
                "priority": result.priority,
                "raisons": " | ".join(result.reasons) if result.reasons else "RAS",
            }
        )

    pre_df = pd.DataFrame(prevalidation_rows).sort_values(["priority", "date"], ascending=[True, False]).reset_index(drop=True)
    count_pre = int((pre_df["decision"] == "Pre-validee").sum())
    count_review = int((pre_df["decision"] == "A verifier").sum())
    count_strong = int(((pre_df["decision"] == "A verifier (fort)") | (pre_df["decision"] == "Bloquante")).sum())

    k1, k2, k3 = st.columns(3)
    k1.metric("Pre-validees auto", count_pre)
    k2.metric("A verifier", count_review)
    k3.metric("A verifier (fort/bloquante)", count_strong)

    st.dataframe(pre_df[["date", "nom", "type_lieu", "adresse", "decision", "score", "raisons"]], hide_index=True, width="stretch")

    bulk_choices = st.multiselect(
        "Selection lot",
        options=["Pre-validee", "A verifier", "A verifier (fort)", "Bloquante"],
        default=["Pre-validee"],
        key="admin_bulk_filter",
        help="Filtre les demandes a traiter en lot selon la pre-validation.",
    )
    selected_ids = pre_df[pre_df["decision"].isin(bulk_choices)]["id"].dropna().tolist() if bulk_choices else []
    st.caption(f"{len(selected_ids)} demande(s) ciblee(s) pour action en lot.")
    confirm_bulk = st.checkbox("Je confirme l'action en lot sur la selection ci-dessus", key="admin_bulk_confirm")

    b1, b2 = st.columns(2)
    if b1.button("Approuver la selection", key="bulk_approve_btn", use_container_width=True, disabled=not (confirm_bulk and selected_ids)):
        approved_count = 0
        for row in pending:
            if row.get("id") in selected_ids:
                update_submission_status(row["id"], "approved")
                if row.get("type_lieu") in actor_types:
                    ctx.auto_enrich_actor(row["id"], row.get("association", ""), row.get("type_lieu", ""), row.get("adresse", ""))
                approved_count += 1
        st.success(f"{approved_count} demande(s) approuvee(s) en lot.")
        st.rerun()

    if b2.button("Refuser la selection", key="bulk_reject_btn", use_container_width=True, disabled=not (confirm_bulk and selected_ids)):
        rejected_count = 0
        for row in pending:
            if row.get("id") in selected_ids:
                update_submission_status(row["id"], "rejected")
                rejected_count += 1
        st.warning(f"{rejected_count} demande(s) refusee(s) en lot.")
        st.rerun()

    st.markdown("---")
    for i, row in enumerate(pending):
        with st.expander(f"#{i + 1} • {row['date']} • {row['type_lieu']} • {row['adresse']}"):
            if ctx.check_flood_risk(row.get("lat"), row.get("lon"), row.get("adresse", ""), row.get("type_lieu", "")):
                st.error("🚨 Zone humide : risque de dispersion des micro-plastiques élevé, intervention prioritaire requise")

            st.write(
                {
                    "Nom": row["nom"],
                    "Association": row["association"],
                    "Zone propre": row.get("est_propre", False),
                    "Bénévoles": row["benevoles"],
                    "Durée (min)": row["temps_min"],
                    "Mégots": row["megots"],
                    "Déchets (kg)": row["dechets_kg"],
                    "Plastique (kg)": row.get("plastique_kg", 0),
                    "Verre (kg)": row.get("verre_kg", 0),
                    "Métal (kg)": row.get("metal_kg", 0),
                    "GPS": row["gps"],
                    "Commentaire": row["commentaire"],
                }
            )

            row_precheck = _prevalidate_submission(row)
            if row_precheck.decision == "Pre-validee":
                st.success(f"Pre-validation: {row_precheck.decision} (score {row_precheck.score}/4)")
            elif row_precheck.decision == "A verifier":
                st.warning(f"Pre-validation: {row_precheck.decision} (score {row_precheck.score}/4)")
            else:
                st.error(f"Pre-validation: {row_precheck.decision} (score {row_precheck.score}/4)")

            if row_precheck.reasons:
                st.caption("Raisons: " + " | ".join(row_precheck.reasons))

            a, r = st.columns(2)
            if a.button("✅ Approuver", key=f"approve_{row['id']}", width="stretch"):
                update_submission_status(row["id"], "approved")
                if row.get("type_lieu") in actor_types:
                    with st.spinner(f"Recherche d'informations pour {row['association']}..."):
                        ctx.auto_enrich_actor(row["id"], row["association"], row["type_lieu"], row["adresse"])
                st.rerun()

            if r.button("❌ Refuser", key=f"reject_{row['id']}", width="stretch"):
                update_submission_status(row["id"], "rejected")
                st.rerun()
