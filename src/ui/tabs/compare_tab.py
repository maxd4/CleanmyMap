import streamlit as st
import pandas as pd

def render_compare_tab(ctx):
    """
    Renders the 'Compare' tab (Comparaison territoriale).
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    all_imported_actions = ctx['all_imported_actions']
    get_submissions_by_status = ctx['get_submissions_by_status']
    sanitize_html_text = ctx['sanitize_html_text']

    render_tab_header(
        icon="\U0001F3D9\ufe0f",
        title_fr="Comparaison territoriale",
        title_en="Territorial Comparison",
        subtitle_fr="Comparez les zones par performance, intensité et récurrence de pollution.",
        subtitle_en="Compare zones by performance, intensity, and pollution recurrence.",
        chips=[i18n_text("Benchmark", "Benchmark"), i18n_text("Priorisation", "Prioritization")],
    )

    df_cmp = pd.DataFrame(all_imported_actions + get_submissions_by_status('approved'))

    if df_cmp.empty:
        st.info("Pas encore de données disponibles.")
    else:
        df_cmp['benevoles'] = pd.to_numeric(df_cmp.get('benevoles', df_cmp.get('nb_benevoles', 1)), errors='coerce').fillna(1)
        df_cmp['megots'] = pd.to_numeric(df_cmp['megots'], errors='coerce').fillna(0)
        df_cmp['dechets_kg'] = pd.to_numeric(df_cmp['dechets_kg'], errors='coerce').fillna(0)
        df_cmp['temps_min'] = pd.to_numeric(df_cmp.get('temps_min', 60), errors='coerce').fillna(60)
        df_cmp_dirty = df_cmp[df_cmp.get('est_propre', False) == False].copy()

        territory_reference = {
            "paris": {"population": 2102650, "area_km2": 105.4},
            "lyon": {"population": 522250, "area_km2": 47.9},
            "marseille": {"population": 873076, "area_km2": 240.6},
            "toulouse": {"population": 504078, "area_km2": 118.3},
            "montreuil": {"population": 111455, "area_km2": 8.9},
            "versailles": {"population": 85000, "area_km2": 26.2},
        }

        def _extract_territory(addr: str) -> str:
            txt = str(addr).lower()
            for city in territory_reference.keys():
                if city in txt:
                    return city.title()
            return "Territoire non référencé"
        
        df_cmp_dirty["territoire"] = df_cmp_dirty.get("adresse", pd.Series(dtype=str)).apply(_extract_territory)

        c1c, c2c = st.columns(2)
        with c1c:
            group_by = st.selectbox("Grouper par", ["Type de lieu", "Adresse (Top 20)", "Territoire (ville)"], key="cmp_group")
        with c2c:
            sort_by = st.selectbox(
                "Trier par",
                ["Score IPC", "kg / action", "Mégots / bénévole", "Nombre d'actions", "kg / 10k habitants", "Mégots / km²"],
                key="cmp_sort"
            )

        if group_by == "Type de lieu":
            group_col = 'type_lieu'
        elif group_by == "Adresse (Top 20)":
            df_cmp_dirty = df_cmp_dirty.copy()
            df_cmp_dirty['adresse_short'] = df_cmp_dirty['adresse'].apply(lambda x: str(x)[:40])
            group_col = 'adresse_short'
        else:
            group_col = 'territoire'

        if group_col not in df_cmp_dirty.columns:
            df_cmp_dirty[group_col] = 'Inconnu'

        grp = df_cmp_dirty.groupby(group_col).agg(
            nb_actions=('megots', 'count'),
            total_kg=('dechets_kg', 'sum'),
            total_megots=('megots', 'sum'),
            total_benevoles=('benevoles', 'sum'),
            total_min=('temps_min', 'sum'),
        ).reset_index()
        grp['kg_par_action'] = (grp['total_kg'] / grp['nb_actions']).round(2)
        grp['megots_par_benevole'] = (grp['total_megots'] / grp['total_benevoles'].replace(0, 1)).round(1)
        grp['score_ipc'] = (grp['total_megots'] / (grp['total_min'] / 60).replace(0, 1)).round(1)
        grp["population"] = grp[group_col].apply(lambda z: territory_reference.get(str(z).lower(), {}).get("population", None))
        grp["area_km2"] = grp[group_col].apply(lambda z: territory_reference.get(str(z).lower(), {}).get("area_km2", None))
        population = pd.to_numeric(grp["population"], errors="coerce")
        area_km2 = pd.to_numeric(grp["area_km2"], errors="coerce")
        grp["kg_par_10k_hab"] = (
            ((grp["total_kg"] / population.clip(lower=1.0)) * 10000)
            .where(population.notna(), 0.0)
            .round(2)
        )
        grp["megots_par_km2"] = (
            (grp["total_megots"] / area_km2.clip(lower=0.001))
            .where(area_km2.notna(), 0.0)
            .round(1)
        )

        sort_map = {"Score IPC": "score_ipc", "kg / action": "kg_par_action",
                    "Mégots / bénévole": "megots_par_benevole", "Nombre d'actions": "nb_actions",
                    "kg / 10k habitants": "kg_par_10k_hab", "Mégots / km²": "megots_par_km2"}
        grp = grp.sort_values(sort_map[sort_by], ascending=False).reset_index(drop=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        for i, row in grp.head(15).iterrows():
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"#{i+1}"
            bar_pct = int(row[sort_map[sort_by]] / max(grp[sort_map[sort_by]].max(), 0.001) * 100)
            bg = "#10b981" if i == 0 else "#34d399" if i == 1 else "#6ee7b7" if i == 2 else "#d1fae5"
            border = "3px solid #10b981" if i < 3 else "1px solid #e2e8f0"
            safe_zone = sanitize_html_text(str(row[group_col])[:45], max_len=90)
            st.markdown(f"""
            <div style="background:{'linear-gradient(135deg,#f0fdf4,#ecfdf5)' if i < 3 else '#f8fafc'};
                    border-radius:12px;padding:12px 16px;margin-bottom:8px;border-left:{border};">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div><span style="font-size:1.1rem;">{medal}</span>
                    <strong style="color:#1e293b;margin-left:8px;">{safe_zone}</strong></div>
                    <div style="text-align:right;font-size:12px;color:#64748b;">
                        {int(row['nb_actions'])} actions · {row['total_kg']:.1f} kg · {int(row['total_megots']):,} mégots</div>
                </div>
                <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;">
                        <div style="width:{bar_pct}%;background:{bg};height:8px;border-radius:4px;"></div></div>
                    <span style="font-size:12px;font-weight:700;color:#059669;">{sort_by}: {row[sort_map[sort_by]]:.1f}</span>
                </div>
            </div>""", unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        st.divider()
        grp_disp = grp.rename(columns={group_col: 'Zone', 'nb_actions': 'Actions', 'total_kg': 'Total kg',
            'total_megots': 'Megots', 'total_benevoles': 'Benevoles', 'kg_par_action': 'kg/action',
            'megots_par_benevole': 'Megots/benevole', 'score_ipc': 'Score IPC',
            'kg_par_10k_hab': 'kg/10k hab', 'megots_par_km2': 'Megots/km2'})
        st.dataframe(grp_disp[['Zone','Actions','Total kg','Megots','Benevoles','kg/action','Megots/benevole','kg/10k hab','Megots/km2','Score IPC']],
                     hide_index=True, use_container_width=True)
        st.download_button("⬇️ Exporter (CSV)", data=grp_disp.to_csv(index=False, encoding="utf-8"),
                           file_name="comparaison_territoriale.csv", mime="text/csv", use_container_width=True)
