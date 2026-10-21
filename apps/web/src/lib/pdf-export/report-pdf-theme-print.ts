import type { ReportPdfThemeTokens } from "./report-pdf-theme.tokens";

export function buildReportPrintCss(theme: ReportPdfThemeTokens): string {
  return `    .no-print { display: none !important; }
    @media screen {
      body { background: #EEF3F5; padding: 16px; }
      .cmm-report { max-width: 210mm; margin: 0 auto; box-shadow: 0 24px 80px -60px rgba(15,23,42,0.55); }
      .cmm-page, .cmm-cover { background-color: ${theme.white}; padding: 18mm; }
    }
    @media print {
      .cmm-web-aside { position: static; }
    }
`;
}
