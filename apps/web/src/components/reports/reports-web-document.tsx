"use client";

import { useMemo } from "react";
import { CHAPTERS } from "@/components/reports/web-document/constants";
import { ReportsWebSections } from "@/components/reports/web-document/sections";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import { ReportCover } from "@/components/reports/web-document/report-cover";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";

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
};

export function ReportsWebDocument({
  contracts,
  communityEvents,
  weather,
}: ReportsWebDocumentProps) {
  const model = useReportsWebDocumentModel({
    initialContracts: contracts,
    initialCommunityEvents: communityEvents,
    initialWeather: weather,
  });
  const scopeChoices =
    model.scopeKind === "account"
      ? model.scopeOptions.accounts
      : model.scopeKind === "association"
        ? model.scopeOptions.associations
        : model.scopeOptions.arrondissements;
  const accountCoverage = model.accountScopeCoverage;
  const hasAccountCoverageGap =
    accountCoverage.hasMeasurableBase && accountCoverage.missingCreatedByClerkId > 0;
  const hasAccountCoverageBase = accountCoverage.hasMeasurableBase;
  const pdfData = useMemo(
    () => ({
      title: `Rapport Reporting - ${model.activeScopeLabel}`,
      summary: [
        `Périmètre: ${model.activeScopeLabel}`,
        `Actions consolidées: ${model.report.totals.actions}`,
        `Qualité de données: ${model.report.quality.completenessScore.toFixed(0)}% de complétude, ${model.report.quality.coherenceScore.toFixed(0)}% de cohérence.`,
      ],
      stats: [
        { label: "Actions", value: model.report.totals.actions },
        { label: "Masse collectée", value: `${model.report.totals.kg.toFixed(1)} kg` },
        { label: "Mégots", value: model.report.totals.butts },
        { label: "Bénévoles", value: model.report.totals.volunteers },
        { label: "Couverture géographique", value: `${model.report.map.geoCoverage.toFixed(1)}%` },
        { label: "Événements communauté", value: model.report.community.totalEvents },
      ],
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
      generatedAt: model.report.generatedAt,
    }),
    [model.activeScopeLabel, model.exportRows, model.report],
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-[#f7fafd] to-white shadow-sm">
      <header className="border-b border-slate-200 bg-white/90 p-6 backdrop-blur">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.16em] text-[#21506f]">
          Rapport web integre
        </p>
        <h2 className="mt-2 text-3xl font-semibold cmm-text-primary">
          Rapport institutionnel web - version exhaustive
        </h2>
        <p className="mt-2 max-w-4xl cmm-text-small cmm-text-secondary">
          Version web complete branchee a la rubrique
          <span className="font-semibold">Reporting</span>, fidele au fond du
          PDF et optimisee pour une double lecture: operationnelle terrain et
          pilotage strategique.
        </p>
        <div className="mt-4 grid max-w-2xl gap-3 md:grid-cols-[10rem_minmax(0,1fr)]">
          <label
            htmlFor="report-web-scope-kind"
            className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted"
          >
            Perimetre
          </label>
          <select
            id="report-web-scope-kind"
            value={model.scopeKind}
            onChange={(event) =>
              model.setScopeKind(event.target.value as typeof model.scopeKind)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-secondary outline-none transition focus:border-emerald-500"
          >
            <option value="global">Global</option>
            <option value="account">Compte</option>
            <option value="association">Association</option>
            <option value="arrondissement">Arrondissement</option>
          </select>
          {model.scopeKind !== "global" ? (
            <select
              aria-label="Valeur du perimetre"
              value={model.scopeValue}
              onChange={(event) => model.setScopeValue(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-secondary outline-none transition focus:border-emerald-500"
            >
              {scopeChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 cmm-text-small cmm-text-muted">
              Aucun sous-filtre requis en mode global.
            </div>
          )}
        </div>
        <p className="mt-2 cmm-text-caption cmm-text-secondary">
          Contexte du rapport:
          <span className="font-semibold">Perimetre: {model.activeScopeLabel}</span>
        </p>
        <p
          className={`mt-1 cmm-text-caption ${
            hasAccountCoverageGap ? "text-amber-700" : "cmm-text-muted"
          }`}
        >
          Couverture filtre compte (`created_by_clerk_id`):
          {hasAccountCoverageBase ? (
            <>
              <span className="font-semibold">
                {accountCoverage.coveragePercent.toFixed(1)}%
              </span>
              ({accountCoverage.withCreatedByClerkId}/{accountCoverage.total}).
              {hasAccountCoverageGap
                ? ` ${accountCoverage.missingCreatedByClerkId} entrée(s) restent sans clé stable.`
                : " Couverture complète."}
            </>
          ) : (
            <>
              <span className="font-semibold">n/a</span> (0/0).
              Données insuffisantes pour mesurer la couverture compte.
            </>
          )}
        </p>
        <p className="mt-2 cmm-text-caption cmm-text-muted">
          Derniere generation: {model.report.generatedAt}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <RubriquePdfExportButton
            rubrique="reporting"
            periode={`annee_${new Date().getFullYear()}`}
            organizationType={model.activeScopeLabel}
            defaultTitle={`Rapport Reporting - ${model.activeScopeLabel}`}
            data={pdfData}
            disabled={model.isLoading || model.hasError}
          />
          <RubriqueExcelExportButton
            rubriqueTitle={`Reporting - ${model.activeScopeLabel}`}
            data={model.exportRows}
            columns={[
              { key: "Date", label: "Date" },
              { key: "Lieu", label: "Lieu" },
              { key: "Compte", label: "Compte" },
              { key: "Association", label: "Association" },
              { key: "Masse_Kg", label: "Masse (kg)" },
              { key: "Megots", label: "Megots" },
              { key: "Bénévoles", label: "Benevoles" },
              { key: "Durée_Min", label: "Duree (min)" },
              { key: "Type", label: "Type" },
              { key: "Source", label: "Source" },
            ]}
          />
        </div>
      </header>

      <div className="grid gap-5 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-6">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            Sommaire cliquable
          </p>
          <nav className="mt-3 space-y-1.5 cmm-text-small cmm-text-secondary">
            {CHAPTERS.map((chapter) => (
              <a
                key={chapter.id}
                href={`#${chapter.id}`}
                className="block rounded-lg px-2 py-1.5 transition hover:bg-slate-100 hover:cmm-text-primary"
              >
                <span className="cmm-text-caption cmm-text-muted">{chapter.kicker}</span>
                <span className="block font-medium">{chapter.title}</span>
              </a>
            ))}
          </nav>
          <div className="mt-4 rounded-xl border border-[#c7d3e4] bg-[#f5f8fd] p-3 cmm-text-caption cmm-text-secondary">
            Navigation rapide: clique un chapitre pour y aller instantanement.
          </div>
        </aside>

        <div className="space-y-6" data-rubrique-report-root>
          <ReportCover
            report={model.report}
            activeScopeLabel={model.activeScopeLabel}
            weatherAdvice={model.weatherAdvice}
          />

          <ReportsWebSections
            report={model.report}
            weather={model.weather.data ?? {}}
            weatherAdvice={model.weatherAdvice}
            isLoading={model.isLoading}
            hasError={model.hasError}
          />
        </div>
      </div>
    </section>
  );
}
