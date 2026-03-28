import streamlit as st
import pandas as pd

def render_gamification_tab(ctx):
    """
    Renders the 'Gamification' tab. Consolidates logic from previous leaderboards.py.
    """
    render_tab_header = ctx['render_tab_header']
    evaluate_badges = ctx['evaluate_badges']
    get_leaderboard = ctx['get_leaderboard']
    get_user_impact_stats = ctx['get_user_impact_stats']
    all_public_df = ctx['all_public_df']

    render_tab_header(
        icon="\U0001F3C6",
        title_fr="Classement & Badges",
        title_en="Leaderboard & Badges",
        subtitle_fr="Suivez vos exploits, collectionnez les badges et grimpez dans le classement des citoyens engagés.",
        subtitle_en="Track your achievements, collect badges, and climb the rankings of engaged citizens.",
        chips=["Gamification", "Badges", "Leaderboard"],
    )

    # --- 1. PROGRESSION PERSONNELLE ---
    st.subheader("Votre Progression")
    u_col1, u_col2 = st.columns([1, 2])
    
    with u_col1:
        pseudo = st.text_input("Saisissez votre pseudo pour voir vos badges", placeholder="Ex: Jean_Vert", key="gamification_pseudo")
        if pseudo:
            stats = get_user_impact_stats(pseudo)
            badges = evaluate_badges(stats)
            st.metric("Points cumulés", f"{stats.get('points', 0)} pts")
            st.metric("Actions validées", stats.get("count", 0))
        else:
            st.info("Entrez un pseudo pour découvrir vos badges.")

    with u_col2:
        if pseudo:
            st.markdown(f"**Badges débloqués pour {pseudo}**")
            if not badges:
                st.write("Aucun badge pour le moment. Continuez d'agir !")
            else:
                b_cols = st.columns(len(badges))
                for i, badge in enumerate(badges):
                    with b_cols[i]:
                        st.markdown(f"<div style='text-align:center; font-size:2rem;'>{badge['icon']}</div>", unsafe_allow_html=True)
                        st.caption(badge['name'])
        else:
            st.markdown("### Les badges à collectionner")
            st.write("🌱 **Graine de Champion** | 🧹 **Nettoyeur de Rue** | 🌊 **Gardien de l'Eau** | 🔥 **Légende Urbaine**")

    st.markdown("---")

    # --- 2. CLASSEMENTS (Consolidated from leaderboards.py) ---
    st.subheader("🏆 Classements de la Communauté")
    
    tab_rank1, tab_rank2 = st.tabs(["Par Association", "Par Bénévole"])
    
    with tab_rank1:
        st.markdown("**🏅 Top 20 Associations**")
        if not all_public_df.empty:
            base = all_public_df.copy()
            base["dechets_kg"] = pd.to_numeric(base.get("dechets_kg"), errors="coerce").fillna(0)
            base["megots"] = pd.to_numeric(base.get("megots"), errors="coerce").fillna(0)
            base["association"] = base.get("association", "Indépendant").fillna("Indépendant")
            
            asso_rank = (
                base.groupby("association", as_index=False)
                .agg(
                    Total_Kg=("dechets_kg", "sum"), 
                    Total_Megots=("megots", "sum"), 
                    Nb_Actions=("id", "count")
                )
                .sort_values(["Total_Kg", "Total_Megots"], ascending=False)
                .head(20)
            )
            st.dataframe(asso_rank, width="stretch", hide_index=True)
        else:
            st.info("Aucune donnée disponible.")

    with tab_rank2:
        st.markdown("**👤 Top 20 Bénévoles**")
        if not all_public_df.empty:
            base = all_public_df.copy()
            base["dechets_kg"] = pd.to_numeric(base.get("dechets_kg"), errors="coerce").fillna(0)
            base["megots"] = pd.to_numeric(base.get("megots"), errors="coerce").fillna(0)
            base["nom"] = base.get("nom", "Anonyme").fillna("Anonyme")

            benev_rank = (
                base.groupby("nom", as_index=False)
                .agg(
                    Total_Kg=("dechets_kg", "sum"), 
                    Total_Megots=("megots", "sum"), 
                    Nb_Actions=("id", "count")
                )
                .sort_values(["Total_Kg", "Total_Megots"], ascending=False)
                .head(20)
            )
            st.dataframe(benev_rank, width="stretch", hide_index=True)
        else:
            st.info("Aucune donnée disponible.")
