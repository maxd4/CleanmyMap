import type {
  ReportPdfPage,
  ReportPdfSpacing,
  ReportPdfThemeTokens,
  ReportPdfTypography,
} from "./report-pdf-theme.tokens";

export function buildPageAndTypographyCss(
  theme: ReportPdfThemeTokens,
  typography: ReportPdfTypography,
  spacing: ReportPdfSpacing,
  page: ReportPdfPage,
): string {
  return `
    @page { size: ${page.size} portrait; margin: ${page.margin}; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${theme.white};
      color: ${theme.ink};
      font-family: ${typography.family};
      font-size: ${typography.body};
      line-height: ${typography.lineHeight};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    body { padding: 0; }
    a { color: ${theme.blue}; text-decoration: none; }
    p { margin: 0 0 ${spacing.paragraph}; }
    strong { color: ${theme.navy}; font-weight: 700; }
    em { color: ${theme.gray}; }
    .cmm-report {
      width: 100%;
      background: ${theme.white};
    }
    .cmm-web-shell {
      display: flex;
      flex-direction: column;
      gap: 5mm;
      width: 100%;
    }
`;
}

function buildReportLayoutFrameCss(): string {
  return `    .cmm-web-layout {
      display: grid;
      grid-template-columns: 18rem minmax(0, 1fr);
      gap: 5mm;
      align-items: start;
    }
`;
}

function buildReportAsideCss(theme: ReportPdfThemeTokens): string {
  return `    .cmm-web-aside {
      position: sticky;
      top: 0;
      align-self: start;
      border: 1px solid ${theme.rule};
      border-radius: ${theme.radius};
      padding: 5mm;
      background: ${theme.white};
      break-inside: avoid;
      page-break-inside: avoid;
    }
`;
}

function buildReportMainCss(): string {
  return `    .cmm-web-main {
      display: flex;
      flex-direction: column;
      gap: 5mm;
      min-width: 0;
    }
`;
}

function buildReportTocItemCss(theme: ReportPdfThemeTokens, typography: ReportPdfTypography): string {
  return `    .cmm-toc-item {
      border: 1px solid transparent;
      border-radius: 3mm;
      padding: 2.5mm 3mm;
      color: ${theme.ink};
      display: block;
    }
    .cmm-toc-item:hover {
      border-color: ${theme.rule};
      background: ${theme.noteLight};
    }
    .cmm-toc-title {
      color: ${theme.navy};
      font-weight: 750;
    }
    .cmm-toc-subtitle {
      color: ${theme.gray};
      font-size: ${typography.caption};
      margin-top: 0.8mm;
    }
`;
}

function buildReportTocLinksCss(theme: ReportPdfThemeTokens, typography: ReportPdfTypography): string {
  return `    .cmm-toc-links {
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 1px solid ${theme.rule};
      display: flex;
      flex-direction: column;
      gap: 1.25mm;
    }
    .cmm-toc-link {
      display: block;
      padding: 1.5mm 2.5mm;
      border-radius: 2mm;
      background: ${theme.white};
      border: 1px solid ${theme.rule};
      color: ${theme.ink};
      font-size: ${typography.caption};
    }
    .cmm-toc-link strong {
      color: ${theme.navy};
      display: block;
      font-size: ${typography.small};
    }
`;
}

export function buildReportLayoutCss(theme: ReportPdfThemeTokens, typography: ReportPdfTypography): string {
  return buildReportLayoutFrameCss()
    + buildReportAsideCss(theme)
    + buildReportMainCss()
    + buildReportTocItemCss(theme, typography)
    + buildReportTocLinksCss(theme, typography);
}
