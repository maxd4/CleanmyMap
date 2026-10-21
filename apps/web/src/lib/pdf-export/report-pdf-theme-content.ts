import type {
  ReportPdfPage,
  ReportPdfSpacing,
  ReportPdfThemeTokens,
  ReportPdfTypography,
} from "./report-pdf-theme.tokens";

export function buildReportSectionChromeCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
): string {
  return `    .cmm-web-section.is-locked {
      border-color: #D5DEE6;
      background: #F8FAFC;
    }
    .cmm-web-section.is-locked .cmm-web-section__header {
      background: linear-gradient(135deg, #EEF2F6, #E7EDF3);
      color: ${theme.gray};
      border-bottom: 1px solid #D5DEE6;
      padding: 4mm 5.5mm 3.5mm;
    }
    .cmm-web-section__header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
    }
    .cmm-web-section.is-locked .cmm-web-section__kicker {
      color: #64748B;
    }
    .cmm-web-section__title {
      margin: 1.5mm 0 0;
      font-size: ${typography.subsection};
      font-weight: 760;
      line-height: 1.14;
    }
    .cmm-web-section.is-locked .cmm-web-section__title {
      color: #334155;
      margin-top: 1.25mm;
      font-size: 13.5pt;
    }
    .cmm-web-section.is-locked .cmm-web-section__subtitle {
      color: #64748B;
      margin-top: 1.2mm;
    }
    .cmm-web-section__body {
      padding: 5mm 6mm;
      display: flex;
      flex-direction: column;
      gap: 4mm;
    }
    .cmm-web-section.is-locked .cmm-web-section__body {
      padding: 3.5mm 5.5mm 4mm;
      gap: 3mm;
    }
    .cmm-web-section__badge {
      border: 1px solid ${theme.rule};
      border-radius: 999px;
      background: ${theme.white};
      color: ${theme.gray};
      font-size: ${typography.caption};
      font-weight: 700;
      padding: 1.25mm 2.5mm;
      white-space: nowrap;
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
`;
}

export function buildReportDocumentFrameCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
  spacing: ReportPdfSpacing,
  page: ReportPdfPage,
): string {
  return `    .cmm-page {
      min-height: calc(${page.minHeight} - 20mm);
      page-break-after: always;
      break-after: page;
      padding: 0;
    }
    .cmm-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .cmm-cover {
      min-height: calc(${page.minHeight} - 20mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid ${theme.rule};
      border-left: 5mm solid ${theme.green};
      padding: 18mm;
      background: ${theme.coverBackground};
    }
    .cmm-kicker {
      color: ${theme.gray};
      font-size: ${typography.caption};
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .cmm-cover h1,
    .cmm-section-title {
      color: ${theme.navy};
      font-size: ${typography.section};
      line-height: 1.18;
      margin: 0 0 5mm;
      font-weight: 750;
      letter-spacing: -0.015em;
    }
    .cmm-cover-subtitle,
    .cmm-muted {
      color: ${theme.gray};
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
      border: 1px solid ${theme.rule};
      border-radius: ${theme.radius};
      padding: ${spacing.cardPadding};
      background: ${theme.white};
      break-inside: avoid;
      page-break-inside: avoid;
    }
`;
}

export function buildReportSectionsAndCalloutsCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
  spacing: ReportPdfSpacing,
): string {
  return `    .cmm-card-label {
      color: ${theme.gray};
      font-size: ${typography.caption};
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }
    .cmm-card-value {
      color: ${theme.navy};
      font-size: ${typography.subsection};
      font-weight: 750;
    }
    .cmm-section {
      margin-bottom: ${spacing.block};
      break-inside: auto;
      page-break-inside: auto;
    }
    .cmm-section-title {
      font-size: ${typography.subsection};
      padding-bottom: 2mm;
      border-bottom: 1px solid ${theme.rule};
    }
    .cmm-subtitle {
      color: ${theme.teal};
      font-size: ${typography.subsubsection};
      font-weight: 700;
      margin: 0 0 3mm;
    }
    .cmm-callout {
      border-left: 2.5mm solid ${theme.blue};
      background: ${theme.noteLight};
      border-radius: ${theme.radius};
      padding: 4mm 5mm;
      margin: 4mm 0;
      break-inside: avoid;
    }
    .cmm-callout.important {
      border-left-color: ${theme.warm};
      background: ${theme.warmLight};
    }
    .cmm-callout.limite {
      border-left-color: ${theme.gray};
      background: #F7F8FA;
    }
    .cmm-callout.locked {
      border-left-color: #94A3B8;
      background: #F8FAFC;
      border: 1px solid #D8E1E8;
      border-left-width: 2mm;
      padding: 3.25mm 4.5mm;
      margin: 2mm 0 0;
    }
    .cmm-callout.locked .cmm-callout-title {
      color: #64748B;
      margin-bottom: 1.5mm;
    }
    .cmm-callout.locked ul {
      margin-bottom: 0;
      padding-left: 4.25mm;
    }
    .cmm-callout-title {
      color: ${theme.navy};
      font-weight: 750;
      margin-bottom: 2mm;
    }
`;
}

export function buildReportTablesAndFooterCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
): string {
  return `    .cmm-table-wrap {
      overflow: visible;
      border: 1px solid ${theme.rule};
      border-radius: ${theme.radius};
      break-inside: auto;
      page-break-inside: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${typography.small};
      break-inside: auto;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th {
      text-align: left;
      background: ${theme.tableHead};
      color: ${theme.navy};
      font-weight: 750;
      padding: 2.5mm;
      border-bottom: 1px solid ${theme.rule};
    }
    td {
      vertical-align: top;
      padding: 2.4mm;
      border-bottom: 1px solid #E6EEF2;
      color: ${theme.ink};
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
      color: ${theme.gray};
      font-size: ${typography.caption};
      border-top: 1px solid ${theme.rule};
      padding-top: 4mm;
      margin-top: 8mm;
    }
`;
}
