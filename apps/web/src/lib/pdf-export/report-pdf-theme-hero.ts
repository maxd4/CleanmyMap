import type {
  ReportPdfThemeTokens,
  ReportPdfTypography,
} from "./report-pdf-theme.tokens";

export function buildReportHeaderCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
): string {
  return `    .cmm-web-header {
      border: 1px solid ${theme.rule};
      border-radius: ${theme.radius};
      background: ${theme.headerBackground};
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
      color: ${theme.gray};
      font-size: ${typography.caption};
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }
    .cmm-web-header__title {
      color: ${theme.navy};
      font-size: 21pt;
      line-height: 1.08;
      margin: 0;
      font-weight: 760;
      letter-spacing: -0.02em;
    }
    .cmm-web-header__subtitle {
      margin-top: 2mm;
      color: ${theme.gray};
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
      border: 1px solid ${theme.rule};
      border-radius: 999px;
      background: ${theme.white};
      padding: 1.5mm 3mm;
      font-size: ${typography.caption};
      color: ${theme.navy};
      font-weight: 700;
    }
`;
}

export function buildReportHeroCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
): string {
  return `
    .cmm-web-hero,
    .cmm-web-section {
      border: 1px solid ${theme.rule};
      border-radius: ${theme.radius};
      overflow: hidden;
      background: ${theme.white};
      break-inside: auto;
      page-break-inside: auto;
    }
    .cmm-web-hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
    }
    .cmm-web-hero__left {
      padding: 6mm 7mm;
      color: ${theme.accentForeground};
      background: ${theme.accentBackground};
    }
    .cmm-web-hero__left .cmm-web-header__kicker,
    .cmm-web-hero__left .cmm-web-header__title,
    .cmm-web-hero__left .cmm-web-header__subtitle {
      color: ${theme.accentForeground};
    }
    .cmm-web-hero__left .cmm-callout {
      color: ${theme.ink};
    }
    .cmm-web-hero__left .cmm-table-wrap {
      background: ${theme.white};
      color: ${theme.ink};
    }
    .cmm-web-hero__right {
      padding: 6mm 7mm;
      background: ${theme.noteLight};
    }
    .cmm-web-section__header {
      padding: 5mm 6mm;
      color: ${theme.accentForeground};
      background: ${theme.accentBackground};
    }
    .cmm-web-section__kicker {
      color: ${theme.accentForeground};
      font-size: ${typography.caption};
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .cmm-web-section__subtitle {
      margin-top: 1.8mm;
      color: ${theme.accentForeground};
    }
  `;
}
