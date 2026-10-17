import { escapeHtml } from "@/lib/security/html-escape";
import type { DetailLevelId, ModuleState } from "@/lib/reports/report-pdf-data";
import {
  buildOfficialReportCss,
  getReportPdfThemeTokens,
  type ReportPdfTheme,
} from "./report-pdf-theme";

export const REPORT_THEME_PROTOTYPE_BLOCK_IDS = [
  "header",
  "kpi-grid",
  "figure-01",
  "table-01",
  "method-limits",
  "footer",
] as const;

export type ReportThemePrototypeBlockId = (typeof REPORT_THEME_PROTOTYPE_BLOCK_IDS)[number];

export type ReportThemePrototypeSnapshot = {
  title: string;
  period: string;
  scope: string;
  generationId: string;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  kpis: readonly [PrototypeKpi, PrototypeKpi, PrototypeKpi, PrototypeKpi];
  figure: PrototypeFigure;
  table: PrototypeTable;
  method: string;
  limitations: readonly string[];
};

type PrototypeKpi = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
};

type PrototypeFigure = {
  id: "figure-01";
  title: string;
  legend: string;
  source: string;
  points: readonly [PrototypeFigurePoint, PrototypeFigurePoint];
};

type PrototypeFigurePoint = {
  id: string;
  label: string;
  value: number | null;
  x: number;
  y: number;
};

type PrototypeTable = {
  id: "table-01";
  title: string;
  columns: readonly [PrototypeTableColumn, PrototypeTableColumn, PrototypeTableColumn];
  rows: readonly [PrototypeTableRow, PrototypeTableRow];
};

type PrototypeTableColumn = {
  id: string;
  label: string;
  unit: string;
};

type PrototypeTableRow = {
  id: string;
  zone: string;
  observed: number;
  proxy: number | null;
};

type PrototypeBlock =
  | { id: "header"; kind: "header"; snapshot: ReportThemePrototypeSnapshot }
  | { id: "kpi-grid"; kind: "kpi-grid"; kpis: ReportThemePrototypeSnapshot["kpis"] }
  | { id: "figure-01"; kind: "figure"; figure: PrototypeFigure }
  | { id: "table-01"; kind: "table"; table: PrototypeTable }
  | { id: "method-limits"; kind: "method"; method: string; limitations: readonly string[] }
  | { id: "footer"; kind: "footer"; generationId: string };

export const REPORT_THEME_PROTOTYPE_FIXTURE: ReportThemePrototypeSnapshot = {
  title: "Étude terrain – Quai d’Anvers",
  period: "01 janvier – 30 juin 2026",
  scope: "Secteur Nord, Paris",
  generationId: "prototype-2026-06-30-a",
  detailLevel: "default",
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: true,
    detailedFiles: false,
  },
  kpis: [
    { id: "actions", label: "Actions observées", value: 12, unit: "actions" },
    { id: "mass", label: "Masse collectée", value: 42.5, unit: "kg" },
    { id: "zero", label: "Signalement mesuré", value: 0, unit: "signalement" },
    { id: "unknown", label: "Surface instrumentée", value: null, unit: "m²" },
  ],
  figure: {
    id: "figure-01",
    title: "Figure 01 — évolution des observations",
    legend: "Les points indiquent la position de référence des deux observations de la fixture.",
    source: "Source : relevé de terrain CleanMyMap, fixture synthétique.",
    points: [
      { id: "observed-zero", label: "Observation zéro", value: 0, x: 76, y: 126 },
      { id: "observed-mass", label: "Masse", value: 42.5, x: 224, y: 52 },
    ],
  },
  table: {
    id: "table-01",
    title: "Tableau 01 — mesures et proxys",
    columns: [
      { id: "zone", label: "Zone", unit: "—" },
      { id: "observed", label: "Observé", unit: "kg" },
      { id: "proxy", label: "Proxy", unit: "m²" },
    ],
    rows: [
      { id: "row-quai", zone: "Quai d’Anvers", observed: 0, proxy: null },
      { id: "row-jardin", zone: "Jardin des Plantes", observed: 42.5, proxy: 18.2 },
    ],
  },
  method: "Les valeurs observées proviennent de la fixture déterministe ; le proxy est une estimation qualifiée et ne constitue pas une mesure physique directe.",
  limitations: [
    "Une valeur inconnue reste indiquée comme inconnue et n’est pas convertie en zéro.",
    "La fixture ne représente ni une mesure de production ni une preuve scientifique publiée.",
  ],
};

export function composeReportThemePrototype(snapshot: ReportThemePrototypeSnapshot): readonly PrototypeBlock[] {
  return [
    { id: "header", kind: "header", snapshot },
    { id: "kpi-grid", kind: "kpi-grid", kpis: snapshot.kpis },
    { id: "figure-01", kind: "figure", figure: snapshot.figure },
    { id: "table-01", kind: "table", table: snapshot.table },
    { id: "method-limits", kind: "method", method: snapshot.method, limitations: snapshot.limitations },
    { id: "footer", kind: "footer", generationId: snapshot.generationId },
  ];
}

function formatPrototypeValue(value: number | null, unit: string): string {
  return value === null ? `Inconnu (${unit})` : `${value} ${unit}`;
}

function renderHeader(snapshot: ReportThemePrototypeSnapshot): string {
  return `
    <header class="prototype-header" data-report-block="header">
      <p class="prototype-kicker">CleanMyMap · prototype comparatif</p>
      <h1>${escapeHtml(snapshot.title)}</h1>
      <dl class="prototype-context">
        <div><dt>Période</dt><dd>${escapeHtml(snapshot.period)}</dd></div>
        <div><dt>Périmètre</dt><dd>${escapeHtml(snapshot.scope)}</dd></div>
      </dl>
    </header>`;
}

function renderKpiGrid(kpis: ReportThemePrototypeSnapshot["kpis"]): string {
  return `
    <section class="prototype-kpis" data-report-block="kpi-grid" aria-labelledby="prototype-kpi-title">
      <h2 id="prototype-kpi-title">Indicateurs clés</h2>
      <div class="prototype-kpi-grid">
        ${kpis.map((kpi) => `
          <article class="prototype-kpi" data-report-kpi="${escapeHtml(kpi.id)}">
            <h3>${escapeHtml(kpi.label)}</h3>
            <p data-report-value="${kpi.value === null ? "null" : kpi.value}">${escapeHtml(formatPrototypeValue(kpi.value, kpi.unit))}</p>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderFigure(figure: PrototypeFigure): string {
  return `
    <figure class="prototype-figure" data-report-block="${figure.id}" aria-labelledby="${figure.id}-title">
      <h2 id="${figure.id}-title">${escapeHtml(figure.title)}</h2>
      <svg class="prototype-figure__plot" viewBox="0 0 300 160" role="img" aria-label="${escapeHtml(figure.title)}">
        <line x1="42" y1="140" x2="270" y2="140" />
        <line x1="42" y1="20" x2="42" y2="140" />
        ${figure.points.map((point) => `
          <circle cx="${point.x}" cy="${point.y}" r="6" data-report-point="${escapeHtml(point.id)}" data-report-value="${point.value === null ? "null" : point.value}" />
          <text x="${point.x}" y="${Math.min(154, point.y + 20)}" text-anchor="middle">${escapeHtml(point.label)}</text>
          <text x="${point.x}" y="${Math.min(154, point.y + 30)}" text-anchor="middle">${escapeHtml(point.value === null ? "Inconnu" : String(point.value))}</text>`).join("")}
      </svg>
      <figcaption><span>${escapeHtml(figure.legend)}</span><span>${escapeHtml(figure.source)}</span></figcaption>
    </figure>`;
}

function renderTable(table: PrototypeTable): string {
  return `
    <section class="prototype-table-section" data-report-block="${table.id}">
      <h2>${escapeHtml(table.title)}</h2>
      <table>
        <caption>Unités et valeurs de référence</caption>
        <thead><tr>${table.columns.map((column) => `<th scope="col" data-report-unit="${escapeHtml(column.unit)}">${escapeHtml(column.label)} <span>(${escapeHtml(column.unit)})</span></th>`).join("")}</tr></thead>
        <tbody>${table.rows.map((row) => `
          <tr data-report-row="${escapeHtml(row.id)}">
            <th scope="row">${escapeHtml(row.zone)}</th>
            <td data-report-value="${row.observed}">${escapeHtml(formatPrototypeValue(row.observed, "kg"))}</td>
            <td data-report-value="${row.proxy === null ? "null" : row.proxy}">${escapeHtml(formatPrototypeValue(row.proxy, "m²"))}</td>
          </tr>`).join("")}</tbody>
      </table>
    </section>`;
}

function renderMethod(method: string, limitations: readonly string[]): string {
  return `
    <section class="prototype-method" data-report-block="method-limits">
      <h2>Méthode et limites</h2>
      <p>${escapeHtml(method)}</p>
      <ul>${limitations.map((limitation) => `<li>${escapeHtml(limitation)}</li>`).join("")}</ul>
    </section>`;
}

function renderFooter(generationId: string): string {
  return `<footer class="prototype-footer" data-report-block="footer">Génération synthétique : <code>${escapeHtml(generationId)}</code></footer>`;
}

function renderPrototypeBlock(block: PrototypeBlock): string {
  switch (block.kind) {
    case "header":
      return renderHeader(block.snapshot);
    case "kpi-grid":
      return renderKpiGrid(block.kpis);
    case "figure":
      return renderFigure(block.figure);
    case "table":
      return renderTable(block.table);
    case "method":
      return renderMethod(block.method, block.limitations);
    case "footer":
      return renderFooter(block.generationId);
  }
}

function buildPrototypeCss(theme: ReportPdfTheme): string {
  const colors = getReportPdfThemeTokens(theme);
  const impact = theme === "impact";
  return `
    ${buildOfficialReportCss(theme)}
    .prototype-page { width: 182mm; min-height: 257mm; margin: 0 auto; display: grid; gap: 3mm; grid-template-rows: auto auto auto auto auto auto; color: ${colors.ink}; }
    .prototype-header { border: 1px solid ${colors.rule}; border-top: 4mm solid ${colors.teal}; border-radius: ${colors.radius}; padding: 4mm 5mm; background: ${colors.headerBackground}; }
    .prototype-kicker { color: ${colors.gray}; font-size: 8pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 1mm; }
    .prototype-header h1 { color: ${colors.navy}; font-size: 21pt; line-height: 1.1; margin: 0 0 3mm; }
    .prototype-context { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 0; }
    .prototype-context div { border-top: 1px solid ${colors.rule}; padding-top: 2mm; }
    .prototype-context dt, .prototype-kpi h3 { color: ${colors.gray}; font-size: 8pt; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
    .prototype-context dd { margin: .5mm 0 0; font-size: 9pt; }
    .prototype-kpis, .prototype-figure, .prototype-table-section, .prototype-method { border: 1px solid ${colors.rule}; border-radius: ${colors.radius}; padding: 3.5mm 4mm; background: ${impact ? colors.noteLight : colors.white}; }
    .prototype-kpis h2, .prototype-figure h2, .prototype-table-section h2, .prototype-method h2 { color: ${colors.navy}; font-size: 12pt; margin: 0 0 2.5mm; }
    .prototype-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm; }
    .prototype-kpi { border: 1px solid ${colors.rule}; border-radius: ${colors.radius}; padding: 2.5mm; background: ${colors.white}; }
    .prototype-kpi h3 { margin: 0 0 1mm; }
    .prototype-kpi p { color: ${colors.navy}; font-size: 13pt; font-weight: 700; font-variant-numeric: tabular-nums; margin: 0; }
    .prototype-figure__plot { display: block; width: 100%; height: 32mm; border: 1px solid ${colors.rule}; background: ${colors.white}; }
    .prototype-figure__plot line { stroke: ${colors.rule}; stroke-width: 1; }
    .prototype-figure__plot circle { fill: ${colors.teal}; stroke: ${colors.white}; stroke-width: 2; }
    .prototype-figure__plot text { fill: ${colors.ink}; font-size: 8px; }
    .prototype-figure figcaption { display: grid; gap: .5mm; color: ${colors.gray}; font-size: 8pt; margin-top: 1mm; }
    .prototype-table-section table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    .prototype-table-section caption { text-align: left; color: ${colors.gray}; font-size: 8pt; margin-bottom: 1mm; }
    .prototype-table-section th, .prototype-table-section td { border-bottom: 1px solid ${colors.rule}; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
    .prototype-table-section thead th { background: ${colors.tableHead}; color: ${colors.navy}; }
    .prototype-table-section th span { color: ${colors.gray}; font-weight: 400; }
    .prototype-table-section td { font-variant-numeric: tabular-nums; }
    .prototype-method { background: ${impact ? colors.warmLight : colors.white}; border-left: 2.5mm solid ${colors.warm}; }
    .prototype-method p, .prototype-method li { font-size: 8.5pt; line-height: 1.3; }
    .prototype-method ul { margin: 1.5mm 0 0; padding-left: 5mm; }
    .prototype-footer { border-top: 1px solid ${colors.rule}; color: ${colors.gray}; font-size: 8pt; padding-top: 2mm; }
    .prototype-footer code { color: ${colors.navy}; }
    @media screen { body { background: ${impact ? "#EEF3F5" : "#FFFFFF"}; padding: 16px; } }
    @media print { body { padding: 0; } .prototype-page { margin: 0; } }
  `;
}

export function renderReportThemePrototypeHtml(
  snapshot: ReportThemePrototypeSnapshot,
  theme: ReportPdfTheme,
): string {
  const blocks = composeReportThemePrototype(snapshot);
  return `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(snapshot.title)}</title><style>${buildPrototypeCss(theme)}</style></head>
  <body>
    <main class="prototype-page" data-report-theme="${theme}" data-detail-level="${snapshot.detailLevel}" data-modules="${escapeHtml(JSON.stringify(snapshot.modules))}">
      ${blocks.map(renderPrototypeBlock).join("\n")}
    </main>
  </body>
</html>`;
}
