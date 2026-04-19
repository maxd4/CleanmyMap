from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]

PRIMARY = colors.HexColor("#0D3B66")
SECONDARY = colors.HexColor("#1D7874")
ACCENT = colors.HexColor("#F4D35E")
LIGHT_BG = colors.HexColor("#F6F9FC")
TEXT = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#6B7280")


def fmt_inline(text: str) -> str:
    # Escape XML first, then convert markdown-like bold markers.
    s = escape(text)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return s


def make_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "TitleStyle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=30,
            textColor=colors.white,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "SubtitleStyle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=PRIMARY,
            spaceBefore=12,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=SECONDARY,
            spaceBefore=8,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=PRIMARY,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.7,
            leading=15,
            alignment=TA_JUSTIFY,
            textColor=TEXT,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=MUTED,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.3,
            leading=14,
            textColor=TEXT,
            alignment=TA_LEFT,
        ),
    }
    return styles


def parse_table(lines: list[str], start_idx: int):
    rows = []
    i = start_idx
    while i < len(lines):
        raw = lines[i].strip()
        if not raw.startswith("|"):
            break
        cells = [c.strip() for c in raw.strip("|").split("|")]
        rows.append(cells)
        i += 1
    # Remove markdown separator row like |---|---:|
    cleaned = []
    for row in rows:
        if all(re.fullmatch(r":?-{3,}:?", c.replace(" ", "")) for c in row):
            continue
        cleaned.append(row)
    return cleaned, i


def table_flow(rows: list[list[str]], styles):
    if not rows:
        return []
    data = [[Paragraph(fmt_inline(c), styles["body"]) for c in row] for row in rows]
    tbl = Table(data, repeatRows=1, hAlign="LEFT")
    tbl_style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D1D5DB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
    )
    for r in range(1, len(data)):
        if r % 2 == 0:
            tbl_style.add("BACKGROUND", (0, r), (-1, r), LIGHT_BG)
    tbl.setStyle(tbl_style)
    return [tbl, Spacer(1, 0.25 * cm)]


def parse_markdown_visual(text: str, styles):
    lines = text.splitlines()
    story = []
    bullets: list[str] = []

    def flush_bullets():
        nonlocal bullets
        if not bullets:
            return
        items = [ListItem(Paragraph(fmt_inline(b), styles["body"])) for b in bullets]
        story.append(ListFlowable(items, bulletType="bullet", leftIndent=14))
        story.append(Spacer(1, 0.12 * cm))
        bullets = []

    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.strip()

        if not line:
            flush_bullets()
            story.append(Spacer(1, 0.14 * cm))
            i += 1
            continue

        if line == "---":
            flush_bullets()
            story.append(Spacer(1, 0.1 * cm))
            story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#D1D5DB")))
            story.append(Spacer(1, 0.2 * cm))
            i += 1
            continue

        if line.startswith("|"):
            flush_bullets()
            rows, j = parse_table(lines, i)
            story.extend(table_flow(rows, styles))
            i = j
            continue

        if line.startswith("- "):
            bullets.append(line[2:].strip())
            i += 1
            continue

        flush_bullets()

        if line.startswith("# "):
            story.append(Paragraph(fmt_inline(line[2:].strip()), styles["h1"]))
        elif line.startswith("## "):
            story.append(Paragraph(fmt_inline(line[3:].strip()), styles["h2"]))
        elif line.startswith("### "):
            story.append(Paragraph(fmt_inline(line[4:].strip()), styles["h3"]))
        elif line.lower().startswith("plan d'exécution") or line.lower().startswith("plan d'exécution"):
            box = Table(
                [[Paragraph(fmt_inline(line), styles["callout"])]],
                colWidths=[16.8 * cm],
            )
            box.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EAF4FF")),
                        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#93C5FD")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]
                )
            )
            story.append(box)
            story.append(Spacer(1, 0.2 * cm))
        else:
            story.append(Paragraph(fmt_inline(line), styles["body"]))

        i += 1

    flush_bullets()
    return story


def build_cover(title: str, subtitle: str, styles):
    banner = Table(
        [
            [
                Paragraph(fmt_inline(title), styles["title"]),
                Paragraph(fmt_inline(subtitle), styles["subtitle"]),
            ]
        ],
        colWidths=[17.2 * cm],
    )
    banner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 20),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    chip = Table(
        [[Paragraph("Document de diffusion publique", ParagraphStyle("chip", fontName="Helvetica-Bold", fontSize=9.5, textColor=PRIMARY, alignment=TA_CENTER))]],
        colWidths=[7 * cm],
    )
    chip.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
                ("BOX", (0, 0), (-1, -1), 0.5, PRIMARY),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    return [Spacer(1, 2 * cm), chip, Spacer(1, 0.8 * cm), banner, Spacer(1, 0.9 * cm)]


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2.1 * cm, 1.0 * cm, "CleanMyMap — Document projet")
    canvas.drawRightString(A4[0] - 2.1 * cm, 1.0 * cm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(input_path: Path, output_path: Path, cover_title: str, cover_subtitle: str):
    styles = make_styles()
    text = input_path.read_text(encoding="utf-8")

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2.1 * cm,
        rightMargin=2.1 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title=cover_title,
        author="CleanMyMap",
    )

    story = []
    story.extend(build_cover(cover_title, cover_subtitle, styles))
    story.append(HRFlowable(width="100%", thickness=1.2, color=SECONDARY))
    story.append(Spacer(1, 0.5 * cm))
    story.extend(parse_markdown_visual(text, styles))

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)


if __name__ == "__main__":
    build_pdf(
        ROOT / "fiche_projet.txt",
        ROOT / "fiche_projet.pdf",
        "Fiche projet — CleanMyMap",
        "Version longue",
    )
    build_pdf(
        ROOT / "fiche_projet_resume",
        ROOT / "fiche_projet_resume.pdf",
        "Fiche projet — CleanMyMap",
        "Version courte",
    )
