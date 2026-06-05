"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleCheckBig,
  Download,
  Eye,
  FileText,
  Leaf,
  MapPin,
  ShoppingBag,
  Map as MapIcon,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { REPORT_SECTIONS } from "@/components/reports/web-document/constants";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import { ReportCover } from "@/components/reports/web-document/report-cover";
import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

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

type ReportTypeId = "standard" | "institutionnel" | "technique" | "personnalise";
type DetailLevelId = "standard" | "approfondi" | "complet";
type PeriodId = "30j" | "90j" | "12m" | "annee";
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
  type: string;
  generatedAt: string;
};

type ReportTypeOption = {
  id: ReportTypeId;
  title: string;
  description: string;
  icon: LucideIcon;
};

type DetailLevelOption = {
  id: DetailLevelId;
  label: string;
  description: string;
  icon: LucideIcon;
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

  if (period === "annee") {
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return contracts.filter((contract) => {
      const observedAt = new Date(contract.dates.observedAt);
      return !Number.isNaN(observedAt.getTime()) && observedAt >= startOfYear;
    });
  }

  const windowDays =
    period === "30j" ? 30 : period === "90j" ? 90 : 365;
  const floor = new Date(now);
  floor.setUTCDate(floor.getUTCDate() - (windowDays - 1));

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
    case "30j":
      return "30 derniers jours";
    case "90j":
      return "90 derniers jours";
    case "12m":
      return "12 mois glissants";
    case "annee":
      return "Année civile";
  }
}

function reportTypeLabel(id: ReportTypeId): string {
  switch (id) {
    case "standard":
      return "Standard";
    case "institutionnel":
      return "Institutionnel";
    case "technique":
      return "Technique";
    case "personnalise":
      return "Personnalisé";
  }
}

function detailLevelLabel(id: DetailLevelId): string {
  switch (id) {
    case "standard":
      return "Standard (recommandé)";
    case "approfondi":
      return "Approfondi";
    case "complet":
      return "Complet";
  }
}

function reportTypeToPeriod(id: ReportTypeId): PeriodId {
  switch (id) {
    case "standard":
      return "12m";
    case "institutionnel":
      return "annee";
    case "technique":
      return "90j";
    case "personnalise":
      return "30j";
  }
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

function reportTypeToModules(id: ReportTypeId): ModuleState {
  switch (id) {
    case "standard":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: false,
        detailedFiles: false,
      };
    case "institutionnel":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: false,
        detailedFiles: true,
      };
    case "technique":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: true,
        detailedFiles: true,
      };
    case "personnalise":
      return {
        dataAndCartography: true,
        environmentalImpact: true,
        rawData: false,
        detailedFiles: false,
      };
  }
}

function buildRecentReports(params: {
  overview?: PilotageOverview | null;
  activeScopeLabel: string;
  period: PeriodId;
  reportType: ReportTypeId;
}): RecentReportRow[] {
  const generatedAt = formatDateTime(params.overview?.generatedAt);
  const windows: Array<{ key: "30" | "90" | "365"; type: ReportTypeId; period: string }> = [
    { key: "30", type: params.reportType, period: periodLabel(params.period) },
    { key: "90", type: "institutionnel", period: "90 derniers jours" },
    { key: "365", type: "technique", period: "12 mois glissants" },
  ];

  return windows.map((window) => {
    const comparison = params.overview?.comparisonsByWindow[window.key];
    const suffix =
      comparison?.current.reliability.level === "elevee"
        ? "fiable"
        : comparison?.current.reliability.level === "moyenne"
          ? "à vérifier"
          : "à surveiller";

    return {
      id: `window-${window.key}`,
      report: "Rapport d'impact",
      period: window.period,
      perimeter: params.activeScopeLabel,
      type: reportTypeLabel(window.type),
      generatedAt: `${generatedAt}${suffix ? ` · ${suffix}` : ""}`,
    };
  });
}

function buildReportTitle(reportType: ReportTypeId, scopeLabel: string): string {
  return `Rapport d'impact - ${reportTypeLabel(reportType)} - ${scopeLabel}`;
}

function buildPdfData(params: {
  reportTitle: string;
  scopeLabel: string;
  period: PeriodId;
  reportType: ReportTypeId;
  detailLevel: DetailLevelId;
  modules: ModuleState;
  model: ReturnType<typeof useReportsWebDocumentModel>;
  surfaceProxy: number;
}): Parameters<typeof usePdfExport>[0]["data"] {
  const { model, modules, detailLevel, period, reportType, reportTitle, scopeLabel, surfaceProxy } = params;
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

  const chapters = [
    {
      id: "synthese-executive",
      title: "Synthèse exécutive",
      subtitle: "Vue d’ensemble du rapport",
      lines: [
        executive.summary,
        `Lecture: ${executive.readinessLabel}.`,
        model.weatherAdvice,
        `Période: ${periodLabel(period)} · ${reportTypeLabel(reportType)} · ${detailLevelLabel(detailLevel)}.`,
      ],
      stats: [
        { label: "Actions validées", value: report.totals.actions },
        { label: "Volume collecte", value: `${report.totals.kg.toFixed(1)} kg` },
        { label: "Crédibilité data", value: `${executive.readinessScore.toFixed(1)} / 100` },
        { label: "Géolocalisation", value: `${report.map.geoCoverage.toFixed(1)}%` },
      ],
      always: true,
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
      always: true,
    },
    modules.dataAndCartography
      ? {
          id: "resultats-terrain",
          title: "Résultats terrain",
          subtitle: "Actions, déchets, bénévoles et zones traitées",
          stats: [
            { label: "Actions recensées", value: report.totals.actions },
            { label: "Déchets collectés", value: `${report.totals.kg.toFixed(1)} kg` },
            { label: "Déchets signalés", value: report.terrain.spotCount },
            { label: "Participation bénévole", value: report.totals.volunteers },
          ],
          lines: [
            `Zones traitées: ${report.areas.length}.`,
            `Zones restantes (proxy): ${Math.max(0, 100 - report.map.geoCoverage).toFixed(1)}%.`,
          ],
        }
      : null,
    modules.dataAndCartography
      ? {
          id: "cartographie-impact",
          title: "Cartographie d’impact",
          subtitle: "Lecture spatiale et évolution des signalements",
          stats: [
            { label: "Couverture GPS", value: `${report.map.geoCoverage.toFixed(1)}%` },
            { label: "Taux de traces", value: `${report.map.traceCoverage.toFixed(1)}%` },
            { label: "Évolution", value: `${report.trendPercent >= 0 ? "+" : ""}${report.trendPercent.toFixed(1)}%` },
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
      : null,
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
      always: true,
    },
    modules.environmentalImpact
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
      : null,
    modules.rawData
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
      : null,
    modules.environmentalImpact
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
      : null,
    modules.environmentalImpact
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
      : null,
    {
      id: "recommandations-operationnelles",
      title: "Recommandations opérationnelles",
      subtitle: "Court terme, moyen terme et priorités",
      lines: executive.budgetUseCases.concat([`Zone prioritaire: ${report.areas[0]?.area ?? "n/a"}.`]),
      always: true,
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
      always: true,
    },
    modules.environmentalImpact
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
      : null,
    modules.detailedFiles
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
      : null,
  ]
    .filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter))
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      subtitle: chapter.subtitle,
      lines: chapter.lines,
      stats: chapter.stats,
      rows: chapter.rows,
      columns: chapter.columns,
    }));

  return {
    title: reportTitle,
    summary: [
      `Périmètre: ${scopeLabel}`,
      `Type: ${reportTypeLabel(reportType)}.`,
      `Niveau de détail: ${detailLevelLabel(detailLevel)}.`,
      `Actions consolidées: ${report.totals.actions}`,
      `Modules sélectionnés: ${
        [
          modules.dataAndCartography ? "Données & cartographie" : null,
          modules.environmentalImpact ? "Impact environnemental" : null,
          modules.rawData ? "Données brutes" : null,
          modules.detailedFiles ? "Fichiers détaillés" : null,
        ]
          .filter(Boolean)
          .join(", ") || "Aucun module additionnel"
      }`,
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
  const [reportType, setReportType] = useState<ReportTypeId>("standard");
  const [detailLevel, setDetailLevel] = useState<DetailLevelId>("standard");
  const [modules, setModules] = useState<ModuleState>(reportTypeToModules("standard"));
  const effectivePeriod = period || "12m";
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
        reportType,
      }),
    [activeScopeLabel, effectivePeriod, overview, reportType],
  );

  const defaultTitle = buildReportTitle(reportType, activeScopeLabel);
  const pdfData = useMemo(
    () =>
      buildPdfData({
        reportTitle: defaultTitle,
        scopeLabel: activeScopeLabel,
        period: effectivePeriod,
        reportType,
        detailLevel,
        modules,
        model,
        surfaceProxy,
      }),
    [activeScopeLabel, defaultTitle, detailLevel, effectivePeriod, model, modules, reportType, surfaceProxy],
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

  const reportTypeOptions: ReportTypeOption[] = [
    {
      id: "standard",
      title: "Standard",
      description: "Rapport d'impact complet par défaut.",
      icon: FileText,
    },
    {
      id: "institutionnel",
      title: "Institutionnel",
      description: "Version adaptée pour le reporting institutionnel.",
      icon: Building2,
    },
    {
      id: "technique",
      title: "Technique",
      description: "Focus sur la méthodologie et les données.",
      icon: Wrench,
    },
    {
      id: "personnalise",
      title: "Personnalisé",
      description: "Choisissez les modules et sections inclus.",
      icon: SlidersHorizontal,
    },
  ];

  const detailOptions: DetailLevelOption[] = [
    {
      id: "standard",
      label: "Standard (recommandé)",
      description: "Format compact et lisible.",
      icon: CircleCheckBig,
    },
    {
      id: "approfondi",
      label: "Approfondi",
      description: "Plus de contexte et de preuves.",
      icon: CalendarDays,
    },
    {
      id: "complet",
      label: "Complet",
      description: "Inclut plus de détails et d'annexes.",
      icon: FileText,
    },
  ];

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

  function syncModulesFromReportType(nextType: ReportTypeId): void {
    setReportType(nextType);
    if (!period) {
      setPeriod(reportTypeToPeriod(nextType));
    }
    setModules(reportTypeToModules(nextType));
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
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
                <option value="30j">30 derniers jours</option>
                <option value="90j">90 derniers jours</option>
                <option value="12m">12 mois glissants</option>
                <option value="annee">Année civile</option>
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
              Type de rapport
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {reportTypeOptions.map((option) => {
                const Icon = option.icon;
                const active = reportType === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => syncModulesFromReportType(option.id)}
                    className={`flex min-h-[96px] items-start gap-4 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-red-300 bg-red-50 shadow-[0_12px_24px_-18px_rgba(220,38,38,0.35)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        active ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900">{option.title}</p>
                        {active ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                            ✓
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{option.description}</p>
                    </div>
                  </button>
                );
              })}
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
                onChange={(event) => setDetailLevel(event.target.value as DetailLevelId)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm text-slate-600 shadow-[inset_0_1px_4px_rgba(15,23,42,0.04)] outline-none transition focus:border-red-300"
              >
                {detailOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
            <p className="text-base font-black text-red-600">Comment ça marche ?</p>
            <div className="mt-4 space-y-4">
              {[
                {
                  step: "1",
                  title: "Configurez",
                  text: "Sélectionnez la période, le périmètre et le type de rapport.",
                },
                {
                  step: "2",
                  title: "Générez",
                  text: "Nous préparons votre rapport avec les données CleanMyMap.",
                },
                {
                  step: "3",
                  title: "Consultez",
                  text: "Visualisez le rapport en ligne ou téléchargez-le.",
                },
                {
                  step: "4",
                  title: "Partagez",
                  text: "Diffusez facilement votre rapport auprès de vos parties prenantes.",
                },
              ].map((item, index, array) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-sm font-black text-red-600">
                      {item.step}
                    </span>
                    {index < array.length - 1 ? (
                      <span className="mt-2 h-full w-px flex-1 bg-slate-200" />
                    ) : null}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
            <p className="text-base font-black text-red-600">Indicateurs inclus</p>
            <ul className="mt-4 space-y-3">
              {[
                "Collecte des données",
                "Impact environnemental",
                "Données & cartographie",
                "Transparence & méthodes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                  <CircleCheckBig size={18} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {item === "Collecte des données"
                        ? "Volumes collectés et sources de terrain."
                        : item === "Impact environnemental"
                          ? "Émissions évitées, eau préservée et surface d’action."
                          : item === "Données & cartographie"
                            ? "Cartes, zones couvertes et précision géographique."
                            : "Méthodologie, hypothèses et contrôle qualité."}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Le contenu varie selon le type de rapport et les modules sélectionnés.
            </p>
          </section>
        </aside>
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
                {reportTypeLabel(reportType)}
              </span>
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

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-black text-red-600">Sections incluses dans le rapport</p>
            <p className="mt-1 text-sm text-slate-500">
              Les sections affichées ci-dessous correspondent au livrable généré.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sectionCards.map((section, index) => (
            <article
              key={section.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                {index === 0 ? (
                  <ShoppingBag size={22} />
                ) : index === 1 ? (
                  <Leaf size={22} />
                ) : index === 2 ? (
                  <MapIcon size={22} />
                ) : (
                  <ShieldCheck size={22} />
                )}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{section.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">{section.subtitle}</p>
              </div>
            </article>
          ))}
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
                {["Rapport", "Période", "Périmètre", "Type", "Généré le", "Actions"].map((header) => (
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
                        <p className="text-xs text-slate-500">{row.type}</p>
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
                    {row.type}
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
