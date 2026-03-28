import streamlit as st
import pandas as pd
import re
import requests
from datetime import date, datetime

def render_elus_tab(ctx):
    """
    Renders the 'Elus / Territories' tab.
    ctx: A dictionary or object containing required utilities and data.
    """
    render_tab_header = ctx['render_tab_header']
    i18n_text = ctx['i18n_text']
    get_submissions_by_status = ctx['get_submissions_by_status']
    IMPACT_CONSTANTS = ctx['IMPACT_CONSTANTS']
    render_partner_dashboard = ctx['render_partner_dashboard']
    PDFReport = ctx['PDFReport']
    get_critical_zones = ctx['get_critical_zones']
    get_eco_districts = ctx['get_eco_districts']
    build_certificat_eco_quartier = ctx['build_certificat_eco_quartier']
    build_certificat_territorial = ctx['build_certificat_territorial']
    get_eco_quartiers = ctx['get_eco_quartiers']
    sanitize_html_text = ctx['sanitize_html_text']
    _txt = ctx['_txt']
    STREAMLIT_PUBLIC_URL = ctx.get('STREAMLIT_PUBLIC_URL', "https://cleanwalk.streamlit.app")

    render_tab_header(
        icon="\U0001F3DB\ufe0f",
        title_fr="Espace Territoires",
        title_en="Territories Dashboard",
        subtitle_fr="Analysez l'impact local, les zones de vigilance et les leviers de décision pour votre collectivité.",
        subtitle_en="Analyze local impact, risk areas, and decision levers for your municipality.",
        chips=[i18n_text("Collectivités", "Municipalities"), i18n_text("Pilotage", "Steering")],
        compact=True,
    )
    st.write("Ce portail permet de visualiser l'impact de l'action citoyenne sur votre commune.")
    
    db_approved = get_submissions_by_status('approved')
    approved_df = pd.DataFrame(db_approved)
    all_submissions_df = pd.DataFrame(get_submissions_by_status(None))

    st.markdown("### Simulation budget / ROI (scenarios)")
    roi_presets = {
        "Prudent": {"ops_month": 2, "volunteers": 12, "kg_per_op": 18.0, "megots_per_op": 650, "budget_per_op": 320.0, "fixed_cost": 1800.0},
        "Equilibre": {"ops_month": 4, "volunteers": 18, "kg_per_op": 26.0, "megots_per_op": 1200, "budget_per_op": 450.0, "fixed_cost": 2800.0},
        "Ambitieux": {"ops_month": 6, "volunteers": 28, "kg_per_op": 34.0, "megots_per_op": 1900, "budget_per_op": 620.0, "fixed_cost": 4200.0},
    }
    selected_roi_preset = st.selectbox(
        "Scénario de pilotage",
        list(roi_presets.keys()),
        index=1,
        key="roi_preset_select",
    )
    if st.session_state.get("roi_last_preset") != selected_roi_preset:
        preset = roi_presets[selected_roi_preset]
        st.session_state["roi_ops_month"] = int(preset["ops_month"])
        st.session_state["roi_volunteers"] = int(preset["volunteers"])
        st.session_state["roi_kg_per_op"] = float(preset["kg_per_op"])
        st.session_state["roi_megots_per_op"] = int(preset["megots_per_op"])
        st.session_state["roi_budget_per_op"] = float(preset["budget_per_op"])
        st.session_state["roi_fixed_cost"] = float(preset["fixed_cost"])
        st.session_state["roi_last_preset"] = selected_roi_preset

    r1, r2, r3 = st.columns(3)
    with r1:
        roi_ops_month = st.number_input("Opérations / mois", min_value=1, max_value=40, step=1, key="roi_ops_month")
        roi_kg_per_op = st.number_input("Kg collectés / opération", min_value=1.0, step=1.0, key="roi_kg_per_op")
    with r2:
        roi_volunteers = st.number_input("Bénévoles moyens / opération", min_value=1, max_value=300, step=1, key="roi_volunteers")
        roi_megots_per_op = st.number_input("Mégots / opération", min_value=0, step=50, key="roi_megots_per_op")
    with r3:
        roi_budget_per_op = st.number_input("Budget variable / opération (EUR)", min_value=0.0, step=50.0, key="roi_budget_per_op")
        roi_fixed_cost = st.number_input("Budget fixe annuel (coordination, com) (EUR)", min_value=0.0, step=100.0, key="roi_fixed_cost")

    annual_ops = int(roi_ops_month * 12)
    annual_budget = float(roi_fixed_cost + (annual_ops * roi_budget_per_op))
    projected_kg = float(annual_ops * roi_kg_per_op)
    projected_megots = int(annual_ops * roi_megots_per_op)
    treatment_savings = (projected_kg / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
    protected_water_l = projected_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
    protected_water_value = (protected_water_l / 1000.0) * 0.08
    projected_value = treatment_savings + protected_water_value
    roi_ratio = ((projected_value - annual_budget) / annual_budget * 100.0) if annual_budget > 0 else 0.0

    m_roi1, m_roi2, m_roi3, m_roi4 = st.columns(4)
    m_roi1.metric("Budget annuel", f"{annual_budget:,.0f} EUR")
    m_roi2.metric("Impact projeté", f"{projected_kg:,.0f} kg")
    m_roi3.metric("Valeur estimée", f"{projected_value:,.0f} EUR")
    m_roi4.metric("ROI estimé", f"{roi_ratio:+.1f}%")
    st.caption(
        f"Projection annuelle: {annual_ops} opérations, {int(roi_volunteers) * annual_ops:,} participations bénévoles, "
        f"{projected_megots:,} mégots retirés, {protected_water_l:,.0f} L d'eau protégés."
    )
    st.markdown("---")

    if not approved_df.empty and 'adresse' in approved_df.columns:
        render_partner_dashboard(all_submissions_df, approved_df, PDFReport)
        st.markdown("---")
        
        extracted_cities = set()
        for addr in approved_df['adresse'].dropna():
            match = re.search(r'\\b\\d{5}\\s+([A-Za-zÃ€-Ã¿\\s-]+)\\b', str(addr))
            if match:
                extracted_cities.add(match.group(1).strip())
            else:
                parts = str(addr).split(',')
                if len(parts) > 1: extracted_cities.add(parts[-1].strip())
        
        villes_uniques = sorted(list(extracted_cities)) if extracted_cities else ["Paris", "Versailles", "Montreuil"]
        
        st.info("💡 Saisissez le nom de votre commune (ou un mot clé de votre territoire) pour isoler les statistiques.")
        recherche_ville = st.selectbox("Sélectionnez votre Territoire :", options=["-- Sélectionnez --"] + list(villes_uniques) + ["[Autre Recherche Manuelle]"])
        
        if recherche_ville == "[Autre Recherche Manuelle]":
            recherche_ville = st.text_input("Tapez le nom de la ville ou de l'arrondissement librement :")
            
        if recherche_ville and recherche_ville != "-- Sélectionnez --":
            df_ville = approved_df[approved_df['adresse'].str.contains(recherche_ville, case=False, na=False)]
            
            if df_ville.empty:
                st.warning(f"Aucune action bénévole répertoriée correspondante à '{recherche_ville}' pour le moment.")
            else:
                nb_actions = len(df_ville)
                tot_megots = df_ville.get('megots', pd.Series(dtype=int)).fillna(0).sum()
                tot_dechets = df_ville.get('dechets_kg', pd.Series(dtype=float)).fillna(0).sum()
                
                economie = (tot_dechets / 1000.0) * IMPACT_CONSTANTS["COUT_TRAITEMENT_TONNE_EUR"]
                eau_save = tot_megots * IMPACT_CONSTANTS["EAU_PROTEGEE_PER_MEGOT_L"]
                
                points_critiques = get_critical_zones(df_ville)
                
                st.success(f"Recherche : **{nb_actions} actions citoyennes** recensées sur {recherche_ville}")
                
                col1, col2, col3 = st.columns(3)
                col1.metric("Matières collectées", f"{tot_dechets:.1f} kg")
                col2.metric("Eau préservée", f"{eau_save:,} litres")
                col3.metric("Économie estimée", f"{economie:.2f} €", help="Coût de traitement évité pour la collectivité.")
                
                st.markdown("---")
                st.subheader(f"Zones de vigilance ({len(points_critiques)} lieux)")
                if points_critiques:
                    st.info(f"Ces **{len(points_critiques)} lieux** font l'objet de soins réguliers par nos brigades. Un renforcement des infrastructures locales (cendriers, bacs) pourrait aider à pérenniser cette propreté :")
                    if isinstance(points_critiques, dict):
                        for addr, data in points_critiques.items():
                            st.write(f"- 📍 **{addr}** : Signalée {data['count']} fois. Mémorisé se re-pollue tous les **{data['delai_moyen']} jours**.")
                    else:
                        for z in points_critiques:
                            st.write(f"- 📍 {z}")
                else:
                    st.success("Aucune zone de récurrence critique détectée sur cette sélection.")

                st.markdown("---")
                st.subheader("Sauvegarde locale")
                col_b1, col_b2 = st.columns(2)
                with col_b1:
                    if st.button("Générer une sauvegarde (JSON)"):
                        all_data = pd.DataFrame(get_submissions_by_status(None))
                        json_data = all_data.to_json(orient='records', force_ascii=False)
                        st.download_button(
                            label="Télécharger la sauvegarde",
                            data=json_data,
                            file_name=f"backup_cleanmymap_{datetime.now().strftime('%Y%m%d')}.json",
                            mime="application/json"
                        )
                with col_b2:
                    st.info("Pensez à faire une sauvegarde avant toute mise à jour majeure du schéma de base de données.")

                st.markdown("---")
                st.subheader("Label Éco-Quartier Citoyen")
                eligible_villes = get_eco_districts(approved_df)
                if recherche_ville.lower() in [v.lower() for v in eligible_villes]:
                    st.success(f"🏆 Félicitations ! **{recherche_ville}** est labellisé **éco-quartier citoyen**.")
                    certif_eco = build_certificat_eco_quartier(recherche_ville)
                    st.download_button(
                        label=f"Télécharger le diplôme éco-quartier ({recherche_ville})",
                        data=certif_eco,
                        file_name=f"diplome_eco_quartier_{recherche_ville}.pdf",
                        mime="application/pdf"
                    )
                else:
                    st.info("Ce territoire ne remplit pas encore les critères du label (180 jours sans pollution signalée).")

                st.markdown("---")
                certif_pdf = build_certificat_territorial(df_ville, recherche_ville, points_critiques)
                st.download_button(
                    label=f"Télécharger le certificat d'impact ({recherche_ville})",
                    data=certif_pdf,
                    file_name=f"certificat_impact_{recherche_ville}.pdf",
                    mime="application/pdf"
                )
                
                share_text = f"Fier d'agir pour {recherche_ville} avec les brigades vertes ! Déjà {tot_dechets:.1f}kg de déchets retirés. Rejoignez-nous sur cleanwalk 🌍"
                encoded_text = requests.utils.quote(share_text)
                st.markdown(f"""
                [Partager sur LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https://cleanwalk.streamlit.app&text={encoded_text}) 
                [Partager sur Twitter/X](https://twitter.com/intent/tweet?text={encoded_text})
                """, unsafe_allow_html=True)
                
                st.markdown("---")
                st.subheader("📆 Label Éco-Quartier Citoyen")
                st.write("Analyse automatique de la préservation de votre territoire sur les 180 derniers jours.")
                
                labels_eligibles = get_eco_quartiers(df_ville)
                if labels_eligibles:
                    st.success(f"✨ Félicitations ! **{len(labels_eligibles)} zone(s)** de votre commune sont éligibles au Label Éco-Quartier (Zéro pollution sur 180 jours).")
                    selected_label = st.selectbox("Choisissez une zone pour générer son certificat :", options=labels_eligibles)
                    
                    if selected_label:
                        certif_eco = build_certificat_eco_quartier(selected_label)
                        st.download_button(
                            label=f"🥇 Télécharger le Label pour '{selected_label}'",
                            data=certif_eco,
                            file_name=f"Label_EcoQuartier_{selected_label.replace(' ', '_')}.pdf",
                            mime="application/pdf"
                        )
                else:
                    st.info("Aucune zone n'a encore atteint le seuil des 180 jours de propreté continue avec signalements de contrôle. Encouragez vos citoyens à signaler les zones propres pour activer le label !")

                st.markdown("---")
                st.subheader("Génération de courrier officiel")
                st.write("Générez un courrier officiel à destination de la mairie, avec les statistiques réelles de votre territoire et des recommandations d'infrastructure concrètes.")
                
                with st.form("lettre_maire_form"):
                    col_lm1, col_lm2 = st.columns(2)
                    with col_lm1:
                        nom_maire = st.text_input("Nom du maire / élu", placeholder="Ex: Monsieur le Maire Pierre Dupont")
                        nom_association_lettre = st.text_input("Expéditeur (association)", placeholder="Ex: Association Clean Walk Paris 10")
                    with col_lm2:
                        date_lettre = st.date_input("Date du courrier", value=date.today())
                        objet_lettre = st.text_input("Objet (optionnel)", value=f"Rapport d'impact citoyen - Action bénévole à {recherche_ville}")
                    gen_lettre_btn = st.form_submit_button("Générer la lettre (PDF)")
                
                if gen_lettre_btn:
                    def build_lettre_maire(nom_m, nom_asso, ville, tot_d, tot_meg, n_act, pts_crit, d_lettre, objet) -> bytes:
                        from fpdf import FPDF
                        pdf = FPDF()
                        pdf.add_page()
                        pdf.set_margins(20, 20, 20)
                        pdf.set_auto_page_break(auto=True, margin=25)
                        
                        pdf.set_font('Helvetica', 'B', 11)
                        pdf.set_text_color(5, 150, 105)
                        pdf.cell(0, 6, _txt(nom_asso), ln=True)
                        pdf.set_font('Helvetica', '', 9)
                        pdf.set_text_color(100, 116, 139)
                        pdf.cell(0, 5, _txt(f"contact@cleanmymap.fr | {STREAMLIT_PUBLIC_URL}"), ln=True)
                        pdf.ln(3)
                        pdf.set_draw_color(16, 185, 129)
                        pdf.set_line_width(0.5)
                        pdf.line(20, pdf.get_y(), 190, pdf.get_y())
                        pdf.ln(8)
                        
                        pdf.set_font('Helvetica', '', 10); pdf.set_text_color(51, 65, 85)
                        pdf.cell(0, 6, _txt(nom_m), ln=True)
                        pdf.cell(0, 6, _txt(f"Mairie de {ville}"), ln=True)
                        pdf.ln(5)
                        
                        pdf.set_font('Helvetica', '', 10)
                        pdf.cell(0, 6, _txt(f"Le {d_lettre.strftime('%d %B %Y')}"), ln=True, align='R')
                        pdf.ln(4)
                        pdf.set_font('Helvetica', 'B', 10)
                        pdf.multi_cell(0, 6, _txt(f"Objet : {objet}"))
                        pdf.ln(6)
                        
                        eco = (tot_d / 1000) * IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']
                        eau = int(tot_meg * IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L'])
                        
                        pdf.set_font('Helvetica', '', 10)
                        corps = (
                            f"{nom_m},\n\n"
                            f"Nous avons l'honneur de vous adresser le présent rapport d'activité concernant "
                            f"les actions citoyennes de dépollution menées sur le territoire de {ville}.\n\n"
                            f"Au cours de la période analysée, nos brigades bénévoles ont réalisé {n_act} interventions, "
                            f"permettant de retirer {tot_d:.1f} kg de déchets et {tot_meg:,} mégots de la voie publique."
                            f" Ces actions ont préservé environ {eau:,} litres d'eau de la contamination toxique "
                            f"et représentent une économie estimée à {eco:,.0f} € pour les services de propreté de votre commune.\n\n"
                        )
                        pdf.multi_cell(0, 6, _txt(corps))
                        
                        if pts_crit:
                            pdf.set_font('Helvetica', 'B', 10)
                            pdf.cell(0, 6, _txt("Zones de récurrence identifiées (Points noirs) :"), ln=True)
                            pdf.set_font('Helvetica', '', 10)
                            if isinstance(pts_crit, dict):
                                for addr, data in list(pts_crit.items())[:5]:
                                    pdf.multi_cell(0, 5, _txt(f"- {addr} : {data['count']} passages bénévoles, re-pollution tous les {data['delai_moyen']} jours en moyenne."))
                            pdf.ln(3)
                            pdf.multi_cell(0, 6, _txt(
                                "Pour limiter la récidive de pollution sur ces zones, nous vous recommandons "
                                "d'envisager l'installation d'infrastructures de collecte supplémentaires "
                                "(cendriers de rue, corbeilles), ainsi que des campagnes de sensibilisation ciblées."
                            ))
                        
                        pdf.ln(6)
                        pdf.multi_cell(0, 6, _txt(
                            "Nous restons à votre disposition pour tout échange ou partenariat visant à "
                            "coordonner nos actions avec les services municipaux de propreté.\n\n"
                            "Dans l'attente d'une réponse favorable, veuillez agréer, " + nom_m + ", "
                            "l'expression de nos salutations distinguées.\n\n"
                        ))
                        pdf.set_font('Helvetica', 'B', 10)
                        pdf.cell(0, 6, _txt(nom_asso), ln=True)
                        
                        out = pdf.output(dest='S')
                        return out if isinstance(out, bytes) else out.encode('latin-1', 'replace')
                    
                    lettre_bytes = build_lettre_maire(
                        nom_maire or "Monsieur/Madame le Maire",
                        nom_association_lettre or "Clean My Map",
                        recherche_ville, tot_dechets, int(tot_megots),
                        nb_actions, points_critiques,
                        date_lettre, objet_lettre
                    )

                    safe_association = sanitize_html_text(nom_association_lettre or "Clean My Map", max_len=120)
                    safe_maire = sanitize_html_text(nom_maire or "Monsieur/Madame le Maire", max_len=120)
                    safe_ville = sanitize_html_text(recherche_ville, max_len=120)
                    safe_objet = sanitize_html_text(objet_lettre, max_len=220)
                    
                    st.markdown(f"""
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; font-family: 'Georgia', serif; line-height: 1.7; color: #1e293b; margin: 16px 0;">
                        <div style="color: #059669; font-weight: bold; font-size: 14px;">{safe_association}</div>
                        <div style="color: #94a3b8; font-size: 11px; margin-bottom: 16px;">contact@cleanmymap.fr</div>
                        <div style="border-top: 1px solid #10b981; margin-bottom: 16px;"></div>
                        <div><strong>{safe_maire}</strong><br>Mairie de {safe_ville}</div>
                        <div style="text-align: right; font-size: 12px; color: #64748b;">Le {date_lettre.strftime('%d/%m/%Y')}</div>
                        <p><strong>Objet : {safe_objet}</strong></p>
                        <p>{safe_maire},</p>
                        <p>Nos brigades bénévoles ont réalisé <strong>{nb_actions} interventions</strong> sur votre territoire, retirant <strong>{tot_dechets:.1f} kg</strong> de déchets et <strong>{int(tot_megots):,}</strong> mégots - soit une économie estimée à <strong>{(tot_dechets/1000)*IMPACT_CONSTANTS['COUT_TRAITEMENT_TONNE_EUR']:,.0f} €</strong> pour la collectivité.</p>
                        <p style="color: #64748b; font-style: italic;">[...] Cordialement, {safe_association}</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.download_button(
                        "⬇️ Télécharger la lettre officielle (PDF)",
                        data=lettre_bytes,
                        file_name=f"lettre_mairie_{recherche_ville}_{date_lettre}.pdf",
                        mime="application/pdf"
                    )
    else:
        st.info("Aucune donnée publique approuvée disponible pour le moment afin d'alimenter cet espace.")
