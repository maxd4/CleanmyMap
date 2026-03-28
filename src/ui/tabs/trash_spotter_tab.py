import streamlit as st
import folium
from streamlit_folium import st_folium

def render_trash_spotter_tab(ctx):
    """
    Renders the 'Trash Spotter' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    main_user_email = ctx.get('main_user_email', "Bénévole Anonyme")
    save_uploaded_image = ctx['save_uploaded_image']
    add_spot = ctx['add_spot']
    get_active_spots = ctx['get_active_spots']
    update_spot_status = ctx['update_spot_status']
    sanitize_html_text = ctx['sanitize_html_text']
    log_exception = ctx['log_exception']
    geocode_address = ctx['geocode_address']

    render_tab_header(
        icon="🚩",
        title_fr="Signaler un dépôt",
        title_en="Report a Waste Spot",
        subtitle_fr="Aidez-nous à cartographier la pollution pour organiser de futurs nettoyages.",
        subtitle_en="Help us map pollution to organize future cleanups.",
        chips=[i18n_text("Signalement", "Reporting"), i18n_text("Vigilance", "Vigilance")],
        compact=True,
    )


    col_ts1, col_ts2 = st.columns([1, 1])
    with col_ts1:
        st.subheader("📍 Signaler un Spot")
        with st.form("spot_form_fast"):
            s_addr = st.text_input("Adresse ou Lieu", placeholder="Ex: 10 Rue de Rivoli")
            s_type = st.selectbox("Type de déchet", ["Décharge sauvage", "Mégots en masse", "Plastiques", "Verre", "Autre"])
            s_pseudo = st.text_input("Votre pseudo", value=main_user_email)
            s_photo = st.file_uploader("Photo du spot (obligatoire)", type=["png", "jpg", "jpeg"], key="spot_photo_required")
            s_btn = st.form_submit_button("📢 Signaler (+10 Eco-Points)")
            
            if s_btn:
                if not s_addr:
                    st.warning("Précisez l'adresse du spot.")
                elif s_photo is None:
                    st.warning("Une photo est obligatoire pour valider le signalement.")
                else:
                    lat_s, lon_s = geocode_address(s_addr)
                    if lat_s:
                        photo_path = save_uploaded_image(s_photo, prefix="spot")
                        add_spot(lat_s, lon_s, s_addr, s_type, s_pseudo, photo_url=photo_path)
                        st.success("Spot ajouté ! Merci pour votre vigilance.")
                        st.balloons()
                        st.rerun()
                    else:
                        st.error("Impossible de localizer l'adresse.")

    with col_ts2:
        st.subheader("🚩 Points Noirs Actifs")
        spots = get_active_spots()
        if spots:
            m_ts = folium.Map(location=[48.8566, 2.3522], zoom_start=12)
            for sp in spots:
                safe_type_dechet = sanitize_html_text(sp.get("type_dechet", "Spot"), max_len=80)
                safe_reporter = sanitize_html_text(sp.get("reporter_name", "N/A"), max_len=80)
                popup_text = f"<b>{safe_type_dechet}</b><br>Signalé par {safe_reporter}"
                if sp.get("photo_url"):
                    popup_text += f"<br><small>Photo disponible</small>"
                folium.Marker(
                    [sp['lat'], sp['lon']],
                    popup=popup_text,
                    icon=folium.Icon(color='red', icon='trash', prefix='fa')
                ).add_to(m_ts)
            st_folium(m_ts, width=400, height=350, key="ts_map_view")

            st.markdown("---")
            st.subheader("Validation terrain")
            st.caption("Confirmez sur place qu'un spot est nettoyé : il sera clôturé automatiquement.")
            for sp in spots[:8]:
                with st.container():
                    st.markdown(f"**{sp.get('type_dechet', 'Spot')}** - {sp.get('adresse', '')}")
                    st.caption(f"Signalé par {sp.get('reporter_name', 'N/A')}")
                    if sp.get("photo_url"):
                        try:
                            st.image(sp["photo_url"], width=240)
                        except (FileNotFoundError, OSError, RuntimeError, ValueError) as exc:
                            log_exception(
                                component="app",
                                action="render_spot_photo",
                                exc=exc,
                                message="Unable to render spot photo",
                                context={"spot_id": sp.get("id")},
                                severity="warning",
                            )
                            st.caption("Photo non affichable")
                    if st.button("Valider terrain et clôturer", key=f"close_spot_{sp['id']}", use_container_width=True):
                        update_spot_status(sp["id"], "cleaned")
                        st.success("Spot clôturé automatiquement.")
                        st.rerun()
        else:
            st.info("Aucun spot de pollution signalé pour le moment.")
