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
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import {
  DETAIL_LEVEL_OPTIONS,
  REPORT_HISTORY_SERVER_LIMIT,
  GenerationStageCard,
  buildCoverageRangeLabel,
  buildDetailCoverageLabel,
  buildPdfData,
  buildRecentReports,
  buildReportTitle,
  buildScopeSelectValue,
  detailLevelLabel,
  detailLevelToModules,
  periodLabel,
  parseScopeSelectValue,
  type DetailLevelId,
  type ModuleState,
  type PeriodId,
  type ReportsWeather,
  type SelectedPeriodId,
} from "@/components/reports/web-document/reports-web-document.shared";
import { usePdfExport } from "@/components/ui/pdf-export/use-pdf-export";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

function toIsoDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getPeriodFloorDate(period: PeriodId): string | null {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  switch (period) {
    case "six_months": {
      const floor = new Date(utcToday);
      floor.setUTCMonth(floor.getUTCMonth() - 6);
      return toIsoDateKey(floor);
    }
    case "current_year":
      return `${today.getUTCFullYear()}-01-01`;
    case "full_history":
      return null;
  }

  return null;
}

function filterContractsByPeriod(contracts: ActionDataContract[], period: PeriodId) {
  const floorDate = getPeriodFloorDate(period);

  return contracts.filter((contract) => {
    if (contract.status !== "approved") {
      return false;
    }

    if (!floorDate) {
      return true;
    }

    return contract.dates.observedAt >= floorDate;
  });
}

type ModuleOption = {
  id: keyof ModuleState;
  label: string;
  description: string;
};

export type ReportsWebDocumentProps = {
  contracts: ActionDataContract[];
  communityEvents: CommunityEventItem[];
  weather: ReportsWeather;
  overview?: PilotageOverview | null;
};

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
  const historyCompletenessWarning = effectivePeriod === "full_history";
  const filteredContracts = useMemo(
    () => filterContractsByPeriod(contracts, effectivePeriod),
    [contracts, effectivePeriod],
  );
  const coverageRangeLabel = useMemo(
    () => buildCoverageRangeLabel(filteredContracts),
    [filteredContracts],
  );
  const detailCoverageLabel = useMemo(
    () => buildDetailCoverageLabel(detailLevel),
    [detailLevel],
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
    <CmmGrid
      as="section"
      className="rounded-[2.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.25)] sm:p-6"
      contentClassName="gap-6"
    >
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
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
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <div className="grid gap-4 xl:grid-cols-[1.14fr_0.86fr] xl:items-start">
        <GenerationStageCard
          tone="prepare"
          step="1"
          title="Préparer le rapport"
          description="Choisissez la période, le périmètre et le niveau de détail avant de lancer la génération."
        >
            <div className="space-y-3">
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-900">Période</label>
              <div className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
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

              {historyCompletenessWarning ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <p>
                    Historique complet: la vue actuelle charge jusqu&apos;à{" "}
                    {REPORT_HISTORY_SERVER_LIMIT} actions approuvées. Pour une complétude
                    strictement exhaustive, il faut lever ce plafond côté serveur.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-slate-900">Périmètre géographique</label>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
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
              <label className="block text-sm font-black text-slate-900">Niveau de détail</label>
              <div className="relative">
                <SlidersHorizontal
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
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
                        <span className="block text-sm font-semibold text-slate-800">
                          {option.label}
                        </span>
                        <span className="block text-xs leading-5 text-slate-500">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-red-600" />
              Le rapport est généré à partir des données et de la méthodologie CleanMyMap.
            </p>
          </div>
        </GenerationStageCard>

        <div className="grid gap-4">
          <GenerationStageCard
            tone="preview"
            step="2"
            title="Voir ce qui sortira"
            description="Regardez ce que l'utilisateur verra dans le PDF avant de l'exporter."
            action={
              <button
                type="button"
                onClick={handlePreview}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-black text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                <Eye size={16} />
                {showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
              </button>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50/60 p-4 shadow-[0_12px_28px_-24px_rgba(8,145,178,0.35)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                    Ce que l&apos;utilisateur verra
                  </p>
                  <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                    Première page du PDF
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Synthèse exécutive, chiffres clés et sommaire cliquable dans le rendu final.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      A4 portrait
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      Sommaire cliquable
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {REPORT_SECTIONS.length} sections
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {detailLevelLabel(detailLevel)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {sectionCards.map((section, index) => {
                      const Icon =
                        index === 0 ? ShoppingBag : index === 1 ? Leaf : index === 2 ? MapIcon : ShieldCheck;
                      return (
                        <div
                          key={section.id}
                          className="flex items-start gap-3 rounded-2xl border border-cyan-100/60 bg-white/90 px-3 py-2"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                            <p className="mt-0.5 text-xs leading-4 text-slate-500">
                              {section.subtitle}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.2)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                        Ce qui sortira dans le PDF
                      </p>
                      <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                        Fiche du livrable
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Une sortie prête à partager, structurée comme le PDF officiel.
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${exportStatus.tone}`}>
                      {exportStatus.label}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {historyCompletenessWarning
                        ? `Historique borné à ${REPORT_HISTORY_SERVER_LIMIT}`
                        : `Historique: ${filteredContracts.length} actions`}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {periodLabel(effectivePeriod)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      {detailLevelLabel(detailLevel)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Garanties d&apos;export
                    </p>
                    <div className="space-y-1.5 text-sm leading-6 text-slate-700">
                      <p>Historique: {historyCompletenessWarning ? `plafonné à ${REPORT_HISTORY_SERVER_LIMIT} actions approuvées` : "couverture conforme à la fenêtre sélectionnée"}.</p>
                      <p>Période réelle: {coverageRangeLabel}.</p>
                      <p>Niveau inclus: {detailCoverageLabel}</p>
                    </div>
                  </div>
                </div>
              </div>

              {showPreview ? (
                <div ref={previewRef} className="space-y-4 rounded-[1.5rem] border border-cyan-100 bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
                        Ce que l&apos;utilisateur verra
                      </p>
                      <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">
                        Aperçu du PDF
                      </h3>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                        L&apos;aperçu reprend le rendu final, alimenté par les données du
                        territoire sélectionné.
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
                </div>
              ) : null}
            </div>
          </GenerationStageCard>

          <GenerationStageCard
            tone="export"
            step="3"
            title="Ce qui est prêt à exporter"
            description="Lancez le PDF dès que la configuration est validée."
            action={
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isDisabled}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_18px_34px_-18px_rgba(220,38,38,0.55)] transition hover:from-red-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText size={18} />
                {state === "pending" ? copy.pendingLabel : "Générer le rapport"}
              </button>
            }
          >
            <div className="space-y-3">
              <div className={`flex items-start gap-3 rounded-2xl border px-3 py-3 ${exportStatus.tone}`}>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${exportStatus.iconTone}`}
                >
                  <ExportStatusIcon size={18} className={state === "pending" ? "animate-spin" : ""} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black">{exportStatus.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">
                    {exportStatus.description}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Ce qui est prêt à exporter
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                    Le PDF officiel est généré avec la structure exhaustive commune.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                    Les sections verrouillées restent présentes mais affichent un contenu réduit.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
                    L&apos;export s&apos;ouvre une fois la préparation terminée et valide.
                  </li>
                </ul>
              </div>

              <p className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
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
          </GenerationStageCard>
        </div>
      </div>
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
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
            <table className="w-full min-w-full border-separate border-spacing-0 text-left">
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
      </CmmGridItem>
    </CmmGrid>
  );
}

