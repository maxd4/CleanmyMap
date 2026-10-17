import type { PdfReportChapter } from "@/lib/pdf-export/simple-pdf-content";
import type { ReportModel } from "@/lib/reports/report-model/types";

export type ReportDetailModuleFlags = {
  dataAndCartography: boolean;
  transparencyAndMethods: boolean;
  rawData: boolean;
  detailedFiles: boolean;
};

type ReportDetailLevelContext = {
  report: ReportModel;
  modules: ReportDetailModuleFlags;
  wasteKnown: boolean;
  buttsKnown: boolean;
  volunteersKnown: boolean;
};

function formatNumber(value: number | undefined, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function buildSpatialDetailChapter(
  report: ReportModel,
  wasteKnown: boolean,
  buttsKnown: boolean,
): PdfReportChapter {
  const routeSteps = report.routeSteps ?? [];
  const rows = routeSteps.map((step) => ({
    Étape: step.index,
    Zone: step.label,
    "Masse (kg)": wasteKnown ? formatNumber(step.kg) : "n/a",
    Mégots: buttsKnown ? step.butts : "n/a",
    "Segment (km)": formatNumber(step.segmentKm, 2),
    Latitude: formatNumber(step.latitude, 5),
    Longitude: formatNumber(step.longitude, 5),
  }));

  return {
    id: "details-spatiaux",
    title: "Détails spatiaux",
    subtitle: "Étapes géolocalisées et distance de parcours disponible",
    lines: rows.length > 0
      ? [`${rows.length} étape(s) détaillée(s), pour ${formatNumber(report.routeDistance, 2)} km de parcours cumulé.`]
      : ["Aucune étape géolocalisée détaillée n'est disponible dans ce rapport."],
    rows,
    columns: [
      { key: "Étape", label: "Étape" },
      { key: "Zone", label: "Zone" },
      { key: "Masse (kg)", label: "Masse (kg)" },
      { key: "Mégots", label: "Mégots" },
      { key: "Segment (km)", label: "Segment (km)" },
      { key: "Latitude", label: "Latitude" },
      { key: "Longitude", label: "Longitude" },
    ],
  };
}

function buildMethodDetailChapter(report: ReportModel): PdfReportChapter {
  const sources = Object.entries(report.impactMethodology.sources ?? {}).map(([source, reference]) => ({
    Source: source,
    Référence: String(reference),
  }));
  const lines = [
    `Fraîcheur médiane des données: ${formatNumber(report.quality.freshnessDays, 1)} jour(s).`,
    `Géolocalisation exploitable: ${formatNumber(report.quality.geolocRate, 1)}%.`,
    ...(report.executive.watchouts ?? []),
  ];

  return {
    id: "sources-et-limites",
    title: "Sources et limites détaillées",
    subtitle: "Proxys, hypothèses, qualité et réserves disponibles",
    lines: lines.length > 0 ? lines : ["Aucune limite complémentaire n'est renseignée."],
    rows: sources,
    columns: [
      { key: "Source", label: "Source" },
      { key: "Référence", label: "Référence" },
    ],
  };
}

function buildMonthlyDetailChapter(
  report: ReportModel,
  buttsKnown: boolean,
  volunteersKnown: boolean,
): PdfReportChapter {
  const rows = (report.monthRows12 ?? []).map((row) => ({
    Mois: row.month,
    Actions: row.actions,
    "Masse (kg)": row.knownWasteActions === undefined || row.knownWasteActions > 0
      ? formatNumber(row.kg)
      : "n/a",
    Mégots: buttsKnown ? row.butts : "n/a",
    Bénévoles: volunteersKnown ? row.volunteers : "n/a",
    "Durée (min)": row.minutes,
  }));

  return {
    id: "tendance-mensuelle-detaillee",
    title: "Tendance mensuelle détaillée",
    subtitle: "Série historique disponible sur les douze derniers mois",
    lines: rows.length > 0
      ? ["Les valeurs inconnues restent affichées comme n/a ; elles ne sont pas assimilées à zéro."]
      : ["Aucune ligne mensuelle détaillée n'est disponible dans ce rapport."],
    rows,
    columns: [
      { key: "Mois", label: "Mois" },
      { key: "Actions", label: "Actions" },
      { key: "Masse (kg)", label: "Masse (kg)" },
      { key: "Mégots", label: "Mégots" },
      { key: "Bénévoles", label: "Bénévoles" },
      { key: "Durée (min)", label: "Durée (min)" },
    ],
  };
}

function buildHighlightedActionsChapter(
  report: ReportModel,
  wasteKnown: boolean,
  buttsKnown: boolean,
): PdfReportChapter {
  const rows = (report.highlightActions ?? []).map((action) => ({
    Lieu: action.label,
    "Masse (kg)": wasteKnown ? formatNumber(action.kg) : "n/a",
    Mégots: buttsKnown ? action.butts : "n/a",
    "Photos disponibles": action.photos.length,
  }));

  return {
    id: "actions-mises-en-avant",
    title: "Actions mises en avant",
    subtitle: "Compléments issus des données d'action disponibles",
    lines: rows.length > 0
      ? ["Les identifiants privés ne sont pas exposés dans ce tableau."]
      : ["Aucune action mise en avant avec pièce complémentaire n'est disponible."],
    rows,
    columns: [
      { key: "Lieu", label: "Lieu" },
      { key: "Masse (kg)", label: "Masse (kg)" },
      { key: "Mégots", label: "Mégots" },
      { key: "Photos disponibles", label: "Photos disponibles" },
    ],
  };
}

export function buildExhaustiveSupplementalChapters(
  context: ReportDetailLevelContext,
): PdfReportChapter[] {
  const { report, modules, wasteKnown, buttsKnown, volunteersKnown } = context;
  const chapters: PdfReportChapter[] = [];

  if (modules.dataAndCartography) chapters.push(buildSpatialDetailChapter(report, wasteKnown, buttsKnown));
  if (modules.transparencyAndMethods) chapters.push(buildMethodDetailChapter(report));
  if (modules.rawData) chapters.push(buildMonthlyDetailChapter(report, buttsKnown, volunteersKnown));
  if (modules.detailedFiles) chapters.push(buildHighlightedActionsChapter(report, wasteKnown, buttsKnown));

  return chapters;
}

export function buildConciseChapter(chapter: PdfReportChapter): PdfReportChapter {
  const rowsSuppressed = Boolean(chapter.rows?.length);
  const lines = (chapter.lines ?? []).slice(0, 3);
  if (rowsSuppressed) {
    lines.push("Détails tabulaires omis dans le niveau concis.");
  }

  return {
    ...chapter,
    lines,
    stats: chapter.stats?.slice(0, 4),
    rows: undefined,
    columns: undefined,
  };
}
