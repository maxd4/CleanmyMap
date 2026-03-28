from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Callable

import pandas as pd
import streamlit as st
from fpdf import FPDF

from src.logging_utils import log_exception
from src.models import ImpactPeriodStats


@dataclass(slots=True)
class ReportTabContext:
    render_tab_header: Callable[..., None]
    i18n_text: Callable[[str, str], str]
    get_submissions_by_status: Callable[[str], list[dict[str, Any]]]
    all_imported_actions: list[dict[str, Any]]
    normalize_bool_flag: Callable[[Any], bool]
    txt_fn: Callable[[Any], str]
    track_ux_issue: Callable[..., None]
    pdf_report_cls: type
    streamlit_public_url: str
    t_fn: Callable[[str], str]


def render_report_tab(ctx: ReportTabContext) -> None:
    ctx.render_tab_header(
        icon="📑",
        title_fr="Mon Bilan PDF",
        title_en="My PDF Report",
        subtitle_fr="Générez un rapport d'impact professionnel pour vos partenaires et votre communication.",
        subtitle_en="Generate a professional impact report for your partners and communication.",
        chips=[ctx.i18n_text("Export", "Export"), ctx.i18n_text("Bilan", "Summary")],
        compact=True,
    )

    db_approved = ctx.get_submissions_by_status("approved")
    public_actions = ctx.all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)

    if public_df.empty:
        st.info("Aucune donnée disponible pour générer le rapport." if st.session_state.lang == "fr" else "No data available to generate report.")
        return

    report_df = public_df.copy()
    report_df["date_dt"] = pd.to_datetime(report_df.get("date"), errors="coerce")
    if report_df["date_dt"].isna().all() and "submitted_at" in report_df.columns:
        report_df["date_dt"] = pd.to_datetime(report_df.get("submitted_at"), errors="coerce")

    c_rep1, c_rep2 = st.columns([2, 1])
    with c_rep2:
        st.markdown('<div class="premium-card">', unsafe_allow_html=True)
        st.write("⚙️ **Options du Rapport**")
        is_rse_mode = st.toggle(
            "Format Corporate RSE",
            value=False,
            help="Ajoute des métriques ESG et une valorisation du mécénat pour les bilans RSE d'entreprises.",
        )
        compare_days = st.selectbox("Comparatif de période", [30, 60, 90], format_func=lambda x: f"{x} jours")
        st.markdown("</div>", unsafe_allow_html=True)

        if is_rse_mode:
            st.success("🏢 **Mode RSE Activé**\nLe rapport inclura les métriques d'impact social et environnemental.")
            total_h = int((public_df["temps_min"] * public_df.get("benevoles", 1)).sum() / 60)
            st.metric("Temps de mécénat accumulé", f"{total_h} h")

        end_date = pd.Timestamp(date.today())
        current_start = end_date - pd.Timedelta(days=compare_days - 1)
        previous_start = current_start - pd.Timedelta(days=compare_days)
        previous_end = current_start - pd.Timedelta(days=1)

        current_period_df = report_df[(report_df["date_dt"] >= current_start) & (report_df["date_dt"] <= end_date)]
        previous_period_df = report_df[(report_df["date_dt"] >= previous_start) & (report_df["date_dt"] <= previous_end)]

        def metric_pack(df: pd.DataFrame) -> ImpactPeriodStats:
            if df.empty:
                return ImpactPeriodStats()
            return ImpactPeriodStats(
                actions=int(len(df)),
                kg=float(pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0).sum()),
                megots=int(pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0).sum()),
                benevoles=int(pd.to_numeric(df.get("benevoles", 0), errors="coerce").fillna(0).sum()),
            )

        def collect_report_highlights(df: pd.DataFrame) -> list[str]:
            if df.empty:
                return []
            highlights: list[str] = []
            type_col = df.get("type_lieu", pd.Series(dtype=str)).fillna("").astype(str)
            clean_col = df.get("est_propre", pd.Series(dtype=bool)).map(ctx.normalize_bool_flag)
            date_col = pd.to_datetime(df.get("date"), errors="coerce")
            if date_col.isna().all() and "submitted_at" in df.columns:
                date_col = pd.to_datetime(df.get("submitted_at"), errors="coerce")
            recent_count = int((date_col >= (pd.Timestamp(date.today()) - pd.Timedelta(days=30))).fillna(False).sum())
            partner_count = int(type_col.str.contains("Engag", case=False, na=False).sum())
            clean_count = int(clean_col.sum())
            pollution_count = int((~clean_col).sum())
            quality_flags = int(
                (
                    (pd.to_numeric(df.get("dechets_kg", 0), errors="coerce").fillna(0) > 400)
                    | (pd.to_numeric(df.get("megots", 0), errors="coerce").fillna(0) > 80000)
                    | (pd.to_numeric(df.get("benevoles", 0), errors="coerce").fillna(0) > 300)
                    | (pd.to_numeric(df.get("temps_min", 0), errors="coerce").fillna(0) > 720)
                ).sum()
            )

            highlights.append("Carte interactive avec préréglages partageables : pollution, zones propres, partenaires, récentes, prioritaires.")
            if recent_count > 0:
                highlights.append(f"Préréglage actions récentes : {recent_count} action(s) sur les 30 derniers jours.")
            if partner_count > 0:
                highlights.append(f"Préréglage partenaires engagés : {partner_count} point(s) cartographiés.")
            if clean_count > 0:
                highlights.append(f"Préréglage zones propres : {clean_count} point(s) valorisés.")
            if pollution_count > 0:
                highlights.append(f"Préréglage pollution/priorité : {pollution_count} point(s) à surveiller.")
            if quality_flags > 0:
                highlights.append(f"Validation admin en lot et pré-validation : {quality_flags} signalement(s) atypique(s) détecté(s).")
            return highlights

        current_stats = metric_pack(current_period_df)
        previous_stats = metric_pack(previous_period_df)
        report_highlights = collect_report_highlights(current_period_df if not current_period_df.empty else report_df)

    with c_rep1:
        st.markdown("### Comparatif période précédente")
        cmp1, cmp2 = st.columns(2)
        cmp1.metric("Actions", current_stats.actions, delta=current_stats.actions - previous_stats.actions)
        cmp2.metric("kg collectés", f"{current_stats.kg:.1f}", delta=f"{current_stats.kg - previous_stats.kg:.1f}")
        cmp3, cmp4 = st.columns(2)
        cmp3.metric("Mégots", f"{current_stats.megots:,}", delta=f"{current_stats.megots - previous_stats.megots:,}")
        cmp4.metric("Bénévoles", current_stats.benevoles, delta=current_stats.benevoles - previous_stats.benevoles)

        st.markdown("### Nouveautés retenues dans ce rapport")
        if report_highlights:
            for hl in report_highlights[:6]:
                st.caption(f"- {hl}")
        else:
            st.caption("- Pas de nouveauté data-driven à afficher sur la période.")

        def build_decider_onepager(curr_stats: ImpactPeriodStats, prev_stats: ImpactPeriodStats, window_days: int, source_df: pd.DataFrame, highlights: list[str]) -> bytes:
            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=14)
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 16)
            pdf.cell(0, 10, ctx.txt_fn("Clean my Map - Synthese decideur (1 page)"), ln=True)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 7, ctx.txt_fn(f"Periode analysee: {window_days} jours - edition du {date.today().isoformat()}"), ln=True)
            pdf.ln(3)

            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, ctx.txt_fn("Indicateurs cles"), ln=True)
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(
                0,
                6,
                ctx.txt_fn(
                    f"- Actions: {curr_stats.actions} (periode precedente: {prev_stats.actions})\n"
                    f"- Dechets collectes: {curr_stats.kg:.1f} kg (precedente: {prev_stats.kg:.1f} kg)\n"
                    f"- Megots: {curr_stats.megots:,} (precedente: {prev_stats.megots:,})\n"
                    f"- Benevoles mobilises: {curr_stats.benevoles} (precedente: {prev_stats.benevoles})"
                ),
            )

            top_zones = (
                source_df.groupby("adresse", dropna=False)["dechets_kg"].sum().sort_values(ascending=False).head(5)
                if ("adresse" in source_df.columns and "dechets_kg" in source_df.columns and not source_df.empty)
                else pd.Series(dtype=float)
            )
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, ctx.txt_fn("Top zones prioritaires"), ln=True)
            pdf.set_font("Helvetica", "", 10)
            if top_zones.empty:
                pdf.multi_cell(0, 6, ctx.txt_fn("- Donnees insuffisantes pour prioriser des zones."))
            else:
                for zone, kg in top_zones.items():
                    zone_label = str(zone) if str(zone).strip() else "Zone non renseignee"
                    pdf.multi_cell(0, 6, ctx.txt_fn(f"- {zone_label}: {float(kg):.1f} kg"))

            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, ctx.txt_fn("Recommandations"), ln=True)
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(
                0,
                6,
                ctx.txt_fn(
                    "1) Renforcer les equipes sur les zones prioritaires identifiees.\n"
                    "2) Coupler operation terrain + sensibilisation locale sur les points de recidive.\n"
                    "3) Suivre les memes indicateurs tous les mois pour mesurer l'effet des actions."
                ),
            )

            if highlights:
                pdf.ln(2)
                pdf.set_font("Helvetica", "B", 11)
                pdf.cell(0, 7, ctx.txt_fn("Nouveautés produit visibles (si pertinentes)"), ln=True)
                pdf.set_font("Helvetica", "", 9)
                for line in highlights[:4]:
                    pdf.multi_cell(0, 5, ctx.txt_fn(f"- {line}"))

            output = pdf.output(dest="S")
            return output if isinstance(output, bytes) else output.encode("latin-1", "replace")

        try:
            onepage_bytes = build_decider_onepager(current_stats, previous_stats, compare_days, current_period_df, report_highlights)
            st.download_button(
                "Telecharger export decideur 1 page (PDF)",
                data=onepage_bytes,
                file_name=f"cleanmymap_decideur_1page_{compare_days}j.pdf",
                mime="application/pdf",
                width="stretch",
            )

            st.divider()
            report_gen = ctx.pdf_report_cls(public_df)
            report_gen.is_rse = is_rse_mode
            report_gen.map_base_url = ctx.streamlit_public_url
            pdf_bytes = report_gen.generate(dest="S")

            label_btn = "Telecharger le Rapport RSE (PDF)" if is_rse_mode else ctx.t_fn("download_pdf")
            st.download_button(
                label_btn,
                data=pdf_bytes,
                file_name=f"cleanmymap_rapport_{'rse' if is_rse_mode else 'public'}.pdf",
                mime="application/pdf",
                width="stretch",
            )

            st.divider()
            st.markdown(f"### {'Apercu des donnees' if st.session_state.lang == 'fr' else 'Data Preview'}")
            st.markdown("#### Dernieres actions marquantes")
            st.dataframe(
                public_df.sort_values("date", ascending=False).head(10)[["date", "type_lieu", "adresse", "dechets_kg", "megots"]],
                width="stretch",
                hide_index=True,
            )
        except (RuntimeError, ValueError, TypeError, KeyError) as pdf_exc:
            log_exception(
                component="ui.report",
                action="generate_report",
                exc=pdf_exc,
                message="Report generation failed",
                severity="error",
            )
            ctx.track_ux_issue(
                event_type="broken_action",
                tab_id="pdf",
                action_name="generate_report",
                message=str(pdf_exc),
            )
            st.error("La generation du rapport a echoue. Verifiez les donnees puis reessayez.")
