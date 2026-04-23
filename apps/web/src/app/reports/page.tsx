import { auth } from "@clerk/nextjs/server";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";

import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { ReportsKpiSummary } from "@/components/reports/reports-kpi-summary";
import { ReportsWindowComparisonsSection } from "@/components/reports/reports-window-comparisons-section";
import { ReportsWebDocument } from "@/components/reports/reports-web-document";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  getProfileLabel,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function loadReportsData() {
  const supabase = getSupabaseServerClient();
  const overview = await loadPilotageOverview({
    supabase,
    periodDays: 90,
    limit: 2200,
  });

  const { fetchUnifiedActionContracts } = await import("@/lib/actions/unified-source");
  const { items: contracts } = await fetchUnifiedActionContracts(supabase, {
    limit: 1000,
    status: "approved",
    floorDate: null,
    requireCoordinates: false,
    types: null,
  });

  return { overview, contracts };
}

export default async function ReportsPage() {
  const { userId } = await auth();
  const role = userId ? await getCurrentUserRoleLabel() : "anonymous";
  const profile = toProfile(role);
  const locale = await getServerLocale();
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel =
    userId ? getProfileLabel(profile, locale) : locale === "fr" ? "Visiteur" : "Visitor";
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const data = await loadReportsData().catch(() => null);
  const overview = data?.overview ?? null;
  const contracts = data?.contracts ?? [];

  const { aggregateMonthlyAnalytics } = await import("@/lib/pilotage/analytics-data-utils");
  const { AnalyticsCockpit } = await import("@/components/reports/analytics-cockpit");
  const monthlyData = aggregateMonthlyAnalytics(contracts);
  const publicAccessBanner = !userId ? (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm">
      Lecture publique: tu peux parcourir les rapports et générer un livrable
      sans compte. La connexion n&apos;est utile que pour les vues
      personnalisées et la modération.
    </section>
  ) : null;
  const headerActions = userId
    ? [
        { href: "/profil", label: "Retour cockpit" },
        { href: "/learn/hub", label: "Apprendre" },
      ]
    : [
        { href: "/learn/hub", label: "Apprendre" },
        { href: "/sign-in", label: "Se connecter" },
      ];

  const summaryKpis = overview
    ? ([
        {
          label: overview.summary.kpis[0].label,
          value: overview.summary.kpis[0].value,
          previousValue: overview.summary.kpis[0].previousValue,
          deltaAbsolute: overview.summary.kpis[0].deltaAbsolute,
          deltaPercent: overview.summary.kpis[0].deltaPercent,
          interpretation: overview.summary.kpis[0].interpretation,
        },
        {
          label: overview.summary.kpis[1].label,
          value: overview.summary.kpis[1].value,
          previousValue: overview.summary.kpis[1].previousValue,
          deltaAbsolute: overview.summary.kpis[1].deltaAbsolute,
          deltaPercent: overview.summary.kpis[1].deltaPercent,
          interpretation: overview.summary.kpis[1].interpretation,
        },
        {
          label: overview.summary.kpis[2].label,
          value: overview.summary.kpis[2].value,
          previousValue: overview.summary.kpis[2].previousValue,
          deltaAbsolute: overview.summary.kpis[2].deltaAbsolute,
          deltaPercent: overview.summary.kpis[2].deltaPercent,
          interpretation: overview.summary.kpis[2].interpretation,
        },
      ] as const)
    : ([
        {
          label: "Impact terrain",
          value: "n/a",
          previousValue: "n/a",
          deltaAbsolute: "n/a",
          deltaPercent: "n/a",
          interpretation: "neutral",
        },
        {
          label: "Mobilisation",
          value: "n/a",
          previousValue: "n/a",
          deltaAbsolute: "n/a",
          deltaPercent: "n/a",
          interpretation: "neutral",
        },
        {
          label: "Qualité data",
          value: "n/a",
          previousValue: "n/a",
          deltaAbsolute: "n/a",
          deltaPercent: "n/a",
          interpretation: "neutral",
        },
      ] as const);

  if (pageTemplateV2Enabled) {
    return (
      <div className="space-y-4">
        {publicAccessBanner}

        <PageReadingTemplate
          context={`Profil ${roleLabel}`}
          title="Rapports d'impact multi-horizon et exports"
          objective="Concentrer les comparatifs 30j/90j/12m, la méthode KPI et les livrables exportables, sans recopier le cockpit."
          summary={
            <ThirtySecondsSummary
              kpis={summaryKpis}
              alert={overview ? overview.summary.alert : undefined}
              recommendedAction={{
                href:
                  overview?.summary.recommendedAction.href ?? primaryAction.href,
                label:
                  overview?.summary.recommendedAction.label ??
                  primaryAction.label[locale],
              }}
              recommendedReason={overview?.summary.recommendedAction.reason}
            />
          }
          primaryAction={{
            href: primaryAction.href,
            label: primaryAction.label[locale],
          }}
          secondaryAction={
            secondaryAction
              ? {
                  href: secondaryAction.href,
                  label: secondaryAction.label[locale],
                }
              : undefined
          }
          analysis={
            <>
              {overview ? (
                <ReportsWindowComparisonsSection
                  comparisonsByWindow={overview.comparisonsByWindow}
                />
              ) : (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <p className="text-sm text-amber-800">
                    Données de comparaison temporairement indisponibles.
                    Vérifier la source pilotage.
                  </p>
                </section>
              )}
            </>
          }
          trace={
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Horodatage:{" "}
                {overview
                  ? new Date(overview.generatedAt).toLocaleString("fr-FR")
                  : "indisponible"}{" "}
                | Fiabilite:{" "}
                {overview
                  ? "badge par fenêtre 30/90/365 jours"
                  : "faible (données absentes)"}
              </p>
              <p>
                Sources: module pilotage overview, actions normalisées,
                agrégations reporting.
              </p>
              <p>
                Méthode: comparatifs N vs N-1, priorisation automatique et
                limites documentées par KPI.
              </p>
              <p>
                Périmètre: espace Rapports d&apos;impact (exports + synthèse
                multi-horizon).
              </p>
              <div className="flex gap-2 pt-2">
                <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
                <RubriqueExcelExportButton
                  rubriqueTitle="Reporting et pilotage"
                  data={contracts.map((c) => ({
                    Date: c.dates.observedAt,
                    Lieu: c.location.label,
                    Masse_Kg: c.metadata.wasteKg || 0,
                    Megots: c.metadata.cigaretteButts || 0,
                    Bénévoles: c.metadata.volunteersCount,
                    Durée_Min: c.metadata.durationMinutes,
                    Type: c.type,
                    Source: c.source,
                  }))}
                />
              </div>
            </div>
          }
        />

        <div className="space-y-4">
          {overview ? (
            <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Méthode
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Lecture des KPI
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  L&apos;explication détaillée est conservée hors de l&apos;écran
                  d&apos;ouverture.
                </p>
              </div>
              <KpiMethodBlock methods={overview.methods} title="Méthode" />
            </section>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Analyse mensuelle
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Cockpit intermédiaire
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Les vues comparatives, les agrégations et les exports détaillés
                restent accessibles plus bas.
              </p>
            </div>
            <AnalyticsCockpit data={monthlyData} />
          </section>

          <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
            <ReportsWebDocument />
          </section>

          <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
            <ReportsKpiSummary />
          </section>

          <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
            {role === "admin" ? (
              <ActionsReportPanel />
            ) : (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Admin requis
                </p>
                <h2 className="mt-2 text-xl font-semibold text-amber-900">
                  Exports et modération réservés aux admins
                </h2>
                <p className="mt-2 text-sm text-amber-800">
                  Tu vois la synthèse KPI, mais les exports CSV/JSON et la
                  modération restent limités au rôle{" "}
                  <span className="font-semibold">admin</span>.
                </p>
              </section>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Exports
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Livraison des livrables
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Les exports sont déplacés sous le fold pour ne pas encombrer
                l&apos;ouverture.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
              <RubriqueExcelExportButton
                rubriqueTitle="Reporting et pilotage"
                data={contracts.map((c) => ({
                  Date: c.dates.observedAt,
                  Lieu: c.location.label,
                  Masse_Kg: c.metadata.wasteKg || 0,
                  Megots: c.metadata.cigaretteButts || 0,
                  Bénévoles: c.metadata.volunteersCount,
                  Durée_Min: c.metadata.durationMinutes,
                  Type: c.type,
                  Source: c.source,
                }))}
              />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      {publicAccessBanner}

      <ThirtySecondsSummary
        kpis={summaryKpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label[locale],
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <DecisionPageHeader
        context={`Profil ${roleLabel}`}
        title="Rapports d'impact, méthode KPI et priorités opérationnelles"
        objective="Arbitrer sur 30j/90j/12m avec comparatifs N vs N-1 et priorités auto justifiées."
        actions={headerActions}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tracer
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
          <RubriqueExcelExportButton
            rubriqueTitle="Reporting et pilotage"
            data={contracts.map((c) => ({
              Date: c.dates.observedAt,
              Lieu: c.location.label,
              Masse_Kg: c.metadata.wasteKg || 0,
              Megots: c.metadata.cigaretteButts || 0,
              Bénévoles: c.metadata.volunteersCount,
              Durée_Min: c.metadata.durationMinutes,
              Type: c.type,
              Source: c.source,
            }))}
          />
        </div>
      </section>

      {overview ? (
        <ReportsWindowComparisonsSection
          comparisonsByWindow={overview.comparisonsByWindow}
        />
      ) : null}

      {overview ? <KpiMethodBlock methods={overview.methods} title="Méthode" /> : null}

      <ReportsWebDocument />

      <ReportsKpiSummary />

      {role === "admin" ? (
        <ActionsReportPanel />
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Admin requis
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-900">
            Exports et modération réservés aux admins
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Tu vois la synthèse KPI, mais les exports CSV/JSON et la modération
            restent limités au rôle <span className="font-semibold">admin</span>.
          </p>
        </section>
      )}

      <RolePrimaryActions profile={profile} />
    </div>
  );
}
