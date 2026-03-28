import streamlit as st
import uuid
import pandas as pd
from datetime import date, datetime
import os

def render_declaration_tab(ctx):
    """
    Renders the 'Declaration' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    render_ui_callout = ctx['render_ui_callout']
    i18n_text = ctx['i18n_text']
    check_pseudo = ctx.get('check_pseudo', "")
    lieu_prefill = ctx.get('lieu_prefill', "")
    TYPE_LIEU_OPTIONS = ctx['TYPE_LIEU_OPTIONS']
    get_weight_conversion_hints = ctx['get_weight_conversion_hints']
    geocode_and_resolve = ctx['geocode_and_resolve']
    fuzzy_address_match = ctx['fuzzy_address_match']
    calculate_scores = ctx['calculate_scores']
    insert_submission = ctx['insert_submission']
    add_subscriber = ctx['add_subscriber']
    validate_submission_inputs = ctx['validate_submission_inputs']
    validate_feedback_input = ctx['validate_feedback_input']
    add_volunteer_feedback = ctx['add_volunteer_feedback']
    track_ux_issue = ctx['track_ux_issue']
    save_uploaded_image = ctx['save_uploaded_image']
    get_messages = ctx['get_messages']
    add_message = ctx['add_message']
    get_user_badge = ctx['get_user_badge']
    all_imported_actions = ctx['all_imported_actions']
    get_submissions_by_status = ctx['get_submissions_by_status']
    main_user_email = ctx.get('main_user_email', "")

    render_tab_header(
        icon="\U0001F3AF",
        title_fr="Déclarer une action",
        title_en="Declare an Action",
        subtitle_fr="Soumettez une récolte, un lieu propre ou un acteur engagé via un formulaire structuré et guidé.",
        subtitle_en="Submit a cleanup, a clean area, or an engaged actor using a clear and guided form.",
        chips=[i18n_text("Formulaire", "Form"), i18n_text("Qualité", "Data quality")],
        compact=True,
    )
    render_ui_callout(
        icon="✅",
        title_fr="Déclaration en 3 étapes",
        title_en="3-step submission",
        body_fr="Renseignez d'abord le profil et le lieu, puis les quantités d'impact, avant une validation finale pour sécuriser la qualité des données.",
        body_en="Start with profile and location, then impact quantities, and finish with final validation to secure data quality.",
        tone="success",
    )
    st.divider()

    draft = st.session_state.get("submission_draft", {})

    def _seed_decl_value(key, value):
        if key not in st.session_state:
            st.session_state[key] = value

    _seed_decl_value("decl_action_type", draft.get("action_type", "Ajouter une recolte"))
    _seed_decl_value("decl_nom", draft.get("nom", check_pseudo if check_pseudo else ""))
    _seed_decl_value("decl_association", draft.get("association", ""))
    _seed_decl_value("decl_type_lieu", draft.get("type_lieu", TYPE_LIEU_OPTIONS[0]))
    _seed_decl_value("decl_type_acteur", draft.get("type_acteur", "Association ecologique"))
    _seed_decl_value("decl_emplacement", draft.get("emplacement_brut", lieu_prefill if lieu_prefill else ""))
    _seed_decl_value("decl_emplacement_fin", draft.get("emplacement_fin_brut", ""))
    _seed_decl_value("decl_benevoles", int(draft.get("benevoles", 1)))
    _seed_decl_value("decl_temps_min", int(draft.get("temps_min", 60)))
    _seed_decl_value("decl_m_weight", float(draft.get("m_weight", 0.0)))
    _seed_decl_value("decl_m_condition", draft.get("m_condition", "Mélangé / Impuretés"))
    _seed_decl_value("decl_dechets_kg", float(draft.get("dechets_kg", 0.0)))
    _seed_decl_value("decl_commentaire", draft.get("commentaire", ""))
    _seed_decl_value("decl_newsletter", bool(draft.get("subscribe_newsletter", True)))
    _seed_decl_value("decl_news_email", draft.get("user_email", ""))
    _seed_decl_value("decl_step", "1. Profil & lieu")
    _seed_decl_value("decl_action_date", date.today())

    st.caption("Brouillon auto actif : vos champs sont sauvegardés en continu.")
    progress_step = st.radio(
        "Progression",
        ["1. Profil & lieu", "2. Donnees d'impact", "3. Validation"],
        horizontal=False,
        key="decl_step",
        format_func=lambda s: {
            "1. Profil & lieu": "1. Profil & lieu",
            "2. Donnees d'impact": "2. Données d'impact",
            "3. Validation": "3. Validation",
        }.get(s, s),
    )
    step_status = {
        "1. Profil & lieu": "🟢" if progress_step == "1. Profil & lieu" else "⚪",
        "2. Donnees d'impact": "🟢" if progress_step == "2. Donnees d'impact" else "⚪",
        "3. Validation": "🟢" if progress_step == "3. Validation" else "⚪",
    }
    step2_key = "2. Donnees d'impact"
    st.caption(f"{step_status['1. Profil & lieu']} Étape 1 : identité, date, lieu")
    st.caption(f"{step_status[step2_key]} Étape 2 : quantités et contexte")
    st.caption(f"{step_status['3. Validation']} Étape 3 : vérification finale")

    action_type = st.radio(
        "Que souhaitez-vous faire ?",
        ["Ajouter une recolte", "Declarer un lieu propre", "Declarer un acteur engage"],
        horizontal=False,
        key="decl_action_type",
        format_func=lambda s: {
            "Ajouter une recolte": "Ajouter une récolte",
            "Declarer un lieu propre": "Déclarer un lieu propre",
            "Declarer un acteur engage": "Déclarer un acteur engagé",
        }.get(s, s),
    )
    zone_propre = (action_type == "Declarer un lieu propre")
    acteur_engage = (action_type == "Declarer un acteur engage")

    if progress_step == "1. Profil & lieu":
        st.text_input("Votre prenom / pseudo", key="decl_nom", placeholder="Ex: Sarah")
        if not zone_propre:
            st.text_input("Association*", key="decl_association", placeholder="Ex: Clean Walk Paris 10")
        st.date_input("Date de l'action*", key="decl_action_date", max_value=date.today())
        st.text_input(
            "Emplacement (Adresse ou GPS)*",
            key="decl_emplacement",
            placeholder="Ex: 48.8584, 2.2945 ou Tour Eiffel, Paris",
        )
        st.text_input(
            "Adresse de fin d'action (optionnel)",
            key="decl_emplacement_fin",
            placeholder="Ex: Place de la République, Paris",
        )
        st.caption("Si renseignée, la carte reliera automatiquement le point de départ et le point d'arrivée.")

        if acteur_engage:
            st.selectbox(
                "Type d'acteur*",
                ["Association ecologique", "Association humanitaire et sociale", "Commercant engage"],
                key="decl_type_acteur",
                format_func=lambda s: {
                    "Association ecologique": "Association écologique",
                    "Association humanitaire et sociale": "Association humanitaire et sociale",
                    "Commercant engage": "Commerçant engagé",
                }.get(s, s),
            )
        elif zone_propre:
            st.info("Mode lieu propre : les métriques de déchets seront renseignées à zéro.")
        else:
            st.selectbox("Type de lieu*", TYPE_LIEU_OPTIONS, key="decl_type_lieu")

    elif progress_step == "2. Donnees d'impact":
        if acteur_engage:
            st.text_area("Actions & Engagement (optionnel)", key="decl_commentaire", placeholder="Décrivez pourquoi cet acteur est engagé.")
        elif zone_propre:
            st.text_area("Commentaire (optionnel)", key="decl_commentaire", placeholder="Précisions sur le lieu propre.")
        else:
            st.number_input("Nombre de bénévoles*", min_value=1, step=1, key="decl_benevoles")
            st.number_input("Durée (minutes)*", min_value=1, step=5, key="decl_temps_min")
            st.number_input("Poids total mégots (grammes)", min_value=0.0, step=10.0, key="decl_m_weight")
            st.selectbox("État des mégots", ["Sec", "Mélangé / Impuretés", "Humide"], key="decl_m_condition")
            coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
            m_weight_val = float(st.session_state.get("decl_m_weight", 0.0))
            megots_preview = int(m_weight_val / coeffs[st.session_state.get("decl_m_condition", "Mélangé / Impuretés")]) if m_weight_val > 0 else 0
            if megots_preview > 0:
                st.info(f"Estimation : ~{megots_preview} mégots")
            st.number_input("Déchets (total kg)", min_value=0.0, step=0.5, key="decl_dechets_kg")
            hints = get_weight_conversion_hints(float(st.session_state.get("decl_dechets_kg", 0.0)))
            st.caption(f"⚡ {hints['sacs_30l']} sacs 30L | ⚡ {hints['bouteilles_1_5l']} bouteilles 1.5L")
            st.text_area("Commentaire (optionnel)", key="decl_commentaire")

    else:
        st.subheader("Validation finale")
        st.checkbox("Recevoir la gazette des brigades", key="decl_newsletter")
        if st.session_state.get("decl_newsletter", True):
            st.text_input("Votre adresse email pour la gazette*", key="decl_news_email", placeholder="ex: camille@ecologie.fr")

        recap_type_lieu = (
            "Signalement Proprete"
            if zone_propre
            else st.session_state.get("decl_type_acteur", "")
            if acteur_engage
            else st.session_state.get("decl_type_lieu", "")
        )
        st.markdown(
            f"- **Type**: {action_type}\n"
            f"- **Lieu**: {st.session_state.get('decl_emplacement', '')}\n"
            f"- **Lieu de fin**: {st.session_state.get('decl_emplacement_fin', '') or 'Non renseigne'}\n"
            f"- **Categorie**: {recap_type_lieu}\n"
            f"- **Auteur**: {st.session_state.get('decl_nom', '') or 'Anonyme'}"
        )

        if st.button("Partager mon action", key="decl_submit_btn", use_container_width=True):
            nom = str(st.session_state.get("decl_nom", "")).strip()
            association = str(st.session_state.get("decl_association", "")).strip()
            type_lieu = st.session_state.get("decl_type_lieu", TYPE_LIEU_OPTIONS[0])
            action_date = st.session_state.get("decl_action_date", date.today())
            emplacement_brut = str(st.session_state.get("decl_emplacement", "")).strip()
            emplacement_fin_brut = str(st.session_state.get("decl_emplacement_fin", "")).strip()
            commentaire = str(st.session_state.get("decl_commentaire", "")).strip()
            benevoles = int(st.session_state.get("decl_benevoles", 1))
            temps_min = int(st.session_state.get("decl_temps_min", 1))
            dechets_kg = float(st.session_state.get("decl_dechets_kg", 0.0))
            m_weight = float(st.session_state.get("decl_m_weight", 0.0))
            m_condition = st.session_state.get("decl_m_condition", "Mélangé / Impuretés")
            coeffs = {"Sec": 0.20, "Mélangé / Impuretés": 0.27, "Humide": 0.35}
            megots = int(m_weight / coeffs[m_condition]) if m_weight > 0 else 0
            subscribe_newsletter = bool(st.session_state.get("decl_newsletter", True))
            user_email = str(st.session_state.get("decl_news_email", "")).strip()

            if acteur_engage:
                type_lieu = st.session_state.get("decl_type_acteur", "Association ecologique")
                benevoles, temps_min, megots, dechets_kg = 1, 1, 0, 0.0
            elif zone_propre:
                association = association or "Independant"
                type_lieu = "Signalement Proprete"
                benevoles, temps_min, megots, dechets_kg = 1, 1, 0, 0.0
                commentaire = commentaire or "Zone signalee propre"

            if not emplacement_brut or not type_lieu or (not association and not zone_propre):
                track_ux_issue(
                    event_type="invalid_field",
                    tab_id="declaration",
                    action_name="submit_action",
                    field_name="required_fields",
                    message="Champs obligatoires manquants",
                )
                st.error("Merci de remplir les champs obligatoires.")
            elif subscribe_newsletter and not user_email:
                track_ux_issue(
                    event_type="invalid_field",
                    tab_id="declaration",
                    action_name="submit_action",
                    field_name="newsletter_email",
                    message="Email newsletter manquant",
                )
                st.error("Merci de renseigner votre email pour la gazette.")
            else:
                quality_errors = validate_submission_inputs(
                    {
                        "benevoles": benevoles,
                        "temps_min": temps_min,
                        "megots": megots,
                        "dechets_kg": dechets_kg,
                        "emplacement_brut": emplacement_brut,
                    }
                )
                if quality_errors:
                    for err in quality_errors:
                        track_ux_issue(
                            event_type="invalid_field",
                            tab_id="declaration",
                            action_name="submit_action",
                            field_name="validation_rule",
                            message=str(err),
                        )
                        st.error(err)
                    st.stop()

                with st.spinner("Analyse de l'emplacement..."):
                    lat_depart, lon_depart, adresse_depart_resolue = geocode_and_resolve(emplacement_brut)
                    lat_arrivee, lon_arrivee, adresse_arrivee_resolue = (None, None, "")
                    if emplacement_fin_brut:
                        lat_arrivee, lon_arrivee, adresse_arrivee_resolue = geocode_and_resolve(emplacement_fin_brut)

                if lat_depart is not None and lon_depart is not None and not (-90 <= float(lat_depart) <= 90 and -180 <= float(lon_depart) <= 180):
                    track_ux_issue(
                        event_type="invalid_field",
                        tab_id="declaration",
                        action_name="submit_action",
                        field_name="geocode",
                        message="Coordonnées géocodées incohérentes",
                        payload=emplacement_brut,
                    )
                    st.error("Coordonnees geocodees incoherentes. Verifiez votre saisie.")
                    st.stop()
                if emplacement_fin_brut and lat_arrivee is not None and lon_arrivee is not None and not (-90 <= float(lat_arrivee) <= 90 and -180 <= float(lon_arrivee) <= 180):
                    st.error("Coordonnées de fin incohérentes. Vérifiez la seconde adresse.")
                    st.stop()
                if emplacement_fin_brut and (lat_arrivee is None or lon_arrivee is None):
                    st.warning("La seconde adresse n'a pas pu etre géolocalisée. L'action est enregistrée sur l'adresse principale.")
                    emplacement_fin_brut = ""
                    adresse_arrivee_resolue = ""

                approved_actions = get_submissions_by_status('approved')
                existing_pool = [a.get('adresse') for a in approved_actions if a.get('adresse')]
                adresse_finale = fuzzy_address_match(adresse_depart_resolue, existing_pool)

                data_to_save = {
                    "id": str(uuid.uuid4()),
                    "nom": nom,
                    "association": association,
                    "type_lieu": type_lieu,
                    "adresse": adresse_finale,
                    "adresse_depart": adresse_finale,
                    "adresse_arrivee": adresse_arrivee_resolue if emplacement_fin_brut else None,
                    "date": str(action_date),
                    "benevoles": benevoles,
                    "temps_min": temps_min,
                    "megots": megots,
                    "dechets_kg": dechets_kg,
                    "plastique_kg": 0.0,
                    "verre_kg": 0.0,
                    "metal_kg": 0.0,
                    "gps": f"{lat_depart}, {lon_depart}" if lat_depart is not None and lon_depart is not None else emplacement_brut,
                    "lat": lat_depart,
                    "lon": lon_depart,
                    "lat_depart": lat_depart,
                    "lon_depart": lon_depart,
                    "lat_arrivee": lat_arrivee if emplacement_fin_brut else None,
                    "lon_arrivee": lon_arrivee if emplacement_fin_brut else None,
                    "commentaire": commentaire,
                    "est_propre": zone_propre,
                    "submitted_at": datetime.now().isoformat(),
                }
                data_to_save["eco_points"] = 5 if zone_propre else calculate_scores(data_to_save)['eco_points']
                insert_submission(data_to_save)
                if subscribe_newsletter and user_email:
                    add_subscriber(user_email)

                st.session_state["submission_draft"] = {}
                st.session_state["submission_draft_saved_at"] = None
                for k in list(st.session_state.keys()):
                    if k.startswith("decl_"):
                        del st.session_state[k]
                st.success("Merci ! Votre action a ete enregistree et sera validee par un administrateur.")
                st.balloons()
                st.rerun()

    st.session_state["submission_draft"] = {
        "action_type": st.session_state.get("decl_action_type", "Ajouter une recolte"),
        "nom": st.session_state.get("decl_nom", ""),
        "association": st.session_state.get("decl_association", ""),
        "type_lieu": st.session_state.get("decl_type_lieu", TYPE_LIEU_OPTIONS[0]),
        "type_acteur": st.session_state.get("decl_type_acteur", "Association ecologique"),
        "action_date": str(st.session_state.get("decl_action_date", date.today())),
        "emplacement_brut": st.session_state.get("decl_emplacement", ""),
        "emplacement_fin_brut": st.session_state.get("decl_emplacement_fin", ""),
        "benevoles": st.session_state.get("decl_benevoles", 1),
        "temps_min": st.session_state.get("decl_temps_min", 60),
        "m_weight": st.session_state.get("decl_m_weight", 0.0),
        "m_condition": st.session_state.get("decl_m_condition", "Mélangé / Impuretés"),
        "dechets_kg": st.session_state.get("decl_dechets_kg", 0.0),
        "commentaire": st.session_state.get("decl_commentaire", ""),
        "subscribe_newsletter": st.session_state.get("decl_newsletter", True),
        "user_email": st.session_state.get("decl_news_email", ""),
    }
    st.session_state["submission_draft_saved_at"] = datetime.now().strftime("%H:%M:%S")
    st.caption(f"Brouillon enregistre a {st.session_state['submission_draft_saved_at']}")

    st.divider()
    st.subheader("💡 Suggestions d'amélioration et signalement de bugs")
    st.write(
        "Vous avez repéré un bug ou une idée pour améliorer le site ? "
        "Partagez votre retour ci-dessous pour aider l'équipe à faire évoluer la plateforme."
    )

    with st.form("volunteer_feedback_form", clear_on_submit=True):
        feedback_author = st.text_input("Votre pseudo (optionnel)", placeholder="Ex : camille_verte")
        feedback_type = st.selectbox(
            "Type de retour",
            ["Suggestion d'amélioration", "Bug / problème rencontré"],
            key="feedback_type",
        )
        feedback_text = st.text_area(
            "Votre retour (suggestion, problème ou bug) *",
            placeholder=(
                "Ex : Sur mobile, la carte se recharge quand je change de filtre. "
                "Serait-il possible de garder le niveau de zoom ?"
            ),
            height=150,
        )
        submit_feedback = st.form_submit_button("Envoyer mon retour")

        if submit_feedback:
            feedback_errors = validate_feedback_input(feedback_text)
            if feedback_errors:
                for err in feedback_errors:
                    track_ux_issue(
                        event_type="invalid_field",
                        tab_id="declaration",
                        action_name="submit_feedback",
                        field_name="feedback_text",
                        message=str(err),
                    )
                    st.error(err)
            else:
                feedback_category = "bug" if feedback_type.startswith("Bug") else "suggestion"
                feedback_actor = feedback_author.strip() or main_user_email or "Anonyme"
                add_volunteer_feedback(
                    author=feedback_actor,
                    category=feedback_category,
                    content=feedback_text.strip(),
                )
                track_ux_issue(
                    event_type="warning",
                    tab_id="declaration",
                    action_name="volunteer_feedback_submitted",
                    message=feedback_category,
                )
                st.success("Merci ! Votre retour a bien été envoyé à l'équipe.")

    st.divider()
    st.subheader("📱 Partagez votre exploit avec la communauté !")
    st.write("Maintenant que votre action est déclarée, inspirez les autres brigades en postant un petit mot ou une photo sur le mur public.")
    
    # Récupération des messages
    messages = get_messages()
    
    # Formulaire pour nouveau message
    with st.form("wall_form", clear_on_submit=True):
        pseudo_msg = st.text_input("Votre pseudo", placeholder="Ex : camille_verte")
        contenu_msg = st.text_area("Votre message", placeholder="Merci à l'équipe pour l'action à Versailles !")
        col_upload, col_url = st.columns(2)
        with col_upload:
            fichier_image = st.file_uploader("Ajouter une photo (optionnel)", type=["png", "jpg", "jpeg"])
        with col_url:
            image_url_input = st.text_input("Ou coller l'URL d'une image", placeholder="https://...")
        submit_msg = st.form_submit_button("Partager sur le mur")
        
        if submit_msg:
            if not pseudo_msg.strip() or not contenu_msg.strip():
                st.error("Champs obligatoires manquants.")
            else:
                from src.ui.map_builder import save_uploaded_image # Re-import or use ctx
                saved_image_path = save_uploaded_image(fichier_image, prefix="wall")
                final_image_url = image_url_input.strip() or saved_image_path
                add_message(pseudo_msg.strip(), contenu_msg.strip(), final_image_url)
                st.success("Message publié !")
                st.rerun()

    st.divider()
    
    # Affichage des messages avec badges
    if not messages:
        st.info("Soyez le premier à poster un message !")
    else:
        # On a besoin des actions pour calculer les badges
        db_approved = get_submissions_by_status('approved')
        all_actions_df = pd.DataFrame(all_imported_actions + db_approved)
        
        for m in reversed(messages):  # Plus récent en haut
            pseudo = m.get('author', m.get('pseudo', 'Anonyme'))
            timestamp = m.get('created_at', m.get('timestamp', ''))
            badge = get_user_badge(pseudo, all_actions_df)
            st.markdown(f"**{pseudo}** {badge} • *{timestamp}*")
            st.info(m.get('content', ''))
            img_url = m.get('image_url')
            if img_url:
                try:
                    st.image(img_url, width=None) # width="stretch" was a custom CSS class
                except Exception:
                    st.warning("Impossible d'afficher l'image associée à ce message.")
            st.markdown("---")
