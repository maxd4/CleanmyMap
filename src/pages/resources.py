import streamlit as st
import os

import streamlit as st
import os

def show_resources():
    st.markdown('<div class="hero-container animate-in">', unsafe_allow_html=True)
    st.markdown('<h1 class="hero-title">🌱 Le Guide du Citoyen Vert</h1>', unsafe_allow_html=True)
    st.markdown('<p class="hero-subtitle">Retrouvez toutes les ressources pour comprendre votre impact et agir au quotidien pour la planète.</p>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    # --- 1. IMPACT DES DÉCHETS ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("1. L'impact silencieux des mégots")
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/infographie_ademe_megot.png", 
                    caption="Cycle de pollution (Source: ADEME)",
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
        st.link_button("Consulter l'étude ADEME", "https://librairie.ademe.fr/recherche?search_query=megots", use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # --- 2. GUIDE DU TRI ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("2. Le guide du tri local")
    col3, col4 = st.columns([1, 2])
    
    with col3:
        st.image("https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/consignes_tri_generique.png", 
                    caption="Consignes de tri",
                    use_container_width=True)
        
    with col4:
        regime_tri = st.selectbox("Choisissez votre zone :", ["Paris", "Yvelines"], key="resource_tri_zone")
        
        if regime_tri == "Paris":
            st.info("💡 **Bac jaune :** tous les emballages. À Paris, on trie tout : plastiques, métaux, cartons et papiers vont ensemble.")
        else:
            st.info("💡 **Yvelines :** extension du tri simplifiée : 100 % des emballages ménagers dans le bac jaune.")
        
        st.link_button("Guide complet de Citeo", "https://www.citeo.com/le-guide-du-tri", use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # --- 3. ÉCO-GESTES ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
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
        st.link_button("Plus de conseils ADEME", "https://agirpourlatransition.ademe.fr/particuliers/", use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # --- 4. SÉCURITÉ ET BONNES PRATIQUES ---
    st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
    st.subheader("4. Sécurité en Cleanwalk")
    col7, col8 = st.columns([1, 2])

    with col7:
        st.image(
            "https://raw.githubusercontent.com/sophi/carte-interactive-clean-walk-main/main/assets/cleanwalk_securite.png",
            caption="Sécurité sur le terrain",
            use_container_width=True,
        )

    with col8:
        st.markdown("""
        **Avant de partir :** Informez un référent et munissez-vous de gants.
        **Pendant l'action :** Ne manipulez pas d'objets suspects. Restez visibles.
        **Après l'action :** Lavez-vous bien les mains et hydratez-vous.
        """)
    st.markdown('</div>', unsafe_allow_html=True)
