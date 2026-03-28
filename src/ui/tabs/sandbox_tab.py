import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium

def render_sandbox_tab(ctx):
    """
    Renders the 'Sandbox' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    TYPE_LIEU_OPTIONS = ctx['TYPE_LIEU_OPTIONS']
    geocode_and_resolve = ctx['geocode_and_resolve']

    render_tab_header(
        icon="🧪",
        title_fr="Le Labo",
        title_en="Sandbox Lab",
        subtitle_fr="Entrainez-vous et testez des scénarios fictifs sans aucun risque pour les données réelles.",
        subtitle_en="Train and test fictional scenarios without any risk to real data.",
        chips=[i18n_text("Brouillon", "Draft"), i18n_text("Simulation", "Simulation")],
        compact=True,
    )

    st.info("Cette zone est un bac à sable : vous pouvez ajouter des données fictives pour tester l'outil. Elles ne sont **pas enregistrées** dans la base réelle et seront perdues si vous rafraîchissez la page.")
    
    col_sb1, col_sb2 = st.columns([1, 2])
    
    with col_sb1:
        st.subheader("Templates de scénarios")
        sandbox_templates = {
            "Ecole": {
                "target_kg": 12.0,
                "target_megots": 450,
                "actions": [
                    {"nom": "Classe CM2", "type_lieu": "Parc urbain", "adresse": "Ecole Jules Ferry, Paris", "megots": 120, "dechets_kg": 3.0, "lat": 48.886, "lon": 2.343, "est_propre": False},
                    {"nom": "Parents volontaires", "type_lieu": "Rue passante", "adresse": "Rue de l'Ecole, Paris", "megots": 90, "dechets_kg": 2.4, "lat": 48.884, "lon": 2.347, "est_propre": False},
                    {"nom": "Referent eco", "type_lieu": "Signalement Proprete", "adresse": "Cour de recreation", "megots": 0, "dechets_kg": 0.0, "lat": 48.885, "lon": 2.345, "est_propre": True},
                ],
            },
            "Parc": {
                "target_kg": 20.0,
                "target_megots": 900,
                "actions": [
                    {"nom": "Brigade Verte Nord", "type_lieu": "Parc urbain", "adresse": "Parc Montsouris, Paris", "megots": 300, "dechets_kg": 5.5, "lat": 48.822, "lon": 2.338, "est_propre": False},
                    {"nom": "Brigade Verte Sud", "type_lieu": "Parc urbain", "adresse": "Parc Montsouris, Paris", "megots": 210, "dechets_kg": 4.2, "lat": 48.821, "lon": 2.336, "est_propre": False},
                    {"nom": "Equipe sensibilisation", "type_lieu": "Aire de jeux", "adresse": "Aire centrale", "megots": 80, "dechets_kg": 1.5, "lat": 48.823, "lon": 2.34, "est_propre": False},
                ],
            },
            "Centre-ville": {
                "target_kg": 32.0,
                "target_megots": 2200,
                "actions": [
                    {"nom": "Equipe matin", "type_lieu": "Rue passante", "adresse": "Place de la Republique, Paris", "megots": 620, "dechets_kg": 7.4, "lat": 48.867, "lon": 2.363, "est_propre": False},
                    {"nom": "Equipe midi", "type_lieu": "Rue passante", "adresse": "Boulevard du Temple, Paris", "megots": 540, "dechets_kg": 6.1, "lat": 48.866, "lon": 2.366, "est_propre": False},
                    {"nom": "Equipe soir", "type_lieu": "Abords transport", "adresse": "Station Oberkampf, Paris", "megots": 460, "dechets_kg": 5.6, "lat": 48.864, "lon": 2.37, "est_propre": False},
                ],
            },
        }
        tpl_cols = st.columns(3)
        for idx, (tpl_name, tpl_data) in enumerate(sandbox_templates.items()):
            with tpl_cols[idx]:
                if st.button(f"Charger {tpl_name}", key=f"sandbox_tpl_{tpl_name}", use_container_width=True):
                    start_idx = len(st.session_state["sandbox_actions"])
                    for offset, action_tpl in enumerate(tpl_data["actions"]):
                        draft_row = dict(action_tpl)
                        draft_row["id"] = f"draft_{start_idx + offset}"
                        st.session_state["sandbox_actions"].append(draft_row)
                    st.session_state["sb_target_kg"] = float(tpl_data["target_kg"])
                    st.session_state["sb_target_megots"] = int(tpl_data["target_megots"])
                    st.success(f"Template {tpl_name} charge.")
                    st.rerun()
        st.caption("Utilisez un template pour simuler rapidement une intervention type (ecole, parc, centre-ville).")
        st.markdown("---")

        st.subheader("Simuler une action")
        with st.form("sandbox_form"):
            sb_nom = st.text_input("Pseudo fictif", value="Testeur")
            sb_type = st.selectbox("Type de lieu", TYPE_LIEU_OPTIONS)
            sb_loc = st.text_input("Emplacement (Adresse ou GPS)", value="48.8584, 2.2945")
            sb_weight = st.number_input("Poids mégots (g)", min_value=0.0, value=50.0)
            sb_cond = st.selectbox("État mégots", ["Sec", "Mélangé / Impuretés", "Humide"])
            sb_kg = st.number_input("Déchets (total kg)", min_value=0.0, value=1.5)
            sb_propre = st.checkbox("Signaler comme zone propre")
            
            sb_submit = st.form_submit_button("Ajouter au brouillon")
            
            if sb_submit:
                lat, lon, res_addr = geocode_and_resolve(sb_loc)
                coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
                m_count = int(sb_weight / coeffs[sb_cond]) if sb_weight > 0 else 0
                
                new_draft = {
                    "id": f"draft_{len(st.session_state['sandbox_actions'])}",
                    "nom": sb_nom,
                    "type_lieu": sb_type,
                    "adresse": res_addr,
                    "megots": 0 if sb_propre else m_count,
                    "dechets_kg": 0.0 if sb_propre else sb_kg,
                    "lat": lat or 48.85, 
                    "lon": lon or 2.35,
                    "est_propre": sb_propre
                }
                st.session_state['sandbox_actions'].append(new_draft)
                st.success("Action ajoutée au brouillon !")
                st.rerun()

        if st.button("Vider le brouillon"):
            st.session_state['sandbox_actions'] = []
            st.rerun()

        st.markdown("---")
        st.subheader("Simulateur mission fictive")
        if "sb_target_kg" not in st.session_state:
            st.session_state["sb_target_kg"] = 20.0
        if "sb_target_megots" not in st.session_state:
            st.session_state["sb_target_megots"] = 1500
        target_kg = st.number_input("Objectif mission (kg)", min_value=1.0, step=1.0, key="sb_target_kg")
        target_megots = st.number_input("Objectif mission (mégots)", min_value=0, step=100, key="sb_target_megots")
        drafted_df = pd.DataFrame(st.session_state['sandbox_actions'])
        done_kg = float(drafted_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0.0
        done_megots = int(drafted_df.get('megots', pd.Series(dtype=float)).fillna(0).sum()) if not drafted_df.empty else 0
        completion = min(((done_kg / target_kg) + (done_megots / max(target_megots, 1))) / 2 * 100, 100)
        st.progress(int(completion))
        st.caption(f"Completion rate mission fictive: {completion:.1f}% - {done_kg:.1f}/{target_kg:.1f} kg, {done_megots}/{target_megots} mégots")

    with col_sb2:
        st.subheader("Carte de test")
        # Carte simplifiée pour le sandbox
        m_sb = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
        
        for act in st.session_state['sandbox_actions']:
            if act['lat'] and act['lon']:
                color = "green" if act['est_propre'] else "blue"
                folium.Marker(
                    [act['lat'], act['lon']],
                    popup=f"<b>{act['type_lieu']}</b><br>Mégots: {act['megots']}<br>Kg: {act['dechets_kg']}",
                    icon=folium.Icon(color=color, icon='info-sign')
                ).add_to(m_sb)
        
        st_folium(m_sb, width=600, height=500, key="sandbox_map")
