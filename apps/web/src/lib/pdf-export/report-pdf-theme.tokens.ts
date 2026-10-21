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

export type ReportPdfTheme = "impact" | "scientific";

export const REPORT_PDF_THEME_OPTIONS = [
  {
    id: "impact",
    label: "Impact",
    description: "Habillage éditorial et institutionnel, avec accents de marque.",
  },
  {
    id: "scientific",
    label: "Scientifique",
    description: "Habillage sobre, blanc dominant et priorité à la référence.",
  },
] as const satisfies ReadonlyArray<{
  id: ReportPdfTheme;
  label: string;
  description: string;
}>;

export const DEFAULT_REPORT_PDF_THEME: ReportPdfTheme = "impact";

type ReportPdfColorTokens = {
  [Key in keyof typeof reportPdfColors]: string;
};

export type ReportPdfThemeTokens = ReportPdfColorTokens & {
  radius: string;
  headerBackground: string;
  accentBackground: string;
  accentForeground: string;
  coverBackground: string;
};

const reportPdfThemeTokens: Record<ReportPdfTheme, ReportPdfThemeTokens> = {
  impact: {
    ...reportPdfColors,
    radius: "3mm",
    headerBackground: `linear-gradient(135deg, ${reportPdfColors.noteLight}, ${reportPdfColors.white})`,
    accentBackground: `linear-gradient(135deg, ${reportPdfColors.teal}, ${reportPdfColors.navy})`,
    accentForeground: reportPdfColors.white,
    coverBackground: `linear-gradient(135deg, ${reportPdfColors.noteLight}, ${reportPdfColors.white})`,
  },
  scientific: {
    ...reportPdfColors,
    navy: "#1F2937",
    blue: "#334155",
    teal: "#475569",
    green: "#334155",
    gray: "#475569",
    rule: "#94A3B8",
    light: "#F8FAFC",
    noteLight: "#FFFFFF",
    warm: "#475569",
    warmLight: "#F8FAFC",
    tableHead: "#F8FAFC",
    ink: "#111827",
    radius: "1mm",
    headerBackground: "#FFFFFF",
    accentBackground: "#FFFFFF",
    accentForeground: "#1F2937",
    coverBackground: "#FFFFFF",
  },
};

export function getReportPdfThemeTokens(theme: ReportPdfTheme = "impact"): ReportPdfThemeTokens {
  return reportPdfThemeTokens[theme];
}

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
export type ReportPdfTypography = typeof reportPdfTypography;

export const reportPdfSpacing = {
  pageMargin: "10mm",
  block: "8mm",
  paragraph: "4.8pt",
  cardPadding: "5mm",
  radius: "3mm",
} as const;
export type ReportPdfSpacing = typeof reportPdfSpacing;

export const reportPdfPage = {
  size: "A4",
  width: "210mm",
  minHeight: "297mm",
  margin: reportPdfSpacing.pageMargin,
} as const;
export type ReportPdfPage = typeof reportPdfPage;
