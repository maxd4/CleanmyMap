from __future__ import annotations

import pandas as pd
import streamlit as st

from src.analytics import compute_advanced_kpis, previous_period


def render_partner_dashboard(all_submissions_df: pd.DataFrame, approved_df: pd.DataFrame, pdf_builder_cls) -> None:
    st.subheader("📊 Tableau de bord partenaires")

    if approved_df.empty:
        st.info("Aucune donnée approuvée disponible.")
        return

    work = approved_df.copy()
    work["date"] = pd.to_datetime(work.get("date"), errors="coerce")

    min_date = work["date"].dropna().min()
    max_date = work["date"].dropna().max()
    if pd.isna(min_date) or pd.isna(max_date):
        min_date = pd.Timestamp.today() - pd.Timedelta(days=30)
        max_date = pd.Timestamp.today()

    col_f1, col_f2 = st.columns(2)
    with col_f1:
        territory = st.text_input("Filtre territoire (adresse contient)", value="")
    with col_f2:
        date_range = st.date_input(
            "Période",
            value=(min_date.date(), max_date.date()),
            min_value=min_date.date(),
            max_value=max_date.date(),
        )

    if isinstance(date_range, tuple) and len(date_range) == 2:
        start_date = pd.Timestamp(date_range[0])
        end_date = pd.Timestamp(date_range[1])
    else:
        start_date = min_date
        end_date = max_date

    filt = work[(work["date"] >= start_date) & (work["date"] <= end_date)]
    if territory.strip():
        filt = filt[filt.get("adresse", "").astype(str).str.contains(territory, case=False, na=False)]

    kpis = compute_advanced_kpis(all_submissions_df, filt)
    prev = previous_period(work, start_date, end_date)
    if territory.strip() and not prev.empty:
        prev = prev[prev.get("adresse", "").astype(str).str.contains(territory, case=False, na=False)]
    prev_kpis = compute_advanced_kpis(all_submissions_df, prev)

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Mission completion rate", f"{kpis['mission_completion_rate']:.1f}%")
    delay = kpis["avg_validation_delay_days"]
    m2.metric("Délai validation moyen", f"{delay:.1f} j" if delay is not None else "N/A")
    m3.metric("Coût évité estimé", f"{kpis['estimated_cost_saved_eur']:.0f} €")
    m4.metric("Impact / €", f"{kpis['impact_kg_per_eur']:.2f} kg/€")

    st.caption(
        f"Comparatif période précédente - kg: {prev_kpis['total_kg']:.1f} → {kpis['total_kg']:.1f} | "
        f"mégots: {int(prev_kpis['total_megots'])} → {int(kpis['total_megots'])}"
    )

    export_cols = [c for c in ["date", "association", "nom", "type_lieu", "adresse", "dechets_kg", "megots", "status"] if c in filt.columns]
    export_df = filt[export_cols].sort_values("date", ascending=False)
    st.dataframe(export_df, width="stretch", hide_index=True)

    csv_data = export_df.to_csv(index=False).encode("utf-8")
    c1, c2 = st.columns(2)
    with c1:
        st.download_button(
            "⬇️ Export CSV partenaires",
            data=csv_data,
            file_name="dashboard_partenaires.csv",
            mime="text/csv",
            width="stretch",
        )
    with c2:
        if not filt.empty:
            pdf_bytes = pdf_builder_cls(filt).generate(dest="S")
            st.download_button(
                "⬇️ Export PDF partenaires",
                data=pdf_bytes,
                file_name="dashboard_partenaires.pdf",
                mime="application/pdf",
                width="stretch",
            )
