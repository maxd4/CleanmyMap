import streamlit as st
import pandas as pd
from datetime import date, timedelta
from src.security_utils import sanitize_html_text

def _normalize_preview(preview) -> dict:
    if hasattr(preview, "as_dict"):
        data = preview.as_dict()
    elif isinstance(preview, dict):
        data = dict(preview)
    else:
        data = {}
    return data

def render_community_tab(ctx):
    """
    Renders the 'Community' tab. Consolidates logic from previous community_validation.py.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    get_events_for_date = ctx['get_events_for_date']
    mark_event_reminder = ctx['mark_event_reminder']
    add_message = ctx['add_message']
    get_community_events = ctx['get_community_events']
    get_event_rsvp_summary = ctx['get_event_rsvp_summary']
    upsert_event_rsvp = ctx['upsert_event_rsvp']
    get_submissions_by_status = ctx['get_submissions_by_status']
    build_pending_public_previews = ctx['build_pending_public_previews']
    add_mission_validation = ctx['add_mission_validation']
    get_mission_validation_summary = ctx['get_mission_validation_summary']
    main_user_email = ctx.get('main_user_email', "")

    render_tab_header(
        icon="🤝",
        title_fr="Rassemblements",
        title_en="Meetups & Community",
        subtitle_fr="Rejoignez des actions locales, coordonnez vos sorties et échangez avec les autres brigades.",
        subtitle_en="Join local actions, coordinate your outings, and chat with other brigades.",
        chips=[i18n_text("Collectif", "Collective"), i18n_text("Événements", "Events")],
        compact=True,
    )


    st.warning("⚠️ **Important** : Pour une organisation officielle et une visibilité maximale, nous vous recommandons vivement de créer également votre évènement sur [cleanwalk.org](https://www.cleanwalk.org).")

    # --- 1. RELANCE AUTOMATIQUE ---
    today_iso = date.today().isoformat()
    tomorrow_iso = (date.today() + timedelta(days=1)).isoformat()
    for ev in get_events_for_date(tomorrow_iso):
        if mark_event_reminder(ev["id"], today_iso):
            add_message(
                "CleanMyMap Bot",
                f"Rappel J-1 : {ev.get('title', 'Sortie')} demain ({ev.get('event_date')}) a {ev.get('location', 'lieu a confirmer')}.",
                None,
            )

    c_evt1, c_evt2 = st.columns([1.4, 2.0], gap="large")
    with c_evt1:
        st.subheader("Calendrier des sorties")
        events = get_community_events(limit=50, include_past=False)
        if events:
            cal_df = pd.DataFrame([
                {"Date": ev.get("event_date"), "Titre": ev.get("title"), "Lieu": ev.get("location"), "Organisateur": ev.get("organizer", "")}
                for ev in events
            ])
            st.dataframe(cal_df, hide_index=True, width="stretch")
        else:
            st.info("Aucune sortie planifiée.")

        with st.form("community_outing"):
            st.subheader("Créer une sortie")
            out_title = st.text_input("Titre de la sortie")
            out_date = st.date_input("Date prévue", value=date.today())
            out_loc = st.text_input("Lieu de rendez-vous")
            out_desc = st.text_area("Description / Matériel nécessaire")
            if st.form_submit_button("Publier l'annonce"):
                if out_title.strip() and out_loc.strip():
                    ctx['add_community_event'](out_title.strip(), str(out_date), out_loc.strip(), out_desc.strip(), organizer=main_user_email)
                    st.success("Sortie publiée.")
                    st.rerun()
                else:
                    st.error("Titre et lieu obligatoires.")

    with c_evt2:
        st.subheader("RSVP participants")
        rsvp_events = get_community_events(limit=10, include_past=False)
        for ev in rsvp_events:
            summary = get_event_rsvp_summary(ev["id"])
            st.markdown(f"**{ev.get('title')}** ({ev.get('event_date')})")
            st.caption(f"Oui: {summary['yes']} | Peut-être: {summary['maybe']} | Non: {summary['no']}")
            rsvp_status = st.selectbox("Votre réponse", ["yes", "maybe", "no"], key=f"rsvp_{ev['id']}")
            if st.button("Enregistrer RSVP", key=f"btn_rsvp_{ev['id']}"):
                upsert_event_rsvp(ev["id"], main_user_email, rsvp_status)
                st.success("RSVP enregistré.")
                st.rerun()
            st.markdown("---")

    st.markdown("---")
    # --- 2. VALIDATION COMMUNAUTAIRE (Consolidated from community_validation.py) ---
    st.subheader("⚖️ Validation communautaire des missions")
    st.caption("Aidez-nous à valider les missions en attente (vue anonymisée).")
    
    pending_actions = get_submissions_by_status('pending')
    pending_previews = build_pending_public_previews(pending_actions)
    
    normalized = [_normalize_preview(item) for item in list(pending_previews or [])[:10]]
    if not normalized:
        st.info("Aucune mission en attente de validation.")
    else:
        voter = st.text_input("Votre pseudo pour voter", key="community_voter")
        for action in normalized:
            sid = action.get("id")
            pub_ref = sanitize_html_text(action.get("public_ref") or "N/A", max_len=20)
            st.markdown(f"**Mission {pub_ref}**")
            st.caption(f"Impact: {action.get('impact_level')} | {action.get('dechets_kg')} kg | {action.get('megots')} mégots")
            
            v_col1, v_col2, v_col3 = st.columns([1, 1, 2])
            with v_col1:
                if st.button("Utile", key=f"up_{sid}"):
                    if voter.strip(): add_mission_validation(sid, voter.strip(), 1)
                    else: st.warning("Pseudo requis.")
            with v_col2:
                if st.button("A revoir", key=f"down_{sid}"):
                    if voter.strip(): add_mission_validation(sid, voter.strip(), -1)
                    else: st.warning("Pseudo requis.")
            with v_col3:
                summary = get_mission_validation_summary(sid)
                st.write(f"Score: **{summary.get('score', 0)}** (Utile: {summary.get('up', 0)} / A revoir: {summary.get('down', 0)})")
            st.markdown("---")
