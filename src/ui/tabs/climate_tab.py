import streamlit as st

def render_climate_tab(ctx):
    """
    Renders the 'Climate' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    
    render_tab_header(
        icon="\U0001F30D",
        title_fr="Comprendre le dérèglement climatique",
        title_en="Understanding Climate Disruption",
        subtitle_fr="Une base scientifique claire pour renforcer l'action citoyenne locale.",
        subtitle_en="A clear scientific baseline to strengthen local citizen action.",
        compact=True,
    )
    st.write("Parce qu'agir pour la planète commence par comprendre les enjeux. Voici les informations essentielles validées par la science pour construire votre culture écologique.")

    st.markdown("### Mini fiches pédagogiques actionnables localement")
    climate_cards = [
        {
            "title": "Canicules urbaines",
            "why": "Les ilots de chaleur augmentent les risques sante en ville.",
            "actions": ["Cartographier les zones sans ombre", "Installer des points d'eau et pauses fraicheur", "Planter/entretenir micro-vegetalisation locale"],
        },
        {
            "title": "Ruissellement & dechets",
            "why": "La pluie entraine megots/plastiques vers les egouts puis les cours d'eau.",
            "actions": ["Nettoyages avant episodes pluvieux", "Signaler zones de concentration", "Poser cendriers/corbeilles sur points noirs"],
        },
        {
            "title": "Biodiversite locale",
            "why": "Moins de dechets = moins de stress pour la faune urbaine.",
            "actions": ["Retirer filets, plastiques et dechets coupants", "Proteger zones de nidification", "Suivre mensuellement les zones sensibles"],
        },
        {
            "title": "Engagement quartier",
            "why": "La regularite des actions produit un effet durable.",
            "actions": ["Definir un rendez-vous mensuel fixe", "Mettre en place une equipe referente", "Partager les resultats avec mairie/commercants"],
        },
    ]
    ccl1, ccl2 = st.columns(2, gap="large")
    for i, card in enumerate(climate_cards):
        target_col = ccl1 if i % 2 == 0 else ccl2
        with target_col:
            with st.expander(f"{card['title']}"):
                st.caption(card["why"])
                for act in card["actions"]:
                    st.markdown(f"- {act}")
    
    st.markdown("---")
    
    col_c1, col_c2 = st.columns([1, 1])
    
    with col_c1:
        st.markdown("### 📊 Les Constats du GIEC")
        st.info("Le GIEC (Groupe d'experts intergouvernemental sur l'évolution du climat) synthétise les travaux de milliers de chercheurs à travers le monde.")
        st.write("""
        - **Origine humaine indiscutable :** Le réchauffement actuel (+1.1°C depuis l'ère préindustrielle) est causé sans équivoque par les activités humaines (combustion d'énergies fossiles, déforestation).
        - **Conséquences visibles :** Multiplication des événements extremes (canicules, inondations, sécheresses), montée des eaux, fonte des glaces.
        - **L'urgence d'agir :** Chaque fraction de degré compte. Limiter le réchauffement à 1.5°C au lieu de 2°C permet d'éviter des points de basculement irréversibles.
        """)
        st.image("https://www.statistiques.developpement-durable.gouv.fr/sites/default/files/2019-12/giec-ar5-wg1-spm-fig1-fr_0.png", caption="Évolution de la température mondiale combinée des terres et des océans (Source: Synthèse GIEC)")
        
    with col_c2:
        st.markdown("### 🤝 L'Accord de Paris")
        st.success("Adopté en 2015 lors de la COP21, c'est le premier accord universel sur le climat.")
        st.write("""
        - **Objectif principal :** Maintenir l'augmentation de la température moyenne mondiale bien en dessous de 2°C, et de préférence à 1.5°C, par rapport aux niveaux préindustriels.
        - **Neutralité carbone :** Atteindre l'équilibre entre les émissions et les absorptions de gaz à effet de serre d'ici la deuxième moitié du siècle.
        - **La France :** S'est engagée via la Stratégie Nationale Bas-Carbone (SNBC) à réduire ses émissions d'ici 2050.
        """)
        
    st.markdown("---")
    
    st.markdown("### 🌏 Les 9 Limites Planétaires")
    st.write("Le climat n'est qu'une des 9 limites planétaires définies par le Stockholm Resilience Centre. Dépasser ces limites menace la stabilité de l'écosystème terrestre dont nous dépendons.")
    
    col_l1, col_l2 = st.columns([2, 3])
    with col_l1:
        st.write("""
        Aujourd'hui, **6 des 9 limites sont déjà franchies** au niveau mondial :
        1. 🌡️ Le changement climatique
        2. 🦋 L'érosion de la biodiversité
        3. 🧪 La perturbation des cycles de l'azote et du phosphore
        4. 🌳 Le changement d'usage des sols (déforestation)
        5. 🧪 L'introduction d'entités nouvelles (pollutions chimiques, plastiques)
        6. 💧 L'utilisation de l'eau verte (eau douce dans les sols)
        
        *Le ramassage de déchets agit directement sur la limite 5 (entités nouvelles / plastiques) !*
        """)
    with col_l2:
        st.image("https://www.notre-environnement.gouv.fr/IMG/png/limites_planetaires_2023_-_fr.png", caption="État des 9 limites planétaires en 2023 (Source: Stockholm Resilience Centre / Notre-Environnement.gouv)")
        
    st.markdown("---")
    st.info("💡 **Pour aller plus loin :** Pour approfondir ces sujets, n'hésitez pas à participer à une **Fresque du Climat**, un atelier ludique et collaboratif de 3h basé sur les rapports du GIEC, ou à consulter les rapports de l'ADEME.")
