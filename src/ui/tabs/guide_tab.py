import streamlit as st

def render_guide_tab(ctx):
    """
    Renders the 'Guide' tab. Consolidates logic from previous resources.py.
    """
    render_tab_header = ctx['render_tab_header']

    render_tab_header(
        icon="\U0001F4DA",
        title_fr="Guide pratique",
        title_en="Practical Guide",
        subtitle_fr="Retrouvez les ressources utiles pour agir efficacement sur le terrain.",
        subtitle_en="Find practical resources to act effectively in the field.",
        compact=True,
    )

    # --- 1. ONBOARDING ---
    st.subheader("Onboarding nouveau bénévole (2 minutes)")
    g1, g2 = st.columns([2, 1])
    with g1:
        st.markdown(
            "1. **Choisir une mission**: ouvrez `Carte Interactive` et appliquez un preset de filtres.\n"
            "2. **Déclarer votre action**: complétez le formulaire progressif en 3 étapes.\n"
            "3. **Rester engagé**: suivez `Notre Impact` et utilisez `reprendre mon action`."
        )
        done_steps = 0
        done_steps += 1 if st.checkbox("Je sais trouver une mission proche", key="guide_step_mission") else 0
        done_steps += 1 if st.checkbox("Je sais déclarer une action complète", key="guide_step_declare") else 0
        done_steps += 1 if st.checkbox("Je sais suivre mon impact perso", key="guide_step_impact") else 0
        st.progress(done_steps / 3)
        st.caption(f"Progression onboarding: {done_steps}/3")
    with g2:
        st.metric("Temps estimé", "2 min")
        st.info("Objectif: rendre le premier passage simple, clair et rapide.")
        if st.button("Réinitialiser l'onboarding", key="reset_onboarding_guide", use_container_width=True):
            for step_key in ["guide_step_mission", "guide_step_declare", "guide_step_impact"]:
                st.session_state[step_key] = False
            st.rerun()

    st.markdown("---")
    st.subheader("Ressources détaillées")

    # --- 2. IMPACT DES DÉCHETS (from resources.py) ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("1. L'impact silencieux des mégots")
    col1, col2 = st.columns([1, 2])
    with col1:
        st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/infographie_ademe_megot.png", 
                    caption="Cycle de pollution (Source: ADEME)",
                    width="stretch")
    with col2:
        st.markdown("""
        **Le saviez-vous ?** Un seul mégot jeté au sol peut contaminer jusqu'à **1000 litres d'eau**. 
        Il contient plus de 4000 substances chimiques toxiques et met jusqu'à 15 ans à se décomposer.
        
        **Le cycle de pollution :**
        - Jeté dans le caniveau, emporté par les eaux de pluie.
        - Arrive dans les cours d'eau puis l'océan.
        - Libère nicotine, métaux lourds et micro-plastiques.
        """)
        st.link_button("Consulter l'étude ADEME", "https://librairie.ademe.fr/recherche?search_query=megots", width="stretch")
    st.markdown('</div>', unsafe_allow_html=True)

    # --- 3. GUIDE DU TRI ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("2. Le guide du tri local")
    col3, col4 = st.columns([1, 2])
    with col3:
        st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/consignes_tri_generique.png", 
                    caption="Consignes de tri",
                    width="stretch")
    with col4:
        regime_tri = st.selectbox("Choisissez votre zone :", ["Paris", "Yvelines"], key="resource_tri_zone")
        if regime_tri == "Paris":
            st.info("💡 **Bac jaune :** tous les emballages. À Paris, on trie tout : plastiques, métaux, cartons et papiers vont ensemble.")
        else:
            st.info("💡 **Yvelines :** extension du tri simplifiée : 100 % des emballages ménagers dans le bac jaune.")
        st.link_button("Guide complet de Citeo", "https://www.citeo.com/le-guide-du-tri", width="stretch")
    st.markdown('</div>', unsafe_allow_html=True)

    # --- 4. ÉCO-GESTES ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("3. Éco-gestes et sobriété")
    col5, col6 = st.columns([1, 2])
    with col5:
        st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/eco_gestes_maison.png", 
                    caption="Gestes du quotidien",
                    width="stretch")
    with col6:
        st.markdown("""
        **Agissez sur votre consommation :**
        - **Chauffage** : -1 °C = **7 % d'économie** sur votre facture.
        - **Numérique** : éteignez vos box la nuit et veillez sur vos boîtes mail.
        - **Alimentation** : privilégiez le vrac et les produits de saison locaux.
        - **Eau** : installez des mousseurs pour veiller sur la ressource sans perte de confort.
        """)
        st.link_button("Plus de conseils ADEME", "https://agirpourlatransition.ademe.fr/particuliers/", width="stretch")
    st.markdown('</div>', unsafe_allow_html=True)

    # --- 5. SÉCURITÉ ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("4. Sécurité en Cleanwalk")
    col7, col8 = st.columns([1, 2])
    with col7:
        st.image(
            "https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/cleanwalk_securite.png",
            caption="Sécurité sur le terrain",
            width="stretch",
        )
    with col8:
        st.markdown("""
        **Avant de partir :** Informez un référent et munissez-vous de gants.
        **Pendant l'action :** Ne manipulez pas d'objets suspects. Restez visibles.
        **Après l'action :** Lavez-vous bien les mains et hydratez-vous.
        """)
    st.markdown('</div>', unsafe_allow_html=True)
