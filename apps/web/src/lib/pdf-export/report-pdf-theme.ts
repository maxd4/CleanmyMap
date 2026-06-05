export const reportPdfColors = {
  navy: "#1A365D",
  blue: "#2563A8",
  teal: "#1F6F78",
  green: "#2F7D5E",
  gray: "#5A6772",
  rule: "#B8C8D0",
  light: "#EAF2F4",
  noteLight: "#F2F7F8",
  warm: "#8A5A24",
  warmLight: "#FFF7E8",
  tableHead: "#E1EEF2",
  white: "#FFFFFF",
  ink: "#0F172A",
} as const;

export const reportPdfTypography = {
  family: "Inter, Arial, 'TeX Gyre Heros', system-ui, sans-serif",
  body: "11pt",
  small: "9pt",
  caption: "8.5pt",
  section: "20pt",
  subsection: "14pt",
  subsubsection: "11.5pt",
  lineHeight: "1.1",
} as const;

export const reportPdfSpacing = {
  pageMargin: "10mm",
  block: "8mm",
  paragraph: "4.8pt",
  cardPadding: "5mm",
  radius: "3mm",
} as const;

export const reportPdfPage = {
  size: "A4",
  width: "210mm",
  minHeight: "297mm",
  margin: reportPdfSpacing.pageMargin,
} as const;

export function buildOfficialReportCss(): string {
  const c = reportPdfColors;
  const t = reportPdfTypography;
  const s = reportPdfSpacing;
  const p = reportPdfPage;

  return `
    @page { size: ${p.size} portrait; margin: ${p.margin}; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${c.white};
      color: ${c.ink};
      font-family: ${t.family};
      font-size: ${t.body};
      line-height: ${t.lineHeight};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    body { padding: 0; }
    a { color: ${c.blue}; text-decoration: none; }
    p { margin: 0 0 ${s.paragraph}; }
    strong { color: ${c.navy}; font-weight: 700; }
    em { color: ${c.gray}; }
    .cmm-report {
      width: 100%;
      background: ${c.white};
    }
    .cmm-web-shell {
      display: flex;
      flex-direction: column;
      gap: 5mm;
      width: 100%;
    }
    .cmm-web-header {
      border: 1px solid ${c.rule};
      border-radius: ${s.radius};
      background: linear-gradient(135deg, ${c.noteLight}, ${c.white});
      padding: 6mm 7mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cmm-web-header__top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 4mm;
      align-items: flex-start;
    }
    .cmm-web-header__kicker {
      color: ${c.gray};
      font-size: ${t.caption};
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }
    .cmm-web-header__title {
      color: ${c.navy};
      font-size: 21pt;
      line-height: 1.08;
      margin: 0;
      font-weight: 760;
      letter-spacing: -0.02em;
    }
    .cmm-web-header__subtitle {
      margin-top: 2mm;
      color: ${c.gray};
      max-width: 120mm;
    }
    .cmm-web-header__meta {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 3mm;
      margin-top: 4mm;
    }
    .cmm-web-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 2mm;
      margin-top: 3mm;
    }
    .cmm-web-pill {
      border: 1px solid ${c.rule};
      border-radius: 999px;
      background: ${c.white};
      padding: 1.5mm 3mm;
      font-size: ${t.caption};
      color: ${c.navy};
      font-weight: 700;
    }
    .cmm-web-layout {
      display: grid;
      grid-template-columns: 18rem minmax(0, 1fr);
      gap: 5mm;
      align-items: start;
    }
    .cmm-web-aside {
      position: sticky;
      top: 0;
      align-self: start;
      border: 1px solid ${c.rule};
      border-radius: ${s.radius};
      padding: 5mm;
      background: ${c.white};
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cmm-web-main {
      display: flex;
      flex-direction: column;
      gap: 5mm;
      min-width: 0;
    }
    .cmm-toc-item {
      border: 1px solid transparent;
      border-radius: 3mm;
      padding: 2.5mm 3mm;
      color: ${c.ink};
      display: block;
    }
    .cmm-toc-item:hover {
      border-color: ${c.rule};
      background: ${c.noteLight};
    }
    .cmm-toc-title {
      color: ${c.navy};
      font-weight: 750;
    }
    .cmm-toc-subtitle {
      color: ${c.gray};
      font-size: ${t.caption};
      margin-top: 0.8mm;
    }
    .cmm-toc-links {
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 1px solid ${c.rule};
      display: flex;
      flex-direction: column;
      gap: 1.25mm;
    }
    .cmm-toc-link {
      display: block;
      padding: 1.5mm 2.5mm;
      border-radius: 2mm;
      background: ${c.white};
      border: 1px solid ${c.rule};
      color: ${c.ink};
      font-size: ${t.caption};
    }
    .cmm-toc-link strong {
      color: ${c.navy};
      display: block;
      font-size: ${t.small};
    }
    .cmm-web-hero,
    .cmm-web-section {
      border: 1px solid ${c.rule};
      border-radius: ${s.radius};
      overflow: hidden;
      background: ${c.white};
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cmm-web-hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
    }
    .cmm-web-hero__left {
      padding: 6mm 7mm;
      color: ${c.white};
      background: linear-gradient(135deg, ${c.teal}, ${c.navy});
    }
    .cmm-web-hero__right {
      padding: 6mm 7mm;
      background: ${c.noteLight};
    }
    .cmm-web-section__header {
      padding: 5mm 6mm;
      color: ${c.white};
      background: linear-gradient(135deg, ${c.teal}, ${c.navy});
    }
    .cmm-web-section__kicker {
      color: rgba(255, 255, 255, 0.78);
      font-size: ${t.caption};
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .cmm-web-section__title {
      margin: 1.5mm 0 0;
      font-size: ${t.subsection};
      font-weight: 760;
      line-height: 1.14;
    }
    .cmm-web-section__subtitle {
      margin-top: 1.8mm;
      color: rgba(255, 255, 255, 0.88);
    }
    .cmm-web-section__body {
      padding: 5mm 6mm;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }
    .cmm-web-section__grid {
      display: grid;
      gap: 4mm;
    }
    .cmm-web-section__grid--2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .cmm-web-section__grid--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .cmm-web-section__grid--4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .cmm-page {
      min-height: calc(${p.minHeight} - 20mm);
      page-break-after: always;
      break-after: page;
      padding: 0;
    }
    .cmm-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .cmm-cover {
      min-height: calc(${p.minHeight} - 20mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid ${c.rule};
      border-left: 5mm solid ${c.green};
      padding: 18mm;
      background: linear-gradient(135deg, ${c.noteLight}, ${c.white});
    }
    .cmm-kicker {
      color: ${c.gray};
      font-size: ${t.caption};
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .cmm-cover h1,
    .cmm-section-title {
      color: ${c.navy};
      font-size: ${t.section};
      line-height: 1.18;
      margin: 0 0 5mm;
      font-weight: 750;
      letter-spacing: -0.015em;
    }
    .cmm-cover-subtitle,
    .cmm-muted {
      color: ${c.gray};
    }
    .cmm-meta-grid,
    .cmm-stat-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4mm;
    }
    .cmm-stat-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .cmm-card {
      border: 1px solid ${c.rule};
      border-radius: ${s.radius};
      padding: ${s.cardPadding};
      background: ${c.white};
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cmm-card-label {
      color: ${c.gray};
      font-size: ${t.caption};
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }
    .cmm-card-value {
      color: ${c.navy};
      font-size: ${t.subsection};
      font-weight: 750;
    }
    .cmm-section {
      margin-bottom: ${s.block};
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .cmm-section-title {
      font-size: ${t.subsection};
      padding-bottom: 2mm;
      border-bottom: 1px solid ${c.rule};
    }
    .cmm-subtitle {
      color: ${c.teal};
      font-size: ${t.subsubsection};
      font-weight: 700;
      margin: 0 0 3mm;
    }
    .cmm-callout {
      border-left: 2.5mm solid ${c.blue};
      background: ${c.noteLight};
      border-radius: ${s.radius};
      padding: 4mm 5mm;
      margin: 4mm 0;
      break-inside: avoid;
    }
    .cmm-callout.important {
      border-left-color: ${c.warm};
      background: ${c.warmLight};
    }
    .cmm-callout.limite {
      border-left-color: ${c.gray};
      background: #F7F8FA;
    }
    .cmm-callout-title {
      color: ${c.navy};
      font-weight: 750;
      margin-bottom: 2mm;
    }
    .cmm-table-wrap {
      overflow: hidden;
      border: 1px solid ${c.rule};
      border-radius: ${s.radius};
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${t.small};
    }
    th {
      text-align: left;
      background: ${c.tableHead};
      color: ${c.navy};
      font-weight: 750;
      padding: 2.5mm;
      border-bottom: 1px solid ${c.rule};
    }
    td {
      vertical-align: top;
      padding: 2.4mm;
      border-bottom: 1px solid #E6EEF2;
      color: ${c.ink};
      overflow-wrap: anywhere;
    }
    tr:nth-child(even) td { background: #F8FBFC; }
    ul {
      margin: 0 0 4mm 0;
      padding-left: 5mm;
    }
    li { margin-bottom: 1.5mm; }
    .cmm-footer {
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      color: ${c.gray};
      font-size: ${t.caption};
      border-top: 1px solid ${c.rule};
      padding-top: 4mm;
      margin-top: 8mm;
    }
    .no-print { display: none !important; }
    @media screen {
      body { background: #EEF3F5; padding: 16px; }
      .cmm-report { max-width: 210mm; margin: 0 auto; box-shadow: 0 24px 80px -60px rgba(15,23,42,0.55); }
      .cmm-page, .cmm-cover { background-color: ${c.white}; padding: 18mm; }
    }
    @media print {
      .cmm-web-aside { position: static; }
    }
  `;
}
