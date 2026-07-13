"use client";

import type { ReactNode } from "react";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { ReportModel } from "./types";

export type ReportsWeather = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
} | null;

export const DETAIL_LEVEL_OPTIONS = [
  { id: "concis", label: "Concis", pages: "6 à 8 pages" },
  { id: "default", label: "Par défaut", pages: "12 à 16 pages" },
  { id: "exhaustif", label: "Exhaustif", pages: "20 à 28 pages" },
] as const;

export const REPORT_HISTORY_SERVER_LIMIT = 1000;

export type DetailLevelId = (typeof DETAIL_LEVEL_OPTIONS)[number]["id"];
export type PeriodId = "six_months" | "current_year" | "full_history";
export type SelectedPeriodId = PeriodId | "";
export type ModuleState = {
  dataAndCartography: boolean;
  environmentalImpact: boolean;
  rawData: boolean;
  detailedFiles: boolean;
};

type RecentReportRow = {
  id: string;
  report: string;
  period: string;
  perimeter: string;
  detail: string;
  generatedAt: string;
};

type GenerationStageTone = "prepare" | "preview" | "export";

type GenerationStageCardProps = {
  tone: GenerationStageTone;
  step: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

const GENERATION_STAGE_STYLES: Record<
  GenerationStageTone,
  {
    stripe: string;
    step: string;
    eyebrow: string;
    title: string;
    border: string;
    surface: string;
  }
> = {
  prepare: {
    stripe: "from-red-600 via-red-500 to-orange-500",
    step: "border-red-200 bg-red-50 text-red-700",
    eyebrow: "text-red-600",
    title: "text-red-700",
    border: "border-red-100",
    surface: "bg-white",
  },
  preview: {
    stripe: "from-cyan-600 via-cyan-500 to-sky-500",
    step: "border-cyan-200 bg-cyan-50 text-cyan-700",
    eyebrow: "text-cyan-700",
    title: "text-cyan-950",
    border: "border-cyan-100",
    surface: "bg-white",
  },
  export: {
    stripe: "from-slate-700 via-red-600 to-red-500",
    step: "border-slate-200 bg-slate-50 text-slate-700",
    eyebrow: "text-slate-500",
    title: "text-slate-950",
    border: "border-slate-200",
    surface: "bg-slate-50/50",
  },
};

type ReportsWebDocumentModelLike = {
  report: ReportModel;
  weatherAdvice: string;
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
};

export function GenerationStageCard({
  tone,
  step,
  title,
  description,
  action,
  children,
}: GenerationStageCardProps) {
  const styles = GENERATION_STAGE_STYLES[tone];

  return (
    <section
      className={`overflow-hidden rounded-[1.75rem] border ${styles.border} ${styles.surface} shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]`}
    >
      <div className={`h-1.5 bg-gradient-to-r ${styles.stripe}`} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${styles.step}`}
            >
              {step}
            </span>
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${styles.eyebrow}`}>
                Étape {step}
              </p>
              <h3 className={`mt-1 text-xl font-black tracking-tight ${styles.title}`}>{title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
            </div>
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

export function formatDateTime(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return value ?? "";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

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

export function buildDetailCoverageLabel(detailLevel: DetailLevelId): string {
  switch (detailLevel) {
    case "concis":
      return "Concis: seule la lecture synthétique est pleinement remplie, les sous-parties avancées restent verrouillées.";
    case "default":
      return "Par défaut: le socle principal du rapport est rempli, avec les annexes détaillées ouvertes.";
    case "exhaustif":
      return "Exhaustif: le rapport embarque le niveau maximal de détail et les annexes techniques.";
  }
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

export function detailLevelLabel(id: DetailLevelId): string {
  const option = DETAIL_LEVEL_OPTIONS.find((entry) => entry.id === id);
  return option ? `${option.label} (${option.pages})` : "";
}

export function detailLevelShortLabel(id: DetailLevelId): string {
  const option = DETAIL_LEVEL_OPTIONS.find((entry) => entry.id === id);
  return option?.label ?? "";
}

export function detailLevelRank(id: DetailLevelId): number {
  switch (id) {
    case "concis":
      return 0;
    case "default":
      return 1;
    case "exhaustif":
      return 2;
  }
}

export function isDetailLevelAtLeast(current: DetailLevelId, required: DetailLevelId): boolean {
  return detailLevelRank(current) >= detailLevelRank(required);
}

export function buildLockedSectionMessage(required: DetailLevelId): string {
  return `Générez le rapport avec un niveau de détail : "${detailLevelShortLabel(required)}" si vous voulez le détail de cette sous partie.`;
}

export function buildLockedSectionChapter(params: {
  id: string;
  title: string;
  subtitle: string;
  required: DetailLevelId;
}) {
  return {
    id: params.id,
    title: params.title,
    subtitle: params.subtitle,
    lines: [buildLockedSectionMessage(params.required)],
    locked: true,
    requiredDetailLevelLabel: detailLevelLabel(params.required),
  };
}

export function buildScopeSelectValue(kind: string, value: string): string {
  return kind === "global" || !value ? "" : `${kind}:${value}`;
}

export function parseScopeSelectValue(
  value: string,
): { kind: "global"; value: "" } | { kind: "account" | "association" | "arrondissement"; value: string } {
  if (!value) {
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

export function detailLevelToModules(id: DetailLevelId): ModuleState {
  switch (id) {
    case "concis":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: false,
        detailedFiles: false,
      };
    case "default":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: false,
        detailedFiles: true,
      };
    case "exhaustif":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: true,
        detailedFiles: true,
      };
  }
}

export function buildRecentReports(params: {
  overviewGeneratedAt?: string | null;
  activeScopeLabel: string;
  period: PeriodId;
  detailLevel: DetailLevelId;
}): RecentReportRow[] {
  const generatedAt = formatDateTime(params.overviewGeneratedAt ?? undefined);
  const windows: Array<{ key: PeriodId; detail: DetailLevelId; period: string }> = [
    { key: "six_months", detail: params.detailLevel, period: periodLabel(params.period) },
    { key: "current_year", detail: "default", period: "Année en cours" },
    { key: "full_history", detail: "exhaustif", period: "Historique complet" },
  ];

  return windows.map((window) => ({
    id: `window-${window.key}`,
    report: "Rapport d'impact",
    period: window.period,
    perimeter: params.activeScopeLabel,
    detail: detailLevelLabel(window.detail),
    generatedAt,
  }));
}

export function buildReportTitle(scopeLabel: string, detailLevel: DetailLevelId): string {
  return `Rapport d'impact - ${scopeLabel} - ${detailLevelShortLabel(detailLevel)}`;
}

export function buildPdfData(params: {
  reportTitle: string;
  scopeLabel: string;
  period: PeriodId;
  detailLevel: DetailLevelId;
  model: ReportsWebDocumentModelLike;
  surfaceProxy: number;
}) {
  const { model, detailLevel, period, reportTitle, scopeLabel, surfaceProxy } = params;
  const report = model.report;
  const executive = report.executive as {
    summary: string;
    watchouts: string[];
    budgetUseCases: string[];
    readinessLabel: string;
    readinessScore: number;
    evidence: string[];
    headline: string;
  };

  const visibleDefaultDetail = isDetailLevelAtLeast(detailLevel, "default");
  const visibleExhaustifDetail = isDetailLevelAtLeast(detailLevel, "exhaustif");
  const chapters = [
    {
      id: "synthese-executive",
      title: "Synthèse exécutive",
      subtitle: "Vue d’ensemble du rapport",
      lines: [
        executive.summary,
        `Lecture: ${executive.readinessLabel}.`,
        model.weatherAdvice,
        `Période: ${periodLabel(period)} · ${detailLevelLabel(detailLevel)}.`,
      ],
      stats: [
        { label: "Actions validées", value: report.totals.actions },
        { label: "Volume collecte", value: `${report.totals.kg.toFixed(1)} kg` },
        { label: "Crédibilité data", value: `${executive.readinessScore.toFixed(1)} / 100` },
        { label: "Géolocalisation", value: `${report.map.geoCoverage.toFixed(1)}%` },
      ],
    },
    {
      id: "perimetre-rapport",
      title: "Périmètre du rapport",
      subtitle: "Période analysée, territoire couvert et sources des données",
      lines: [
        `Période analysée: ${periodLabel(period)}.`,
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
    visibleDefaultDetail
      ? {
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
      }
      : buildLockedSectionChapter({
          id: "cartographie-impact",
          title: "Cartographie d’impact",
          subtitle: "Lecture spatiale et évolution des signalements",
          required: "default",
        }),
    {
      id: "indicateurs-environnementaux",
      title: "Indicateurs environnementaux",
      subtitle: "Proxy eau, CO2, surface et pollution",
      stats: [
        { label: "Impact estimé", value: `${report.totals.kg.toFixed(1)} kg` },
        { label: "Émissions évitées", value: `${report.climate.co2AvoidedKg.toFixed(1)} kg` },
        { label: "Eau préservée", value: `${report.climate.waterProtectedLiters.toFixed(0)} L` },
        { label: "Indice de pollution", value: `${report.impactMethodology.pollutionScoreAverage.toFixed(1)} / 100` },
      ],
      lines: [
        `Surface d’action proxy: ${surfaceProxy.toFixed(1)} m².`,
        `Indice de tri propre: ${report.recycling.triIndex.toFixed(1)} / 100.`,
      ],
    },
    visibleDefaultDetail
      ? {
          id: "contexte-local",
          title: "Analyse du contexte local",
          subtitle: "Typologie des déchets et contraintes du territoire",
          lines: [
            `Typologie dominante: ${model.wasteProfile.dominantLabel}.`,
            `Couverture des déchets typés: ${model.wasteProfile.coveragePercent.toFixed(1)}%.`,
            model.weatherAdvice,
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
      }
      : buildLockedSectionChapter({
          id: "contexte-local",
          title: "Analyse du contexte local",
          subtitle: "Typologie des déchets et contraintes du territoire",
          required: "default",
        }),
    visibleDefaultDetail
      ? {
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
      }
      : buildLockedSectionChapter({
          id: "communaute-mobilisation",
          title: "Communauté et mobilisation",
          subtitle: "Bénévoles, partenaires et contribution citoyenne",
          required: "default",
        }),
    visibleDefaultDetail
      ? {
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
      }
      : buildLockedSectionChapter({
          id: "methodologie-fiabilite",
          title: "Méthodologie et fiabilité",
          subtitle: "Mode de calcul, qualité et limites",
          required: "default",
        }),
    visibleDefaultDetail
      ? {
          id: "gouvernance-transparence",
          title: "Gouvernance et transparence",
          subtitle: "Validation, modération et traçabilité",
          lines: [
            `Couverture compte: ${model.accountScopeCoverage.coveragePercent.toFixed(1)}%.`,
            `Modération: ${report.moderation.approved} approuvés / ${report.moderation.rejected} rejetés.`,
            `Délai moyen: ${report.moderation.delayDays.toFixed(1)} jours.`,
          ],
      }
      : buildLockedSectionChapter({
          id: "gouvernance-transparence",
          title: "Gouvernance et transparence",
          subtitle: "Validation, modération et traçabilité",
          required: "default",
        }),
    {
      id: "recommandations-operationnelles",
      title: "Recommandations opérationnelles",
      subtitle: "Court terme, moyen terme et priorités",
      lines: executive.budgetUseCases.concat([`Zone prioritaire: ${report.areas[0]?.area ?? "n/a"}.`]),
    },
    visibleDefaultDetail
      ? {
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
      }
      : buildLockedSectionChapter({
          id: "calendrier-previsionnel",
          title: "Calendrier prévisionnel",
          subtitle: "Prochaines actions et échéances recommandées",
          required: "default",
        }),
    visibleDefaultDetail
      ? {
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
      }
      : buildLockedSectionChapter({
          id: "glossaire-simplifie",
          title: "Glossaire simplifié",
          subtitle: "Définitions clés et méthodes de calcul",
          required: "default",
        }),
    visibleExhaustifDetail
      ? {
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
      }
      : buildLockedSectionChapter({
          id: "annexes",
          title: "Annexes",
          subtitle: "Données détaillées et exports techniques",
          required: "exhaustif",
        }),
  ].map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    subtitle: chapter.subtitle,
    lines: chapter.lines,
    stats: "stats" in chapter ? chapter.stats : undefined,
    rows: "rows" in chapter ? chapter.rows : undefined,
    columns: "columns" in chapter ? chapter.columns : undefined,
    locked: "locked" in chapter ? chapter.locked : false,
    requiredDetailLevelLabel:
      "requiredDetailLevelLabel" in chapter ? chapter.requiredDetailLevelLabel : undefined,
  }));

  return {
    title: reportTitle,
    summary: [
      `Périmètre: ${scopeLabel}`,
      `Niveau de détail: ${detailLevelLabel(detailLevel)}.`,
      `Structure commune: sommaire exhaustif complet pour tous les niveaux.`,
      `Actions consolidées: ${report.totals.actions}`,
      `Qualité de données: ${report.quality.completenessScore.toFixed(0)}% de complétude, ${report.quality.coherenceScore.toFixed(0)}% de cohérence.`,
    ],
    stats: [
      { label: "Actions", value: report.totals.actions },
      { label: "Masse collectée", value: `${report.totals.kg.toFixed(1)} kg` },
      { label: "Mégots", value: report.totals.butts },
      { label: "Bénévoles", value: report.totals.volunteers },
      { label: "Couverture géographique", value: `${report.map.geoCoverage.toFixed(1)}%` },
      { label: "Événements communauté", value: report.community.totalEvents },
    ],
    chapters,
    rows: model.exportRows,
    columns: [
      { key: "Date", label: "Date" },
      { key: "Lieu", label: "Lieu" },
      { key: "Compte", label: "Compte" },
      { key: "Association", label: "Association" },
      { key: "Masse_Kg", label: "Masse (kg)" },
      { key: "Megots", label: "Mégots" },
      { key: "Bénévoles", label: "Bénévoles" },
      { key: "Durée_Min", label: "Durée (min)" },
      { key: "Type", label: "Type" },
      { key: "Source", label: "Source" },
    ],
    generatedAt: report.generatedAt,
  };
}
