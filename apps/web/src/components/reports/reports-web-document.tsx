"use client";

import { useMemo } from "react";
import { GLOSSARY_ROWS, REPORT_TOC_ENTRIES } from "@/components/reports/web-document/constants";
import { ReportsWebSections } from "@/components/reports/web-document/sections";
import { useReportsWebDocumentModel } from "@/components/reports/web-document/use-reports-web-document-model";
import { ReportCover } from "@/components/reports/web-document/report-cover";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";
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
  const executive = model.report.executive as {
    summary: string;
    watchouts: string[];
    budgetUseCases: string[];
    readinessLabel: string;
    readinessScore: number;
    evidence: string[];
    headline: string;
  };
  const surfaceProxy =
    model.report.totals.kg * IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg +
    model.report.totals.hours * 60 * IMPACT_PROXY_CONFIG.factors.surfaceM2PerVolunteerMinute;
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
      chapters: [
        {
          title: "Synthèse exécutive",
          subtitle: "Vue d’ensemble du rapport",
          lines: [
            executive.summary,
            `Lecture: ${executive.readinessLabel}.`,
            model.weatherAdvice,
          ],
          stats: [
            { label: "Actions validées", value: model.report.totals.actions },
            { label: "Volume collecte", value: `${model.report.totals.kg.toFixed(1)} kg` },
            { label: "Crédibilité data", value: `${executive.readinessScore.toFixed(1)} / 100` },
            { label: "Géolocalisation", value: `${model.report.map.geoCoverage.toFixed(1)}%` },
          ],
        },
        {
          title: "Périmètre du rapport",
          subtitle: "Période analysée, territoire couvert et sources des données",
          lines: [
            `Période analysée: 12 mois glissants.`,
            `Territoire couvert: ${model.activeScopeLabel}.`,
            `Organisation ou collectif concerné: ${model.activeScopeLabel === "Global" ? "Collectif CleanMyMap" : model.activeScopeLabel}.`,
            `Sources des données: ${Object.keys(model.report.impactMethodology.sources).join(", ")}.`,
          ],
        },
        {
          title: "Résultats terrain",
          subtitle: "Actions, déchets, bénévoles et zones traitées",
          stats: [
            { label: "Actions recensées", value: model.report.totals.actions },
            { label: "Déchets collectés", value: `${model.report.totals.kg.toFixed(1)} kg` },
            { label: "Déchets signalés", value: model.report.terrain.spotCount },
            { label: "Participation bénévole", value: model.report.totals.volunteers },
          ],
          lines: [
            `Zones traitées: ${model.report.areas.length}.`,
            `Zones restantes (proxy): ${Math.max(0, 100 - model.report.map.geoCoverage).toFixed(1)}%.`,
          ],
        },
        {
          title: "Cartographie d’impact",
          subtitle: "Lecture spatiale et évolution des signalements",
          stats: [
            { label: "Couverture GPS", value: `${model.report.map.geoCoverage.toFixed(1)}%` },
            { label: "Taux de traces", value: `${model.report.map.traceCoverage.toFixed(1)}%` },
            { label: "Évolution", value: `${model.report.trendPercent >= 0 ? "+" : ""}${model.report.trendPercent.toFixed(1)}%` },
          ],
          rows: model.report.areas.slice(0, 6).map((row) => ({
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
            title: "Indicateurs environnementaux",
            subtitle: "Proxy eau, CO2, surface et pollution",
            stats: [
              { label: "Impact estimé", value: `${model.report.totals.kg.toFixed(1)} kg` },
              { label: "Émissions évitées", value: `${model.report.climate.co2AvoidedKg.toFixed(1)} kg` },
              { label: "Eau préservée", value: `${model.report.climate.waterProtectedLiters.toFixed(0)} L` },
              { label: "Indice de pollution", value: `${model.report.impactMethodology.pollutionScoreAverage.toFixed(1)} / 100` },
            ],
            lines: [
            `Surface d’action proxy: ${surfaceProxy.toFixed(1)} m².`,
            `Indice de tri propre: ${model.report.recycling.triIndex.toFixed(1)} / 100.`,
          ],
        },
        {
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
        },
        {
          title: "Méthodologie et fiabilité",
          subtitle: "Mode de calcul, qualité et limites",
          lines: [
            `Version proxy: ${model.report.impactMethodology.proxyVersion}.`,
            `Règles qualité: ${model.report.impactMethodology.qualityRulesVersion}.`,
            `Complétude: ${model.report.quality.completenessScore.toFixed(1)}%. Cohérence: ${model.report.quality.coherenceScore.toFixed(1)}%.`,
          ],
          rows: model.report.impactMethodology.formulas.map((formula) => ({
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
          title: "Communauté et mobilisation",
          subtitle: "Bénévoles, partenaires et contribution citoyenne",
          stats: [
            { label: "Événements", value: model.report.community.totalEvents },
            { label: "RSVP oui", value: `${model.report.community.participationRate.toFixed(1)}%` },
            { label: "Bénévoles", value: model.report.totals.volunteers },
          ],
          rows: model.report.community.topLeaderboard.slice(0, 5).map((entry) => ({
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
          title: "Gouvernance et transparence",
          subtitle: "Validation, modération et traçabilité",
          lines: [
            `Couverture compte: ${model.accountScopeCoverage.coveragePercent.toFixed(1)}%.`,
            `Modération: ${model.report.moderation.approved} approuvés / ${model.report.moderation.rejected} rejetés.`,
            `Délai moyen: ${model.report.moderation.delayDays.toFixed(1)} jours.`,
          ],
        },
        {
          title: "Recommandations opérationnelles",
          subtitle: "Court terme, moyen terme et priorités",
          lines: executive.budgetUseCases.concat([
            `Zone prioritaire: ${model.report.areas[0]?.area ?? "n/a"}.`,
          ]),
        },
        {
          title: "Calendrier prévisionnel",
          subtitle: "Prochaines actions et échéances recommandées",
          rows: model.report.calendar.map(([sprint, periode, objectif, responsable]) => ({
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
          title: "Glossaire simplifié",
          subtitle: "Définitions clés et méthodes de calcul",
          rows: GLOSSARY_ROWS.map(([terme, definition]) => ({
            Terme: terme,
            Définition: definition,
          })),
          columns: [
            { key: "Terme", label: "Terme" },
            { key: "Définition", label: "Définition" },
          ],
        },
        {
          title: "Annexes",
          subtitle: "Données détaillées et exports techniques",
          rows: model.exportRows.slice(0, 20).map((row) => ({
            Date: row.Date,
            Lieu: row.Lieu,
            Compte: row.Compte,
            Association: row.Association,
            Masse_Kg: row.Masse_Kg,
            Megots: row.Megots,
          })),
          columns: [
            { key: "Date", label: "Date" },
            { key: "Lieu", label: "Lieu" },
            { key: "Compte", label: "Compte" },
            { key: "Association", label: "Association" },
            { key: "Masse_Kg", label: "Masse (kg)" },
            { key: "Megots", label: "Mégots" },
          ],
        },
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
    [executive, model.accountScopeCoverage.coveragePercent, model.activeScopeLabel, model.exportRows, model.report, model.wasteProfile, model.weatherAdvice, surfaceProxy],
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
          <nav className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">
            {REPORT_TOC_ENTRIES.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-2 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <a href={`#${entry.id}`} className="block rounded-lg px-2 py-1.5 transition">
                  <span className="cmm-text-caption cmm-text-muted">{entry.kicker}</span>
                  <span className="block font-medium cmm-text-primary">{entry.title}</span>
                  <span className="block cmm-text-caption cmm-text-muted">{entry.subtitle}</span>
                </a>
                {entry.links?.length ? (
                  <div className="mt-2 space-y-1 border-t border-slate-200/80 pt-2">
                    {entry.links.map((link) => (
                      <a
                        key={link.id}
                        href={`#${link.id}`}
                        className="block rounded-md px-2 py-1 transition hover:bg-white hover:cmm-text-primary"
                      >
                        <span className="block font-medium">{link.label}</span>
                        <span className="block cmm-text-caption cmm-text-muted">{link.subtitle}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
          <div className="mt-4 rounded-xl border border-[#c7d3e4] bg-[#f5f8fd] p-3 cmm-text-caption cmm-text-secondary">
            Navigation rapide: clique un chapitre pour y aller instantanement.
          </div>
        </aside>

        <div className="space-y-6" data-rubrique-report-root>
          <ReportCover
            id="synthese-executive"
            report={model.report}
            activeScopeLabel={model.activeScopeLabel}
            weatherAdvice={model.weatherAdvice}
          />

          <ReportsWebSections
            report={model.report}
            activeScopeLabel={model.activeScopeLabel}
            accountCoverage={accountCoverage}
            wasteProfile={model.wasteProfile}
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
