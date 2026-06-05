"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Leaf,
  MapPin,
  Loader2,
  ShoppingBag,
  Map as MapIcon,
  ShieldCheck,
  TriangleAlert,
  SlidersHorizontal,
} from "lucide-react";
import { REPORT_SECTIONS } from "@/components/reports/web-document/constants";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import { ReportCover } from "@/components/reports/web-document/report-cover";
import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { buildExecutiveNarrative, toFrInt, toFrNumber } from "@/components/reports/web-document/analytics";

type ReportsWeather = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
} | null;

type ReportsWebDocumentProps = {
  contracts: ActionDataContract[];
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
  overview?: PilotageOverview | null;
};

const DETAIL_LEVEL_OPTIONS = [
  { id: "concis", label: "Concis", pages: "6 à 8 pages" },
  { id: "default", label: "Par défaut", pages: "12 à 16 pages" },
  { id: "exhaustif", label: "Exhaustif", pages: "20 à 28 pages" },
] as const;

type DetailLevelId = (typeof DETAIL_LEVEL_OPTIONS)[number]["id"];
type PeriodId = "six_months" | "current_year" | "full_history";
type SelectedPeriodId = PeriodId | "";
type ModuleState = {
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

type ModuleOption = {
  id: keyof ModuleState;
  label: string;
  description: string;
};

function filterContractsByPeriod(
  contracts: ActionDataContract[],
  period: PeriodId,
): ActionDataContract[] {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  if (period === "full_history") {
    return contracts;
  }

  if (period === "current_year") {
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return contracts.filter((contract) => {
      const observedAt = new Date(contract.dates.observedAt);
      return !Number.isNaN(observedAt.getTime()) && observedAt >= startOfYear;
    });
  }

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const floor = new Date(now);
  floor.setTime(sixMonthsAgo.getTime());

  return contracts.filter((contract) => {
    const observedAt = new Date(contract.dates.observedAt);
    return !Number.isNaN(observedAt.getTime()) && observedAt >= floor;
  });
}

function formatDateTime(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return value ?? "";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function periodLabel(period: PeriodId): string {
  switch (period) {
    case "six_months":
      return "Six mois";
    case "current_year":
      return "Année en cours";
    case "full_history":
      return "Historique complet";
  }
}

function detailLevelLabel(id: DetailLevelId): string {
  const option = DETAIL_LEVEL_OPTIONS.find((entry) => entry.id === id);
  return option ? `${option.label} (${option.pages})` : "";
}

function detailLevelShortLabel(id: DetailLevelId): string {
  const option = DETAIL_LEVEL_OPTIONS.find((entry) => entry.id === id);
  return option?.label ?? "";
}

function detailLevelRank(id: DetailLevelId): number {
  switch (id) {
    case "concis":
      return 0;
    case "default":
      return 1;
    case "exhaustif":
      return 2;
  }
}

function isDetailLevelAtLeast(current: DetailLevelId, required: DetailLevelId): boolean {
  return detailLevelRank(current) >= detailLevelRank(required);
}

function buildLockedSectionMessage(required: DetailLevelId): string {
  return `Générez le rapport avec un niveau de détail : "${detailLevelShortLabel(required)}" si vous voulez le détail de cette sous partie.`;
}

function buildLockedSectionChapter(params: {
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

function buildScopeSelectValue(kind: string, value: string): string {
  return kind === "global" || !value ? "" : `${kind}:${value}`;
}

function parseScopeSelectValue(
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

function detailLevelToModules(id: DetailLevelId): ModuleState {
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

function buildRecentReports(params: {
  overview?: PilotageOverview | null;
  activeScopeLabel: string;
  period: PeriodId;
  detailLevel: DetailLevelId;
}): RecentReportRow[] {
  const generatedAt = formatDateTime(params.overview?.generatedAt);
  const windows: Array<{ key: "six_months" | "current_year" | "full_history"; detail: DetailLevelId; period: string }> = [
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

function buildReportTitle(scopeLabel: string, detailLevel: DetailLevelId): string {
  return `Rapport d'impact - ${scopeLabel} - ${detailLevelShortLabel(detailLevel)}`;
}

function buildPdfData(params: {
  reportTitle: string;
  scopeLabel: string;
  period: PeriodId;
  detailLevel: DetailLevelId;
  model: ReturnType<typeof useReportsWebDocumentModel>;
  surfaceProxy: number;
}): Parameters<typeof usePdfExport>[0]["data"] {
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

export function ReportsWebDocument({
  contracts,
  communityEvents,
  weather,
  overview,
}: ReportsWebDocumentProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [period, setPeriod] = useState<SelectedPeriodId>("");
  const [detailLevel, setDetailLevel] = useState<DetailLevelId>("default");
  const [modules, setModules] = useState<ModuleState>(detailLevelToModules("default"));
  const effectivePeriod = period || "six_months";
  const filteredContracts = useMemo(
    () => filterContractsByPeriod(contracts, effectivePeriod),
    [contracts, effectivePeriod],
  );

  const model = useReportsWebDocumentModel({
    initialContracts: filteredContracts,
    initialCommunityEvents: communityEvents,
    initialWeather: weather,
  });

  const report = model.report;
  const activeScopeLabel = model.activeScopeLabel;
  const surfaceProxy =
    report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
    report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute;
  const selectedScopeValue = buildScopeSelectValue(model.scopeKind, model.scopeValue);
  const recentRows = useMemo(
    () =>
      buildRecentReports({
        overview,
        activeScopeLabel,
        period: effectivePeriod,
        detailLevel,
      }),
    [activeScopeLabel, detailLevel, effectivePeriod, overview],
  );

  const defaultTitle = buildReportTitle(activeScopeLabel, detailLevel);
  const pdfData = useMemo(
    () =>
      buildPdfData({
        reportTitle: defaultTitle,
        scopeLabel: activeScopeLabel,
        period: effectivePeriod,
        detailLevel,
        model,
        surfaceProxy,
      }),
    [activeScopeLabel, defaultTitle, detailLevel, effectivePeriod, model, surfaceProxy],
  );

  const moduleOptions: ModuleOption[] = [
    {
      id: "dataAndCartography",
      label: "Données & cartographie",
      description: "Carte, zones traitées et mesures géographiques.",
    },
    {
      id: "environmentalImpact",
      label: "Transparence & méthodes",
      description: "Impact, fiabilité et contrôle qualité.",
    },
    {
      id: "rawData",
      label: "Données brutes",
      description: "Listes détaillées et exports intermédiaires.",
    },
    {
      id: "detailedFiles",
      label: "Fichiers détaillés",
      description: "Annexes, glossaire et pièces techniques.",
    },
  ];

  const {
    state,
    message,
    copy,
    hasData,
    isDisabled,
    exportRubriquePdf,
  } = usePdfExport({
    rubrique: "reporting",
    periode: effectivePeriod,
    organizationType: activeScopeLabel,
    defaultTitle,
    data: pdfData,
    disabled: model.isLoading || model.hasError,
  });

  const sectionCards = REPORT_SECTIONS.slice(0, 4).map((section, index) => ({
    id: section.id,
    title:
      index === 0
        ? "Collecte des données"
        : index === 1
          ? "Impact environnemental"
          : index === 2
            ? "Données & cartographie"
            : "Transparence & méthodes",
    subtitle:
      index === 0
        ? "Sources, volumes collectés et maillage territorial."
        : index === 1
          ? "Impacts évités et bénéfices environnementaux."
          : index === 2
            ? "Cartes, visualisations et données clés du territoire."
        : "Méthodologie, hypothèses et contrôle qualité.",
  }));
  const executiveNarrative = useMemo(() => buildExecutiveNarrative(report), [report]);

  function syncModulesFromDetailLevel(nextLevel: DetailLevelId): void {
    setDetailLevel(nextLevel);
    setModules(detailLevelToModules(nextLevel));
  }

  function toggleModule(key: keyof ModuleState): void {
    setModules((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function handleGenerate(): void {
    void exportRubriquePdf();
  }

  function handlePreview(): void {
    setShowPreview((current) => !current);
    if (!showPreview) {
      window.setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  const exportStatus =
    state === "pending"
      ? {
          icon: Loader2,
          label: "Génération en cours",
          description: "Le livrable est en cours de préparation.",
          tone: "border-cyan-200 bg-cyan-50 text-cyan-900",
          iconTone: "text-cyan-600",
        }
      : state === "success"
          ? {
              icon: CheckCircle2,
              label: "Prêt à exporter",
              description: "Le PDF officiel est ouvert et prêt à être enregistré.",
              tone: "border-red-200 bg-red-50 text-red-900",
              iconTone: "text-red-600",
            }
          : state === "error"
          ? {
              icon: TriangleAlert,
              label: "Export à vérifier",
              description: message ?? "Une action est nécessaire avant de relancer l'export.",
              tone: "border-red-200 bg-red-50 text-red-900",
              iconTone: "text-red-600",
            }
          : hasData
            ? {
                icon: FileText,
                label: "Prêt à générer",
                description: "La configuration actuelle permet de lancer l'export.",
                tone: "border-slate-200 bg-slate-50 text-slate-900",
                iconTone: "text-red-600",
              }
            : {
                icon: TriangleAlert,
                label: "Export indisponible",
                description: "Aucune donnée exploitable n'est disponible pour cette configuration.",
                tone: "border-slate-200 bg-slate-50 text-slate-900",
                iconTone: "text-slate-400",
              };
  const ExportStatusIcon = exportStatus.icon;

  return (
    <section className="space-y-6 rounded-[2.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.25)] sm:p-6">
      <header className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-red-600 text-white shadow-[0_18px_42px_-24px_rgba(220,38,38,0.55)]">
          <FileText size={28} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[clamp(1.8rem,3vw,2.4rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
            Générer un rapport d&apos;impact
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
            Créez un rapport complet avec les données et la méthodologie CleanMyMap.
          </p>
        </div>
      </header>

      <div className="grid gap-4">
        <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
          <div>
            <p className="text-base font-black text-red-600">1. Configurez votre rapport</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-900">
              Période
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as SelectedPeriodId)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
              >
                <option value="six_months">Six mois</option>
                <option value="current_year">Année en cours</option>
                <option value="full_history">Historique complet</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-900">
              Périmètre géographique
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedScopeValue}
                onChange={(event) => {
                  const next = parseScopeSelectValue(event.target.value);
                  model.setScopeKind(next.kind);
                  model.setScopeValue(next.value);
                }}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
              >
                <option value="">Sélectionner un périmètre</option>
                <optgroup label="Général">
                  <option value="global">Global</option>
                </optgroup>
                <optgroup label="Compte">
                  {model.scopeOptions.accounts.map((choice) => (
                    <option key={choice.value} value={`account:${choice.value}`}>
                      {choice.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Association">
                  {model.scopeOptions.associations.map((choice) => (
                    <option key={choice.value} value={`association:${choice.value}`}>
                      {choice.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Arrondissement">
                  {model.scopeOptions.arrondissements.map((choice) => (
                    <option key={choice.value} value={`arrondissement:${choice.value}`}>
                      {choice.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-900">
              Niveau de détail
            </label>
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={detailLevel}
                onChange={(event) => syncModulesFromDetailLevel(event.target.value as DetailLevelId)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
              >
                {DETAIL_LEVEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.pages})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Le nombre de pages est indicatif et varie légèrement selon le volume de données.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              Modules optionnels
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px] font-black text-slate-400">
                i
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {moduleOptions.map((option) => {
                const checked = modules[option.id];
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                      checked
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(option.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-400"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                      <span className="block text-xs leading-5 text-slate-500">{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isDisabled}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-base font-black text-white shadow-[0_18px_34px_-18px_rgba(220,38,38,0.55)] transition hover:from-red-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText size={18} />
              {state === "pending" ? copy.pendingLabel : "Générer le rapport"}
            </button>

            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <Eye size={16} />
              {showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
            </button>

            <div className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${exportStatus.tone}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${exportStatus.iconTone}`}>
                <ExportStatusIcon size={18} className={state === "pending" ? "animate-spin" : ""} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black">{exportStatus.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">
                  {exportStatus.description}
                </p>
              </div>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-red-600" />
              Le rapport est généré à partir des données et de la méthodologie CleanMyMap.
            </p>

            {message ? (
              <p
                role={state === "error" ? "alert" : "status"}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  state === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-cyan-200 bg-cyan-50 text-cyan-900"
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </section>

      </div>

      {showPreview ? (
        <section ref={previewRef} className="space-y-4 rounded-[2rem] border border-red-100 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
                Aperçu condensé
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">
                Première page du rapport
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                L&apos;aperçu reprend le rendu du livrable officiel, alimenté par les données
                du territoire sélectionné.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {detailLevelLabel(detailLevel)}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {periodLabel(effectivePeriod)}
              </span>
            </div>
          </div>
          <ReportCover
            id="synthese-executive"
            report={report}
            activeScopeLabel={activeScopeLabel}
            weatherAdvice={model.weatherAdvice}
          />
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-red-100 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-black text-red-600">Résultat attendu à l&apos;export</p>
            <p className="mt-1 text-sm text-slate-500">
              Une mini maquette du PDF officiel pour comprendre le rendu avant export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">A4 portrait</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Sommaire cliquable</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">12 sections</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.2)]">
            <div className="h-2 bg-gradient-to-r from-red-600 to-red-500" />
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                    Synthèse exécutive
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    Rapport d&apos;impact
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                    {executiveNarrative.headline ?? executiveNarrative.summary}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {report.generatedAt}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Ce que l&apos;export montrera
                  </p>
                  <div className="mt-2 grid gap-1.5 text-sm font-semibold text-slate-800">
                    <p>{toFrInt(report.totals.actions)} actions validées</p>
                    <p>{toFrNumber(report.totals.kg)} kg collectés</p>
                    <p>{toFrNumber(report.map.geoCoverage)}% de couverture géographique</p>
                    <p>{toFrNumber(executiveNarrative.readinessScore)} / 100 de crédibilité data</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
                    Première page du PDF
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950">Vue d’ensemble du rapport</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Synthèse, chiffres clés, conclusions et recommandations prioritaires.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {sectionCards.map((section, index) => {
                  const Icon = index === 0 ? ShoppingBag : index === 1 ? Leaf : index === 2 ? MapIcon : ShieldCheck;
                  return (
                    <div key={section.id} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">{section.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{section.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.2)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                Ce que l&apos;utilisateur voit
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                  Une première page lisible avec synthèse, chiffres clés et recommandations.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                  Un sommaire cliquable qui mène vers les sections détaillées.
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                  Un export A4 pensé pour être partagé sans mise en forme supplémentaire.
                </li>
              </ul>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                Lecture rapide
              </p>
              <p className="mt-2 text-sm leading-6 text-cyan-950/90">
                Le bloc ci-dessus sert de “photo du PDF”. Il montre le rendu attendu avant export,
                sans ouvrir le livrable détaillé.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="reports-history" className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-black text-red-600">Rapports récents</p>
            <p className="mt-1 text-sm text-slate-500">Les rapports générés sur ce périmètre.</p>
          </div>
          <a
            href="#reports-history"
            className="inline-flex items-center gap-2 text-sm font-black text-red-600 transition hover:text-red-700"
          >
            Voir tous les rapports
            <ArrowRight size={16} />
          </a>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                {["Rapport", "Période", "Périmètre", "Détail", "Généré le", "Actions"].map((header) => (
                  <th key={header} className="border-b border-slate-200 px-4 py-3 font-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.report}</p>
                        <p className="text-xs text-slate-500">{row.detail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.period}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.perimeter}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.detail}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.generatedAt}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePreview}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Voir
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Télécharger ${row.report}`}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-center text-sm text-slate-400">
          Les rapports sont conservés pendant 24 mois.
        </p>
      </section>
    </section>
  );
}
