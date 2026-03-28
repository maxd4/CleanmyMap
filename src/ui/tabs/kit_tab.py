import streamlit as st
import pandas as pd
import qrcode
import io
import requests
import zipfile
from datetime import date

def render_kit_tab(ctx):
    """
    Renders the 'Kit' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    STREAMLIT_PUBLIC_URL = ctx.get('STREAMLIT_PUBLIC_URL', "https://cleanwalk.streamlit.app")

    render_tab_header(
        icon="\U0001F4F1",
        title_fr="Kit Organisateur",
        title_en="Organizer Kit",
        subtitle_fr="Générez un QR code terrain, des templates équipes et des supports pré-remplis pour fluidifier vos cleanwalks.",
        subtitle_en="Generate field QR codes, team templates, and prefilled materials to streamline your cleanwalk operations.",
        chips=[i18n_text("Terrain", "Field"), i18n_text("QR Code", "QR Code"), i18n_text("Organisation", "Operations")],
        compact=True,
    )
    
    st.markdown("""
    ### Pourquoi utiliser un QR Code ?
    Le QR Code de terrain est un outil essentiel pour les organisateurs de Clean Walks. Il permet de :
    1. **Simplifier la saisie** : En scannant le code, le lieu de l'action est automatiquement pré-rempli pour les bénévoles.
    2. **Uniformiser les données** : Toutes les déclarations de votre événement porteront exactement le meme nom de lieu, facilitant le bilan final.
    3. **Gagner du temps** : Vos bénévoles n'ont plus qu'à renseigner les quantités ramassées.
    
    ---
    ### Générer votre code
    Saisissez le nom du lieu ou les coordonnées GPS exactes pour générer le QR Code à imprimer ou à afficher sur votre téléphone pendant l'action.
    """)
    
    with st.form("qr_generator_form"):
        lieu_event = st.text_input("Nom du lieu ou Coordonnées GPS", placeholder="Ex: Place de la Bastille, Paris ou 48.8534, 2.3488")
        color_qr = st.color_picker("Couleur du QR Code", "#059669")
        generate_btn = st.form_submit_button("Générer le QR Code de terrain", use_container_width=True)
        
    if generate_btn:
        if not lieu_event.strip():
            st.warning("Veuillez saisir un lieu pour générer le code.")
        else:
            base_url = STREAMLIT_PUBLIC_URL
            share_url = f"{base_url}/?lieu={requests.utils.quote(lieu_event.strip())}"
            
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(share_url)
            qr.make(fit=True)
            img_qr = qr.make_image(fill_color=color_qr, back_color="white")
            
            buf = io.BytesIO()
            img_qr.save(buf, format="PNG")
            byte_im = buf.getvalue()
            
            col_qr1, col_qr2 = st.columns([1, 2])
            with col_qr1:
                st.image(byte_im, caption="QR Code à scanner sur le terrain")
            with col_qr2:
                st.success("Votre QR Code est prêt !")
                st.write(f"**Lien encodé :** `{share_url}`")
                st.download_button(
                    label="⬇️ Télécharger le QR Code (PNG)",
                    data=byte_im,
                    file_name=f"qrcode_terrain_{lieu_event.replace(' ', '_')}.png",
                    mime="image/png",
                    use_container_width=True
                )
                st.info("💡 **Conseil :** Imprimez ce code et fixez-le sur votre peson ou sur votre sac de collecte principal pour que chaque bénévole puisse flasher son impact en fin d'action.")

    st.markdown("---")
    st.subheader("📋 Templates imprimables & gestion multi-bénévoles")
    nb_participants = st.number_input("Nombre de bénévoles attendus", min_value=1, value=10, step=1, key="kit_participants")
    nb_equipes = st.number_input("Nombre d'équipes", min_value=1, value=3, step=1, key="kit_teams")

    planner = pd.DataFrame({
        "equipe": [f"Équipe {((i % nb_equipes) + 1)}" for i in range(nb_participants)],
        "benevole": [f"Participant {i+1}" for i in range(nb_participants)],
        "telephone": ["" for _ in range(nb_participants)],
        "materiel": ["gants, sacs, pinces" for _ in range(nb_participants)],
    })
    st.dataframe(planner, width=None, hide_index=True)
    st.download_button(
        "⬇️ Télécharger template équipes (CSV)",
        data=planner.to_csv(index=False, encoding="utf-8"),
        file_name="template_equipes_cleanmymap.csv",
        mime="text/csv",
        use_container_width=True,
    )

    st.markdown("---")
    st.subheader("📦 Pack ZIP événement")
    st.caption("Génère un kit prêt à imprimer: QR, feuille équipes, checklist terrain.")
    with st.form("kit_zip_form"):
        event_name = st.text_input("Nom de l'événement", value="Cleanwalk locale")
        event_place = st.text_input("Lieu de l'événement", value=lieu_event if 'lieu_event' in locals() and lieu_event else "")
        event_date = st.date_input("Date événement", value=date.today(), key="kit_event_date")
        generate_zip_btn = st.form_submit_button("Générer le pack ZIP", use_container_width=True)

    if generate_zip_btn:
        if not event_place.strip():
            st.warning("Précisez le lieu pour générer le pack.")
        else:
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                pack_url = f"{STREAMLIT_PUBLIC_URL}/?lieu={requests.utils.quote(event_place.strip())}"
                qr_pack = qrcode.QRCode(version=1, box_size=10, border=4)
                qr_pack.add_data(pack_url)
                qr_pack.make(fit=True)
                qr_img = qr_pack.make_image(fill_color="#059669", back_color="white")
                qr_bytes = io.BytesIO()
                qr_img.save(qr_bytes, format="PNG")
                zf.writestr("01_qr_code_terrain.png", qr_bytes.getvalue())

                zf.writestr("02_feuille_equipes.csv", planner.to_csv(index=False, encoding="utf-8"))

                checklist = (
                    f"CHECKLIST TERRAIN - {event_name}\n"
                    f"Date: {event_date}\n"
                    f"Lieu: {event_place}\n\n"
                    "Avant départ:\n"
                    "- Gants, pinces, sacs (tri)\n"
                    "- Peson / balance\n"
                    "- QR code imprimé ou smartphone\n"
                    "- Brief sécurité équipe\n\n"
                    "Pendant:\n"
                    "- Tri des flux (mégots/verre/métal/plastiques)\n"
                    "- Point de regroupement toutes les 30 min\n"
                    "- Photos traçabilité\n\n"
                    "Après:\n"
                    "- Dépôt au point de collecte adapté\n"
                    "- Déclaration des données dans l'app\n"
                    "- Débrief équipe et axes d'amélioration\n"
                )
                zf.writestr("03_checklist_terrain.txt", checklist)

                readme = (
                    f"Pack événement Clean my Map\n\n"
                    f"Nom: {event_name}\n"
                    f"Lieu: {event_place}\n"
                    f"Date: {event_date}\n"
                    f"Lien QR: {pack_url}\n"
                )
                zf.writestr("README.txt", readme)

            st.download_button(
                "Télécharger le pack ZIP événement",
                data=zip_buffer.getvalue(),
                file_name=f"kit_evenement_{event_name.replace(' ', '_')}.zip",
                mime="application/zip",
                use_container_width=True,
            )
