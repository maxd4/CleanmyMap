import streamlit as st
import os

def show_resources():
    st.header("le guide du citoyen vert")
    st.write("retrouvez ici toutes les ressources pour comprendre votre impact et agir au quotidien pour la planète.")
    
    # --- 1. IMPACT DES DÉCHETS ---
    with st.container():
        st.subheader("1. l'impact silencieux des mégots")
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/infographie_ademe_megot.png", 
                     caption="cycle de pollution (source: ademe)",
                     use_container_width=True)
        
        with col2:
            st.markdown("""
            **le saviez-vous ?** un seul mégot jeté au sol peut contaminer jusqu'à **1000 litres d'eau**. 
            il contient plus de 4000 substances chimiques toxiques et met jusqu'à 15 ans à se décomposer.
            
            **le cycle de pollution :**
            - jeté dans le caniveau, emporté par les eaux de pluie.
            - arrive dans les cours d'eau puis l'océan.
            - libère nicotine, métaux lourds et micro-plastiques.
            """)
            st.link_button("consulter l'étude ademe", "https://librairie.ademe.fr/recherche?search_query=megots")

    st.divider()

    # --- 2. GUIDE DU TRI ---
    with st.container():
        st.subheader("2. le guide du tri local")
        col3, col4 = st.columns([1, 2])
        
        with col3:
            st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/consignes_tri_generique.png", 
                     caption="consignes de tri",
                     use_container_width=True)
            
        with col4:
            regime_tri = st.selectbox("choisissez votre zone :", ["paris", "yvelines"])
            
            if regime_tri == "paris":
                st.info("bac jaune : tous les emballages")
                st.write("à paris, on trie tout : plastiques, métaux, cartons et papiers vont ensemble.")
                st.markdown("[détails sur paris.fr](https://www.paris.fr/pages/le-tri-des-dechets-205)")
            else:
                st.info("yvelines (versailles / st-germain) : extension du tri")
                st.write("dans les yvelines, la règle est simplifiée : 100% des emballages ménagers dans le bac jaune.")
                st.markdown("[détails sur versailles grand parc](https://www.versaillesgrandparc.fr/gestion-des-dechets/consignes-de-tri)")
            
            st.link_button("guide complet de citeo", "https://www.citeo.com/le-guide-du-tri")

    st.divider()

    # --- 3. ÉCO-GESTES ---
    with st.container():
        st.subheader("3. éco-gestes et sobrieté")
        col5, col6 = st.columns([1, 2])
        
        with col5:
             st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/eco_gestes_maison.png", 
                     caption="gestes du quotidien",
                     use_container_width=True)
             
        with col6:
            st.markdown("""
            **agissez sur votre consommation :**
            - **chauffage** : -1°c = **7% d'économie** sur votre facture.
            - **numérique** : éteignez vos box la nuit et veillez sur vos boîtes mail.
            - **alimentation** : privilégiez le vrac et les produits de saison locaux.
            - **eau** : installez des mousseurs pour veiller sur la ressource sans perte de confort.
            """)
            st.link_button("plus de conseils ademe", "https://agirpourlatransition.ademe.fr/particuliers/")
