import streamlit as st
import pandas as pd

def render_recycling_tab(ctx):
    """
    Renders the 'Recycling' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    get_submissions_by_status = ctx['get_submissions_by_status']
    all_imported_actions = ctx['all_imported_actions']
    IMPACT_CONSTANTS = ctx['IMPACT_CONSTANTS']

    render_tab_header(
        icon="♻️",
        title_fr="Guide de Tri",
        title_en="Sorting Guide",
        subtitle_fr="Donnez une seconde vie à vos récoltes et localisez les points de collecte adaptés.",
        subtitle_en="Give a second life to your collections and locate suitable collection points.",
        chips=[i18n_text("Impact", "Impact"), i18n_text("Pédagogie", "Education")],
        compact=True,
    )

    
    db_approved = get_submissions_by_status('approved')
    public_actions = all_imported_actions + db_approved
    public_df = pd.DataFrame(public_actions)
    
    if public_df.empty:
        st.info("Aucune donnée disponible pour l'instant.")
    else:
        total_megots = public_df.get('megots', pd.Series(dtype=int)).fillna(0).sum()
        tot_dechets = public_df.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
        
        # Nouvelles équivalences "Grand Public"
        bouteilles_evitees = int(tot_dechets * 33)
        eau_preservee = int(total_megots * IMPACT_CONSTANTS.get('EAU_PROTEGEE_PER_MEGOT_L', 500))
        
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### 🌍 Impact Réel de la Communauté")
        col_r1, col_r2, col_r3 = st.columns(3)
        
        with col_r1:
            st.metric(label="💧 Eau Préservée", value=f"{eau_preservee:,} L", help="1 seul mégot peut polluer jusqu'à 500 litres d'eau.")
        with col_r2:
            st.metric(label="📍 Équivalent Bouteilles", value=f"{bouteilles_evitees:,}", help="1 kg de déchets équivaut environ au poids de 33 bouteilles plastiques de 1.5L.")
        with col_r3:
            st.metric(label="🚗 CO₂ évité", value="Calcul en cours...", help="Estimation basée sur le cycle de vie des matériaux collectés.")
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### Points de collecte locaux par type de déchet")
        recycling_points = pd.DataFrame(
            [
                {"ville": "Paris", "type_dechet": "Megots", "point": "Mairie 10e - Borne mego", "adresse": "72 rue du Faubourg Saint-Martin", "infos": "Depot libre 8h-19h"},
                {"ville": "Paris", "type_dechet": "Plastiques", "point": "Recyparc Bercy", "adresse": "48 quai de Bercy", "infos": "Tri et plastique souple"},
                {"ville": "Paris", "type_dechet": "Verre", "point": "Borne verre Republique", "adresse": "Place de la Republique", "infos": "Acces 24/7"},
                {"ville": "Paris", "type_dechet": "Metal", "point": "Ressourcerie La Petite Rockette", "adresse": "125 rue du Chemin Vert", "infos": "Reemploi et valorisation"},
                {"ville": "Montreuil", "type_dechet": "Plastiques", "point": "Decheterie Murs-a-Peches", "adresse": "127 rue Pierre de Montreuil", "infos": "Tri municipal"},
                {"ville": "Versailles", "type_dechet": "Verre", "point": "Point Tri Chantiers", "adresse": "Rue des Chantiers", "infos": "Verre uniquement"},
            ]
        )
        rc1, rc2 = st.columns([1.2, 2.8], gap="small")
        with rc1:
            selected_type = st.selectbox(
                "Type de déchet",
                options=["Tous", "Megots", "Plastiques", "Verre", "Metal"],
                key="recycling_type_filter",
            )
            selected_city = st.text_input("Ville / zone", value="Paris", key="recycling_city_filter")
        with rc2:
            filtered_points = recycling_points.copy()
            if selected_type != "Tous":
                filtered_points = filtered_points[filtered_points["type_dechet"] == selected_type]
            if selected_city.strip():
                filtered_points = filtered_points[filtered_points["ville"].str.contains(selected_city.strip(), case=False, na=False)]
            if filtered_points.empty:
                st.info("Aucun point de collecte trouve pour ce filtre.")
            else:
                st.dataframe(filtered_points, hide_index=True, width="stretch")
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### Tutoriels courts (2 min)")
        tutorial_col1, tutorial_col2, tutorial_col3 = st.columns(3)
        with tutorial_col1:
            st.markdown("**1) Tri express sur le terrain**")
            st.caption("Separez rapidement: megots / verre / metal / plastiques pour un bilan exploitable.")
        with tutorial_col2:
            st.markdown("**2) Securiser la collecte**")
            st.caption("Gants, pinces, sacs doubles et point de regroupement avant pesage.")
        with tutorial_col3:
            st.markdown("**3) Depot au bon endroit**")
            st.caption("Deposez chaque flux dans le point adapte et conservez une photo de tracabilite.")
        st.markdown('</div>', unsafe_allow_html=True)
             
        st.markdown('<div class="premium-card animate-in">', unsafe_allow_html=True)
        st.markdown("### 💧 Le Saviez-vous ?")
        
        z1, z2 = st.columns(2)
        with z1:
            st.info("**Recyclage vs Décyclage** : Le verre se recycle à l'infini, mais le plastique perd souvent en qualité, c'est le *downcycling*.")
        with z2:
            st.success("**Le Poids des Mégots** : Un seul mégot contient des milliers de substances chimiques nocives qui mettent 12 ans à se décomposer.")
        st.markdown('</div>', unsafe_allow_html=True)
            
        with st.expander("📍 Énergie Primaire vs Électricité"):
            st.write('''
            On confond souvent les deux ! 
            - **L'électricité** n'est pas une source, c'est un *vecteur* (un moyen de la transporter). 
            - **L'énergie primaire** est ce que l'on extrait de la nature (Pétrole, Vent, Soleil, Uranium, Charbon).
            
            Recycler de l'aluminium (canettes) permet d'économiser **jusqu'à 95%** de l'énergie primaire nécessaire pour l'extraire de la mine (la bauxite), limitant ainsi la destruction d'écosystèmes.
            ''')
            
        with st.expander("🌍 Qu'est-ce que l'ACV (Analyse du Cycle de Vie) ?"):
            st.write('''
            L'Analyse du Cycle de Vie est la méthode d'évaluation environnementale systémique :
            1. **L'Extraction** des matières premières (Le *Sac à Dos Écologique*, c'est-à-dire les milliers de litres d'eau et matériaux invisibles déplacés).
            2. **La Fabrication** en usine.
            3. **Le Transport** et la logistique.
            4. **L'Utilisation**, parfois gourmande en énergie.
            5. **La Fin de vie**, ou les déchets deviennent de la pollution ou retournent dans la boucle matérielle via le recyclage.
            ''')
            
        with st.expander("💧 Microplastiques : Invisible et Universel"):
            st.write('''
            Lorsqu'un plastique se dégrade dans la nature, il ne disparait jamais : il se fragmente en **microplastiques** sous l'effet du soleil (UV) et des frottements.
            Ces particules intègrent la chaine alimentaire. On estime que chaque humain ingère **l'équivalent d'une carte de crédit en plastique par semaine** (soit environ 5 grammes) via l'eau potable, le sel et l'alimentation.
            ''')
