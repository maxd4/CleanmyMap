import pandas as pd
import streamlit as st


def render_historical_rankings(actions_df: pd.DataFrame) -> None:
    st.subheader("🏅 Classement historique")
    if actions_df.empty:
        st.info("Aucune donnée disponible pour les classements.")
        return

    base = actions_df.copy()
    base["dechets_kg"] = pd.to_numeric(base.get("dechets_kg"), errors="coerce").fillna(0)
    base["megots"] = pd.to_numeric(base.get("megots"), errors="coerce").fillna(0)
    base["association"] = base.get("association", "Indépendant").fillna("Indépendant")
    base["nom"] = base.get("nom", "Anonyme").fillna("Anonyme")

    c1, c2 = st.columns(2)

    with c1:
        st.markdown("**Par association**")
        asso_rank = (
            base.groupby("association", as_index=False)
            .agg(dechets_kg=("dechets_kg", "sum"), megots=("megots", "sum"), actions=("id", "count"))
            .sort_values(["dechets_kg", "megots"], ascending=False)
            .head(20)
        )
        st.dataframe(asso_rank, width="stretch", hide_index=True)

    with c2:
        st.markdown("**Par bénévole**")
        benev_rank = (
            base.groupby("nom", as_index=False)
            .agg(dechets_kg=("dechets_kg", "sum"), megots=("megots", "sum"), actions=("id", "count"))
            .sort_values(["dechets_kg", "megots"], ascending=False)
            .head(20)
        )
        st.dataframe(benev_rank, width="stretch", hide_index=True)
