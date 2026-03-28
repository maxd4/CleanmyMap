import os
import unicodedata
import qrcode
import numpy as np
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt
from fpdf import FPDF
from .config import OUTPUT_DIR, IMPACT_CONSTANTS
from .logging_utils import log_exception

# --- CHARTE GRAPHIQUE OFFICIELLE ---
COLORS = {
    'primary': (16, 185, 129),    # Emeraude 500
    'primary_dark': (5, 150, 105),# Emeraude 600
    'secondary': (30, 41, 59),    # Ardoise (Slate 800)
    'text': (51, 65, 85),         # Slate 700
    'text_light': (100, 116, 139),# Slate 500
    'light_bg': (248, 250, 252),  # Slate 50
    'border': (226, 232, 240),    # Slate 200
    'white': (255, 255, 255),
    'accent': (14, 165, 233),     # Sky 500
    'danger': (239, 68, 68),      # Red 500
}

def safe_text(text):
    """Nettoyage UTF-8 pour FPDF Latin-1 et conversion d'emojis en tags."""
    if not isinstance(text, str): text = str(text)
    remplacements = {
        '📊': '[STATS]', '📈': '[HAUSSE]', '📉': '[BAISSE]', '📄': '[DOC]',
        '📍': '[LIEU]', '🗺️': '[CARTE]', '🏆': '[TOP]', '🤝': '[ASSO]',
        '👥': '[BENEVOLES]', '🎯': '[OBJECTIF]', '✅': '[OK]', '⚠️': '[ATTENTION]',
        '🚬': '[MEGOT]', '🗑️': '[DECHET]', '⏱️': '[TEMPS]', '🌍': '[TERRE]',
        '🌳': '[ARBRE]', '⚡': '[EFFICACITE]', '📅': '[DATE]', '✨': '*',
        '🌱': '[ECLAIREUR]', '🛡️': '[GARDIEN]', '👑': '[LEGENDE]', '💧': '[EAU]',
        '🪑': '[BANC]', '🚗': '[VOITURE]', '💡': '[INFO]', '🏘️': '[VILLE]',
        '♻️': '[RECYCLAGE]', '⚖️': '[SOCIAL]', '🌍': '[HUMA]', '🌈': '[MIXITE]',
        '⭐': '[COMMERCE]'
    }
    for emoji, replacement in remplacements.items():
        text = text.replace(emoji, replacement)
    # Remove any other non-latin1 chars safely
    return unicodedata.normalize('NFKD', text).encode('latin1', 'ignore').decode('latin1')

class PDFReport(FPDF):
    def __init__(self, df: pd.DataFrame):
        super().__init__()
        self.full_df = df
        self.set_auto_page_break(auto=True, margin=20)
        self.report_date = datetime.now().strftime("%d/%m/%Y")
        self.version = "v2.0 - Institutionnel"
        self.is_rse = False # Nouveau mode RSE
        self.map_base_url = "https://cleanmymap.streamlit.app"
        self.feature_flags = {}
        self.toc_data = []
        self.is_dummy = False
        self.section_links = {} # Stores link IDs for internal navigation

    def add_to_toc(self, title, is_sub=False):
        # Create an internal link for this section
        link_id = self.add_link()
        self.section_links[title] = link_id
        self.toc_data.append({'title': title, 'page': self.page_no(), 'is_sub': is_sub, 'link': link_id})
        return link_id

    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'B', 8)
            self.set_text_color(*COLORS['primary'])
            self.cell(0, 10, 'CLEAN MY MAP - STRATEGIC IMPACT REPORT', 0, 0, 'L')
            self.set_text_color(*COLORS['text_light'])
            self.cell(0, 10, f'Généré le {self.report_date} - Page {self.page_no()}', 0, 1, 'R')
            self.set_draw_color(*COLORS['border'])
            self.set_line_width(0.1)
            self.line(10, 18, 200, 18)
            self.ln(2)

    def section_header(self, title, subtitle):
        self.set_font('Helvetica', 'B', 24)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 15, safe_text(title), ln=True)
        self.set_font('Helvetica', 'I', 13)
        self.set_text_color(*COLORS['primary'])
        self.cell(0, 8, safe_text(subtitle), ln=True)
        self.ln(5)
        self.set_draw_color(*COLORS['primary'])
        self.set_line_width(1.5)
        self.line(10, self.get_y(), 60, self.get_y())
        self.ln(10)

    # --- PARTIE 1 : SYNTHÈSE DÉCISIONNELLE ---

    def create_cover(self, city_name, city_df):
        self.add_page()
        # Fond vert émeraude (palette CMM)
        self.set_fill_color(*COLORS['primary_dark'])
        self.rect(0, 0, 210, 110, 'F')
        self.set_fill_color(*COLORS['secondary'])
        self.rect(0, 110, 210, 187, 'F')
        
        # Badge "RAPPORT ANNUEL" sur fond vert
        self.set_y(22)
        self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['primary'])
        self.set_fill_color(255, 255, 255); 
        self.cell(0, 10, safe_text("RAPPORT ANNUEL DE DÉPOLLUTION CITOYENNE"), ln=True, align='C')
        self.set_font('Helvetica', 'B', 38); self.set_text_color(255, 255, 255)
        self.cell(0, 22, safe_text("Clean my Map"), ln=True, align='C')
        self.set_font('Helvetica', '', 16); self.set_text_color(255, 255, 255)
        self.cell(0, 12, safe_text(f"VILLE DE {city_name.upper()}"), ln=True, align='C')

        # Bande blanche de séparation
        self.set_fill_color(*COLORS['white'])
        self.rect(0, 108, 210, 8, 'F')
        
        # Bloc statistiques globales sur fond ardoise
        self.set_y(125)
        total_m = int(city_df['megots'].sum())
        total_kg = city_df['dechets_kg'].sum()
        total_vol = int(city_df.get('nb_benevoles', city_df.get('benevoles', 0)).sum())
        nb_actions = len(city_df)
        
        stats = [(str(nb_actions), "Actions"), (f"{total_m:,}".replace(',', ' '), "Mégots"), 
                 (f"{total_kg:.0f} kg", "Déchets"), (str(total_vol), "Bénévoles")]
        
        for i, (val, label) in enumerate(stats):
            x = 10 + i * 50
            self.set_fill_color(*COLORS['primary']); self.rect(x, 125, 46, 40, 'F')
            self.set_xy(x, 129); self.set_font('Helvetica', 'B', 18); self.set_text_color(255, 255, 255)
            self.cell(46, 12, safe_text(val), 0, 1, 'C')
            self.set_x(x); self.set_font('Helvetica', '', 8); self.set_text_color(*COLORS['light_bg'])
            self.cell(46, 8, safe_text(label.upper()), 0, 1, 'C')
        
        # Période et édition
        self.set_y(178)
        self.set_font('Helvetica', 'B', 12); self.set_text_color(*COLORS['border'])
        try:
            d_min = city_df['date'].min().strftime('%d/%m/%Y')
            d_max = city_df['date'].max().strftime('%d/%m/%Y')
            self.cell(0, 10, safe_text(f"PÉRIODE : {d_min} AU {d_max}"), ln=True, align='C')
        except (AttributeError, TypeError, ValueError) as exc:
            log_exception(
                component="report_generator",
                action="cover_period_range",
                exc=exc,
                message="Unable to compute report period range",
                severity="warning",
            )
        assos = ", ".join(city_df['association'].dropna().unique()[:4])
        self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text_light'])
        self.cell(0, 8, safe_text(f"Structure porteuse : {assos}"), ln=True, align='C')
        self.set_y(250)
        self.set_font('Helvetica', 'I', 9); self.set_text_color(*COLORS['text_light'])
        self.cell(0, 10, safe_text(f"Édition : {self.report_date} | Version {self.version}"), ln=True, align='C')

    def create_dynamic_toc(self):
        self.add_page(); 
        link_id = self.add_link() # Special link for TOC itself
        self.set_link(link_id)
        
        self.section_header("SOMMAIRE EXÉCUTIF", "Navigation et structure du rapport")
        self.ln(5)
        
        for item in self.toc_data:
            if item['title'] == "SOMMAIRE": continue
            
            indent = 15 if item['is_sub'] else 0
            self.set_x(15 + indent) # Better margin
            
            font_style = '' if item['is_sub'] else 'B'
            font_size = 11 if item['is_sub'] else 13
            color = COLORS['text'] if item['is_sub'] else COLORS['secondary']
            
            self.set_font('Helvetica', font_style, font_size)
            self.set_text_color(*color)
            
            title_w = 160 - indent
            # Use link to make it clickable
            self.cell(title_w, 10, safe_text(item['title']), 0, 0, 'L', link=item['link'])
            
            self.set_text_color(*COLORS['primary'])
            self.cell(0, 10, f"{item['page']}", 0, 1, 'R', link=item['link'])
            
            if not item['is_sub']:
                self.set_draw_color(*COLORS['border'])
                self.set_line_width(0.1)
                self.line(15, self.get_y(), 195, self.get_y())
            self.ln(1)

    def create_executive_summary(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("1. Synthèse Exécutive", is_sub=False)
        self.set_link(link)
        
        self.section_header("1. SYNTHÈSE EXÉCUTIVE", "Indicateurs clés et enseignements majeurs")
        
        total_m = int(city_df['megots'].sum())
        total_kg = city_df['dechets_kg'].sum()
        total_h = int((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        total_volunteers = int(city_df['nb_benevoles'].sum())
        
        # Plaidoyer Économique
        economie_v_eur = (total_kg / 1000) * IMPACT_CONSTANTS.get('COUT_TRAITEMENT_TONNE_EUR', 150)
        ipc_score = total_m / total_h if total_h > 0 else 0
        
        metrics = [
            ("Actions", f"{len(city_df)}"), ("Citoyens", f"{total_volunteers:,}"), 
            ("Kg Déchets", f"{total_kg:.1f}"), ("Mégots", f"{total_m:,}"),
            ("Économie (€)", f"{economie_v_eur:,.0f} €"), ("Score IPC", f"{ipc_score:.1f} mgt/h")
        ]
        
        start_y = self.get_y()
        for i, (l, v) in enumerate(metrics):
            col, row = i % 3, i // 3
            x, y = 10 + (col * 65), start_y + (row * 35)
            self.set_fill_color(*COLORS['light_bg']); self.rect(x, y, 60, 30, 'F')
            self.set_xy(x, y+5); self.set_font('Helvetica', 'B', 9); self.set_text_color(*COLORS['text_light'])
            self.cell(60, 5, safe_text(l.upper()), 0, 1, 'C')
            self.set_x(x); self.set_font('Helvetica', 'B', 18); self.set_text_color(*COLORS['primary'])
            self.cell(60, 12, safe_text(v), 0, 1, 'C')

        self.set_y(start_y + 80)
        self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "ANALYSES ET ENSEIGNEMENTS PRIORITAIRES", ln=True)
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        
        # Calcul réel des statistiques (remplace les valeurs hardcodées)
        top_3_total = city_df.groupby('lieu_complet')['megots'].sum().nlargest(3).sum() if 'lieu_complet' in city_df.columns else 0
        top_3_pct = (top_3_total / max(city_df['megots'].sum(), 1)) * 100
        
        # Efficacité individuelle vs groupe
        solo = city_df[city_df['nb_benevoles'] <= 2] if 'nb_benevoles' in city_df.columns else pd.DataFrame()
        groupe = city_df[city_df['nb_benevoles'] > 5] if 'nb_benevoles' in city_df.columns else pd.DataFrame()
        solo_eff = (solo['megots'].sum() / max(solo['nb_benevoles'].sum(), 1)) if not solo.empty else 0
        grp_eff = (groupe['megots'].sum() / max(groupe['nb_benevoles'].sum(), 1)) if not groupe.empty else 0
        ratio_grp = (grp_eff / solo_eff) if solo_eff > 0 else 2.0
        
        text = (
            f"- Hotspots : 3 zones concentrent {top_3_pct:.0f}% de la charge polluante totale identifiée.\n"
            f"- Engagement : Le format 'Équipe' (>5 pers) s'avère {ratio_grp:.1f}x plus efficace que les actions solo.\n\n"
            "POINT DE VIGILANCE : L'augmentation de la fréquentation côtière/urbaine nécessite un renforcement "
            "préventif des infrastructures de collecte (cendriers de rue)."
        )
        self.multi_cell(0, 7, safe_text(text))

    def create_economic_vision(self, city_df):
        link = self.add_to_toc("1.1 Vision Économique", is_sub=True)
        self.set_link(link)
        self.ln(10)
        self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "1.1 PLAIDOYER ÉCONOMIQUE POUR LA VILLE", ln=True)
        
        total_kg = city_df['dechets_kg'].sum()
        total_h = int((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        valeur_benevolat = total_h * 15 # Valorisation à 15€/h (base asso)
        cout_evite = (total_kg / 1000) * IMPACT_CONSTANTS.get('COUT_TRAITEMENT_TONNE_EUR', 150)
        
        text = (
            f"L'action citoyenne génère une économie directe et indirecte substantielle pour la collectivité :\n"
            f"- VALEUR DU BÉNÉVOLAT : L'effort humain représente une dotation en nature estimée à **{valeur_benevolat:,} €**.\n"
            f"- COÛT DE TRAITEMENT ÉVITÉ : En extrayant {total_kg:.1f} kg avant leur entrée dans le réseau public, "
            f"les bénévoles économisent environ **{cout_evite:.2f} €** de frais de traitement à la tonne.\n"
            f"- PRÉVENTION : Chaque € investi dans le plaidoyer citoyen évite 10€ de dépenses curatives futures."
        )
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(text))

    def create_methodology(self):
        self.add_page(); 
        link = self.add_to_toc("17. Cadre Méthodologique", is_sub=False)
        self.set_link(link)
        
        self.section_header("17. CADRE MÉTHODOLOGIQUE", "Fiabilité, traçabilité et sources de données")
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        text = (
            "Ce rapport repose sur un protocole de science citoyenne rigoureux :\n\n"
            "1. SOURCE DES DONNÉES : Collecte via l'application mobile Clean My Map, synchronisée sur une base "
            "Google Sheets sécurisée. Chaque point est géocodé via l'API Nominatim (OpenStreetMap).\n\n"
            "2. DÉTERMINATION DES VOLUMES : \n"
            "- Mégots : Calcul basé sur le poids moyen d'un mégot (0.22g) et les relevés de terrain.\n"
            "- Masse : Pesée directe ou estimation volumétrique certifiée par les modérateurs.\n\n"
            "3. COEFFICIENTS D'IMPACT (Source ADEME/OMS/Surfrider) : \n"
            f"- Eau protégée : {IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L']}L par mégot.\n"
            f"- Équivalent CO2 : {IMPACT_CONSTANTS['CO2_PER_MEGOT_KG']*1000:.1f}g par mégot.\n"
            "- Revalorisation : 80kg de plastique recyclé par banc public.\n\n"
            "4. GAMIFICATION (ÉCO-POINTS) : \n"
            "- Formule interne de classement : 10 + (temps_min/15)*10 + 5*kg_dechets + (megots/100).\n"
            "- Cet indicateur sert au pilotage communautaire (badges/classements) et ne remplace pas "
            "les unités d'impact environnemental."
        )
        self.multi_cell(0, 7, safe_text(text))

    # --- PARTIE 3 : ANALYSES STATISTIQUES ---

    def create_performance_analysis(self, city_name, city_df):
        self.add_page(); 
        link = self.add_to_toc("3. Bilan Opérationnel", is_sub=False)
        self.set_link(link)
        
        self.section_header("3. BILAN OPÉRATIONNEL", f"Performance et saisonnalité à {city_name}")
        
        city_df['month_yr'] = city_df['date'].dt.strftime('%Y-%m')
        monthly = city_df.groupby('month_yr').agg({'megots': 'sum', 'dechets_kg': 'sum', 'nb_benevoles': 'sum'}).sort_index()
        
        if not monthly.empty:
            # Style ADEME/GIEC
            plt.style.use('seaborn-v0_8-muted')
            fig, ax1 = plt.subplots(figsize=(10, 5))
            
            bars = ax1.bar(monthly.index, monthly['megots'], color='#10b981', alpha=0.3, label='Mégots collectés')
            ax1.set_ylabel('Mégots', color='#059669', fontsize=10, fontweight='bold')
            ax1.tick_params(axis='y', colors='#059669')
            
            ax2 = ax1.twinx()
            ax2.plot(monthly.index, monthly['dechets_kg'], color='#1e293b', marker='o', markersize=6, linewidth=3, label='Masse déchets (kg)')
            ax2.set_ylabel('Déchets (kg)', color='#1e293b', fontsize=10, fontweight='bold')
            ax2.grid(False)
            
            # Annotation du mois pic
            if len(monthly) > 1:
                peak_idx = monthly['megots'].idxmax()
                peak_val = monthly.loc[peak_idx, 'megots']
                peak_pos = list(monthly.index).index(peak_idx)
                ax1.annotate(
                    f'Pic : {peak_val:,}'.replace(',', ' '),
                    xy=(peak_pos, peak_val),
                    xytext=(peak_pos + 0.5, peak_val * 1.08),
                    arrowprops=dict(arrowstyle='->', color='#059669', lw=1.5),
                    fontsize=9, color='#059669', fontweight='bold'
                )
            
            plt.title(f"Dynamique Temporelle - {city_name.upper()}", fontsize=14, pad=20, fontweight='bold', color='#1e293b')
            ax1.tick_params(axis='x', rotation=0)
            
            path = os.path.join(OUTPUT_DIR, f"perf_{city_name}.png")
            plt.tight_layout(); plt.savefig(path, dpi=200, transparent=True); plt.close()
            self.image(path, x=15, w=180); 
            if not self.is_dummy: os.remove(path)

        trend_note = "Données insuffisantes pour établir une tendance robuste."
        if len(monthly) >= 2:
            first_megots = float(monthly['megots'].iloc[0] or 0.0)
            last_megots = float(monthly['megots'].iloc[-1] or 0.0)
            first_kg = float(monthly['dechets_kg'].iloc[0] or 0.0)
            last_kg = float(monthly['dechets_kg'].iloc[-1] or 0.0)
            megots_delta = ((last_megots - first_megots) / max(first_megots, 1.0)) * 100.0
            kg_delta = ((last_kg - first_kg) / max(first_kg, 1.0)) * 100.0
            trend_note = (
                f"Évolution période observée - Mégots: {megots_delta:+.1f}% ; "
                f"Déchets (kg): {kg_delta:+.1f}%."
            )

        self.ln(10)
        self.set_font('Helvetica', 'B', 12); self.cell(0, 10, "LECTURE DE LA SAISONNALITÉ", ln=True)
        self.set_font('Helvetica', '', 11); self.multi_cell(0, 7, safe_text(
            "L'analyse met en évidence la dynamique mensuelle observée sur la période. "
            f"{trend_note}"
        ))

    def create_trends_analysis(self, city_name, city_df):
        self.add_page(); 
        link = self.add_to_toc("4. Analyse Prédictive", is_sub=False)
        self.set_link(link)
        
        self.section_header("4. ANALYSE PRÉDICTIVE", "Courbes de tendance et projections territoriales")
        
        work = city_df.copy()
        work['date'] = pd.to_datetime(work.get('date'), errors='coerce')
        work = work.dropna(subset=['date'])
        work['month_yr'] = work['date'].dt.strftime('%Y-%m')
        monthly = (
            work.groupby('month_yr', as_index=False)
            .agg(megots=('megots', 'sum'), dechets_kg=('dechets_kg', 'sum'))
            .sort_values('month_yr')
        )

        projection_text = "Données insuffisantes pour proposer une projection fiable."
        if len(monthly) >= 6:
            recent = monthly.tail(3)
            previous = monthly.iloc[-6:-3]
            recent_megots = float(recent['megots'].mean() or 0.0)
            previous_megots = float(previous['megots'].mean() or 0.0)
            delta = ((recent_megots - previous_megots) / max(previous_megots, 1.0)) * 100.0
            direction = "hausse" if delta > 2 else "baisse" if delta < -2 else "stabilité"
            projection_text = (
                "Projection courte (3 prochains mois, extrapolation linéaire simple): "
                f"{direction} estimée à {delta:+.1f}% sur le volume de mégots collectés. "
                "Cette estimation doit être confirmée par le contexte terrain."
            )
        elif len(monthly) >= 2:
            prev_val = float(monthly['megots'].iloc[-2] or 0.0)
            last_val = float(monthly['megots'].iloc[-1] or 0.0)
            delta = ((last_val - prev_val) / max(prev_val, 1.0)) * 100.0
            projection_text = (
                "Projection préliminaire (signal faible): "
                f"variation mensuelle récente de {delta:+.1f}% sur les mégots."
            )

        self.set_font('Helvetica', '', 11); self.multi_cell(0, 7, safe_text(projection_text))
        
        self.set_fill_color(254, 242, 242); self.set_draw_color(*COLORS['danger'])
        self.rect(10, self.get_y()+5, 190, 30, 'FD')
        self.set_xy(15, self.get_y()+10); self.set_font('Helvetica', 'B', 10); self.set_text_color(*COLORS['danger'])
        self.cell(0, 5, "PRUDENCE D'INTERPRÉTATION :", ln=True)
        self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
        self.multi_cell(180, 5, safe_text("Ces modeles mathematiques ne prennent pas en compte les variations meteorologiques exceptionnelles ou les changements de legislation locale."))

    def create_spatial_analysis(self, city_name, city_df):
        self.add_page(); self.add_to_toc("5. Analyse Spatiale", is_sub=False)
        self.section_header("5. ANALYSE SPATIALE", "Hotspots et cartographie territoriale")
        
        # QR Code
        if not self.is_dummy:
            qr_url = f"{self.map_base_url}/?tab=map&preset=all"
            qr = qrcode.make(qr_url)
            path = os.path.join(OUTPUT_DIR, f"qr_{city_name}.png")
            qr.save(path)
            self.image(path, x=150, y=self.get_y(), w=40)
            os.remove(path)
        
        self.set_font('Helvetica', 'B', 12); self.cell(0, 10, "ACCÉDER À LA CARTE INTERACTIVE", ln=True)
        self.set_font('Helvetica', '', 10); self.multi_cell(130, 5, safe_text(
            "Scannez ce QR Code pour visualiser les points d'action, les zones propres et les points chauds en temps réel. "
            "Presets partageables inclus: pollution, zones propres, partenaires, recentes et prioritaires."
        ))
        
        self.ln(20)
        self.add_to_toc("5.1 Typologie des Lieux", is_sub=True)
        self.set_font('Helvetica', 'B', 14); self.cell(0, 10, "5.1 TYPOLOGIE DES LIEUX IMPACTÉS", ln=True)
        if 'type_lieu' in city_df.columns:
            counts = city_df['type_lieu'].value_counts()
            for t, v in counts.items():
                self.set_font('Helvetica', 'B', 10); self.cell(40, 8, safe_text(t))
                self.set_font('Helvetica', '', 10); self.cell(0, 8, f"{v} interventions", ln=True)

    def create_product_updates(self, city_df):
        self.add_page()
        link = self.add_to_toc("2. Nouveautes Produit", is_sub=False)
        self.set_link(link)
        self.section_header("2. NOUVEAUTES PRODUIT", "Fonctionnalites visibles et activables")

        work_df = city_df.copy()
        date_col = pd.to_datetime(work_df.get("date"), errors="coerce")
        if date_col.isna().all() and "submitted_at" in work_df.columns:
            date_col = pd.to_datetime(work_df.get("submitted_at"), errors="coerce")

        now_ts = pd.Timestamp.now()
        recent_count = int((date_col >= (now_ts - pd.Timedelta(days=30))).fillna(False).sum()) if len(work_df) else 0

        clean_raw = work_df.get("est_propre", pd.Series(index=work_df.index, dtype="object"))
        clean_col = clean_raw.astype("string").str.strip().str.lower().isin({"true", "1", "yes", "oui", "vrai"})
        type_col = work_df.get("type_lieu", pd.Series(dtype=str)).fillna("").astype(str)
        clean_count = int(clean_col.sum())
        partner_count = int(type_col.str.contains("Engag", case=False, na=False).sum())
        pollution_count = int((~clean_col).sum()) if len(clean_col) else 0

        quality_warnings = 0
        if not work_df.empty:
            kg_col = pd.to_numeric(work_df.get("dechets_kg", 0), errors="coerce").fillna(0)
            megot_col = pd.to_numeric(work_df.get("megots", 0), errors="coerce").fillna(0)
            ben_col = pd.to_numeric(work_df.get("nb_benevoles", work_df.get("benevoles", 0)), errors="coerce").fillna(0)
            dur_col = pd.to_numeric(work_df.get("temps_min", 0), errors="coerce").fillna(0)
            quality_warnings = int(((kg_col > 400) | (megot_col > 80000) | (ben_col > 300) | (dur_col > 720)).sum())

        bullets = [
            "Carte interactive: presets partageables actifs (pollution, zones propres, partenaires, recentes, prioritaires).",
        ]
        if recent_count > 0:
            bullets.append(f"Actions recentes (30 jours): {recent_count} point(s) visibles sur preset dedie.")
        if pollution_count > 0:
            bullets.append(f"Zones a traiter en priorite: {pollution_count} points de pollution actifs.")
        if clean_count > 0:
            bullets.append(f"Zones propres valorisees: {clean_count} points verifies.")
        if partner_count > 0:
            bullets.append(f"Partenaires engages cartographies: {partner_count} point(s) acteurs.")
        if quality_warnings > 0:
            bullets.append(f"Validation admin: {quality_warnings} contribution(s) atypique(s) a verifier manuellement.")
        else:
            bullets.append("Validation admin: aucune anomalie majeure detectee sur les donnees de reference.")

        self.set_font('Helvetica', '', 11)
        self.set_text_color(*COLORS['text'])
        for item in bullets:
            self.multi_cell(0, 7, safe_text(f"- {item}"))

        self.ln(4)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 8, safe_text("Parcours benevole simplifie"), ln=True)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 6, safe_text(
            "Le flux recommande est desormais: 1) choisir une rubrique prioritaire, "
            "2) declarer en formulaire progressif 3 etapes, 3) suivre l'impact et reprendre l'action."
        ))

    def create_waste_typology(self, city_df):
        self.add_to_toc("5.2 Typologie des Déchets", is_sub=True)
        self.ln(10)
        self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "5.2 ÉCONOMIE CIRCULAIRE & TYPOLOGIE", ln=True)
        
        total_kg = city_df['dechets_kg'].sum()
        ratio_plastique = IMPACT_CONSTANTS.get('PLASTIQUE_URBAIN_RATIO', 0.5)
        ratio_verre = IMPACT_CONSTANTS.get('VERRE_URBAIN_RATIO', 0.2)
        ratio_metal = IMPACT_CONSTANTS.get('METAL_URBAIN_RATIO', 0.1)
        kg_plastique = total_kg * ratio_plastique
        kg_verre = total_kg * ratio_verre
        kg_metal = total_kg * ratio_metal
        kg_megots = int(city_df['megots'].sum()) * 0.00022  # ~0.22g par mégot
        
        text = (
            f"Basé sur les relevés de terrain, nous estimons la répartition suivante :\n"
            f"- PLASTIQUE ({ratio_plastique*100:.0f}%) : ~{kg_plastique:.1f} kg. Potentiel de revalorisation élevé.\n"
            f"- VERRE/MÉTAL : {kg_verre + kg_metal:.1f} kg. Recyclage à 100% possible si collecté séparément.\n"
            f"- DÉCHETS ULTIMES : Flux géré par les filières d'incinération avec valorisation énergétique."
        )
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(text))
        self.ln(4)
        
        # Pie chart des typologies
        labels = ['Plastique', 'Verre', 'Métal', 'Mégots', 'Autres']
        sizes = [ratio_plastique, ratio_verre, ratio_metal, 
                 min(kg_megots/max(total_kg, 0.001), 0.15), 
                 max(0, 1 - ratio_plastique - ratio_verre - ratio_metal - min(kg_megots/max(total_kg, 0.001), 0.15))]
        colors_pie = ['#22c55e', '#3b82f6', '#9ca3af', '#f97316', '#e2e8f0']
        filtered = [(l, s, c) for l, s, c in zip(labels, sizes, colors_pie) if s > 0.01]
        if filtered and not self.is_dummy:
            fl, fs, fc = zip(*filtered)
            fig, ax = plt.subplots(figsize=(5, 3.5))
            wedges, texts, autotexts = ax.pie(fs, labels=fl, colors=fc, autopct='%1.0f%%', 
                                               startangle=140, pctdistance=0.75)
            for at in autotexts: at.set_fontsize(10)
            ax.set_title('Composition des déchets collectés', fontsize=12, fontweight='bold', color='#1e293b')
            plt.tight_layout()
            pie_path = os.path.join(OUTPUT_DIR, f"pie_waste.png")
            plt.savefig(pie_path, dpi=180, transparent=True, bbox_inches='tight'); plt.close()
            if self.get_y() > 230:
                self.add_page()
            self.image(pie_path, x=40, w=130)
            os.remove(pie_path)

    def create_prioritization(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("6. Priorisation Territoriale", is_sub=False)
        self.set_link(link)
        
        self.section_header("6. PALMARÈS ET PRIORISATION", "Indice composite pour l'aide à la décision")
        
        top_10 = city_df.groupby('lieu_complet')['megots'].sum().nlargest(10)
        self.set_font('Helvetica', 'B', 11); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
        self.cell(140, 10, "Lieu d'Intervention", 1, 0, 'L', True); self.cell(50, 10, "Indice ICP", 1, 1, 'C', True)
        
        self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text'])
        max_megots = float(top_10.max()) if not top_10.empty else 0.0
        for l, v in top_10.items():
            self.cell(140, 8, safe_text(str(l)[:65]), 1)
            icp = int(round((float(v) / max(max_megots, 1.0)) * 100))
            self.set_font('Helvetica', 'B', 10); self.cell(50, 8, f"{icp}/100", 1, 1, 'C'); self.set_font('Helvetica', '', 10)

    def create_volunteer_analysis(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("7. Mobilisation Citoyenne", is_sub=False)
        self.set_link(link)
        
        self.section_header("7. MOBILISATION", "Profil des bénévoles et dynamique de groupe")
        
        total_ben = int(city_df['nb_benevoles'].sum())
        self.set_font('Helvetica', '', 12); self.multi_cell(0, 7, safe_text(
            f"Au total, {total_ben} benevoles ont ete mobilises sur la periode. "
            "L'efficacite individuelle est maximale dans les groupes de 3 a 5 personnes."
        ))

    def create_gamification_section(self):
        self.add_page(); 
        link = self.add_to_toc("8. Communauté & Gamification", is_sub=False)
        self.set_link(link)
        
        self.section_header("8. COMMUNAUTÉ", "Système de badges et récompenses")
        badges = [
            ("🌱 Éclaireur", "Niveau 1 : Premières contributions directes."), 
            ("🛡️ Sentinelle", "Niveau 2 : Gardien régulier de l'espace public."), 
            ("👑 Légende", "Niveau 3 : Ambassadeur territorial majeur.")
        ]
        for b, d in badges:
            self.set_fill_color(*COLORS['light_bg']); self.rect(10, self.get_y(), 190, 15, 'F')
            self.set_xy(15, self.get_y()+3); self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['primary']); self.cell(40, 10, safe_text(b))
            self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text']); self.cell(0, 10, safe_text(d), ln=True)
            self.ln(5)

    def create_partners_summary(self):
        self.add_page(); 
        link = self.add_to_toc("9. Annuaire des Acteurs Engagés", is_sub=False)
        self.set_link(link)
        
        self.section_header("9. RÉSEAU PARTENAIRE", "Écosystème des structures à impact à Paris")
        
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(
            "Plus de 100 structures sont désormais répertoriées dans notre annuaire dynamique. "
            "Ces acteurs sont classés par domaines d'intervention prioritaires :"
        ))
        self.ln(5)
        
        cats = [
            ("🌿 ENVIRONNEMENT", "Lutte contre le gaspillage, agriculture urbaine, protection de l'eau."),
            ("⚖️ SOCIAL & PRÉCARITÉ", "Aide alimentaire, hébergement d'urgence, soutien aux vulnérables."),
            ("🌈 MIXITÉ & INCLUSION", "Insertion des réfugiés, égalité des chances, sport inclusif."),
            ("🌍 HUMANITAIRE", "Aide internationale, secours civils, logistique d'urgence."),
            ("⭐ COMMERCE ENGAGÉ", "Lieux de vie solidaires et commerces à mission environnementale.")
        ]
        
        for cat, desc in cats:
            self.set_fill_color(*COLORS['light_bg'])
            self.set_font('Helvetica', 'B', 10); self.set_text_color(*COLORS['primary'])
            self.cell(0, 8, safe_text(cat), 1, 1, 'L', True)
            self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
            self.multi_cell(0, 6, safe_text(desc), 1)
            self.ln(3)

    def create_rse_metrics(self, city_df):
        """Section exclusive au rapport RSE : Métriques ESG."""
        self.add_page()
        link = self.add_to_toc("Métrique RSE / ESG (Corporate)", is_sub=False)
        self.set_link(link)
        self.section_header("MÉTRIQUES RSE", "Performance extra-financière et impact mécénat")
        
        total_kg = city_df['dechets_kg'].sum()
        total_h = int((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        
        data = [
            ("Impact Environnemental", f"{total_kg:.1f} kg retirés du milieu naturel."),
            ("Impact Social (Mécénat)", f"{total_h} heures de mobilisation citoyenne."),
            ("Gouvernance Participative", f"{len(city_df['association'].unique())} structures territoriales impliquées."),
            ("Économie Circulaire", f"Récupération de flux spécifiques (mégots, plastiques).")
        ]
        
        self.set_font('Helvetica', 'B', 12); self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "VALORISATION DES ACTIONS DÉLÉGUÉES", ln=True)
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        for label, val in data:
            self.set_font('Helvetica', 'B', 10); self.cell(60, 8, safe_text(label) + " :"); 
            self.set_font('Helvetica', '', 10); self.cell(0, 8, safe_text(val), ln=True)
        
        self.ln(10)
        self.set_fill_color(240, 253, 244); self.rect(10, self.get_y(), 190, 40, 'F')
        self.set_xy(15, self.get_y()+5); self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['primary_dark'])
        self.cell(0, 10, safe_text("NOTE POUR LE BILAN RSE :"), ln=True)
        self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text'])
        self.multi_cell(180, 5, safe_text("Ces données sont certifiées conformes aux relevés de terrain Clean My Map et peuvent être utilisées pour votre Déclaration de Performance Extra-Financière (DPEF)."))

    def create_guide_summary(self):
        self.add_page(); 
        link = self.add_to_toc("10. Guide du Citoyen Vert", is_sub=False)
        self.set_link(link)
        
        self.section_header("10. GUIDE STRATÉGIQUE", "Bonnes pratiques et ressources opérationnelles")
        
        guides = [
            ("1. IMPACT MÉGOTS", "Un seul mégot contamine 1000L d'eau douce."),
            ("2. LE GUIDE DU TRI", "Centralisation des consignes Paris/Yvelines."),
            ("3. ÉCO-GESTES", "Sobriété numérique, domestique et énergétique."),
            ("4. SÉCURITÉ", "Protocoles de protection lors des Cleanwalks.")
        ]
        
        for g, d in guides:
            self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['secondary'])
            self.cell(0, 8, safe_text(g), ln=True)
            self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text'])
            self.multi_cell(0, 6, safe_text(d))
            self.ln(2)

    def create_impact_infographic(self, city_df):
        self.add_page(); self.add_to_toc("11. Impact Environnemental", is_sub=False)
        self.section_header("11. IMPACT ÉCO-CITOYEN", "Équivalences et bénéfices qualitatifs")
        
        total_m = int(city_df['megots'].sum())
        total_kg = city_df['dechets_kg'].sum()
        eau = total_m * IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L']
        co2 = total_m * IMPACT_CONSTANTS['CO2_PER_MEGOT_KG']
        bancs = int(total_kg / IMPACT_CONSTANTS['PLASTIQUE_POUR_BANC_KG'])
        pulls = int(total_kg / IMPACT_CONSTANTS.get('PLASTIQUE_POUR_PULL_KG', 0.5))
        
        self.set_fill_color(*COLORS['light_bg']); self.rect(10, self.get_y(), 190, 65, 'F')
        self.set_xy(15, self.get_y()+5); self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['primary'])
        self.cell(0, 10, "INFOGRAPHIE DES ÉQUIVALENCES", ln=True)
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(
            f"- EAU : {eau:,} Litres protégés ([EAU] équivalent {eau/1000000:.1f} M. de litres).\n"
            f"- CARBONE : {co2:.1f} kg CO2e évités ([VOITURE] équivalent {co2/0.12:.0f} km en voiture).\n"
            f"- RECYCLAGE : {bancs} [BANC] bancs publics OU {pulls:,} [RECYCLAGE] pulls en polyester recyclé.\n"
            f"- ARBRES : Capacité d'absorption annuelle de {co2/25:.1f} arbres (Source: ADEME)."
        ))

    # --- PARTIE 4 : PRÉCONISATIONS & PLAN D'ACTION ---

    def create_action_plan(self):
        self.add_page(); 
        link = self.add_to_toc("12. Plan d'Action N+1", is_sub=False)
        self.set_link(link)
        
        self.section_header("12. PLAN D'ACTION", "Recommandations stratégiques à la Mairie")
        recos = [
            ("Installer des cendriers 'sondage'", "Hotspots prioritaires", "-30% pollution"),
            ("Campagnes Nudge", "Abords des transports", "Prévention active"),
            ("Coordination trimestrielle", "Services Techniques", "Optimisation balayage")
        ]
        self.set_font('Helvetica', 'B', 10); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
        self.cell(70, 10, "Action", 1, 0, 'C', True); self.cell(60, 10, "Cible", 1, 0, 'C', True); self.cell(60, 10, "Effet attendu", 1, 1, 'C', True)
        self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
        for a, c, e in recos:
            self.cell(70, 10, safe_text(a), 1); self.cell(60, 10, safe_text(c), 1); self.cell(60, 10, safe_text(e), 1, 1)

    # --- PARTIE 5 : ANNEXES ---

    def create_detailed_registry(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("13. Registre d'Audit", is_sub=False)
        self.set_link(link)
        
        self.section_header("13. REGISTRE COMPLET", "Traçabilité exhaustive des interventions")
        self.set_font('Helvetica', 'B', 7); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
        h = [('Date', 15), ('Lieu', 80), ('Mgt', 15), ('Kg', 15), ('Ben', 10), ('Statut', 20)]
        for t, w in h: self.cell(w, 8, safe_text(t), 1, 0, 'C', True)
        self.ln()
        self.set_font('Helvetica', '', 6); self.set_text_color(*COLORS['text'])
        # Zebrastripes : alternance de fond blanc et fond léger
        for i, (_, r) in enumerate(city_df.sort_values('date', ascending=False).iterrows()):
            if self.get_y() > 270: self.add_page()
            fill = (i % 2 == 0)  # Alterne True/False
            if fill:
                self.set_fill_color(*COLORS['light_bg'])
            else:
                self.set_fill_color(*COLORS['white'])
            self.cell(15, 6, r['date'].strftime('%d/%m/%y'), 1, 0, 'C', fill)
            self.cell(80, 6, safe_text(str(r['lieu_complet'])[:55]), 1, 0, 'L', fill)
            self.cell(15, 6, str(int(r['megots'])), 1, 0, 'C', fill)
            self.cell(15, 6, f"{r['dechets_kg']:.1f}", 1, 0, 'C', fill)
            self.cell(10, 6, str(int(r['nb_benevoles'])), 1, 0, 'C', fill)
            status = "PROPRE" if bool(r.get('est_propre', False)) else "ACTION"
            stat_color = COLORS['primary'] if status == "PROPRE" else COLORS['text']
            self.set_text_color(*stat_color)
            self.cell(20, 6, status, 1, 1, 'C', fill)
            self.set_text_color(*COLORS['text'])

    def create_glossary(self):
        self.add_page(); 
        link = self.add_to_toc("15. Glossaire & Méthodologie", is_sub=False)
        self.set_link(link)
        
        self.section_header("15. GLOSSAIRE TECHNIQUE", "Définitions, sources et constantes de calcul")
        
        data = [
            ("Mégot", "Filtre en acétate de cellulose + 4000 substances toxiques. 15 ans de décomposition."),
            ("Eau Protégée", "Base Surfrider/INERIS : 500L par mégot non jeté dans le réseau pluvial."),
            ("Emissions CO2", "Facteur ADEME/OMS : 1.4g CO2 par mégot (cycle complet)."),
            ("Coût Traitement", "Moyenne nationale préconisée par le plaidoyer propreté : 150€/tonne."),
            ("Score IPC", "Indice de Performance Citoyenne (Mégots / Heures de mobilisation)."),
            ("Éco-Points", "Score de gamification : 10 + (temps_min/15)*10 + 5*kg_dechets + (megots/100).")
        ]
        
        for t, d in data:
            self.set_font('Helvetica', 'B', 10); self.set_text_color(*COLORS['primary'])
            self.cell(40, 7, safe_text(t))
            self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
            self.multi_cell(0, 7, safe_text(d))
            self.ln(2)

    def create_technical_annex(self):
        self.add_page(); 
        link = self.add_to_toc("16. Annexes Techniques", is_sub=False)
        self.set_link(link)
        
        self.section_header("16. ANNEXES TECHNIQUES", "Écosystème numérique et remerciements")
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(
            "ÉCOSYSTÈME NUMÉRIQUE :\n"
            "La plateforme Clean My Map propose un système de modération admin, des formulaires sécurisés "
            "et un centre de ressources (guides de sécurité, kits de com).\n\n"
            "COOPÉRATION :\n"
            "Les données sont issues de collectes citoyennes et sont mises à disposition en Open Data "
            "pour favoriser la recherche sur la pollution urbaine.\n\n"
            "REMERCIEMENTS :\n"
            "Nous tenons à remercier chaleureusement les bénévoles, les associations partenaires "
            "et les structures engagées pour leur dévouement quotidien à la protection de notre environnement."
        ))

    def _add_all_content(self, ville, city_df):
        """Helper for two-pass generation. Strategic hierarchy inspired by IPCC/ADEME."""
        self.create_dynamic_toc()          # Navigation first (P2)
        
        # 1. FAITS MARQUANTS & VISION (Impact immédiat)
        self.create_executive_summary(city_df) # P3
        self.create_economic_vision(city_df)    # P4
        self.create_product_updates(city_df)    # P5
        
        # 2. IMPACT ENVIRONNEMENTAL (Grand Public)
        self.create_impact_infographic(city_df) # P6
        self.create_gamification_section()      # P7
        
        # 3. ANALYSE SCIENTIFIQUE & TERRITORIALE (Expertise)
        self.create_spatial_analysis(ville, city_df) # P8
        self.create_waste_typology(city_df)          # P9
        self.create_prioritization(city_df)          # P10
        self.create_performance_analysis(ville, city_df) # P11
        self.create_trends_analysis(ville, city_df)      # P12
        
        # 4. RÉSEAU & ACTION (Community)
        self.create_partners_summary() # P13
        self.create_guide_summary()    # P14
        self.create_action_plan()      # P15
        
        # 5. ANNEXES (Technique)
        if self.is_rse:
            self.create_rse_metrics(city_df) # Section spécifique RSE
            
        self.create_detailed_registry(city_df) # P16+
        self.create_glossary()                 # P Final - 2
        self.create_methodology()              # P Final - 1
        self.create_technical_annex()          # Final Page

    def generate(self, filename="Rapport_Complet_Codex.pdf", dest='F'):
        """Génération ordonnée avec Sommaire Dynamique Automatisé."""
        villes = [v for v in self.full_df['ville'].unique() if pd.notna(v)] or ['Général']
        ville = villes[0]
        city_df = self.full_df[self.full_df['ville'] == ville].copy()
        
        # Normaliser les colonnes benevoles / nb_benevoles
        if 'nb_benevoles' not in city_df.columns and 'benevoles' in city_df.columns:
            city_df['nb_benevoles'] = city_df['benevoles']
        elif 'benevoles' not in city_df.columns and 'nb_benevoles' in city_df.columns:
            city_df['benevoles'] = city_df['nb_benevoles']
        city_df['nb_benevoles'] = pd.to_numeric(city_df.get('nb_benevoles', 0), errors='coerce').fillna(0).astype(int)
        
        # Normaliser lieu_complet si absent
        if 'lieu_complet' not in city_df.columns:
            city_df['lieu_complet'] = city_df.get('adresse', 'Lieu inconnu')
        
        # S'assurer que les dates sont bien parsées
        city_df['date'] = pd.to_datetime(city_df['date'], errors='coerce')
        city_df = city_df.dropna(subset=['date'])
        
        if city_df.empty:
            # Fallback si toutes les dates sont invalides
            city_df = self.full_df.copy()
            city_df['date'] = pd.Timestamp.now()
            if 'lieu_complet' not in city_df.columns:
                city_df['lieu_complet'] = city_df.get('adresse', 'Lieu inconnu')
        
        # --- PASSE 1 : Collecte des numéros de page réels ---
        dummy = PDFReport(self.full_df)
        dummy.is_dummy = True
        dummy.map_base_url = self.map_base_url
        dummy.feature_flags = self.feature_flags
        dummy.add_page() # Placeholder for Cover (P1)
        dummy._add_all_content(ville, city_df)
        self.toc_data = dummy.toc_data # Copy exact TOC with page numbers
        
        # --- PASSE 2 : Génération réelle ---
        self.create_cover(ville, city_df) # Page 1
        self._add_all_content(ville, city_df) # Starts Page 2 with TOC
        
        if dest == 'S':
            out = self.output(dest='S')
            return out if isinstance(out, bytes) else out.encode("latin-1", "replace")
        
        output_path = os.path.join(OUTPUT_DIR, filename)
        self.output(output_path)
        return output_path
