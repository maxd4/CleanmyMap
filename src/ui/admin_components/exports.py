from __future__ import annotations

import io
from datetime import datetime

import pandas as pd
import streamlit as st

from src.services.exports import build_eprtr_export_df
from src.services.sheet_actions import anonymize_contributor


def render_admin_exports(approved_df: pd.DataFrame) -> None:
    st.markdown("---")
    st.subheader("science citoyenne : export e-prtr")
    st.write("générez un jeu de données anonymisé respectant les standards européens pour la recherche.")
    if st.button("préparer l'export scientifique (csv)"):
        science_df = approved_df.copy()
        science_df["anonymized_id"] = science_df.get("nom", "").map(anonymize_contributor)
        eper_df = build_eprtr_export_df(science_df)
        if not eper_df.empty:
            csv_buffer = io.StringIO()
            eper_df.to_csv(csv_buffer, index=False)
            st.download_button(
                label="télécharger le fichier e-prtr (.csv)",
                data=csv_buffer.getvalue(),
                file_name=f"cleanwalk_eper_export_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv",
            )
            st.success("votre jeu de données anonymisé est prêt.")
        else:
            st.warning("aucune donnée d'impact (mégots/déchets) à exporter.")

    st.divider()
    st.caption("Export rapide des actions validées")
    if not approved_df.empty:
        st.download_button(
            "⬇️ Télécharger CSV (actions validées)",
            data=approved_df.to_csv(index=False).encode("utf-8"),
            file_name="actions_validees.csv",
            mime="text/csv",
            width="stretch",
        )
