import streamlit as st


def show_partners():
    st.header("Acteurs engagés à Paris")
    st.write(
        "Découvrez une sélection d'associations et de commerçants engagés "
        "socialement, humanitairement et écologiquement sur le territoire parisien."
    )

    st.divider()

    # Associations écologiques
    st.subheader("🌿 Associations écologiques")
    col1, col2 = st.columns(2)

    with col1:
        st.markdown(
            """
            **Zero Waste Paris**  
            Association citoyenne dédiée au **zéro déchet et zéro gaspillage** à Paris et en Île‑de‑France.  
            - Ateliers et conférences sur la réduction des déchets  
            - Accompagnement des collectivités et entreprises  
            - Campagnes de sensibilisation dans les quartiers et les écoles  

            [Site web](https://zerowasteparis.fr/)
            """
        )

        st.markdown(
            """
            **Surfrider Paris – Groupe Local**  
            Antenne locale de Surfrider Foundation Europe qui agit **à la source des pollutions** océaniques.  
            - Collectes de déchets et caractérisation scientifique  
            - Actions de plaidoyer auprès des décideurs  
            - Interventions pédagogiques sur le cycle de l'eau et les micro‑plastiques  

            [Site web](https://www.surfrider-paris.fr/)
            """
        )

    with col2:
        st.markdown(
            """
            **Paris Zéro Déchet**  
            Collectif d'habitants et bénévoles qui organise des cleanwalks, ateliers DIY et actions de plaidoyer.  
            - Ramassages citoyens dans les parcs et quartiers  
            - Animations autour du réemploi et du vrac  
            - Sensibilisation des commerçants de proximité  
            """
        )

        st.markdown(
            """
            **Les Brigades Vertes**  
            Réseau qui porte la plateforme *Clean my Map* et coordonne les actions de soin des lieux (cleanwalks, "
            "zones propres, accompagnement des territoires).  
            - Organisation de tournées de dépollution  
            - Production de données d'impact pour les collectivités  
            - Accompagnement des associations locales  
            """
        )

    st.divider()

    # Associations sociales & humanitaires
    st.subheader("🤝 Associations sociales & humanitaires")
    col3, col4 = st.columns(2)

    with col3:
        st.markdown(
            """
            **Secours populaire français – Fédération de Paris**  
            Acteur majeur de la **solidarité contre la pauvreté et l'exclusion**.  
            - Aides alimentaires et vestimentaires  
            - Accompagnement scolaire et accès aux vacances  
            - Actions de solidarité en France et à l'international  

            [Site web](https://www.secourspopparis.org/)
            """
        )

        st.markdown(
            """
            **Les Restos du Cœur – Paris**  
            Association de lutte contre la précarité alimentaire et l'isolement.  
            - Distributions de repas  
            - Accompagnement vers l'emploi et les droits  
            - Actions spécifiques auprès des publics sans‑abri  
            """
        )

    with col4:
        st.markdown(
            """
            **Emmaüs**  
            Mouvement d'**économie solidaire** et de lutte contre l'exclusion.  
            - Boutiques solidaires et recycleries  
            - Accueil et hébergement de personnes en situation de grande précarité  
            - Réemploi massif d'objets pour réduire les déchets  

            [Site web](https://emmaus-france.org/)
            """
        )

        st.markdown(
            """
            **La Cloche (Paris)**  
            Association qui crée du lien entre habitants avec et sans domicile.  
            - Mise en réseau de commerces bienveillants  
            - Actions de convivialité dans l'espace public  
            - Sensibilisation des riverains à la grande précarité  
            """
        )

    st.divider()

    # Commerçants engagés
    st.subheader("⭐ Commerçants engagés (carte)")
    st.write(
        "Sur la carte interactive, les **établissements engagés** apparaissent avec une icône en forme d'étoile dorée. "
        "Ils correspondent à des cafés, commerces, lieux culturels ou tiers‑lieux signalés via le formulaire "
        "*« Établissement Engagé (Label) »*."
    )

    st.info(
        "Pour ajouter un commerçant engagé, utilisez l'onglet **Déclaration bénévole**, choisissez "
        "**« Établissement Engagé (Label) »** comme type de lieu, puis décrivez ses actions "
        "(zéro déchet, solidarité, circuits courts, etc.)."
    )

    st.markdown(
        """
        Quelques exemples de profils de commerçants engagés que l'on peut valoriser sur la carte :  
        - Épiceries vrac ou zéro déchet  
        - Cafés solidaires ou à prix libre  
        - Librairies de quartier impliquées dans des collectes solidaires  
        - Tiers‑lieux qui hébergent des ateliers de réparation ou de réemploi  
        """
    )

