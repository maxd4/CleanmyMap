import os
import re
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
    'primary': (14, 116, 144),        # Teal institutionnel
    'primary_dark': (9, 78, 98),      # Teal profond
    'secondary': (22, 40, 70),        # Bleu marine institutionnel
    'secondary_soft': (35, 60, 102),  # Bleu marine secondaire
    'text': (37, 50, 74),             # Texte principal
    'text_light': (99, 112, 134),     # Texte secondaire
    'light_bg': (246, 248, 252),      # Fond clair
    'card_bg': (252, 253, 255),       # Fond cartouche/tableau
    'border': (214, 221, 233),        # Bordure neutre
    'shadow': (233, 238, 247),        # Ombre subtile
    'zebra': (243, 247, 253),         # Alternance tableau
    'white': (255, 255, 255),
    'accent': (194, 156, 76),         # Accent doré
    'danger': (196, 65, 80),          # Rouge institutionnel
}

MOJIBAKE_MARKERS = ("\u00c3", "\u00c2", "\u00e2", "\u00c6", "\u20ac", "\u2122", "\ufffd")


def _repair_mojibake(text: str) -> str:
    repaired = text
    for _ in range(5):
        marker_score = sum(repaired.count(marker) for marker in MOJIBAKE_MARKERS)
        if marker_score == 0:
            break

        candidates = [repaired]
        for src, dst in (("latin1", "utf-8"), ("cp1252", "utf-8"), ("latin1", "cp1252")):
            try:
                candidates.append(repaired.encode(src).decode(dst))
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue

        def score(value: str) -> tuple[int, int]:
            return (sum(value.count(marker) for marker in MOJIBAKE_MARKERS), len(value))

        best = min(candidates, key=score)
        if best == repaired:
            break
        repaired = best

    return repaired


def safe_text(text):
    """Normalize text while preserving accents and punctuation for Unicode fonts."""
    if not isinstance(text, str):
        text = str(text)

    text = _repair_mojibake(text)
    text = text.translate(
        str.maketrans(
            {
                "\u2018": "'",
                "\u2019": "'",
                "\u201c": '"',
                "\u201d": '"',
                "\u2013": "-",
                "\u2014": "-",
                "\u2026": "...",
                "\u00a0": " ",
            }
        )
    )
    return text

class PDFReport(FPDF):
    def __init__(self, df: pd.DataFrame):
        super().__init__()
        self.full_df = df
        self.set_auto_page_break(auto=True, margin=20)
        self.report_date = datetime.now().strftime("%d/%m/%Y")
        self.version = "v1.0"
        self.is_rse = False # Nouveau mode RSE
        self.map_base_url = os.getenv("CLEANMYMAP_PUBLIC_WEB_URL", "https://cleanmymap.fr").rstrip("/")
        self.feature_flags = {}
        self.toc_data = []
        self.is_dummy = False
        self.section_links = {} # Stores link IDs for internal navigation
        self.report_author = os.getenv("CLEANMYMAP_REPORT_AUTHOR", "Equipe CleanMyMap")
        self.report_scope = "Rapport territorial annuel"
        self._font_family = "ReportSans"
        self._unicode_font_enabled = False
        self._configure_fonts()

    def _configure_fonts(self):
        font_dir = r"C:\Windows\Fonts"
        font_files = {
            "": os.path.join(font_dir, "DejaVuSans.ttf"),
            "B": os.path.join(font_dir, "DejaVuSans-Bold.ttf"),
            "I": os.path.join(font_dir, "DejaVuSans-Oblique.ttf"),
            "BI": os.path.join(font_dir, "DejaVuSans-BoldOblique.ttf"),
        }
        try:
            for style, path in font_files.items():
                if os.path.exists(path):
                    self.add_font(self._font_family, style, path, uni=True)
                else:
                    raise FileNotFoundError(path)
            self._unicode_font_enabled = True
        except Exception:
            self._unicode_font_enabled = False
            self._font_family = "Helvetica"

    def set_font(self, family=None, style="", size=0):
        requested = (family or self._font_family or "Helvetica").lower()
        if requested in {"helvetica", "arial", "reportsans"}:
            family = self._font_family
        return super().set_font(family, style, size)

    def cell(self, *args, **kwargs):
        """Sanitize text payloads before delegating to FPDF."""
        if 'txt' in kwargs and isinstance(kwargs['txt'], str):
            kwargs['txt'] = safe_text(kwargs['txt'])
        elif len(args) >= 3 and isinstance(args[2], str):
            args = list(args)
            args[2] = safe_text(args[2])
            args = tuple(args)
        return super().cell(*args, **kwargs)

    def multi_cell(self, *args, **kwargs):
        """Sanitize text payloads and tolerate legacy kwargs."""
        # fpdf<=1.x does not support `ln` for multi_cell
        kwargs.pop('ln', None)
        if 'txt' in kwargs and isinstance(kwargs['txt'], str):
            kwargs['txt'] = safe_text(kwargs['txt'])
        elif len(args) >= 3 and isinstance(args[2], str):
            args = list(args)
            args[2] = safe_text(args[2])
            args = tuple(args)
        return super().multi_cell(*args, **kwargs)

    def add_to_toc(self, title, is_sub=False):
        # Create an internal link for this section
        link_id = self.add_link()
        self.section_links[title] = link_id
        self.toc_data.append({'title': title, 'page': self.page_no(), 'is_sub': is_sub, 'link': link_id})
        return link_id

    def header(self):
        if self.page_no() > 1:
            self.set_fill_color(*COLORS['secondary'])
            self.rect(0, 0, 210, 16, 'F')
            self.set_draw_color(*COLORS['accent'])
            self.set_line_width(0.7)
            self.line(0, 16, 210, 16)

            self.set_y(4)
            self.set_font(self._font_family, 'B', 8)
            self.set_text_color(255, 255, 255)
            self.cell(0, 6, safe_text("CLEANMYMAP  |  RAPPORT D'IMPACT TERRITORIAL"), 0, 0, 'L')
            self.set_text_color(235, 239, 247)
            self.cell(0, 6, safe_text(f"Généré le {self.report_date}  |  Page {self.page_no()}"), 0, 1, 'R')
            self.ln(7)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(*COLORS['border'])
        self.set_line_width(0.25)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_y(-11)
        self.set_font(self._font_family, '', 8)
        self.set_text_color(*COLORS['text_light'])
        self.cell(0, 6, safe_text(f"{self.report_scope} · Version {self.version}"), 0, 0, 'L')
        self.cell(0, 6, safe_text(f"{self.report_author} · {self.page_no()}"), 0, 0, 'R')

    def section_header(self, title, subtitle):
        self._ensure_vertical_space(30)
        y = self.get_y()
        self.set_fill_color(*COLORS['card_bg'])
        self.set_draw_color(*COLORS['border'])
        self.rect(10, y, 190, 24, 'DF')
        self.set_fill_color(*COLORS['accent'])
        self.rect(10, y, 4, 24, 'F')
        self.set_xy(17, y + 3)
        self.set_font(self._font_family, 'B', 16)
        self.set_text_color(*COLORS['secondary'])
        self.cell(180, 7, safe_text(title), ln=True)
        self.set_x(17)
        self.set_font(self._font_family, '', 10)
        self.set_text_color(*COLORS['secondary_soft'])
        self.cell(180, 6, safe_text(subtitle), ln=True)
        self.set_y(y + 28)

    def _ensure_vertical_space(self, required_height: float = 30.0):
        if self.get_y() + required_height > 270:
            self.add_page()

    def _series_str(self, df: pd.DataFrame, candidates: list[str]) -> pd.Series:
        for col in candidates:
            if col in df.columns:
                return df[col].fillna("").astype(str).str.strip()
        return pd.Series("", index=df.index, dtype="object")

    def _extract_arrondissement_label(self, value: str) -> str:
        s = str(value).strip().lower()
        if not s:
            return "Non renseigné"
        match = re.search(r"\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b", s)
        if not match:
            return "Non renseigné"
        return f"{match.group(1)}e"

    def _render_kpi_cartouches(self, items: list[tuple[str, str]]):
        if not items:
            return
        count = max(1, min(4, len(items)))
        values = items[:count]
        gap = 3
        width = (190 - (gap * (count - 1))) / count
        height = 20
        self._ensure_vertical_space(height + 6)
        y = self.get_y()
        for idx, (label, value) in enumerate(values):
            x = 10 + idx * (width + gap)
            self.set_fill_color(*COLORS['shadow'])
            self.rect(x + 0.8, y + 0.8, width, height, 'F')
            self.set_fill_color(*COLORS['card_bg'])
            self.set_draw_color(*COLORS['border'])
            self.rect(x, y, width, height, "DF")
            self.set_fill_color(*COLORS['primary'])
            self.rect(x, y, width, 2.5, 'F')
            self.set_xy(x + 1.6, y + 4)
            self.set_font(self._font_family, 'B', 7)
            self.set_text_color(*COLORS['text_light'])
            self.cell(width - 3.2, 4, safe_text(str(label).upper()), 0, 2, 'C')
            self.set_x(x + 1.6)
            self.set_font(self._font_family, 'B', 13)
            self.set_text_color(*COLORS['secondary'])
            self.cell(width - 3.2, 9, safe_text(str(value)), 0, 1, 'C')
        self.set_y(y + height + 3)

    def _render_summary_table(self, title: str, cols, rows: list[tuple[str, str, str]]):
        if not rows:
            return
        estimated_height = 12 + (len(rows) * 8)
        self._ensure_vertical_space(estimated_height + 4)
        self.set_fill_color(*COLORS['secondary_soft'])
        self.set_text_color(255, 255, 255)
        self.set_font(self._font_family, 'B', 9)
        self.set_x(10)
        self.cell(190, 7, safe_text(title), 0, 1, 'L', True)
        self.ln(0.5)
        self._table_header(cols)
        for idx, row in enumerate(rows):
            self._table_row(row, cols, row_index=idx, truncate=True)
        self.ln(2)

    def _render_decision_block(
        self,
        rubrique: str,
        observations: list[str],
        decisions: list[str],
        kpis: list[tuple[str, str]] | None = None,
        summary_rows: list[tuple[str, str, str]] | None = None,
    ):
        self._ensure_vertical_space(24)
        y = self.get_y()
        self.set_fill_color(*COLORS['shadow'])
        self.rect(11, y + 1, 189, 10, 'F')
        self.set_fill_color(*COLORS['secondary'])
        self.set_draw_color(*COLORS['secondary'])
        self.rect(10, y, 190, 10, 'DF')
        self.set_fill_color(*COLORS['accent'])
        self.rect(10, y, 3, 10, 'F')
        self.set_xy(15, y + 2)
        self.set_font(self._font_family, 'B', 10)
        self.set_text_color(255, 255, 255)
        self.cell(182, 6, safe_text(rubrique), 0, 1, 'L')
        self.set_y(y + 13)

        if kpis:
            self._render_kpi_cartouches(kpis)
        self._render_insight_box("Constats clés", observations)
        self._render_insight_box("Orientations recommandées", decisions)
        if summary_rows:
            cols = [
                ("Indicateur", 74, "L"),
                ("Valeur", 38, "C"),
                ("Lecture", 78, "L"),
            ]
            self._render_summary_table("Tableau de synthèse par rubrique", cols, summary_rows)
        self.ln(2)

    def _render_insight_box(self, title: str, lines: list[str]):
        height = 13 + max(1, len(lines)) * 5.5
        self._ensure_vertical_space(height + 4)
        y = self.get_y()
        self.set_fill_color(*COLORS['shadow'])
        self.rect(11, y + 1, 189, height, 'F')
        self.set_fill_color(*COLORS['card_bg'])
        self.set_draw_color(*COLORS['border'])
        self.rect(10, y, 190, height, "DF")
        self.set_fill_color(*COLORS['primary_dark'])
        self.rect(10, y, 4, height, 'F')
        self.set_xy(17, y + 3)
        self.set_font(self._font_family, "B", 10)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 5, safe_text(title), ln=True)
        self.set_font(self._font_family, "", 9)
        self.set_text_color(*COLORS['text'])
        for line in lines:
            self.set_x(19)
            self.multi_cell(180, 5, safe_text(f"- {line}"))
        self.ln(2)

    def _table_header(self, cols):
        self.set_font(self._font_family, 'B', 9)
        self.set_fill_color(*COLORS['secondary'])
        self.set_draw_color(*COLORS['secondary'])
        self.set_line_width(0.25)
        self.set_text_color(255, 255, 255)
        for title, width, align in cols:
            self.cell(width, 8.5, safe_text(title), 1, 0, align, True)
        self.ln()
        self.set_draw_color(*COLORS['accent'])
        self.set_line_width(0.45)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_draw_color(*COLORS['border'])
        self.set_line_width(0.15)

    def _table_row(self, values, cols, row_index=0, truncate=False):
        fill = (row_index % 2 == 0)
        self.set_fill_color(*COLORS['zebra'] if fill else COLORS['white'])
        self.set_draw_color(*COLORS['border'])
        self.set_text_color(*COLORS['text'])
        self.set_font(self._font_family, '', 9)
        for value, (_, width, align) in zip(values, cols):
            text = str(value)
            if truncate:
                max_chars = max(8, int(width / 1.85))
                if len(text) > max_chars:
                    text = text[: max_chars - 1].rstrip() + "…"
            self.cell(width, 7.5, safe_text(text), 1, 0, align, fill)
        self.ln()

    def _compute_web_rubrique_metrics(self, city_df: pd.DataFrame) -> dict:
        record_type_col = city_df.get('record_type', pd.Series(index=city_df.index, dtype='object')).fillna("").astype(str).str.lower()
        source_col = city_df.get('source', pd.Series(index=city_df.index, dtype='object')).fillna("").astype(str).str.lower()
        type_lieu_col = city_df.get('type_lieu', pd.Series(index=city_df.index, dtype='object')).fillna("").astype(str).str.lower()
        clean_col = city_df.get('est_propre', pd.Series(False, index=city_df.index)).fillna(False).astype(bool)

        clean_places_count = int(((record_type_col == "clean_place") | clean_col).sum())
        spots_count = int(((record_type_col == "spot") | (type_lieu_col.str.contains("spot", na=False))).sum())
        spots_source_count = int(source_col.str.contains("spot", na=False).sum())
        community_source_count = int(source_col.str.contains("community", na=False).sum())

        geometry_cols = [
            "geometry_geojson",
            "manual_drawing_geojson",
            "manual_drawing_coordinates_json",
        ]
        drawing_count = 0
        for col in geometry_cols:
            if col in city_df.columns:
                drawing_count = max(drawing_count, int(city_df[col].fillna("").astype(str).str.strip().ne("").sum()))
        if "geometry_kind" in city_df.columns:
            drawing_count = max(
                drawing_count,
                int(city_df["geometry_kind"].fillna("").astype(str).str.strip().str.lower().isin({"polyline", "polygon"}).sum()),
            )
        if "manual_drawing_kind" in city_df.columns:
            drawing_count = max(
                drawing_count,
                int(city_df["manual_drawing_kind"].fillna("").astype(str).str.strip().str.lower().isin({"polyline", "polygon"}).sum()),
            )

        active_spots_count = None
        upcoming_events_count = None
        upcoming_rsvp_yes = None
        db_note = None
        if not self.is_dummy:
            try:
                from src.database import get_active_spots, get_community_events, get_event_rsvp_summary

                active_spots = get_active_spots()
                upcoming_events = get_community_events(limit=200, past=False)
                active_spots_count = int(len(active_spots))
                upcoming_events_count = int(len(upcoming_events))
                upcoming_rsvp_yes = int(
                    sum(int(get_event_rsvp_summary(evt["id"]).get("yes", 0)) for evt in upcoming_events if evt.get("id"))
                )
            except Exception as exc:
                db_note = f"Données community/spot sqlite indisponibles ({type(exc).__name__})."

        return {
            "clean_places_count": clean_places_count,
            "spots_count": spots_count,
            "spots_source_count": spots_source_count,
            "community_source_count": community_source_count,
            "drawing_count": drawing_count,
            "active_spots_count": active_spots_count,
            "upcoming_events_count": upcoming_events_count,
            "upcoming_rsvp_yes": upcoming_rsvp_yes,
            "db_note": db_note,
        }

    # --- PARTIE 1 : SYNTHESE DECISIONNELLE ---

    def create_cover(self, city_name, city_df):
        self.add_page()
        self.set_fill_color(*COLORS['light_bg'])
        self.rect(0, 0, 210, 297, 'F')
        self.set_fill_color(*COLORS['secondary'])
        self.rect(0, 0, 210, 118, 'F')
        self.set_fill_color(*COLORS['secondary_soft'])
        self.rect(0, 86, 210, 32, 'F')
        self.set_fill_color(*COLORS['accent'])
        self.rect(0, 116, 210, 2, 'F')

        self.set_fill_color(255, 255, 255)
        self.rect(15, 14, 55, 10, 'F')
        self.set_xy(15, 16)
        self.set_font(self._font_family, 'B', 7)
        self.set_text_color(*COLORS['secondary'])
        self.cell(55, 6, safe_text("RAPPORT INSTITUTIONNEL"), 0, 1, 'C')

        self.set_xy(15, 34)
        self.set_font(self._font_family, 'B', 22)
        self.set_text_color(255, 255, 255)
        self.multi_cell(180, 10, safe_text("CleanMyMap"), 0, 'L')
        self.set_x(15)
        self.set_font(self._font_family, 'B', 14)
        self.multi_cell(180, 8, safe_text("Rapport annuel de dépollution citoyenne"), 0, 'L')
        self.set_x(15)
        self.set_font(self._font_family, '', 11)
        self.set_text_color(231, 237, 246)
        self.multi_cell(180, 6, safe_text(f"Périmètre territorial : {city_name}"), 0, 'L')

        self.set_fill_color(255, 255, 255)
        self.set_draw_color(*COLORS['border'])
        self.rect(15, 78, 180, 31, 'DF')
        self.set_fill_color(*COLORS['accent'])
        self.rect(15, 78, 180, 3, 'F')

        try:
            d_min = city_df['date'].min().strftime('%d/%m/%Y')
            d_max = city_df['date'].max().strftime('%d/%m/%Y')
            period_line = f"Période couverte : {d_min} au {d_max}"
        except (AttributeError, TypeError, ValueError) as exc:
            log_exception(
                component="report_generator",
                action="cover_period_range",
                exc=exc,
                message="Unable to compute report period range",
                severity="warning",
            )
            period_line = "Période couverte : non renseignée"

        associations = city_df['association'].dropna().astype(str).str.strip()
        assos = ", ".join([a for a in associations.unique() if a][:6]) or "Non renseigné"
        assos_line = assos if len(assos) <= 96 else assos[:93].rstrip() + "..."

        self.set_xy(20, 84)
        self.set_font(self._font_family, 'B', 9)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 5, safe_text(period_line), ln=True, align='L')
        self.set_x(20)
        self.set_font(self._font_family, '', 8.5)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(170, 4.6, safe_text(f"Structure porteuse / associations partenaires : {assos_line}"), 0, 'L')
        self.set_xy(20, 101.5)
        self.set_font(self._font_family, '', 8.5)
        self.cell(0, 4.6, safe_text(f"Date d'édition : {datetime.now().strftime('%Y-%m-%d')}"), ln=True, align='L')
        self.set_x(20)
        self.cell(0, 4.6, safe_text(f"Version du rapport : {self.version}"), ln=True, align='L')

        clean_series = city_df.get('est_propre')
        if clean_series is None:
            clean_series = pd.Series(False, index=city_df.index)
        else:
            clean_series = clean_series.fillna(False).astype(bool)
        total_megots = int(city_df['megots'].sum())
        total_kg = float(city_df['dechets_kg'].sum())
        total_benevoles = int(city_df.get('nb_benevoles', city_df.get('benevoles', 0)).sum())
        total_hours = float((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        total_actions = int((~clean_series).sum())
        total_co2 = total_megots * IMPACT_CONSTANTS.get("CO2_PER_MEGOT_KG", 0.014)

        stats = [
            (str(total_actions), "Actions"),
            (f"{total_megots:,}".replace(',', ' '), "Mégots"),
            (f"{total_kg:.1f} kg", "Déchets"),
            (str(total_benevoles), "Bénévoles"),
            (f"{total_hours:.1f} h", "Heures"),
            (f"{total_co2:.1f} kg", "CO2e estimé"),
        ]

        self.set_xy(15, 124)
        self.set_font(self._font_family, 'B', 10)
        self.set_text_color(*COLORS['secondary'])
        self.cell(180, 6, safe_text("Indicateurs clés consolidés"), 0, 1, 'L')
        self.set_x(15)
        self.set_font(self._font_family, '', 8.5)
        self.set_text_color(*COLORS['text_light'])
        self.cell(180, 5, safe_text("Lecture rapide pour pilotage territorial et présentation institutionnelle"), 0, 1, 'L')

        self.set_y(138)
        for i, (value, label) in enumerate(stats):
            col = i % 3
            row = i // 3
            x = 15 + col * 61
            y = 138 + row * 36
            self.set_fill_color(*COLORS['shadow'])
            self.rect(x + 1, y + 1, 57, 29, 'F')
            self.set_fill_color(*COLORS['card_bg'])
            self.set_draw_color(*COLORS['border'])
            self.rect(x, y, 57, 29, 'DF')
            self.set_fill_color(*COLORS['primary'])
            self.rect(x, y, 57, 3, 'F')
            self.set_xy(x + 1.5, y + 5)
            self.set_font(self._font_family, 'B', 8)
            self.set_text_color(*COLORS['text_light'])
            self.cell(54, 5, safe_text(label.upper()), 0, 1, 'C')
            self.set_x(x + 1.5)
            self.set_font(self._font_family, 'B', 14)
            self.set_text_color(*COLORS['secondary'])
            self.cell(54, 9, safe_text(value), 0, 1, 'C')

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
        link = self.add_to_toc("2) Synthèse exécutive", is_sub=False)
        self.set_link(link)
        
        self.section_header("PARTIE 1 - SYNTHÈSE DÉCISIONNELLE", "2) Synthèse exécutive")
        
        total_m = int(city_df['megots'].sum())
        total_kg = city_df['dechets_kg'].sum()
        total_h = int((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        total_volunteers = int(city_df['nb_benevoles'].sum())
        
        total_co2 = total_m * IMPACT_CONSTANTS.get('CO2_PER_MEGOT_KG', 0.014)
        economie_v_eur = (total_kg / 1000) * IMPACT_CONSTANTS.get('COUT_TRAITEMENT_TONNE_EUR', 150)
        ipc_score = total_m / total_h if total_h > 0 else 0.0
        
        metrics = [
            ("Actions", f"{len(city_df)}"), ("Citoyens", f"{total_volunteers:,}"), 
            ("Kg Déchets", f"{total_kg:.1f}"), ("Mégots", f"{total_m:,}"),
            ("CO2 estimé", f"{total_co2:,.1f} kg"), ("Score IPC", f"{ipc_score:.1f} mgt/h")
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
        self.cell(0, 10, "3 ENSEIGNEMENTS MAJEURS", ln=True)
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        
        # Calcul reel des statistiques (remplace les valeurs hardcodees)
        top_3_total = city_df.groupby('lieu_complet')['megots'].sum().nlargest(3).sum() if 'lieu_complet' in city_df.columns else 0
        top_3_pct = (top_3_total / max(city_df['megots'].sum(), 1)) * 100
        
        # Efficacité individuelle vs groupe
        solo = city_df[city_df['nb_benevoles'] <= 2] if 'nb_benevoles' in city_df.columns else pd.DataFrame()
        groupe = city_df[city_df['nb_benevoles'] > 5] if 'nb_benevoles' in city_df.columns else pd.DataFrame()
        solo_eff = (solo['megots'].sum() / max(solo['nb_benevoles'].sum(), 1)) if not solo.empty else 0
        grp_eff = (groupe['megots'].sum() / max(groupe['nb_benevoles'].sum(), 1)) if not groupe.empty else 0
        ratio_grp = (grp_eff / solo_eff) if solo_eff > 0 else 2.0
        
        text = (
            f"1) Concentration territoriale : 3 hotspots concentrent environ {top_3_pct:.0f}% de la charge polluante.\n"
            f"2) Mobilisation : les équipes (>5 pers) sont ~{ratio_grp:.1f}x plus efficaces que les actions solo.\n"
            "3) Pilotage : les gains les plus visibles proviennent d'un ciblage régulier des zones de récidive."
        )
        self.multi_cell(0, 7, safe_text(text))

        self.ln(4)
        self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "3 RECOMMANDATIONS PRIORITAIRES POUR LA VILLE", ln=True)
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(
            0,
            7,
            safe_text(
                "1) Planifier une fréquence hebdomadaire sur les 10 zones prioritaires.\n"
                "2) Installer/renforcer les dispositifs anti-megots sur les points chauds.\n"
                "3) Mettre en place une revue mensuelle mairie-associations basée sur les KPI de ce rapport."
            ),
        )

    def create_economic_vision(self, city_df):
        link = self.add_to_toc("1.1 Vision économique", is_sub=True)
        self.set_link(link)
        self.ln(10)
        self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['secondary'])
        self.cell(0, 10, "1.1 PLAIDOYER ÉCONOMIQUE POUR LA VILLE", ln=True)
        
        total_kg = city_df['dechets_kg'].sum()
        total_h = int((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        valeur_benevolat = total_h * 15 # Valorisation a 15 EUR/h (base associative)
        cout_evite = (total_kg / 1000) * IMPACT_CONSTANTS.get('COUT_TRAITEMENT_TONNE_EUR', 150)
        
        text = (
            f"L'action citoyenne génère une économie directe et indirecte substantielle pour la collectivité :\n"
            f"- VALEUR DU BÉNÉVOLAT : l'effort humain représente une dotation en nature estimée à {valeur_benevolat:,} EUR.\n"
            f"- COÛT DE TRAITEMENT ÉVITÉ : en extrayant {total_kg:.1f} kg avant entrée dans le réseau public, "
            f"les benevoles économisent environ {cout_evite:.2f} EUR de frais de traitement.\n"
            "- PRÉVENTION : l'action locale réduit les dépenses curatives futures."
        )
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(text))

    def create_methodology(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("3) Périmètre, sources et méthodologie", is_sub=False)
        self.set_link(link)
        
        self.section_header("PARTIE 2 - MÉTHODOLOGIE & PÉRIMÈTRE", "3) Périmètre, sources et méthodologie")
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        missing_date = int(city_df['date'].isna().sum()) if 'date' in city_df.columns else 0
        missing_geo = int(city_df['adresse'].isna().sum()) if 'adresse' in city_df.columns else 0
        text = (
            "Source des données : Google Sheet, données terrain saisies, points géocodés.\n\n"
            "Définitions des indicateurs :\n"
            "- score de saleté = megots + (dechets_kg x 100)\n"
            "- efficacite = score de saleté / heures benevoles\n"
            "- seuils de criticité : <150 faible, 150-399 modéré, >=400 élevé\n\n"
            "Traçabilité méthodologique :\n"
            "- chaque ligne conserve identifiant unique, date et localisation\n"
            "- les agrégats sont recalculés depuis les données brutes du périmètre\n"
            "- les hypothèses de projection sont explicites (partie 5)\n\n"
            "Règles de nettoyage/normalisation :\n"
            "- conversion numérique sécurisée des volumes/temps/effectifs\n"
            "- harmonisation des colonnes (dechets_kg, mégots, benevoles, temps_min)\n"
            "- consolidation action vs zone propre pour les analyses comparables\n\n"
            "Limites méthodologiques :\n"
            "- qualité de saisie hétérogène selon les contributeurs\n"
            "- biais possibles de couverture spatiale et de saisonnalité\n"
            f"- points de vigilance détectés : {missing_date} date(s) manquante(s), {missing_geo} adresse(s) manquante(s)"
        )
        self.multi_cell(0, 7, safe_text(text))
        self._render_insight_box(
            "Encadré méthode (lecture rapide décideur)",
            [
                "Sources: saisies terrain, import tableur, référentiels de géolocalisation.",
                "Les proxies d'impact (eau, CO2, coût évité) donnent un ordre de grandeur, pas une mesure instrumentale.",
                "Les comparaisons inter-zones restent sensibles a la qualité de saisie locale.",
            ],
        )

    def create_governance_block(self, city_df):
        self.add_page()
        link = self.add_to_toc("3bis) Gouvernance, méthode et versioning", is_sub=False)
        self.set_link(link)
        self.section_header(
            "3bis. GOUVERNANCE DU RAPPORT",
            "Méthodologie, périmètre de publication et contrôle de version",
        )

        self._render_insight_box(
            "Méthodologie : sources, définitions, limites des proxies",
            [
                "Sources principales: actions terrain, modules web (map, reports, community), base opérationnelle.",
                "Définitions harmonisées: action, spot, clean_place, moderation, geocouverture, traces.",
                "Limites: données déclaratives, couverture géographique inégale, proxies d'impact non substituables à une mesure scientifique.",
            ],
        )

        cols = [
            ("Périmètre", 50, "C"),
            ("Date édition", 35, "C"),
            ("Version", 20, "C"),
            ("Auteur", 40, "C"),
            ("Changements", 45, "C"),
        ]
        self._table_header(cols)

        period_start = city_df["date"].min().strftime("%d/%m/%Y") if "date" in city_df.columns and len(city_df) else "n/a"
        period_end = city_df["date"].max().strftime("%d/%m/%Y") if "date" in city_df.columns and len(city_df) else "n/a"
        rows = [
            (
                f"{period_start} -> {period_end}",
                datetime.now().strftime("%d/%m/%Y"),
                self.version,
                self.report_author,
                "Bloc pilotage/terrain + contexte/communauté",
            ),
            (
                "Paris (ville active)",
                datetime.now().strftime("%d/%m/%Y"),
                "v1.1",
                self.report_author,
                "Bloc gouvernance + annexes séparées",
            ),
        ]
        for i, row in enumerate(rows):
            self._table_row(row, cols, row_index=i)

        self.ln(3)
        self._render_insight_box(
            "Journal de version (usage public)",
            [
                "Ce journal explique ce qui change entre deux éditions: indicateurs, périmètre, méthodes.",
                "Objectif: garantir un rapport audit-able, compréhensible et stable dans le temps.",
            ],
        )

    # --- PARTIE 3 : ANALYSES STATISTIQUES ---

    def create_performance_analysis(self, city_name, city_df):
        self.add_page(); 
        link = self.add_to_toc("4) Bilan mensuel et performance opérationnelle", is_sub=False)
        self.set_link(link)
        
        self.section_header("PARTIE 3 - ANALYSES STATISTIQUES & SPATIALES", f"4) Bilan mensuel et performance opérationnelle - {city_name}")
        
        city_df['month_yr'] = city_df['date'].dt.strftime('%Y-%m')
        monthly = city_df.groupby('month_yr').agg({'megots': 'sum', 'dechets_kg': 'sum', 'nb_benevoles': 'sum', 'temps_min': 'sum'}).sort_index()
        monthly['actions'] = city_df.groupby('month_yr').size()
        monthly['hours'] = (monthly['temps_min'] * monthly['nb_benevoles']) / 60
        monthly['score'] = monthly['megots'] + (monthly['dechets_kg'] * 100)
        monthly['efficacite'] = monthly['score'] / np.maximum(monthly['hours'], 1e-6)

        def label_perf(v):
            if v >= 400:
                return "Excellent"
            if v >= 180:
                return "Bon"
            return "À améliorer"

        monthly['performance'] = monthly['efficacite'].apply(label_perf)

        self.set_font('Helvetica', 'B', 8); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255, 255, 255)
        cols = [('Mois', 24), ('Act.', 16), ('Mégots', 28), ('Kg', 18), ('Bén.', 16), ('Heures', 20), ('Perf.', 24)]
        for c, w in cols:
            self.cell(w, 7, safe_text(c), 1, 0, 'C', True)
        self.ln()
        self.set_font('Helvetica', '', 8); self.set_text_color(*COLORS['text'])
        for idx, row in monthly.tail(12).iterrows():
            self.cell(24, 6, safe_text(str(idx)), 1, 0, 'C')
            self.cell(16, 6, safe_text(str(int(row['actions']))), 1, 0, 'C')
            self.cell(28, 6, safe_text(f"{int(row['megots']):,}".replace(',', ' ')), 1, 0, 'C')
            self.cell(18, 6, safe_text(f"{row['dechets_kg']:.1f}"), 1, 0, 'C')
            self.cell(16, 6, safe_text(str(int(row['nb_benevoles']))), 1, 0, 'C')
            self.cell(20, 6, safe_text(f"{row['hours']:.1f}"), 1, 0, 'C')
            self.cell(24, 6, safe_text(row['performance']), 1, 1, 'C')
        
        if not monthly.empty:
            # Style ADEME/GIEC
            plt.style.use('seaborn-v0_8-muted')
            fig, ax1 = plt.subplots(figsize=(10, 5))
            
            bars = ax1.bar(monthly.index, monthly['megots'], color='#10b981', alpha=0.3, label='Mégots collectes')
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
            if (not self.is_dummy) and os.path.exists(path):
                os.remove(path)

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
        self.set_font('Helvetica', 'B', 12); self.cell(0, 10, "LECTURE SAISONNALITÉ (pics printemps/été à vérifier)", ln=True)
        self.set_font('Helvetica', '', 11); self.multi_cell(0, 7, safe_text(
            "L'analyse met en évidence la dynamique mensuelle observée sur la période. "
            f"{trend_note}"
        ))

    def create_trends_analysis(self, city_name, city_df):
        self.add_page(); 
        link = self.add_to_toc("5) évolution temporelle et projection", is_sub=False)
        self.set_link(link)
        
        self.section_header("5. ÉVOLUTION TEMPORELLE & PROJECTION", "Courbes de tendance, regression simple, IC95 et projection prudente")
        
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
        if len(monthly) >= 3:
            x = np.arange(len(monthly), dtype=float)
            y = monthly['megots'].to_numpy(dtype=float)
            slope, intercept = np.polyfit(x, y, 1)
            yhat = slope * x + intercept
            resid = y - yhat
            sigma = float(np.sqrt(np.sum(resid**2) / max(len(y) - 2, 1)))
            ci95 = 1.96 * sigma

            next_idx = float(len(monthly))
            next3_idx = np.array([len(monthly), len(monthly) + 1, len(monthly) + 2], dtype=float)
            pred_m1 = (slope * next_idx) + intercept
            pred_trim = float(np.mean((slope * next3_idx) + intercept))

            projection_text = (
                "Régression linéaire simple (série mensuelle mégots): "
                f"pente={slope:+.2f} / mois, IC95 approx. +/- {ci95:.1f}. "
                f"Projection prudente M+1: {pred_m1:.0f} megots. "
                f"Projection prudente trimestre suivant (moyenne): {pred_trim:.0f} megots/mois."
            )
        elif len(monthly) >= 2:
            prev_val = float(monthly['megots'].iloc[-2] or 0.0)
            last_val = float(monthly['megots'].iloc[-1] or 0.0)
            delta = ((last_val - prev_val) / max(prev_val, 1.0)) * 100.0
            projection_text = (
                "Projection préliminaire (signal faible): "
                f"variation mensuelle récente de {delta:+.1f}% sur les megots."
            )

        self.set_font('Helvetica', '', 11); self.multi_cell(0, 7, safe_text(projection_text))
        
        self.set_fill_color(254, 242, 242); self.set_draw_color(*COLORS['danger'])
        self.rect(10, self.get_y()+5, 190, 30, 'FD')
        self.set_xy(15, self.get_y()+10); self.set_font('Helvetica', 'B', 10); self.set_text_color(*COLORS['danger'])
        self.cell(0, 5, "PRUDENCE D'INTERPRETATION :", ln=True)
        self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
        self.multi_cell(180, 5, safe_text("Ces modèles mathématiques ne prennent pas en compte les variations météorologiques exceptionnelles ou les changements de législation locale."))

    def create_spatial_analysis(self, city_name, city_df):
        self.add_page(); self.add_to_toc("6) Analyse spatiale et cartographie", is_sub=False)
        self.section_header("6. ANALYSE SPATIALE & CARTOGRAPHIE", "Capture/lien carte interactive, hotspots et lecture territoriale")
        
        # QR Code
        if not self.is_dummy:
            qr_url = f"{self.map_base_url}/actions/map"
            qr = qrcode.make(qr_url)
            path = os.path.join(OUTPUT_DIR, f"qr_{city_name}.png")
            qr.save(path)
            self.image(path, x=150, y=self.get_y(), w=40)
            if os.path.exists(path):
                os.remove(path)
        
        self.set_font('Helvetica', 'B', 12); self.cell(0, 10, "CAPTURE ET LIEN VERS CARTE INTERACTIVE", ln=True)
        self.set_font('Helvetica', '', 10); self.multi_cell(130, 5, safe_text(
            "Scannez ce QR code pour visualiser les points d'action, les zones propres et les points chauds en temps réel. "
            "Presets partageables inclus: pollution, zones propres, partenaires, recentes et prioritaires."
        ))
        
        self.ln(20)
        self.add_to_toc("6.1 Typologie des lieux", is_sub=True)
        self.set_font('Helvetica', 'B', 14); self.cell(0, 10, "6.1 TYPOLOGIE DES LIEUX IMPACTÉS", ln=True)
        if 'type_lieu' in city_df.columns:
            counts = city_df['type_lieu'].value_counts()
            for t, v in counts.items():
                self.set_font('Helvetica', 'B', 10); self.cell(40, 8, safe_text(t))
                self.set_font('Helvetica', '', 10); self.cell(0, 8, f"{v} interventions", ln=True)

        self.ln(4)
        self.set_font('Helvetica', 'B', 12)
        self.cell(0, 8, "LECTURE TERRITORIALE (ARRONDISSEMENTS / HOTSPOTS)", ln=True)
        self.set_font('Helvetica', '', 10)
        if 'arrondissement' in city_df.columns:
            arr = city_df['arrondissement'].fillna('Non renseigné').astype(str).value_counts().head(5)
            for a, n in arr.items():
                self.cell(0, 6, safe_text(f"- {a}: {int(n)} point(s)"), ln=True)
        else:
            self.cell(0, 6, safe_text("- Arrondissements non renseignes dans la source."), ln=True)

    def create_product_updates(self, city_df):
        self.add_page()
        link = self.add_to_toc("2. Nouveautés produit", is_sub=False)
        self.set_link(link)
        self.section_header("2. NOUVEAUTÉS PRODUIT", "Fonctionnalités visibles et activables")

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
            bullets.append(f"Actions récentes (30 jours): {recent_count} point(s) visibles sur preset dédié.")
        if pollution_count > 0:
            bullets.append(f"Zones à traiter en priorité: {pollution_count} points de pollution actifs.")
        if clean_count > 0:
            bullets.append(f"Zones propres valorisées: {clean_count} points verifies.")
        if partner_count > 0:
            bullets.append(f"Partenaires engagés cartographiés: {partner_count} point(s) acteurs.")
        if quality_warnings > 0:
            bullets.append(f"Validation admin: {quality_warnings} contribution(s) atypique(s) à vérifier manuellement.")
        else:
            bullets.append("Validation admin: aucune anomalie majeure détectée sur les données de référence.")

        self.set_font('Helvetica', '', 11)
        self.set_text_color(*COLORS['text'])
        for item in bullets:
            self.multi_cell(0, 7, safe_text(f"- {item}"))

        self.ln(4)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 8, safe_text("Parcours benevole simplifié"), ln=True)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 6, safe_text(
            "Le flux recommande est désormais: 1) choisir une rubrique prioritaire, "
            "2) déclarer via formulaire progressif 3 etapes, 3) suivre l'impact et reprendre l'action."
        ))

    def create_waste_typology(self, city_df):
        self.add_to_toc("5.2 Typologie des déchets", is_sub=True)
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
            f"Base sur les relevés de terrain, estimation de la repartition suivante :\n"
            f"- PLASTIQUE ({ratio_plastique*100:.0f}%) : ~{kg_plastique:.1f} kg. Potentiel de revalorisation élevé.\n"
            f"- VERRE/METAL : {kg_verre + kg_metal:.1f} kg. Recyclage possible si collecte séparée.\n"
            "- DÉCHETS ULTIMES : flux gérés par les filières d'incineration avec valorisation énergétique."
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
            if os.path.exists(pie_path):
                os.remove(pie_path)

    def create_prioritization(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("7) Palmares et priorisation territoriale", is_sub=False)
        self.set_link(link)
        
        self.section_header("7. PALMARES ET PRIORISATION TERRITORIALE", "Top 10, évolutions, associations, indicateurs normalisés et indice composite")
        
        top_10 = city_df.groupby('lieu_complet')['megots'].sum().nlargest(10)
        self.set_font('Helvetica', 'B', 11); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
        self.cell(140, 10, "Lieu d'intervention", 1, 0, 'L', True); self.cell(50, 10, "Indice ICP", 1, 1, 'C', True)
        
        self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text'])
        max_megots = float(top_10.max()) if not top_10.empty else 0.0
        for l, v in top_10.items():
            self.cell(140, 8, safe_text(str(l)[:65]), 1)
            icp = int(round((float(v) / max(max_megots, 1.0)) * 100))
            self.set_font('Helvetica', 'B', 10); self.cell(50, 8, f"{icp}/100", 1, 1, 'C'); self.set_font('Helvetica', '', 10)

        # Evolution: amelioration/degradation
        if 'date' in city_df.columns:
            ordered = city_df.sort_values('date')
            half = max(len(ordered) // 2, 1)
            first = ordered.iloc[:half].groupby('lieu_complet')['megots'].sum()
            second = ordered.iloc[half:].groupby('lieu_complet')['megots'].sum()
            diff = (second - first).dropna().sort_values()
            self.ln(3)
            self.set_font('Helvetica', 'B', 11)
            self.cell(0, 8, safe_text("Lieux en amélioration / dégradation"), ln=True)
            self.set_font('Helvetica', '', 9)
            if not diff.empty:
                improves = diff.head(3)
                worsens = diff.tail(3)
                self.multi_cell(0, 5, safe_text("Top amélioration:"))
                for k, v in improves.items():
                    self.multi_cell(0, 5, safe_text(f"- {str(k)[:80]} : {float(v):+.0f} megots"))
                self.multi_cell(0, 5, safe_text("Top dégradation:"))
                for k, v in worsens.items():
                    self.multi_cell(0, 5, safe_text(f"- {str(k)[:80]} : {float(v):+.0f} megots"))
            else:
                self.multi_cell(0, 5, safe_text("- Données insuffisantes pour comparer les périodes."))

        # Classement associations + indicateurs normalises
        if 'association' in city_df.columns:
            assoc = city_df.groupby('association').agg({
                'megots': 'sum',
                'dechets_kg': 'sum',
                'nb_benevoles': 'sum',
                'temps_min': 'sum',
            }).sort_values('megots', ascending=False).head(6)
            self.ln(2)
            self.set_font('Helvetica', 'B', 11)
            self.cell(0, 8, safe_text("Classement associations (actions, volumes, mobilisation, efficience)"), ln=True)
            self.set_font('Helvetica', '', 8)
            for asso, row in assoc.iterrows():
                ben = max(float(row['nb_benevoles']), 1.0)
                hours = max((float(row['temps_min']) * ben) / 60.0, 1e-6)
                m_per_b = float(row['megots']) / ben
                kg_per_b = float(row['dechets_kg']) / ben
                m_per_hb = float(row['megots']) / hours
                self.multi_cell(
                    0,
                    5,
                    safe_text(
                        f"- {asso}: megots={int(row['megots'])}, kg={float(row['dechets_kg']):.1f}, "
                        f"mégots/benevole={m_per_b:.1f}, kg/benevole={kg_per_b:.2f}, megots/h/benevole={m_per_hb:.1f}"
                    ),
                )

    def create_volunteer_analysis(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("8) Mobilisation citoyenne", is_sub=False)
        self.set_link(link)
        
        self.section_header("8. MOBILISATION CITOYENNE", "Total, taille des groupes, efficacite et fidélisation")
        
        total_ben = int(city_df['nb_benevoles'].sum())
        avg_per_action = float(city_df['nb_benevoles'].mean()) if len(city_df) else 0.0
        max_group = int(city_df['nb_benevoles'].max()) if len(city_df) else 0

        solo = city_df[city_df['nb_benevoles'] <= 1]
        small = city_df[(city_df['nb_benevoles'] >= 2) & (city_df['nb_benevoles'] <= 5)]
        team = city_df[city_df['nb_benevoles'] >= 6]

        def eff(df):
            ben = max(float(df['nb_benevoles'].sum()), 1.0)
            return float(df['megots'].sum()) / ben

        self.set_font('Helvetica', '', 11)
        self.multi_cell(0, 7, safe_text(
            f"Total benevoles mobilisés: {total_ben}. Moyenne / action: {avg_per_action:.2f}. Record de groupe: {max_group}."
        ))
        self.multi_cell(0, 7, safe_text(
            f"Distribution groupes - solo: {len(solo)}, petit groupe: {len(small)}, equipe: {len(team)}."
        ))
        self.multi_cell(0, 7, safe_text(
            f"Efficacité mégots/benevole - solo: {eff(solo):.1f}, petit groupe: {eff(small):.1f}, equipe: {eff(team):.1f}."
        ))

        # Fidelisation si identifiant exploitable disponible
        identity_col = None
        for candidate in ['nom', 'actor_name', 'created_by_clerk_id']:
            if candidate in city_df.columns:
                identity_col = candidate
                break
        if identity_col:
            ids = city_df[identity_col].dropna().astype(str).str.strip()
            ids = ids[ids != ""]
            if not ids.empty:
                counts = ids.value_counts()
                new_users = int((counts == 1).sum())
                recurring = int((counts >= 2).sum())
                self.multi_cell(0, 7, safe_text(
                    f"Fidélisation (si donnée disponible): nouveaux={new_users}, recurrents={recurring}."
                ))
            else:
                self.multi_cell(0, 7, safe_text("Fidélisation : identifiants insuffisants."))
        else:
            self.multi_cell(0, 7, safe_text("Fidélisation : non calculable (pas d'identifiant benevole exploitable)."))

    def create_web_rubriques_summary(self, city_df):
        self.add_page()
        link = self.add_to_toc("8bis) Nouvelles rubriques web", is_sub=False)
        self.set_link(link)

        self.section_header(
            "8bis. NOUVELLES RUBRIQUES WEB",
            "Community, Trash Spotter, lieux propres/spots et traces cartographiques",
        )
        metrics = self._compute_web_rubrique_metrics(city_df)

        self.set_font('Helvetica', '', 11)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(
            0,
            7,
            safe_text(
                f"Sur la période analysée: {metrics['clean_places_count']} lieu(x) propre(s) et "
                f"{metrics['spots_count']} spot(s) issus des nouvelles rubriques."
            ),
        )
        self.multi_cell(
            0,
            7,
            safe_text(
                f"Traçabilité géospatiale: {metrics['drawing_count']} action(s) avec dessin de zone "
                "(polyline/polygon ou GeoJSON)."
            ),
        )

        self.ln(2)
        self.set_font('Helvetica', 'B', 11)
        self.cell(0, 8, safe_text("Indicateurs de sources (rubriques web)"), ln=True)
        self.set_font('Helvetica', '', 10)
        self.multi_cell(
            0,
            6,
            safe_text(
                f"- Enregistrements source spot: {metrics['spots_source_count']}\n"
                f"- Enregistrements source community: {metrics['community_source_count']}"
            ),
        )

        if metrics["active_spots_count"] is not None:
            self.multi_cell(
                0,
                6,
                safe_text(
                    f"- Spots actifs (base community): {metrics['active_spots_count']}\n"
                    f"- événements à venir (community): {metrics['upcoming_events_count']}\n"
                    f"- RSVP oui cumulés sur événements à venir: {metrics['upcoming_rsvp_yes']}"
                ),
            )
        elif metrics["db_note"]:
            self.multi_cell(0, 6, safe_text(f"- {metrics['db_note']}"))

        self.ln(2)
        self.set_fill_color(*COLORS['light_bg'])
        self.rect(10, self.get_y(), 190, 30, 'F')
        self.set_xy(15, self.get_y() + 4)
        self.set_font('Helvetica', 'B', 10)
        self.cell(0, 6, safe_text("Lecture opérationnelle"), ln=True)
        self.set_font('Helvetica', '', 9)
        self.multi_cell(
            180,
            5,
            safe_text(
                "Ces indicateurs relient le PDF aux nouvelles rubriques du site web: suivi de mobilisation community, "
                "priorisation des zones spotter et preuve cartographique des interventions."
            ),
        )

    def create_rubrique_decision_chapters(self, city_df):
        self.add_page()
        link = self.add_to_toc("8ter) Blocs décisionnels par rubrique", is_sub=False)
        self.set_link(link)
        self.section_header(
            "8ter. BLOCS DÉCISIONNELS PAR RUBRIQUE",
            "Traduction opérationnelle des rubriques web (1 rubrique = 1 bloc decisionnel)",
        )

        records = city_df.copy()
        location_series = self._series_str(records, ["lieu_complet", "location_label", "adresse"])
        area_series = location_series.apply(self._extract_arrondissement_label)
        source_series = self._series_str(records, ["source"]).str.lower()
        type_series = self._series_str(records, ["type_lieu", "type"]).str.lower()
        record_type_series = self._series_str(records, ["record_type"]).str.lower()
        status_series = self._series_str(records, ["status"]).str.lower()
        actor_series = self._series_str(records, ["actor_name", "nom", "created_by_clerk_id"])
        association_series = self._series_str(records, ["association"])

        lat_series = pd.to_numeric(
            records.get("latitude", records.get("lat", pd.Series(np.nan, index=records.index))), errors="coerce"
        )
        lon_series = pd.to_numeric(
            records.get("longitude", records.get("lon", pd.Series(np.nan, index=records.index))), errors="coerce"
        )
        kg_series = pd.to_numeric(records.get("dechets_kg", 0), errors="coerce").fillna(0)
        megots_series = pd.to_numeric(records.get("megots", 0), errors="coerce").fillna(0)
        benevoles_series = pd.to_numeric(records.get("nb_benevoles", records.get("benevoles", 0)), errors="coerce").fillna(0)
        temps_series = pd.to_numeric(records.get("temps_min", 0), errors="coerce").fillna(0)

        date_candidates = [
            "created_at",
            "submitted_at",
            "updated_at",
            "approved_at",
            "date",
        ]
        date_series = pd.Series(pd.NaT, index=records.index, dtype="datetime64[ns]")
        for col in date_candidates:
            if col in records.columns:
                parsed = pd.to_datetime(records[col], errors="coerce")
                date_series = date_series.where(date_series.notna(), parsed)
        if date_series.notna().any():
            now_date = datetime.now()
            age_days = (now_date - date_series).dt.days
            freshness_days = float(age_days.median()) if age_days.notna().any() else None
            fresh_30_count = int((age_days <= 30).sum())
        else:
            freshness_days = None
            fresh_30_count = 0

        by_area = records.assign(__area=area_series).groupby("__area").agg(
            actions=("__area", "size"),
            kg=("dechets_kg", "sum"),
            megots=("megots", "sum"),
        )
        by_area = by_area.sort_values(["actions", "kg"], ascending=False)
        top_areas = [idx for idx in by_area.head(3).index.tolist() if idx]

        route_candidates = records[(lat_series.notna()) & (lon_series.notna())].copy()
        if not route_candidates.empty:
            route_candidates["route_score"] = kg_series[(lat_series.notna()) & (lon_series.notna())] * 10 + megots_series[
                (lat_series.notna()) & (lon_series.notna())
            ] * 0.05
            route_top = route_candidates.sort_values("route_score", ascending=False)
            top_route_labels = (
                route_top.get("lieu_complet", route_top.get("location_label", pd.Series(dtype=str)))
                .fillna("")
                .astype(str)
                .head(3)
                .tolist()
            )
        else:
            top_route_labels = []

        community_metrics = self._compute_web_rubrique_metrics(records)
        spot_mask = (record_type_series == "spot") | type_series.str.contains("spot", na=False)
        clean_place_mask = (record_type_series == "clean_place") | type_series.str.contains("clean", na=False)
        pending_mask = status_series.isin({"pending", "new"})
        approved_mask = status_series.isin({"approved", "validated", "cleaned"})
        rejected_mask = status_series.isin({"rejected", "refused", "dismissed"})
        geoloc_mask = (lat_series.notna()) & (lon_series.notna())

        actions_total = int(len(records))
        total_hours = float(((temps_series * benevoles_series) / 60.0).sum())
        unique_volunteers = int(actor_series[actor_series != ""].nunique())
        geo_coverage_ratio = float(by_area.index.nunique() / 20.0) if len(by_area.index) else 0.0
        geoloc_rate = float(geoloc_mask.mean() * 100.0) if len(records) else 0.0
        traces_count = int(community_metrics["drawing_count"])

        completeness_cols = ["date", "lieu_complet", "dechets_kg", "megots", "nb_benevoles", "temps_min"]
        available_completeness_cols = [c for c in completeness_cols if c in records.columns]
        if available_completeness_cols and len(records):
            completeness_score = float(records[available_completeness_cols].notna().mean().mean() * 100.0)
        else:
            completeness_score = 0.0

        coherent_rows = (
            (kg_series >= 0)
            & (megots_series >= 0)
            & (benevoles_series >= 0)
            & (temps_series >= 0)
        )
        coherence_score = float(coherent_rows.mean() * 100.0) if len(records) else 0.0

        moderation_total = int((pending_mask | approved_mask | rejected_mask).sum())
        moderated_done = int((approved_mask | rejected_mask).sum())
        moderation_conversion = (moderated_done / moderation_total * 100.0) if moderation_total else 0.0

        moderation_delay_days = None
        created_candidates = ["created_at", "submitted_at", "date"]
        done_candidates = ["approved_at", "reviewed_at", "updated_at"]
        created_series = pd.Series(pd.NaT, index=records.index, dtype="datetime64[ns]")
        done_series = pd.Series(pd.NaT, index=records.index, dtype="datetime64[ns]")
        for col in created_candidates:
            if col in records.columns:
                created_series = created_series.where(created_series.notna(), pd.to_datetime(records[col], errors="coerce"))
        for col in done_candidates:
            if col in records.columns:
                done_series = done_series.where(done_series.notna(), pd.to_datetime(records[col], errors="coerce"))
        delay_days = (done_series - created_series).dt.total_seconds() / 86400.0
        if delay_days.notna().any():
            moderation_delay_days = float(delay_days[delay_days >= 0].mean()) if (delay_days >= 0).any() else None

        if date_series.notna().any():
            latest_date = date_series.max()
            period_start = latest_date - pd.Timedelta(days=29)
            prev_start = latest_date - pd.Timedelta(days=59)
            period_mask = date_series.between(period_start, latest_date, inclusive="both")
            prev_mask = date_series.between(prev_start, period_start - pd.Timedelta(days=1), inclusive="both")
            volume_period = int(period_mask.sum())
            volume_prev_period = int(prev_mask.sum())
            trend_pct = ((volume_period - volume_prev_period) / max(volume_prev_period, 1)) * 100.0
        else:
            volume_period = actions_total
            volume_prev_period = 0
            trend_pct = 0.0

        recurrence_score = float(by_area["actions"].head(3).mean()) if not by_area.empty else 0.0

        route_steps = route_candidates.copy()
        if not route_steps.empty:
            route_steps = route_steps.sort_values("route_score", ascending=False).head(5).copy()
            route_steps["lat"] = pd.to_numeric(route_steps.get("latitude", route_steps.get("lat")), errors="coerce")
            route_steps["lon"] = pd.to_numeric(route_steps.get("longitude", route_steps.get("lon")), errors="coerce")
            route_steps = route_steps.dropna(subset=["lat", "lon"])
            if len(route_steps) >= 2:
                coords = route_steps[["lat", "lon"]].to_numpy(dtype=float)
                deltas = np.diff(coords, axis=0)
                # Approximation locale: 1 deg ~111 km
                est_distance_km = float(np.sqrt((deltas[:, 0] * 111.0) ** 2 + (deltas[:, 1] * 78.0) ** 2).sum())
            else:
                est_distance_km = 0.0
        else:
            est_distance_km = 0.0

        recycled_cols = [c for c in ["recyclable_kg", "kg_recyclable", "dechets_recycles_kg"] if c in records.columns]
        if recycled_cols:
            recycled_kg = float(sum(pd.to_numeric(records[c], errors="coerce").fillna(0).sum() for c in recycled_cols))
            recyclable_index = (recycled_kg / max(float(kg_series.sum()), 1e-6)) * 100.0
        else:
            recycled_kg = 0.0
            recyclable_index = 0.0

        points_count = int(geoloc_mask.sum())
        polyline_count = 0
        polygon_count = 0
        for col in ["geometry_kind", "manual_drawing_kind"]:
            if col in records.columns:
                kinds = records[col].fillna("").astype(str).str.lower().str.strip()
                polyline_count = max(polyline_count, int((kinds == "polyline").sum()))
                polygon_count = max(polygon_count, int((kinds == "polygon").sum()))
        spatial_coverage_indicator = ((points_count + polyline_count + polygon_count) / max(actions_total, 1)) * 100.0

        actor_counts = actor_series[actor_series != ""].value_counts()
        badge_confirmed = int((actor_counts >= 5).sum())
        badge_expert = int((actor_counts >= 10).sum())
        top_actors = actor_counts.head(3).index.tolist()

        top_associations = association_series[association_series != ""].value_counts().head(3).index.tolist()
        partner_like_count = int(type_series.str.contains("engag|partenaire|commerce", na=False).sum())

        # Bloc Analyse contexte (climate / weather / compare)
        if date_series.notna().any():
            end_date = date_series.max()
            climate_6m_start = end_date - pd.DateOffset(months=6)
            climate_12m_start = end_date - pd.DateOffset(months=12)
            climate_6m_mask = date_series >= climate_6m_start
            climate_12m_mask = date_series >= climate_12m_start
            climate_6m_actions = int(climate_6m_mask.sum())
            climate_12m_actions = int(climate_12m_mask.sum())
            climate_6m_kg = float(kg_series[climate_6m_mask].sum())
            climate_12m_kg = float(kg_series[climate_12m_mask].sum())
            climate_6m_megots = int(megots_series[climate_6m_mask].sum())
            climate_12m_megots = int(megots_series[climate_12m_mask].sum())
        else:
            climate_6m_actions = actions_total
            climate_12m_actions = actions_total
            climate_6m_kg = float(kg_series.sum())
            climate_12m_kg = float(kg_series.sum())
            climate_6m_megots = int(megots_series.sum())
            climate_12m_megots = int(megots_series.sum())

        # Impacts estimes (approximation opérationnelle)
        # 500L eau protegee / megot + 1.4gCO2e évités / megot
        climate_water_l = int(megots_series.sum() * 500)
        climate_co2_kg = float(megots_series.sum() * 0.0014)

        # Fenetre opérationnelle meteo (proxy basee sur observables terrain)
        # On prend comme "favorable" les actions >= 30 min et >= 2 benevoles (sessions stables).
        weather_operable_mask = (temps_series >= 30) & (benevoles_series >= 2)
        weather_window_rate = float(weather_operable_mask.mean() * 100.0) if len(records) else 0.0
        weather_security_reco = (
            "Fenetre favorable majoritaire; conserver verification meteo H-24 et H-2."
            if weather_window_rate >= 70
            else "Fenetre instable; renforcer filtrage meteo, EPI pluie/chaleur et plan de repli."
        )

        # Benchmark inter-zones
        compare_table = records.assign(__area=area_series).groupby("__area").agg(
            actions=("__area", "size"),
            kg=("dechets_kg", "sum"),
            megots=("megots", "sum"),
        )
        if not compare_table.empty:
            compare_table["kg_action"] = compare_table["kg"] / compare_table["actions"].clip(lower=1)
            compare_rank = compare_table.sort_values(["actions", "kg"], ascending=False).head(3)
            compare_rank_labels = [
                f"{idx} (actions={int(row['actions'])}, kg={float(row['kg']):.1f}, megots={int(row['megots'])}, kg/action={float(row['kg_action']):.2f})"
                for idx, row in compare_rank.iterrows()
            ]
        else:
            compare_rank_labels = []

        # Bloc Communauté (community / gamification / actors)
        community_mask = source_series.str.contains("community", na=False)
        events_created = int(community_mask.sum())
        if date_series.notna().any():
            now_ts = pd.Timestamp(datetime.now())
            events_upcoming = int((community_mask & (date_series >= now_ts)).sum())
            events_past = int((community_mask & (date_series < now_ts)).sum())
        else:
            events_upcoming = 0
            events_past = events_created

        def _extract_rsvp(series_name: str) -> int:
            if series_name in records.columns:
                return int(pd.to_numeric(records[series_name], errors="coerce").fillna(0).sum())
            return 0

        rsvp_yes = _extract_rsvp("rsvp_yes")
        rsvp_maybe = _extract_rsvp("rsvp_maybe")
        rsvp_no = _extract_rsvp("rsvp_no")
        rsvp_total = rsvp_yes + rsvp_maybe + rsvp_no
        participation_rate = (rsvp_yes / rsvp_total * 100.0) if rsvp_total else 0.0

        leaderboard = actor_counts.head(5)
        leaderboard_txt = ", ".join([f"{name} ({int(cnt)})" for name, cnt in leaderboard.items()]) if not leaderboard.empty else "non disponible"
        next_badge_count = int((actor_counts >= 3).sum())
        progression_badges = f"paliers_3+={next_badge_count}, 5+={badge_confirmed}, 10+={badge_expert}"

        actor_type_series = self._series_str(records, ["actor_type", "type_acteur", "acteur_type"]).str.lower()
        if actor_type_series.eq("").all():
            actor_type_series = pd.Series(
                np.where(
                    association_series.str.strip().ne(""),
                    "association",
                    np.where(type_series.str.contains("commerce|entreprise|partenaire", na=False), "partenaire", "citoyen"),
                ),
                index=records.index,
                dtype="object",
            )
        actor_type_counts = actor_type_series.value_counts().head(4)
        actor_type_txt = ", ".join([f"{k}={int(v)}" for k, v in actor_type_counts.items()]) if not actor_type_counts.empty else "n/a"
        actor_zone_counts = records.assign(__area=area_series).groupby("__area").size().sort_values(ascending=False).head(3)
        actor_zones_txt = ", ".join([f"{idx} ({int(v)})" for idx, v in actor_zone_counts.items()]) if not actor_zone_counts.empty else "n/a"

        self._render_decision_block(
            "Bloc Pilotage (dashboard/reports/admin/elus)",
            [
                (
                    "KPI coeur: "
                    f"actions={actions_total}, kg={kg_series.sum():.1f}, megots={int(megots_series.sum())}, "
                    f"benevoles={max(unique_volunteers, int(benevoles_series.sum()))}, heures={total_hours:.1f}, "
                    f"geocouverture={geo_coverage_ratio*100:.1f}%, traces={traces_count}."
                ),
                (
                    "Qualité de données: "
                    f"complétude={completeness_score:.1f}%, coherence={coherence_score:.1f}%, "
                    f"fraîcheur_mediane={f'{freshness_days:.0f} j' if freshness_days is not None else 'n/a'}, "
                    f"taux_geolocalisation={geoloc_rate:.1f}%."
                ),
                (
                    "Moderation: "
                    f"pending={int(pending_mask.sum())} -> approved={int(approved_mask.sum())} / rejected={int(rejected_mask.sum())}, "
                    f"delai_moyen={f'{moderation_delay_days:.1f} j' if moderation_delay_days is not None else 'n/a'}, "
                    f"volume_periode={volume_period} (prev={volume_prev_period})."
                ),
                (
                    "Vue elus: "
                    f"top_zones={', '.join(top_areas) if top_areas else 'non renseignees'}, "
                    f"score_recurrence={recurrence_score:.1f}, tendance_vs_periode_precedente={trend_pct:+.1f}%."
                ),
            ],
            [
                "Prioriser les moyens sur les zones a recurrence élevée et suivre la tendance sur des périodes glissantes de 30 jours.",
                "Industrialiser la data-quality (contrôles automatiques de complétude/coherence/fraîcheur) avant publication aux elus.",
                f"Piloter le funnel de moderation avec un objectif de conversion > {max(moderation_conversion, 80.0):.0f}% et delai moyen < 3 jours.",
            ],
            kpis=[
                ("Actions", str(actions_total)),
                ("Qualité", f"{completeness_score:.0f}%"),
                ("Géoloc", f"{geoloc_rate:.0f}%"),
                ("Moderation", f"{moderation_conversion:.0f}%"),
            ],
            summary_rows=[
                (
                    "KPI coeur",
                    f"{kg_series.sum():.1f} kg / {int(megots_series.sum())} mgt",
                    f"{total_hours:.1f} h ; {max(unique_volunteers, int(benevoles_series.sum()))} ben",
                ),
                (
                    "Qualité données",
                    f"C {completeness_score:.1f}% | Co {coherence_score:.1f}%",
                    f"Fraicheur {f'{freshness_days:.0f} j' if freshness_days is not None else 'n/a'}",
                ),
                (
                    "Moderation",
                    f"{int(pending_mask.sum())} -> {int(approved_mask.sum())}/{int(rejected_mask.sum())}",
                    f"Delai {f'{moderation_delay_days:.1f} j' if moderation_delay_days is not None else 'n/a'}",
                ),
                (
                    "Vue elus",
                    f"Récurrence {recurrence_score:.1f}",
                    f"Tendance {trend_pct:+.1f}%",
                ),
            ],
        )

        self._render_decision_block(
            "Bloc Terrain (new/map/history/route/recycling/trash-spotter)",
            [
                (
                    "Traçabilité opérationnelle: "
                    f"action={int((record_type_series == 'action').sum())}, "
                    f"spot={int(spot_mask.sum())}, clean_place={int(clean_place_mask.sum())}, "
                    f"conversion_modérée={moderation_conversion:.1f}%."
                ),
                (
                    "Itineraire: "
                    f"circuit recommande={', '.join(top_route_labels) if top_route_labels else 'a definir'}, "
                    f"distance_estimee={est_distance_km:.1f} km, hotspots={len(top_route_labels)}."
                ),
                (
                    "Recyclage: "
                    f"flux triés={recycled_kg:.1f} kg, indice_tri_propre={recyclable_index:.1f}%, "
                    f"volume exploitable={kg_series.sum():.1f} kg."
                ),
                (
                    "Cartographie avancee: "
                    f"points={points_count}, polylines={polyline_count}, polygones={polygon_count}, "
                    f"couverture_spatiale={spatial_coverage_indicator:.1f}%."
                ),
            ],
            [
                "Transformer chaque campagne en parcours terrain operable (etapes, distance, hotspots) pour reduire le temps improductif.",
                "Relier trash-spotter et moderation pour accelerer la conversion des signalements en actions planifiees.",
                "Structurer le suivi recyclage pour valoriser les flux tries et le volume reellement exploitable.",
            ],
            kpis=[
                ("Spots", str(int(spot_mask.sum()))),
                ("Clean place", str(int(clean_place_mask.sum()))),
                ("Distance", f"{est_distance_km:.1f} km"),
                ("Couverture", f"{spatial_coverage_indicator:.0f}%"),
            ],
            summary_rows=[
                (
                    "Traçabilité",
                    f"a:{int((record_type_series == 'action').sum())} s:{int(spot_mask.sum())} c:{int(clean_place_mask.sum())}",
                    f"Conversion {moderation_conversion:.1f}%",
                ),
                (
                    "Itineraire",
                    f"{len(top_route_labels)} etapes",
                    f"Hotspots {len(top_route_labels)} ; {est_distance_km:.1f} km",
                ),
                (
                    "Recyclage",
                    f"{recycled_kg:.1f} kg tries",
                    f"Indice {recyclable_index:.1f}% ; volume {kg_series.sum():.1f} kg",
                ),
                (
                    "Cartographie",
                    f"{points_count}/{polyline_count}/{polygon_count}",
                    "Points / polylines / polygones",
                ),
            ],
        )

        self._render_decision_block(
            "Bloc Analyse contexte (climate/weather/compare)",
            [
                (
                    "Climate: impacts estimes="
                    f"eau_protegee~{climate_water_l:,} L, CO2e_evite~{climate_co2_kg:.1f} kg; "
                    f"serie_6_mois(actions={climate_6m_actions}, kg={climate_6m_kg:.1f}, megots={climate_6m_megots}) ; "
                    f"serie_12_mois(actions={climate_12m_actions}, kg={climate_12m_kg:.1f}, megots={climate_12m_megots})."
                ).replace(",", " "),
                (
                    "Weather: conditions_fenetre_operationnelle="
                    f"{weather_window_rate:.1f}% ; recommandation_securite={weather_security_reco}"
                ),
                (
                    "Compare: benchmark inter-zones="
                    f"{' | '.join(compare_rank_labels) if compare_rank_labels else 'données insuffisantes'}."
                ),
            ],
            [
                "Publier une serie glissante 6/12 mois pour relier volumetrie terrain et impacts climatiques estimes.",
                "Operer en mode securite: GO/NO-GO meteo, check EPI et adaptation du parcours selon conditions.",
                "Utiliser le classement inter-zones (actions, kg, megots, kg/action) pour arbitrer les priorites hebdomadaires.",
            ],
            kpis=[
                ("Eau protegee", f"{climate_water_l:,} L".replace(",", " ")),
                ("CO2e evite", f"{climate_co2_kg:.1f} kg"),
                ("Fenetre meteo", f"{weather_window_rate:.1f}%"),
                ("Zones comparees", str(len(compare_table))),
            ],
            summary_rows=[
                (
                    "Climate 6 mois",
                    f"{climate_6m_actions} act.",
                    f"{climate_6m_kg:.1f} kg ; {climate_6m_megots} mgt",
                ),
                (
                    "Climate 12 mois",
                    f"{climate_12m_actions} act.",
                    f"{climate_12m_kg:.1f} kg ; {climate_12m_megots} mgt",
                ),
                (
                    "Weather",
                    f"Fenetre {weather_window_rate:.1f}%",
                    weather_security_reco,
                ),
                (
                    "Compare",
                    f"{len(compare_table)} zones",
                    compare_rank_labels[0] if compare_rank_labels else "données insuffisantes",
                ),
            ],
        )

        self._render_decision_block(
            "Bloc Communauté (community/gamification/actors)",
            [
                (
                    "Events: "
                    f"créés={events_created}, a_venir={events_upcoming}, passés={events_past}, "
                    f"RSVP yes/maybe/no={rsvp_yes}/{rsvp_maybe}/{rsvp_no}, "
                    f"taux_participation={participation_rate:.1f}%."
                ),
                (
                    "Gamification: "
                    f"leaderboard={leaderboard_txt}; paliers_badges={progression_badges}."
                ),
                (
                    "Actors: "
                    f"partenaires_actifs={partner_like_count}, contribution_par_type={actor_type_txt}, "
                    f"zones_d_engagement={actor_zones_txt}."
                ),
            ],
            [
                "Caler le calendrier community sur les zones a plus fort potentiel de participation RSVP.",
                "Activer des paliers de progression visibles pour augmenter retention et fréquence de contribution.",
                "Suivre la contribution par type d'acteur pour equilibrer l'effort associations/citoyens/partenaires.",
            ],
            kpis=[
                ("Events", str(events_created)),
                ("Participation", f"{participation_rate:.1f}%"),
                ("Partenaires", str(partner_like_count)),
                ("Badges 5+", str(badge_confirmed)),
            ],
            summary_rows=[
                (
                    "Events",
                    f"{events_created}/{events_upcoming}/{events_past}",
                    "Crees / a venir / passes",
                ),
                (
                    "RSVP",
                    f"{rsvp_yes}/{rsvp_maybe}/{rsvp_no}",
                    f"Taux yes {participation_rate:.1f}%",
                ),
                (
                    "Gamification",
                    f"3+:{next_badge_count} 5+:{badge_confirmed} 10+:{badge_expert}",
                    leaderboard_txt,
                ),
                (
                    "Actors",
                    actor_type_txt,
                    actor_zones_txt,
                ),
            ],
        )

        self._render_decision_block(
            "Rubrique elus (collectivités)",
            [
                f"{len(records)} action(s) analysée(s) sur la periode.",
                f"Zones les plus sollicitees: {', '.join(top_areas) if top_areas else 'non renseignees'}.",
                f"Volume total collecte: {kg_series.sum():.1f} kg.",
            ],
            [
                "Concentrer les prochains moyens municipaux sur les 3 zones prioritaires.",
                "Suivre mensuellement le ratio actions/zone pour mesurer la recurrence.",
            ],
        )

        self._render_decision_block(
            "Rubrique route (itineraires terrain)",
            [
                f"Points geolocalises exploitables: {int(((lat_series.notna()) & (lon_series.notna())).sum())}.",
                f"Étapes conseillées: {', '.join(top_route_labels) if top_route_labels else 'données géographiques insuffisantes'}.",
            ],
            [
                "Construire les prochaines missions autour de 3 a 5 etapes geolocalisees.",
                "Prioriser les zones a fort score (kg + megots) pour maximiser l'impact.",
            ],
        )

        self._render_decision_block(
            "Rubrique weather (meteo terrain)",
            [
                "La planification meteo est un prerequis securite avant sortie.",
                "Le module web depend d'une API meteo externe (verification en temps réel conseillee).",
            ],
            [
                "Valider la fenetre meteo H-24 et H-2 avant chaque intervention.",
                "Ajuster durée, matériel et taille d'equipe selon pluie/vent/chaleur.",
            ],
        )

        self._render_decision_block(
            "Rubrique compare (benchmark territorial)",
            [
                f"Comparaison disponible sur {len(by_area)} zone(s).",
                f"Top zones comparees: {', '.join(top_areas) if top_areas else 'non disponible'}.",
            ],
            [
                "Utiliser le benchmark pour affecter les equipes aux zones les moins performantes.",
                "Suivre l'evolution kg/action par zone pour arbitrer les priorites.",
            ],
        )

        self._render_decision_block(
            "Rubrique community (rassemblements)",
            [
                f"Signal community source: {community_metrics['community_source_count']} enregistrement(s).",
                f"événements à venir: {community_metrics['upcoming_events_count'] if community_metrics['upcoming_events_count'] is not None else 'n/a'}.",
                f"RSVP oui cumules: {community_metrics['upcoming_rsvp_yes'] if community_metrics['upcoming_rsvp_yes'] is not None else 'n/a'}.",
            ],
            [
                "Programmer les actions de terrain autour des événements a plus fort RSVP.",
                "Relancer la mobilisation sur les zones a forte recurrence la semaine precedente.",
            ],
        )

        self._render_decision_block(
            "Rubrique gamification (classement)",
            [
                f"Contributeurs identifies: {int(len(actor_counts))}.",
                f"Badges confirmes: {badge_confirmed} | badges experts: {badge_expert}.",
                f"Top contributeurs: {', '.join(top_actors) if top_actors else 'anonymes/non renseignes'}.",
            ],
            [
                "Valoriser publiquement les contributeurs recurrents pour soutenir la retention.",
                "Fixer un objectif de progression badge par campagne locale.",
            ],
        )

        self._render_decision_block(
            "Rubrique actors (partenaires)",
            [
                f"Partenaires identifies via typologie: {partner_like_count}.",
                f"Associations les plus actives: {', '.join(top_associations) if top_associations else 'non renseignees'}.",
            ],
            [
                "Animer un comite mensuel associations/collectivités sur indicateurs partages.",
                "Prioriser les partenariats sur les zones de récidive forte.",
            ],
        )

        self._render_decision_block(
            "Rubrique trash-spotter (spots / clean_place)",
            [
                f"Spots detectes: {int(spot_mask.sum())} | lieux propres: {int(clean_place_mask.sum())}.",
                f"Statuts en attente: {int(pending_mask.sum())} | valides: {int(approved_mask.sum())}.",
                f"Traces cartographiques (zones dessinees): {community_metrics['drawing_count']}.",
            ],
            [
                "Accelerer la moderation des signalements en attente pour fiabiliser la carte.",
                "Utiliser les traces geographiques pour piloter la recurrence par micro-zone.",
            ],
        )

    def create_gamification_section(self):
        self.add_page(); 
        link = self.add_to_toc("8. Communauté & gamification", is_sub=False)
        self.set_link(link)
        
        self.section_header("8. COMMUNAUTÉ", "Système de badges et récompenses")
        badges = [
            ("Éclaireur", "Niveau 1 : premières contributions directes."),
            ("Sentinelle", "Niveau 2 : gardien régulier de l'espace public."),
            ("Légende", "Niveau 3 : ambassadeur territorial majeur.")
        ]
        for b, d in badges:
            self.set_fill_color(*COLORS['light_bg']); self.rect(10, self.get_y(), 190, 15, 'F')
            self.set_xy(15, self.get_y()+3); self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['primary']); self.cell(40, 10, safe_text(b))
            self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text']); self.cell(0, 10, safe_text(d), ln=True)
            self.ln(5)

    def create_partners_summary(self):
        self.add_page(); 
        link = self.add_to_toc("9. Annuaire des acteurs engagés", is_sub=False)
        self.set_link(link)
        
        self.section_header("9. RÉSEAU PARTENAIRE", "Écosystème des structures à impact")
        
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(
            "Plus de 100 structures sont désormais répertoriées dans notre annuaire dynamique. "
            "Ces acteurs sont classés par domaines d'intervention prioritaires :"
        ))
        self.ln(5)
        
        cats = [
            ("ENVIRONNEMENT", "Lutte contre le gaspillage, agriculture urbaine, protection de l'eau."),
            ("SOCIAL & PRÉCARITÉ", "Aide alimentaire, hébergement d'urgence, soutien aux personnes vulnérables."),
            ("MIXITÉ & INCLUSION", "Insertion des réfugiés, égalité des chances, sport inclusif."),
            ("HUMANITAIRE", "Aide internationale, secours civils, logistique d'urgence."),
            ("COMMERCE ENGAGÉ", "Lieux de vie solidaires et commerces à mission environnementale."),
        ]
        
        for cat, desc in cats:
            self.set_fill_color(*COLORS['light_bg'])
            self.set_font('Helvetica', 'B', 10); self.set_text_color(*COLORS['primary'])
            self.cell(0, 8, safe_text(cat), 1, 1, 'L', True)
            self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
            self.multi_cell(0, 6, safe_text(desc), 1)
            self.ln(3)

    def create_rse_metrics(self, city_df):
        """Section exclusive au rapport RSE : métriques ESG."""
        self.add_page()
        link = self.add_to_toc("Métriques RSE / ESG (corporate)", is_sub=False)
        self.set_link(link)
        self.section_header("MÉTRIQUES RSE", "Performance extra-financière et impact mécénat")
        
        total_kg = city_df['dechets_kg'].sum()
        total_h = int((city_df['temps_min'] * city_df['nb_benevoles']).sum() / 60)
        
        data = [
            ("Impact environnemental", f"{total_kg:.1f} kg retirés du milieu naturel."),
            ("Impact social (mécénat)", f"{total_h} heures de mobilisation citoyenne."),
            ("Gouvernance participative", f"{len(city_df['association'].unique())} structures territoriales impliquées."),
            ("Économie circulaire", "Récupération de flux spécifiques (mégots, plastiques).")
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
        self.multi_cell(180, 5, safe_text("Ces données sont conformes aux relevés de terrain Clean My Map et peuvent alimenter une déclaration de performance extra-financière (DPEF)."))

    def create_guide_summary(self):
        self.add_page(); 
        link = self.add_to_toc("10. Guide du citoyen vert", is_sub=False)
        self.set_link(link)
        
        self.section_header("10. GUIDE STRATÉGIQUE", "Bonnes pratiques et ressources opérationnelles")
        
        guides = [
            ("1. IMPACT MÉGOTS", "Un seul mégot contamine jusqu'à 1 000 L d'eau douce."),
            ("2. LE GUIDE DU TRI", "Centralisation des consignes Paris/Yvelines."),
            ("3. ÉCO-GESTES", "Sobriété numérique, domestique et énergétique."),
            ("4. SÉCURITÉ", "Protocoles de protection lors des cleanwalks.")
        ]
        
        for g, d in guides:
            self.set_font('Helvetica', 'B', 11); self.set_text_color(*COLORS['secondary'])
            self.cell(0, 8, safe_text(g), ln=True)
            self.set_font('Helvetica', '', 10); self.set_text_color(*COLORS['text'])
            self.multi_cell(0, 6, safe_text(d))
            self.ln(2)

    def create_impact_infographic(self, city_df):
        self.add_page(); self.add_to_toc("9) Impact environnemental et socio-urbain", is_sub=False)
        self.section_header("9. IMPACT ENVIRONNEMENTAL & SOCIO-URBAIN", "CO2 évité, équivalences parlantes et bénéfices qualitatifs")
        
        total_m = int(city_df['megots'].sum())
        total_kg = city_df['dechets_kg'].sum()
        eau = total_m * IMPACT_CONSTANTS['EAU_PROTEGEE_PER_MEGOT_L']
        co2 = total_m * IMPACT_CONSTANTS['CO2_PER_MEGOT_KG']
        bancs = int(total_kg / IMPACT_CONSTANTS['PLASTIQUE_POUR_BANC_KG'])
        pulls = int(total_kg / IMPACT_CONSTANTS.get('PLASTIQUE_POUR_PULL_KG', 0.5))
        
        self.set_fill_color(*COLORS['light_bg']); self.rect(10, self.get_y(), 190, 65, 'F')
        self.set_xy(15, self.get_y()+5); self.set_font('Helvetica', 'B', 14); self.set_text_color(*COLORS['primary'])
        self.cell(0, 10, "INFOGRAPHIE DES EQUIVALENCES", ln=True)
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(
            f"- EAU : {eau:,} litres protégés (équivalent {eau/1000000:.1f} million de litres).\n"
            f"- CARBONE : {co2:.1f} kg CO2e évités (équivalent {co2/0.12:.0f} km en voiture).\n"
            f"- RECYCLAGE : {bancs} bancs publics ou {pulls:,} pulls en polyester recyclé.\n"
            f"- ARBRES : capacité d'absorption annuelle équivalente à {co2/25:.1f} arbres (source ADEME)."
        ))
        self.ln(4)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*COLORS['secondary'])
        self.cell(0, 8, safe_text("Bénéfices urbains qualitatifs"), ln=True)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 6, safe_text(
            "- Propreté perçue améliorée dans les zones traitees.\n"
            "- Cadre de vie et appropriation citoyenne de l'espace public renforcés.\n"
            "- Sensibilisation locale et dynamique cooperative associations-habitants."
        ))

    # --- PARTIE 4 : PRÉCONISATIONS & PLAN D'ACTION ---

    def create_action_plan(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("10) Plan d'action et recommandations a la Mairie", is_sub=False)
        self.set_link(link)
        
        self.section_header("PARTIE 4 - PRÉCONISATIONS & PLAN D'ACTION", "10) Recommandations actionnables, coûts/effets attendus et objectifs N+1")
        recos = [
            ("Interventions hotspots", "Hebdomadaire", "Moyen", "Baisse des points chauds"),
            ("Dispositifs anti-megots", "Permanent", "Moyen", "Reduction des megots"),
            ("Signalétique / prévention", "Mensuel", "Faible", "Sensibilisation locale"),
            ("Coordination associations-mairie", "Mensuel", "Faible", "Pilotage unifié")
        ]
        self.set_font(self._font_family, 'B', 10); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
        self.set_draw_color(*COLORS['secondary'])
        self.set_line_width(0.25)
        self.cell(70, 10, "Action", 1, 0, 'C', True)
        self.cell(35, 10, "Fréquence", 1, 0, 'C', True)
        self.cell(30, 10, "Coût", 1, 0, 'C', True)
        self.cell(55, 10, "Effet attendu", 1, 1, 'C', True)
        self.set_draw_color(*COLORS['border'])
        self.set_line_width(0.15)
        self.set_font(self._font_family, '', 9); self.set_text_color(*COLORS['text'])
        for idx, (a, freq, cost, e) in enumerate(recos):
            self.set_fill_color(*COLORS['zebra'] if idx % 2 == 0 else COLORS['white'])
            self.cell(70, 10, safe_text(a), 1, 0, 'L', True)
            self.cell(35, 10, safe_text(freq), 1, 0, 'C', True)
            self.cell(30, 10, safe_text(cost), 1, 0, 'C', True)
            self.cell(55, 10, safe_text(e), 1, 1, 'L', True)

        # Objectifs N+1
        total_actions = int((~city_df.get('est_propre', pd.Series(False, index=city_df.index)).fillna(False).astype(bool)).sum()) if len(city_df) else 0
        total_megots = int(city_df['megots'].sum()) if len(city_df) else 0
        total_kg = float(city_df['dechets_kg'].sum()) if len(city_df) else 0.0

        prudent_actions = int(total_actions * 1.10)
        prudent_megots = int(total_megots * 1.10)
        prudent_kg = total_kg * 1.10

        ambitious_actions = int(total_actions * 1.30)
        ambitious_megots = int(total_megots * 1.30)
        ambitious_kg = total_kg * 1.30

        self.ln(4)
        self.set_font(self._font_family, 'B', 11)
        self.cell(0, 8, safe_text("Objectifs chiffrés N+1"), ln=True)
        self.set_font(self._font_family, '', 10)
        self.multi_cell(0, 6, safe_text(
            f"Scénario prudent : {prudent_actions} actions, {prudent_megots:,} megots, {prudent_kg:.1f} kg.\n"
            f"Scénario ambitieux : {ambitious_actions} actions, {ambitious_megots:,} megots, {ambitious_kg:.1f} kg."
        ))

    # --- PARTIE 5 : ANNEXES ---

    def create_annex_separator(self):
        self.add_page()
        link = self.add_to_toc("11) Annexes (documentation technique)", is_sub=False)
        self.set_link(link)
        self.section_header(
            "PARTIE 5 - ANNEXES",
            "Documentation détaillée (hors récit principal décideur)",
        )
        self._render_insight_box(
            "Pourquoi cette séparation ?",
            [
                "Le récit principal garde une lecture décisionnelle rapide.",
                "Les annexes regroupent les détails techniques, le registre exhaustif et le glossaire.",
                "Cette structure facilite la diffusion grand public sans perdre la profondeur d'audit.",
            ],
        )

    def create_detailed_registry(self, city_df):
        self.add_page(); 
        link = self.add_to_toc("11.1) Registre complet des actions", is_sub=True)
        self.set_link(link)
        
        self.section_header("11.1 REGISTRE COMPLET DES ACTIONS", "Table de reference pour audit et contrôle")
        self.set_font(self._font_family, 'B', 7); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
        self.set_draw_color(*COLORS['secondary'])
        self.set_line_width(0.2)
        h = [
            ('ID', 16), ('Date', 14), ('Lieu', 42), ('Arr', 10), ('Asso', 20),
            ('Mgt', 10), ('Kg', 10), ('Dur', 10), ('Ben', 10), ('M/B', 10), ('Kg/B', 10), ('M/H/B', 12), ('Statut', 16)
        ]
        for t, w in h: self.cell(w, 8, safe_text(t), 1, 0, 'C', True)
        self.ln()
        self.set_draw_color(*COLORS['accent'])
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_draw_color(*COLORS['border'])
        self.set_line_width(0.15)
        self.set_font(self._font_family, '', 6); self.set_text_color(*COLORS['text'])
        for i, (_, r) in enumerate(city_df.sort_values('date', ascending=False).iterrows()):
            if i >= 220:
                break
            if self.get_y() > 270:
                self.add_page()
                self.set_font(self._font_family, 'B', 7); self.set_fill_color(*COLORS['secondary']); self.set_text_color(255,255,255)
                self.set_draw_color(*COLORS['secondary'])
                self.set_line_width(0.2)
                for t, w in h: self.cell(w, 8, safe_text(t), 1, 0, 'C', True)
                self.ln()
                self.set_draw_color(*COLORS['accent'])
                self.set_line_width(0.4)
                self.line(10, self.get_y(), 200, self.get_y())
                self.set_draw_color(*COLORS['border'])
                self.set_line_width(0.15)
                self.set_font(self._font_family, '', 6); self.set_text_color(*COLORS['text'])
            fill = (i % 2 == 0)  # Alterne True/False
            if fill:
                self.set_fill_color(*COLORS['zebra'])
            else:
                self.set_fill_color(*COLORS['white'])
            date_val = r['date'].strftime('%d/%m/%y') if pd.notna(r.get('date')) else "n/a"
            arr = r.get('arrondissement', '')
            if not arr:
                arr_match = re.search(r"\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b", str(r.get('lieu_complet', '')).lower())
                arr = f"{arr_match.group(1)}e" if arr_match else "-"
            ben = max(float(r.get('nb_benevoles', 0) or 0), 1.0)
            hours = max((float(r.get('temps_min', 0) or 0) * ben) / 60.0, 1e-6)
            m_per_b = float(r.get('megots', 0) or 0) / ben
            kg_per_b = float(r.get('dechets_kg', 0) or 0) / ben
            m_per_hb = float(r.get('megots', 0) or 0) / hours

            self.cell(16, 6, safe_text(str(r.get('id', f"A-{i+1}"))[:10]), 1, 0, 'C', fill)
            self.cell(14, 6, safe_text(date_val), 1, 0, 'C', fill)
            self.cell(42, 6, safe_text(str(r.get('lieu_complet', ''))[:28]), 1, 0, 'L', fill)
            self.cell(10, 6, safe_text(str(arr)[:8]), 1, 0, 'C', fill)
            self.cell(20, 6, safe_text(str(r.get('association', 'N/A'))[:12]), 1, 0, 'L', fill)
            self.cell(10, 6, str(int(r.get('megots', 0) or 0)), 1, 0, 'C', fill)
            self.cell(10, 6, f"{float(r.get('dechets_kg', 0) or 0):.1f}", 1, 0, 'C', fill)
            self.cell(10, 6, f"{float(r.get('temps_min', 0) or 0):.0f}", 1, 0, 'C', fill)
            self.cell(10, 6, str(int(ben)), 1, 0, 'C', fill)
            self.cell(10, 6, f"{m_per_b:.1f}", 1, 0, 'C', fill)
            self.cell(10, 6, f"{kg_per_b:.2f}", 1, 0, 'C', fill)
            self.cell(12, 6, f"{m_per_hb:.1f}", 1, 0, 'C', fill)
            status = "ZONE PROPRE" if bool(r.get('est_propre', False)) else "ACTION"
            stat_color = COLORS['primary_dark'] if status.startswith("ZONE") else COLORS['text']
            self.set_text_color(*stat_color)
            self.cell(16, 6, safe_text(status[:12]), 1, 1, 'C', fill)
            self.set_text_color(*COLORS['text'])

    def create_glossary(self):
        self.add_page(); 
        link = self.add_to_toc("11.3) Glossaire simplifié", is_sub=True)
        self.set_link(link)
        
        self.section_header("11.3 GLOSSAIRE SIMPLIFIÉ", "Définitions en langage clair (1 à 2 lignes)")
        
        data = [
            ("Action", "Intervention de nettoyage réalisée sur le terrain par des benevoles."),
            ("Spot", "Point signalé comme sale ou prioritaire, à vérifier ou traiter."),
            ("Clean place", "Lieu confirme comme propre après verification terrain."),
            ("Moderation", "Validation des signalements avant publication dans les vues publiques."),
            ("Géocouverture", "Part des zones de la ville effectivement couvertes par les données."),
            ("Trace cartographique", "Dessin de parcours ou de zone (point, ligne, polygone) dans la carte."),
            ("KPI", "Indicateur de pilotage qui permet de suivre les résultats dans le temps."),
            ("Proxy d'impact", "Estimation utile pour decision, sans remplacer une mesure scientifique."),
            ("RSVP", "Réponse à un événement : oui, peut-être, non."),
            ("Leaderboard", "Classement des contributeurs selon leur activité."),
            ("Badge", "Palier de progression qui valorise l'engagement d'un benevole."),
            ("Benchmark inter-zones", "Comparaison des quartiers pour prioriser les actions futures."),
        ]
        
        for t, d in data:
            self.set_font('Helvetica', 'B', 10); self.set_text_color(*COLORS['primary'])
            self.cell(54, 7, safe_text(t))
            self.set_font('Helvetica', '', 9); self.set_text_color(*COLORS['text'])
            self.multi_cell(0, 7, safe_text(d))
            self.ln(2)

    def create_technical_annex(self):
        self.add_page(); 
        link = self.add_to_toc("11.2) Annexes techniques", is_sub=True)
        self.set_link(link)
        
        self.section_header("11.2 ANNEXES TECHNIQUES", "Dictionnaire, formules, seuils, logs qualité")
        self.set_font('Helvetica', '', 11); self.set_text_color(*COLORS['text'])
        self.multi_cell(0, 7, safe_text(
            "Dictionnaire des variables (extrait):\n"
            "- id, date, lieu_complet, arrondissement, association, megots, dechets_kg, temps_min, nb_benevoles, est_propre.\n\n"
            "Formules de calcul:\n"
            "- score_salet = megots + (dechets_kg x 100)\n"
            "- efficacite = score_salet / heures_benevoles\n"
            "- ratios: mégots/benevole, kg/benevole, megots/h/benevole\n\n"
            "Seuils de criticité:\n"
            "- <150: faible | 150-399: modéré | >=400: élevé\n\n"
            "Logs qualité des données:\n"
            "- vérifier valeurs manquantes date/lieu\n"
            "- vérifier outliers (megots, kg, durée, effectifs)\n"
            "- tracer toute correction dans le journal de contrôle\n\n"
            "Remerciements:\n"
            "Merci aux benevoles, associations et partenaires institutionnels."
        ))

    def _add_core_sections(self, ville, city_df):
        self.create_dynamic_toc()
        self.create_executive_summary(city_df)
        self.create_economic_vision(city_df)
        self.create_methodology(city_df)
        self.create_governance_block(city_df)
        self.create_product_updates(city_df)
        self.create_performance_analysis(ville, city_df)
        self.create_trends_analysis(ville, city_df)
        self.create_spatial_analysis(ville, city_df)
        self.create_waste_typology(city_df)
        self.create_prioritization(city_df)
        self.create_volunteer_analysis(city_df)
        self.create_web_rubriques_summary(city_df)

    def _add_thematic_sections(self, city_df):
        self.create_rubrique_decision_chapters(city_df)
        self.create_gamification_section()
        self.create_partners_summary()
        if self.is_rse:
            self.create_rse_metrics(city_df)
        self.create_guide_summary()
        self.create_impact_infographic(city_df)
        self.create_action_plan(city_df)

    def _add_annex_sections(self, city_df):
        self.create_annex_separator()
        self.create_detailed_registry(city_df)
        self.create_technical_annex()
        self.create_glossary()

    def _add_all_content(self, ville, city_df):
        self._add_core_sections(ville, city_df)
        self._add_thematic_sections(city_df)
        self._add_annex_sections(city_df)

    def generate(self, filename="Rapport_Annuel_Depollution_Citoyenne_Paris.pdf", dest='F'):
        """Génération ordonnée avec sommaire dynamique automatisé."""
        work_df = self.full_df.copy()

        # Compatibilité legacy: schema historique -> schema courant
        rename_map = {
            'nbr megots': 'megots',
            'kg dechets': 'dechets_kg',
            "nom d'association": 'association',
            'temps en min': 'temps_min',
            'nombre benevoles': 'nb_benevoles',
            'adresse precise ou coordo GPS': 'adresse',
            'type': 'type_lieu',
        }
        for old, new in rename_map.items():
            if old in work_df.columns and new not in work_df.columns:
                work_df = work_df.rename(columns={old: new})

        # Sélection ville
        if 'ville' in work_df.columns:
            villes = [v for v in work_df['ville'].dropna().astype(str).unique() if v.strip()] or ['Paris']
        else:
            villes = ['Paris']
        ville = villes[0]
        if 'ville' in work_df.columns:
            city_df = work_df[work_df['ville'] == ville].copy()
        else:
            city_df = work_df.copy()

        # Colonnes textes minimales
        if 'adresse' not in city_df.columns and 'lieu_complet' in city_df.columns:
            city_df['adresse'] = city_df['lieu_complet']
        if 'adresse' not in city_df.columns:
            city_df['adresse'] = 'Lieu inconnu'
        if 'lieu_complet' not in city_df.columns:
            city_df['lieu_complet'] = city_df['adresse']
        if 'association' not in city_df.columns:
            city_df['association'] = 'Non renseigné'
        else:
            city_df['association'] = city_df['association'].fillna('Non renseigné').astype(str)
        if 'type_lieu' not in city_df.columns:
            city_df['type_lieu'] = 'Non renseigné'
        else:
            city_df['type_lieu'] = city_df['type_lieu'].fillna('Non renseigné').astype(str)

        # Alias benevoles + colonnes numeriques
        if 'nb_benevoles' not in city_df.columns and 'benevoles' in city_df.columns:
            city_df['nb_benevoles'] = city_df['benevoles']
        for col in ['megots', 'dechets_kg', 'nb_benevoles', 'temps_min']:
            if col not in city_df.columns:
                city_df[col] = 0
            city_df[col] = pd.to_numeric(city_df[col], errors='coerce').fillna(0)
        city_df['nb_benevoles'] = city_df['nb_benevoles'].astype(int)
        city_df['benevoles'] = city_df['nb_benevoles']

        # Normaliser est_propre en bool
        if 'est_propre' in city_df.columns:
            est = city_df['est_propre']
            if est.dtype == bool:
                city_df['est_propre'] = est.fillna(False)
            else:
                city_df['est_propre'] = (
                    est.astype(str).str.strip().str.lower().isin(
                        {'true', '1', 'yes', 'oui', 'vrai', 'zone propre'}
                    )
                )
        else:
            city_df['est_propre'] = False

        # Dates
        if 'date' not in city_df.columns and 'action_date' in city_df.columns:
            city_df['date'] = city_df['action_date']
        if 'date' not in city_df.columns:
            city_df['date'] = pd.Timestamp.now()
        city_df['date'] = pd.to_datetime(city_df['date'], errors='coerce')
        city_df = city_df.dropna(subset=['date'])

        if city_df.empty:
            city_df = work_df.copy()
            city_df['date'] = pd.Timestamp.now()
            if 'lieu_complet' not in city_df.columns:
                city_df['lieu_complet'] = city_df.get('adresse', 'Lieu inconnu')
            for col in ['megots', 'dechets_kg', 'nb_benevoles', 'temps_min']:
                if col not in city_df.columns:
                    city_df[col] = 0
                city_df[col] = pd.to_numeric(city_df[col], errors='coerce').fillna(0)
            city_df['nb_benevoles'] = city_df['nb_benevoles'].astype(int)
            if 'association' not in city_df.columns:
                city_df['association'] = 'Non renseigné'
            if 'type_lieu' not in city_df.columns:
                city_df['type_lieu'] = 'Non renseigné'
            if 'est_propre' not in city_df.columns:
                city_df['est_propre'] = False

        # --- PASSE 1 : Collecte des numéros de page réels ---
        dummy = PDFReport(work_df)
        dummy.is_dummy = True
        dummy.map_base_url = self.map_base_url
        dummy.feature_flags = self.feature_flags
        dummy.add_page()  # Placeholder for Cover (P1)
        dummy._add_all_content(ville, city_df)
        self.toc_data = dummy.toc_data

        # --- PASSE 2 : Génération réelle ---
        self.create_cover(ville, city_df)
        self._add_all_content(ville, city_df)

        if dest == 'S':
            out = self.output(dest='S')
            return out if isinstance(out, bytes) else out.encode('latin-1', 'replace')

        output_path = os.path.join(OUTPUT_DIR, filename)
        self.output(output_path)
        return output_path

