from __future__ import annotations
import pandas as pd
import streamlit as st
from src.analytics import compute_advanced_kpis, previous_period

def render_partner_dashboard(all_submissions_df: pd.DataFrame, approved_df: pd.DataFrame, pdf_builder_cls) -> None:
    """
    Tableau de bord pour l'analyse d'impact des partenaires.
    Consolidé depuis src/pages/partner_dashboard.py.
    """
    st.markdown("---")
    st.subheader("📊 Performances & Impact Partenaires")

    if approved_df.empty:
        st.info("Aucune donnée approuvée disponible pour l'analyse.")
        return

    work = approved_df.copy()
    work["date"] = pd.to_datetime(work.get("date"), errors="coerce")
    
    # Sélecteurs de filtres
    f1, f2 = st.columns(2)
    with f1:
        territory = st.text_input("Filtrer par territoire", value="", placeholder="Ex: Paris 15", key="admin_dash_territory")
    with f2:
        # Période par défaut (30 derniers jours)
        end_date = pd.Timestamp.today()
        start_date = end_date - pd.Timedelta(days=30)
        date_range = st.date_input("Période d'analyse", value=(start_date.date(), end_date.date()), key="admin_dash_dates")

    if isinstance(date_range, tuple) and len(date_range) == 2:
        start_ts, end_ts = pd.Timestamp(date_range[0]), pd.Timestamp(date_range[1])
    else:
        start_ts, end_ts = start_date, end_date

    # Filtrage
    filt = work[(work["date"] >= start_ts) & (work["date"] <= end_ts)]
    if territory.strip():
        filt = filt[filt.get("adresse", "").astype(str).str.contains(territory, case=False, na=False)]

    # Calcul des KPIs via src.analytics
    kpis = compute_advanced_kpis(all_submissions_df, filt)
    
    # Affichage des métriques
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Completion Rate", f"{kpis['mission_completion_rate']:.1f}%")
    delay = kpis["avg_validation_delay_days"]
    m2.metric("Délai validation", f"{delay:.1f} j" if delay is not None else "N/A")
    m3.metric("Économies estimées", f"{kpis['estimated_cost_saved_eur']:.0f} €")
    m4.metric("Efficience (kg/€)", f"{kpis['impact_kg_per_eur']:.2f}")

    # Tableau de données
    st.dataframe(filt.sort_values("date", ascending=False), width="stretch", hide_index=True)

    # Exports
    c1, c2 = st.columns(2)
    with c1:
        csv = filt.to_csv(index=False).encode("utf-8")
        st.download_button("Export CSV", data=csv, file_name="kpi_partenaires.csv", mime="text/csv", use_container_width=True)
    with c2:
        if not filt.empty and pdf_builder_cls:
            pdf_bytes = pdf_builder_cls(filt).generate(dest="S")
            st.download_button("Export PDF", data=pdf_bytes, file_name="kpi_partenaires.pdf", mime="application/pdf", use_container_width=True)
