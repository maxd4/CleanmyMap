import streamlit as st


def render_mission_validation(pending_actions, vote_func, summary_func):
    st.subheader("🗳️ Validation communautaire des missions")
    st.caption("Les votes citoyens servent d'indicateur pour aider les modérateurs/admins.")

    if not pending_actions:
        st.info("Aucune mission en attente pour le moment.")
        return

    voter = st.text_input("Votre pseudo pour voter", key="community_voter")

    for action in pending_actions[:10]:
        sid = action.get("id")
        st.markdown(f"**{action.get('type_lieu', 'Mission')}** — {action.get('adresse', 'Adresse inconnue')}")
        st.caption(f"Association: {action.get('association', 'N/A')} • Date: {action.get('date', '')}")

        summary = summary_func(sid)
        col1, col2, col3 = st.columns([1, 1, 2])
        with col1:
            if st.button("👍 Utile", key=f"up_{sid}", width="stretch"):
                if voter.strip():
                    vote_func(sid, voter.strip(), 1)
                    st.success("Vote enregistré")
                else:
                    st.warning("Pseudo requis pour voter.")
        with col2:
            if st.button("👎 À revoir", key=f"down_{sid}", width="stretch"):
                if voter.strip():
                    vote_func(sid, voter.strip(), -1)
                    st.success("Vote enregistré")
                else:
                    st.warning("Pseudo requis pour voter.")
        with col3:
            st.write(f"Score communautaire: **{summary.get('score', 0)}** (👍 {summary.get('up', 0)} / 👎 {summary.get('down', 0)})")

        st.markdown("---")
