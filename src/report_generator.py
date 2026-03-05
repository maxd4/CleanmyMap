import os
import unicodedata
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt
from fpdf import FPDF
from .config import OUTPUT_DIR

# --- CHARTE GRAPHIQUE (Style Premium / Clean My Map) ---
COLORS = {
    'primary': (16, 185, 129),    # Emeraude
    'primary_dark': (5, 150, 105), 
    'secondary': (30, 41, 59),    # Ardoise Foncé (Slate 800)
    'text': (51, 65, 85),         # Slate 700
    'text_light': (100, 116, 139),# Slate 500
    'light_bg': (248, 250, 252),  # Slate 50
    'border': (226, 232, 240),    # Slate 200
    'white': (255, 255, 255),
    'danger': (239, 68, 68),      # Rouge
}

def safe_text(text):
    """Nettoyage pour compatibilité PDF Latin-1 et remplacement des icônes tags."""
    if not isinstance(text, str):
        text = str(text)
    remplacements = {
        '📊': '[STATS]', '📈': '[HAUSSE]', '📉': '[BAISSE]', '📄': '[DOC]',
        '📍': '[LIEU]', '🗺️': '[CARTE]', '🏆': '[TOP]', '🤝': '[ASSO]',
        '👥': '[BENEVOLES]', '🎯': '[OBJECTIF]', '✅': '[OK]', '⚠️': '[ATTENTION]',
        '🚬': '[MEGOT]', '🗑️': '[DECHET]', '⏱️': '[TEMPS]', '🌍': '[TERRE]',
        '🌳': '[ARBRE]', '⚡': '[EFFICACITE]', '📅': '[DATE]', '✨': '*',
    }
    for emoji, replacement in remplacements.items():
        text = text.replace(emoji, replacement)
    return unicodedata.normalize('NFKD', text).encode('latin1', 'ignore').decode('latin1')

class PDFReport(FPDF):
    def __init__(self, df: pd.DataFrame):
        super().__init__()
        self.df = df
        self.set_auto_page_break(auto=True, margin=25)
        self.report_date = datetime.now().strftime("%d/%m/%Y")
        
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'B', 9)
            self.set_text_color(*COLORS['primary'])
            self.cell(0, 10, 'CLEAN MY MAP - RAPPORT D\'IMPACT ENVIRONNEMENTAL', 0, 0, 'L')
            self.set_text_color(*COLORS['text_light'])
            self.cell(0, 10, f'Page {self.page_no()}', 0, 1, 'R')
            self.set_draw_color(*COLORS['border'])
            self.line(10, 20, 200, 20)
            self.ln(5)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-20)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(*COLORS['text_light'])
            self.cell(0, 10, safe_text('Document officiel généré par la Brigade des Élites - Protection de la biodiversité urbaine'), 0, 0, 'C')

    def section_header(self, title, subtitle):
        """Crée une transition visuelle forte pour chaque début de page."""
        self.set_font('Helvetica', 'B', 24)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 15, safe_text(title), 0, 1, 'L')
        self.set_font('Helvetica', 'I', 13)
        self.set_text_color(*COLORS['primary'])
        self.cell(0, 10, safe_text(subtitle), 0, 1, 'L')
        self.ln(5)
        self.set_draw_color(*COLORS['primary'])
        self.set_line_width(1.5)
        self.line(10, self.get_y(), 60, self.get_y())
        self.ln(15)

    def create_cover(self):
        self.add_page()
        self.set_fill_color(*COLORS['secondary'])
        self.rect(0, 0, 210, 120, 'F')
        self.set_y(50)
        self.set_font('Helvetica', 'B', 45)
        self.set_text_color(255, 255, 255)
        self.cell(0, 20, 'CLEAN MY MAP', 0, 1, 'C')
        self.ln(5)
        self.set_font('Helvetica', '', 22)
        self.cell(0, 15, safe_text('BILAN D\'IMPACT CITOYEN'), 0, 1, 'C')
        self.set_y(100)
        self.set_draw_color(*COLORS['primary'])
        self.set_line_width(2)
        self.line(70, 105, 140, 105)
        self.set_y(150)
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, safe_text('Rapport Annuel de Dépollution'), 0, 1, 'C')
        self.set_font('Helvetica', '', 14)
        self.set_text_color(*COLORS['text'])
        self.cell(0, 10, f'Periode : {self.report_date}', 0, 1, 'C')
        self.set_y(240)
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(*COLORS['primary'])
        self.cell(0, 10, 'PROGRAMME DE SCIENCE CITOYENNE', 0, 1, 'C')

    def create_toc(self):
        self.add_page()
        self.section_header("SOMMAIRE", "Structure et organisation du document")
        sections = [
            ("1. Synthèse Executive & Dashboard", "Vue d'ensemble des indicateurs clés"),
            ("2. Registre des Interventions", "Historique exhaustif des actions terrain"),
            ("3. Dynamique Temporelle", "Analyse des tendances et saisonnalité"),
            ("4. Géographie de la Pollution", "Palmarès des zones à enjeux"),
            ("5. Acteurs et Partenaires", "Contribution des structures associatives"),
            ("6. Impact Écologique & Économique", "Valorisation de l'effort citoyen"),
            ("7. Sociologie de l'Engagement", "Profil et mobilisation des bénévoles"),
            ("8. Plan d'Action & Recommandations", "Perspectives et objectifs futurs"),
            ("9. Cadre Méthodologique", "Sources et coefficients scientifiques")
        ]
        self.ln(10)
        for i, (title, desc) in enumerate(sections, 3):
            self.set_font('Helvetica', 'B', 14)
            self.set_text_color(*COLORS['secondary'])
            self.cell(10, 10, str(i-2), 0, 0)
            self.cell(140, 10, safe_text(title), 0, 0)
            self.set_text_color(*COLORS['primary'])
            self.cell(0, 10, f"Page {i}", 0, 1, 'R')
            self.set_x(20)
            self.set_font('Helvetica', '', 10)
            self.set_text_color(*COLORS['text_light'])
            self.cell(0, 5, safe_text(desc), 0, 1)
            self.ln(5)
            self.set_draw_color(*COLORS['border'])
            self.line(20, self.get_y(), 200, self.get_y())
            self.ln(5)

    def create_global_dashboard(self):
        self.add_page()
        self.section_header("1. SYNTHÈSE EXECUTIVE", "Indicateurs de performance globale")
        self.set_font('Helvetica', '', 12)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 8, safe_text(
            "Ce document consolide les efforts de dépollution menés par les brigades citoyennes. "
            "Au-delà des chiffres, il illustre une volonté commune de réappropriation de l'espace public "
            "et de protection active de nos écosystèmes urbains contre les pollutions chimiques et plastiques."
        ))
        self.ln(15)
        total_megots = self.df['megots'].sum()
        total_kg = self.df['dechets_kg'].sum()
        self.set_fill_color(*COLORS['light_bg'])
        self.rect(10, self.get_y(), 190, 60, 'F')
        self.set_xy(20, self.get_y() + 10)
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*COLORS['secondary'])
        self.cell(85, 10, "MÉGOTS RAMASSÉS", 0, 0, 'C')
        self.cell(85, 10, "DÉCHETS COLLECTÉS", 0, 1, 'C')
        self.set_x(20)
        self.set_font('Helvetica', 'B', 36)
        self.set_text_color(*COLORS['primary'])
        self.cell(85, 20, f"{int(total_megots):,}".replace(',', ' '), 0, 0, 'C')
        self.cell(85, 20, f"{total_kg:.1f} KG", 0, 1, 'C')
        self.ln(25)
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "INTERPRÉTATION DE L'IMPACT", 0, 1)
        impact_text = (
            f"L'extraction de ces {int(total_megots):,} mégots a permis de préserver directement "
            f"{int(total_megots * 500):,} litres d'eau d'une contamination toxique majeure. "
            "Chaque action validée dans ce rapport contribue à réduire la charge polluante qui finit "
            "habituellement dans les réseaux d'assainissement et, in fine, dans les fleuves et océans."
        )
        self.set_font('Helvetica', '', 12)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(impact_text))

    def create_action_registry(self):
        self.add_page()
        self.section_header("2. REGISTRE DES ACTIONS", "Historique détaillé des interventions terrain")
        self.set_font('Helvetica', '', 11)
        self.multi_cell(0, 6, safe_text("Ce registre détaille l'ensemble des interventions validées sur la période. Chaque ligne représente une victoire contre la pollution urbaine."))
        self.ln(10)
        self.set_font('Helvetica', 'B', 10)
        self.set_fill_color(*COLORS['secondary'])
        self.set_text_color(255, 255, 255)
        headers = [('Date', 25), ('Lieu', 80), ('Mégots', 25), ('Kg', 20), ('Ben.', 15), ('Eff.', 25)]
        for h, w in headers: self.cell(w, 10, safe_text(h), 1, 0, 'C', True)
        self.ln()
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*COLORS['text'])
        df_sorted = self.df.sort_values('date', ascending=False)
        for i, row in df_sorted.iterrows():
            if self.get_y() > 250: self.add_page(); self.ln(10)
            self.cell(25, 8, row['date'].strftime('%d/%m/%y'), 1, 0, 'C')
            self.cell(80, 8, safe_text(str(row['lieu_complet'])[:50]), 1, 0, 'L')
            self.cell(25, 8, str(int(row['megots'])), 1, 0, 'C')
            self.cell(20, 8, f"{row['dechets_kg']:.1f}", 1, 0, 'C')
            self.cell(15, 8, str(int(row['nb_benevoles'])), 1, 0, 'C')
            self.cell(25, 8, f"{row.get('megots_par_heure_ben', 0):.0f}", 1, 1, 'C')

    def create_monthly_analysis(self):
        self.add_page()
        self.section_header("3. DYNAMIQUE TEMPORELLE", "Analyse des tendances et saisonnalité")
        self.set_font('Helvetica', '', 12)
        self.multi_cell(0, 7, safe_text("La compréhension de la saisonnalité est cruciale pour anticiper les besoins en équipements urbains. Les graphiques ci-dessous illustrent les pics de pollution."))
        self.ln(10)
        self.df['month_yr'] = self.df['date'].dt.strftime('%Y-%m')
        monthly = self.df.groupby('month_yr').agg({'megots': 'sum', 'dechets_kg': 'sum'}).sort_index()
        if not monthly.empty:
            plt.figure(figsize=(10, 5))
            plt.plot(monthly.index, monthly['megots'], marker='o', color='#10b981', linewidth=3, label='Mégots')
            plt.title('Évolution Mensuelle des Captures')
            plt.xticks(rotation=45)
            plt.grid(True, alpha=0.3)
            plt.legend()
            chart_path = os.path.join(OUTPUT_DIR, 'tmp_chart_monthly.png')
            plt.tight_layout(); plt.savefig(chart_path, dpi=150); plt.close()
            self.image(chart_path, x=15, w=180); self.ln(10)
        self.set_font('Helvetica', 'B', 14); self.cell(0, 10, "OBSERVATIONS CLÉS", 0, 1)
        self.set_font('Helvetica', '', 11); self.multi_cell(0, 7, safe_text("On observe une stabilité de l'engagement bénévole. Les pics de récolte coïncident souvent avec les périodes de forte affluence touristique."))

    def create_top_locations(self):
        self.add_page()
        self.section_header("4. GÉOGRAPHIE DE LA POLLUTION", "Zones à enjeux et points noirs prioritaires")
        top_lieux = self.df.groupby('lieu_complet').agg({'megots': 'sum'}).sort_values('megots', ascending=False).head(12)
        self.set_font('Helvetica', '', 12)
        self.multi_cell(0, 7, safe_text("Identifier les 'points noirs' permet de recommander des installations précises aux services municipaux."))
        self.ln(10)
        self.set_font('Helvetica', 'B', 11); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255, 255, 255)
        self.cell(140, 10, "Lieu d'Intervention", 1, 0, 'L', True); self.cell(50, 10, "Mégots Cumulés", 1, 1, 'C', True)
        self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text'])
        for i, (lieu, row) in enumerate(top_lieux.iterrows()):
            color = COLORS['light_bg'] if i % 2 == 0 else COLORS['white']
            self.set_fill_color(*color); self.cell(140, 10, safe_text(str(lieu)[:65]), 1, 0, 'L', True)
            self.set_font('Helvetica', 'B', 10); self.cell(50, 10, f"{int(row['megots']):,}".replace(',', ' '), 1, 1, 'C', True)

    def create_associations(self):
        self.add_page()
        self.section_header("5. ACTEURS ET PARTENAIRES", "Force du réseau et synergie associative")
        stats_asso = self.df.groupby('association').agg({'megots': 'sum', 'date': 'count'}).sort_values('megots', ascending=False)
        self.set_font('Helvetica', '', 12); self.multi_cell(0, 7, safe_text("Le succès de Clean My Map repose sur la diversité de ses contributeurs. Associations et collectifs unissent leurs forces."))
        self.ln(15)
        for asso, row in stats_asso.iterrows():
            self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['primary']); self.cell(0, 10, safe_text(asso), 0, 1)
            max_m = stats_asso['megots'].max(); w = (row['megots'] / max_m) * 180 if max_m > 0 else 0
            self.set_fill_color(*COLORS['light_bg']); self.rect(self.get_x(), self.get_y(), 180, 4, 'F')
            self.set_fill_color(*COLORS['primary']); self.rect(self.get_x(), self.get_y(), w, 4, 'F'); self.ln(7)
            self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text']); self.cell(0, 8, f"{int(row['date'])} actions validées - {int(row['megots']):,} mégots", 0, 1); self.ln(5)

    def create_impact_eco(self):
        self.add_page()
        self.section_header("6. IMPACT ÉCOLOGIQUE", "Valorisation scientifique de l'effort citoyen")
        total_m = self.df['megots'].sum(); total_kg = self.df['dechets_kg'].sum()
        impacts = [
            ("PROTECTION DE L'EAU", f"{int(total_m * 500):,} Litres", "Volume d'eau douce préservé de la contamination chimique."),
            ("BILAN CARBONE", f"{total_m * 0.014:.2f} KG CO2", "Émissions évitées liées au cycle de vie complet des déchets."),
            ("ÉCONOMIE DIRECTE", f"{(total_kg/1000)*150:.2f} EUR", "Économie estimée pour le nettoyage public (Base 150e/tonne).")
        ]
        for title, val, desc in impacts:
            self.set_fill_color(*COLORS['light_bg']); self.rect(10, self.get_y(), 190, 35, 'F')
            self.set_xy(15, self.get_y() + 5); self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['text_light']); self.cell(0, 5, title, 0, 1)
            self.set_x(15); self.set_font('Helvetica', 'B', 18); self.set_text_color(*COLORS['primary']); self.cell(0, 10, val, 0, 1)
            self.set_x(15); self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text']); self.multi_cell(0, 5, safe_text(desc)); self.ln(10)

    def create_benevoles(self):
        self.add_page()
        self.section_header("7. SOCIOLOGIE DE L'ENGAGEMENT", "Profil et mobilisation des brigades citoyennes")
        total_ben = self.df['nb_benevoles'].sum(); avg_ben = self.df['nb_benevoles'].mean()
        self.set_font('Helvetica', '', 12); self.multi_cell(0, 7, safe_text("La dépollution est un acte social. L'action collective renforce l'efficacité de la collecte et crée du lien social."))
        self.ln(15)
        stats = [("BÉNÉVOLES MOBILISÉS", f"{int(total_ben)}", "Citoyens engagés."), ("TAILLE DU GROUPE", f"{avg_ben:.1f}", "Participants moyen."), ("HEURES DE SOIN", f"{int(self.df['temps_min'].sum()/60)} H", "Temps cumulé investi.")]
        for t, v, d in stats:
            self.set_font('Helvetica', 'B', 13); self.set_text_color(*COLORS['secondary']); self.cell(80, 10, t, 0, 0)
            self.set_font('Helvetica', 'B', 20); self.set_text_color(*COLORS['primary']); self.cell(40, 10, v, 0, 0)
            self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text']); self.cell(0, 10, safe_text(d), 0, 1); self.ln(5)

    def create_reco(self):
        self.add_page()
        self.section_header("8. PLAN D'ACTION", "Recommandations stratégiques et objectifs")
        self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['secondary']); self.cell(0, 10, "RECOMMANDATIONS AUX COLLECTIVITÉS", 0, 1); self.ln(5)
        recos = ["Mobilier urbain renforcé sur les points noirs.", "Campagnes de communication sur le cycle de l'eau.", "Intégration des données citoyennes dans les plans municipaux.", "Soutien logistique aux associations pour le tri."]
        for r in recos:
            self.set_font('Helvetica', '', 12); self.set_text_color(*COLORS['primary']); self.cell(10, 8, ">", 0, 0)
            self.set_text_color(*COLORS['text']); self.multi_cell(0, 8, safe_text(r)); self.ln(3)

    def create_methodology(self):
        self.add_page()
        self.section_header("9. CADRE MÉTHODOLOGIQUE", "Rigueur scientifique et sources de données")
        self.set_font('Helvetica', '', 11); self.multi_cell(0, 7, safe_text("Les calculs d'impact reposent sur des constantes validées par l'OMS et l'ADEME. Les données sont modérées par les Brigades des Élites."))
        self.set_y(240); self.set_font('Helvetica', 'B', 16); self.set_text_color(*COLORS['primary']); self.cell(0, 10, "ENSEMBLE, PROTÉGEONS NOTRE ENVIRONNEMENT", 0, 1, 'C')
        self.set_font('Helvetica', 'I', 10); self.set_text_color(*COLORS['text_light']); self.cell(0, 8, "Clean My Map Codex v2.0", 0, 1, 'C')

    def generate_certificate(self, type='territorial', name="Ma Ville", data=None):
        self.add_page(); self.set_draw_color(*COLORS['primary']); self.set_line_width(2); self.rect(5, 5, 200, 287)
        self.set_y(50); self.set_font('Helvetica', 'B', 32); self.set_text_color(*COLORS['primary']); self.cell(0, 20, "CERTIFICAT D'IMPACT", 0, 1, 'C')
        self.set_font('Helvetica', 'B', 24); self.set_text_color(*COLORS['secondary']); self.cell(0, 15, safe_text(name), 0, 1, 'C')
        self.ln(30); self.set_font('Helvetica', '', 16); self.set_text_color(*COLORS['text'])
        txt = "Ce document atteste de l'impact des actions citoyennes." if type == 'territorial' else "Label Eco-Quartier decerne pour la proprete exemplaire."
        self.set_x(25); self.multi_cell(160, 10, safe_text(txt), align='C')
        if data:
            self.ln(20); self.set_font('Helvetica', 'B', 14)
            for k, v in data.items(): self.cell(0, 10, safe_text(f"{k}: {v}"), 0, 1, 'C')
        return self.output(dest='S')

    def generate(self, filename="Rapport_Impact_CleanMyMap.pdf", dest='F'):
        col_map = {'adresse': 'lieu_complet', 'benevoles': 'nb_benevoles', 'poids': 'dechets_kg'}
        for old, new in col_map.items():
            if old in self.df.columns and new not in self.df.columns: self.df[new] = self.df[old]
        for c in ['megots', 'dechets_kg', 'nb_benevoles', 'date', 'lieu_complet', 'temps_min']:
            if c not in self.df.columns: self.df[c] = pd.Timestamp.now() if c == 'date' else 0
        self.df['date'] = pd.to_datetime(self.df['date'], errors='coerce').fillna(pd.Timestamp.now())
        if 'association' not in self.df.columns: self.df['association'] = 'Indépendant'
        self.create_cover(); self.create_toc(); self.create_global_dashboard(); self.create_action_registry()
        self.create_monthly_analysis(); self.create_top_locations(); self.create_associations()
        self.create_impact_eco(); self.create_benevoles(); self.create_reco(); self.create_methodology()
        if dest == 'S':
            out = self.output(dest='S')
            return out if isinstance(out, bytes) else out.encode("latin-1", "replace")
        output_path = os.path.join(OUTPUT_DIR, filename)
        self.output(output_path)
        return output_path
