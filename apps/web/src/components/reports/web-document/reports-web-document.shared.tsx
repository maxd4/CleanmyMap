"use client";

import type { ActionDataContract } from "@/lib/actions/data-contract";
import { toFrOptionalNumber } from "@/lib/reports/report-model/formatters";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { formatScorePercent } from "@/lib/formatters/score";
import {
  buildReportDataAvailabilityNotices,
  type ReportDataAvailability,
} from "@/lib/reports/data-availability";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";

export const DETAIL_LEVEL_OPTIONS = [
  { id: "concis", label: "Concis" },
  { id: "default", label: "Par défaut" },
  { id: "exhaustif", label: "Exhaustif" },
] as const;

export type DetailLevelId = (typeof DETAIL_LEVEL_OPTIONS)[number]["id"];
export type PeriodId = "six_months" | "current_year" | "full_history";
export type SelectedPeriodId = PeriodId;

export const DEFAULT_REPORT_GENERATION_PERIOD: SelectedPeriodId = "six_months";
export const DEFAULT_REPORT_DETAIL_LEVEL: DetailLevelId = "default";

export type ReportGenerationUiState = "idle" | "pending" | "success" | "error";

export type ReportExportStatusKind =
  | "loading"
  | "success"
  | "error"
  | "quota-used"
  | "quota-unavailable"
  | "no-data"
  | "ready";

export type ReportExportStatusSummary = {
  kind: ReportExportStatusKind;
  label: string;
  description: string;
};

export function resolveReportExportStatus({
  state,
  hasData,
  isLoading,
  hasError,
  dailyExportAvailability,
  message,
}: {
  state: ReportGenerationUiState;
  hasData: boolean;
  isLoading: boolean;
  hasError: boolean;
  dailyExportAvailability: ReportExportAvailability;
  message?: string | null;
}): ReportExportStatusSummary {
  if (state === "pending" || isLoading) {
    return {
      kind: "loading",
      label: "Génération en cours",
      description: "Préparation du PDF en cours.",
    };
  }

  if (state === "success") {
    return {
      kind: "success",
      label: "Rapport généré",
      description: "PDF ouvert.",
    };
  }

  if (state === "error") {
    return {
      kind: "error",
      label: "Erreur d’export",
      description: message ?? "Une erreur empêche l’export.",
    };
  }

  if (hasError) {
    return {
      kind: "error",
      label: "Données indisponibles",
      description: "Impossible de charger les données du rapport.",
    };
  }

  if (dailyExportAvailability === "used") {
    return {
      kind: "quota-used",
      label: "Quota quotidien atteint",
      description: "Le prochain export sera disponible le jour civil suivant.",
    };
  }

  if (dailyExportAvailability === "unavailable") {
    return {
      kind: "quota-unavailable",
      label: "Quota indisponible",
      description: "La disponibilité du quota ne peut pas être confirmée.",
    };
  }

  if (!hasData) {
    return {
      kind: "no-data",
      label: "Aucune donnée exploitable",
      description: "Aucune donnée ne permet de générer ce rapport.",
    };
  }

  return {
    kind: "ready",
    label: "Prêt à générer",
    description: "La configuration actuelle permet de lancer l’export.",
  };
}
export type ReportModuleId =
  | "dataAndCartography"
  | "transparencyAndMethods"
  | "rawData"
  | "detailedFiles";

export type ModuleState = {
  dataAndCartography: boolean;
  transparencyAndMethods: boolean;
  rawData: boolean;
  detailedFiles: boolean;
};

/**
 * Composition initiale du rapport. Elle est indépendante du niveau de détail
 * choisi dans les paramètres de génération.
 */
export const DEFAULT_REPORT_MODULES: ModuleState = {
  dataAndCartography: true,
  transparencyAndMethods: true,
  rawData: false,
  detailedFiles: true,
};

export const REPORT_MODULE_DEFINITIONS = [
  {
    id: "dataAndCartography",
    label: "Données & cartographie",
    description: "Carte, zones traitées et mesures géographiques.",
    chapterIds: ["cartographie-impact", "contexte-local"],
  },
  {
    id: "transparencyAndMethods",
    label: "Transparence & méthodes",
    description: "Impacts/proxies, qualité, hypothèses et limites.",
    chapterIds: [
      "indicateurs-environnementaux",
      "methodologie-fiabilite",
      "gouvernance-transparence",
    ],
  },
  {
    id: "rawData",
    label: "Données brutes",
    description: "Listes détaillées et données brutes disponibles.",
    chapterIds: ["communaute-mobilisation", "calendrier-previsionnel"],
  },
  {
    id: "detailedFiles",
    label: "Fichiers détaillés",
    description: "Annexes, glossaire et pièces techniques.",
    chapterIds: ["glossaire-simplifie", "annexes"],
  },
] as const satisfies ReadonlyArray<{
  id: ReportModuleId;
  label: string;
  description: string;
  chapterIds: readonly string[];
}>;

export const REQUIRED_CORE_CHAPTER_IDS = [
  "synthese-executive",
  "perimetre-rapport",
  "resultats-terrain",
] as const;

const ALWAYS_INCLUDED_CHAPTER_IDS = [
  ...REQUIRED_CORE_CHAPTER_IDS,
  "recommandations-operationnelles",
] as const;

export function getEnabledReportModules(modules: ModuleState) {
  return REPORT_MODULE_DEFINITIONS.filter((definition) => modules[definition.id]);
}

export function getVisibleReportChapterIds(modules: ModuleState): Set<string> {
  const chapterIds = new Set<string>(ALWAYS_INCLUDED_CHAPTER_IDS);
  for (const definition of getEnabledReportModules(modules)) {
    for (const chapterId of definition.chapterIds) {
      chapterIds.add(chapterId);
    }
  }
  return chapterIds;
}

export function buildModuleSelectionLabel(modules: ModuleState): string {
  const labels = getEnabledReportModules(modules).map((module) => module.label);
  return labels.length > 0 ? labels.join(", ") : "aucun module optionnel";
}

type ReportsWebDocumentModelLike = {
  report: ReportModel;
  wasteProfile: {
    dominantLabel: string;
    coveragePercent: number;
    categories: Array<{
      key: string;
      label: string;
      kg: number;
      actions: number;
    }>;
  };
  accountScopeCoverage: {
    coveragePercent: number;
  };
  exportRows: Array<Record<string, string | number | null>>;
  dataAvailability?: ReportDataAvailability;
};

export function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(value);
}

export function buildCoverageRangeLabel(contracts: ActionDataContract[]): string {
  const observedDates = contracts
    .map((contract) => new Date(contract.dates.observedAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (observedDates.length === 0) {
    return "Aucune date exploitable";
  }

  const timestamps = observedDates.map((date) => date.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  if (minDate.getTime() === maxDate.getTime()) {
    return formatDateLabel(minDate);
  }

  return `${formatDateLabel(minDate)} → ${formatDateLabel(maxDate)}`;
}

export function periodLabel(period: PeriodId): string {
  switch (period) {
    case "six_months":
      return "Six mois";
    case "current_year":
      return "Année en cours";
    case "full_history":
      return "Historique complet";
  }
}

export function reportPeriodLabel(period: PeriodId, _isTruncated = false): string {
  void _isTruncated;
  return periodLabel(period);
}

export function detailLevelLabel(id: DetailLevelId): string {
  const option = DETAIL_LEVEL_OPTIONS.find((entry) => entry.id === id);
  return option?.label ?? "";
}

export function detailLevelShortLabel(id: DetailLevelId): string {
  const option = DETAIL_LEVEL_OPTIONS.find((entry) => entry.id === id);
  return option?.label ?? "";
}

export function buildScopeSelectValue(kind: string, value: string): string {
  return kind === "global" || !value ? "global" : `${kind}:${value}`;
}

export function parseScopeSelectValue(
  value: string,
): { kind: "global"; value: "" } | { kind: "account" | "association" | "arrondissement"; value: string } {
  if (!value || value === "global") {
    return { kind: "global", value: "" };
  }
  const [kind, ...rest] = value.split(":");
  const parsedValue = rest.join(":");
  if (!parsedValue) {
    return { kind: "global", value: "" };
  }
  if (kind === "account" || kind === "association" || kind === "arrondissement") {
    return { kind, value: parsedValue };
  }
  return { kind: "global", value: "" };
}

export function buildReportTitle(scopeLabel: string, detailLevel: DetailLevelId): string {
  return `Rapport d'impact - ${scopeLabel} - ${detailLevelShortLabel(detailLevel)}`;
}

export function buildPdfData(params: {
  reportTitle: string;
  scopeLabel: string;
  period: PeriodId;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  model: ReportsWebDocumentModelLike;
  surfaceProxy: number;
}) {
  const { model, detailLevel, modules, period, reportTitle, scopeLabel, surfaceProxy } = params;
  const report = model.report;
  const dataAvailabilityNotices = buildReportDataAvailabilityNotices(
    model.dataAvailability ?? {},
  );
  const executive = report.executive as {
    summary: string;
    watchouts: string[];
    budgetUseCases: string[];
    readinessLabel: string;
    readinessScore: number;
    evidence: string[];
    headline: string;
  };

  const allChapters = [
    {
      id: "synthese-executive",
      title: "Synthèse exécutive",
      subtitle: "Vue d’ensemble du rapport",
      lines: [
        ...dataAvailabilityNotices,
        executive.summary,
        `Lecture: ${executive.readinessLabel}.`,
        `Période: ${reportPeriodLabel(period, model.dataAvailability?.isTruncated)} · ${detailLevelLabel(detailLevel)}.`,
      ],
      stats: [
        { label: "Actions validées", value: report.totals.actions },
        { label: "Volume collecte", value: `${report.totals.kg.toFixed(1)} kg` },
        { label: "Crédibilité data", value: formatScorePercent(executive.readinessScore, 1) },
        { label: "Géolocalisation", value: `${report.map.geoCoverage.toFixed(1)}%` },
      ],
    },
    {
      id: "perimetre-rapport",
      title: "Périmètre du rapport",
      subtitle: "Période analysée, territoire couvert et sources des données",
      lines: [
        `Période analysée: ${reportPeriodLabel(period, model.dataAvailability?.isTruncated)}.`,
        `Territoire couvert: ${scopeLabel}.`,
        `Organisation ou collectif concerné: ${scopeLabel === "Global" ? "Collectif CleanMyMap" : scopeLabel}.`,
        `Sources des données: ${Object.keys(report.impactMethodology.sources ?? {}).join(", ")}.`,
      ],
    },
    {
      id: "resultats-terrain",
      title: "Résultats terrain",
      subtitle: "Actions, déchets, bénévoles et zones traitées",
      lines: [
        `Zones traitées: ${report.areas.length}.`,
        `Zones restantes (proxy): ${Math.max(0, 100 - report.map.geoCoverage).toFixed(1)}%.`,
      ],
      stats: [
        { label: "Actions recensées", value: report.totals.actions },
        { label: "Déchets collectés", value: `${report.totals.kg.toFixed(1)} kg` },
        { label: "Déchets signalés", value: report.terrain.spotCount },
        { label: "Participation bénévole", value: report.totals.volunteers },
      ],
    },
    {
          id: "cartographie-impact",
          title: "Cartographie d’impact",
          subtitle: "Lecture spatiale et évolution des signalements",
          lines: [
            `Couverture GPS: ${report.map.geoCoverage.toFixed(1)}%.`,
            `Taux de traces: ${report.map.traceCoverage.toFixed(1)}%.`,
            `Évolution: ${report.trendPercent >= 0 ? "+" : ""}${report.trendPercent.toFixed(1)}%.`,
          ],
          stats: [
            { label: "Zones couvertes", value: report.areas.length },
            { label: "Signalements", value: report.terrain.spotCount },
            { label: "Points cartographiés", value: report.map.points },
          ],
          rows: report.areas.slice(0, 6).map((row) => ({
            Zone: row.area,
            Actions: row.actions,
            Kg: row.kg.toFixed(1),
            Recurrence: row.recurrence,
            Score: row.score.toFixed(1),
          })),
          columns: [
            { key: "Zone", label: "Zone" },
            { key: "Actions", label: "Actions" },
            { key: "Kg", label: "Kg" },
            { key: "Recurrence", label: "Récurrence" },
            { key: "Score", label: "Score" },
          ],
      },
    {
      id: "indicateurs-environnementaux",
      title: "Indicateurs environnementaux",
      subtitle: "Proxy eau, CO2, surface et pollution",
      stats: [
        { label: "Impact estimé", value: `${report.totals.kg.toFixed(1)} kg` },
        { label: "Émissions évitées (proxy)", value: `${report.climate.co2AvoidedKg.toFixed(1)} kg` },
        { label: "Eau préservée (proxy)", value: `${report.climate.waterProtectedLiters.toFixed(0)} L` },
        { label: "Économie de voirie (proxy)", value: report.climate.streetCleaningSavings
          ? `${report.climate.streetCleaningSavings.lowerBoundEuros.toFixed(0)}–${report.climate.streetCleaningSavings.upperBoundEuros.toFixed(0)} €`
          : `${(report.climate.streetCleaningSavingsEuros ?? 0).toFixed(0)} €` },
        { label: "Indice de pollution", value: formatScorePercent(report.impactMethodology.pollutionScoreAverage, 1) },
      ],
      lines: [
        `Surface d’action proxy: ${surfaceProxy.toFixed(1)} m².`,
        `Indice de tri propre: ${formatScorePercent(report.recycling.triIndex, 1)}.`,
      ],
    },
    {
          id: "contexte-local",
          title: "Analyse du contexte local",
          subtitle: "Typologie des déchets et contraintes du territoire",
          lines: [
            `Typologie dominante: ${model.wasteProfile.dominantLabel}.`,
            `Couverture des déchets typés: ${model.wasteProfile.coveragePercent.toFixed(1)}%.`,
          ],
          rows: model.wasteProfile.categories.map((category) => ({
            Déchet: category.label,
            Kg: category.kg.toFixed(1),
            Actions: category.actions,
          })),
          columns: [
            { key: "Déchet", label: "Déchet" },
            { key: "Kg", label: "Kg" },
            { key: "Actions", label: "Actions concernées" },
          ],
      },
    {
          id: "communaute-mobilisation",
          title: "Communauté et mobilisation",
          subtitle: "Bénévoles, partenaires et contribution citoyenne",
          stats: [
            { label: "Événements", value: report.community.totalEvents },
            { label: "RSVP oui", value: `${report.community.participationRate.toFixed(1)}%` },
            { label: "Bénévoles", value: report.totals.volunteers },
          ],
          rows: report.community.topLeaderboard.slice(0, 5).map((entry) => ({
            Contributeur: entry.name,
            Actions: entry.actions,
            Kg: entry.kg.toFixed(1),
            Mégots: entry.butts,
          })),
          columns: [
            { key: "Contributeur", label: "Contributeur" },
            { key: "Actions", label: "Actions" },
            { key: "Kg", label: "Kg" },
            { key: "Mégots", label: "Mégots" },
          ],
      },
    {
          id: "methodologie-fiabilite",
          title: "Méthodologie et fiabilité",
          subtitle: "Mode de calcul, qualité et limites",
          lines: [
            `Version proxy: ${report.impactMethodology.proxyVersion}.`,
            `Règles qualité: ${report.impactMethodology.qualityRulesVersion}.`,
            `Complétude: ${report.quality.completenessScore.toFixed(1)}%. Cohérence: ${report.quality.coherenceScore.toFixed(1)}%.`,
          ],
          rows: report.impactMethodology.formulas.map((formula) => ({
            Formule: formula.label,
            Lecture: formula.formula,
            Interprétation: formula.interpretation,
          })),
          columns: [
            { key: "Formule", label: "Formule" },
            { key: "Lecture", label: "Lecture" },
            { key: "Interprétation", label: "Interprétation" },
          ],
      },
    {
          id: "gouvernance-transparence",
          title: "Gouvernance et transparence",
          subtitle: "Validation, modération et traçabilité",
          lines: [
            `Couverture compte: ${model.accountScopeCoverage.coveragePercent.toFixed(1)}%.`,
            `Modération: ${report.moderation.approved} approuvés / ${report.moderation.rejected === null ? "indisponible" : `${report.moderation.rejected} rejetés`}.`,
            `Délai moyen: ${toFrOptionalNumber(report.moderation.delayDays)} jours.`,
          ],
      },
    {
      id: "recommandations-operationnelles",
      title: "Recommandations opérationnelles",
      subtitle: "Court terme, moyen terme et priorités",
      lines: executive.budgetUseCases.concat([`Zone prioritaire: ${report.areas[0]?.area ?? "n/a"}.`]),
    },
    {
          id: "calendrier-previsionnel",
          title: "Calendrier prévisionnel",
          subtitle: "Prochaines actions et échéances recommandées",
          rows: report.calendar.map(([sprint, periode, objectif, responsable]) => ({
            Sprint: sprint,
            Période: periode,
            Objectif: objectif,
            Responsable: responsable,
          })),
          columns: [
            { key: "Sprint", label: "Sprint" },
            { key: "Période", label: "Période" },
            { key: "Objectif", label: "Objectif" },
            { key: "Responsable", label: "Responsable" },
          ],
      },
    {
          id: "glossaire-simplifie",
          title: "Glossaire simplifié",
          subtitle: "Définitions clés et méthodes de calcul",
          rows: [
            ["Action", "Intervention de nettoyage effectuée sur le terrain et enregistrée dans la plateforme."],
            ["KPI", "Indicateur chiffré utilisé pour suivre l'évolution des résultats."],
            ["Geocouverture", "Part des actions avec coordonnées valides et exploitables sur carte."],
            ["Proxy d'impact", "Estimation utile pour décider, sans remplacer une mesure instrumentale."],
          ].map(([terme, definition]) => ({
            Terme: terme,
            Définition: definition,
          })),
          columns: [
            { key: "Terme", label: "Terme" },
            { key: "Définition", label: "Définition" },
          ],
      },
    {
          id: "annexes",
          title: "Annexes",
          subtitle: "Données détaillées et exports techniques",
          rows: report.areas.slice(0, 8).map((row) => ({
            Zone: row.area,
            Actions: row.actions,
            Kg: row.kg.toFixed(1),
            Score: row.score.toFixed(1),
          })),
          columns: [
            { key: "Zone", label: "Zone" },
            { key: "Actions", label: "Actions" },
            { key: "Kg", label: "Kg" },
            { key: "Score", label: "Score" },
          ],
      },
  ];
  const visibleChapterIds = getVisibleReportChapterIds(modules);
  const chapters = allChapters
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      lines: chapter.lines,
      stats: "stats" in chapter ? chapter.stats : undefined,
      rows: "rows" in chapter ? chapter.rows : undefined,
      columns: "columns" in chapter ? chapter.columns : undefined,
      locked: false,
      requiredDetailLevelLabel: undefined,
    }))
    .filter((chapter) => visibleChapterIds.has(chapter.id));

  return {
    title: reportTitle,
    summary: [
      `Périmètre: ${scopeLabel}`,
      `Niveau de détail: ${detailLevelLabel(detailLevel)}.`,
      `Chapitres cœur inclus: Synthèse exécutive, Périmètre du rapport, Résultats terrain.`,
      `Modules optionnels inclus: ${buildModuleSelectionLabel(modules)}.`,
      `Actions consolidées: ${report.totals.actions}`,
      ...(modules.transparencyAndMethods
        ? [
            `Qualité de données: ${report.quality.completenessScore.toFixed(0)}% de complétude, ${report.quality.coherenceScore.toFixed(0)}% de cohérence.`,
          ]
        : []),
    ],
    stats: [
      { label: "Actions", value: report.totals.actions },
      { label: "Masse collectée", value: `${report.totals.kg.toFixed(1)} kg` },
      { label: "Mégots", value: report.totals.butts },
      { label: "Bénévoles", value: report.totals.volunteers },
      ...(modules.dataAndCartography
        ? [{ label: "Couverture géographique", value: `${report.map.geoCoverage.toFixed(1)}%` }]
        : []),
      { label: "Événements communauté", value: report.community.totalEvents },
    ],
    chapters,
    rows: modules.rawData ? model.exportRows : [],
    columns: modules.rawData
      ? [
          { key: "Date", label: "Date" },
          { key: "Lieu", label: "Lieu" },
          { key: "Compte", label: "Compte" },
          { key: "Association", label: "Association" },
          { key: "Masse_Kg", label: "Masse déclarée historique (kg)" },
          { key: "Masse_Kg_Declaree", label: "Masse déclarée (kg)" },
          { key: "Masse_Kg_Impact", label: "Masse impact (kg)" },
          { key: "Origine_Masse", label: "Origine masse" },
          { key: "Megots", label: "Mégots" },
          { key: "Bénévoles", label: "Bénévoles" },
          { key: "CO2e_Proxy_Kg", label: "CO2e proxy (kg)" },
          { key: "Eau_Proxy_L", label: "Eau proxy (L)" },
          { key: "Economie_Voirie_Proxy_EUR", label: "Économie voirie proxy (€)" },
          { key: "Durée_Min", label: "Durée (min)" },
          { key: "Type", label: "Type" },
          { key: "Source", label: "Source" },
        ]
      : [],
    generatedAt: report.generatedAt,
  };
}
