import streamlit as st
import os

def show_resources():
    st.header("Le guide du citoyen vert")
    st.write("Retrouvez ici toutes les ressources pour comprendre votre impact et agir au quotidien pour la planète.")
    
    # --- 1. IMPACT DES DÉCHETS ---
    with st.container():
        st.subheader("1. L'impact silencieux des mégots")
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/infographie_ademe_megot.png", 
                     caption="cycle de pollution (source: ademe)",
                     use_container_width=True)
        
        with col2:
            st.markdown("""
            **Le saviez-vous ?** Un seul mégot jeté au sol peut contaminer jusqu'à **1000 litres d'eau**. 
            Il contient plus de 4000 substances chimiques toxiques et met jusqu'à 15 ans à se décomposer.
            
            **Le cycle de pollution :**
            - Jeté dans le caniveau, emporté par les eaux de pluie.
            - Arrive dans les cours d'eau puis l'océan.
            - Libère nicotine, métaux lourds et micro-plastiques.
            """)
            st.link_button("Consulter l'étude ADEME", "https://librairie.ademe.fr/recherche?search_query=megots")

    st.divider()

    # --- 2. GUIDE DU TRI ---
    with st.container():
        st.subheader("2. Le guide du tri local")
        col3, col4 = st.columns([1, 2])
        
        with col3:
            st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/consignes_tri_generique.png", 
                     caption="consignes de tri",
                     use_container_width=True)
            
        with col4:
            regime_tri = st.selectbox("Choisissez votre zone :", ["Paris", "Yvelines"])
            
            if regime_tri == "Paris":
                st.info("Bac jaune : tous les emballages")
                st.write("À Paris, on trie tout : plastiques, métaux, cartons et papiers vont ensemble.")
                st.markdown("[Détails sur paris.fr](https://www.paris.fr/pages/le-tri-des-dechets-205)")
            else:
                st.info("Yvelines (Versailles / Saint-Germain) : extension du tri")
                st.write("Dans les Yvelines, la règle est simplifiée : 100 % des emballages ménagers dans le bac jaune.")
                st.markdown("[Détails sur Versailles Grand Parc](https://www.versaillesgrandparc.fr/gestion-des-dechets/consignes-de-tri)")
            
            st.link_button("Guide complet de Citeo", "https://www.citeo.com/le-guide-du-tri")

    st.divider()

    # --- 3. ÉCO-GESTES ---
    with st.container():
        st.subheader("3. Éco-gestes et sobriété")
        col5, col6 = st.columns([1, 2])
        
        with col5:
            st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/eco_gestes_maison.png", 
                     caption="Gestes du quotidien",
                     use_container_width=True)
             
        with col6:
            st.markdown("""
            **Agissez sur votre consommation :**
            - **Chauffage** : -1 °C = **7 % d'économie** sur votre facture.
            - **Numérique** : éteignez vos box la nuit et veillez sur vos boîtes mail.
            - **Alimentation** : privilégiez le vrac et les produits de saison locaux.
            - **Eau** : installez des mousseurs pour veiller sur la ressource sans perte de confort.
            """)
            st.link_button("Plus de conseils ADEME", "https://agirpourlatransition.ademe.fr/particuliers/")

    st.divider()

    # --- 4. SÉCURITÉ ET BONNES PRATIQUES EN CLEANWALK ---
    with st.container():
        st.subheader("4. Sécurité et bonnes pratiques en cleanwalk")
        col7, col8 = st.columns([1, 2])

        with col7:
            st.image(
                "https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/cleanwalk_securite.png",
                caption="Sécurité sur le terrain",
                use_container_width=True,
            )

        with col8:
            st.markdown("""
            **Avant de partir :**
            - Informez un référent ou l'organisateur de votre présence.
            - Privilégiez des gants adaptés et, si possible, des pinces.

            **Pendant l'action :**
            - Ne manipulez pas d'objets tranchants ou suspects sans équipement adapté.
            - Restez visibles (gilet fluorescent) et prudents près de la circulation.

            **Après l'action :**
            - Hydratez-vous, lavez-vous les mains et faites un court débrief avec l'équipe.
            """)
