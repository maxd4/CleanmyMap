import { auth } from "@clerk/nextjs/server";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { OperationalPrioritiesPanel } from "@/components/pilotage/operational-priorities-panel";
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
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  getProfileLabel,
  toProfile,
} from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function loadReportsOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 90,
    limit: 2200,
  });
}

export default async function ReportsPage() {
  const { userId } = await auth();
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel = getProfileLabel(profile, "fr");
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const overview = await loadReportsOverview().catch(() => null);

  if (!userId) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-900">
          Acces restreint
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Connecte-toi pour acceder aux rapports d&apos;impact.
        </p>
      </section>
    );
  }

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
          label: "Qualite data",
          value: "n/a",
          previousValue: "n/a",
          deltaAbsolute: "n/a",
          deltaPercent: "n/a",
          interpretation: "neutral",
        },
      ] as const);

  if (pageTemplateV2Enabled) {
    return (
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
                primaryAction.label.fr,
            }}
            recommendedReason={overview?.summary.recommendedAction.reason}
          />
        }
        primaryAction={{
          href: primaryAction.href,
          label: primaryAction.label.fr,
        }}
        secondaryAction={
          secondaryAction
            ? { href: secondaryAction.href, label: secondaryAction.label.fr }
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
                  Données de comparaison temporairement indisponibles. Vérifier
                  la source pilotage.
                </p>
              </section>
            )}

            {overview ? (
              <OperationalPrioritiesPanel priorities={overview.priorities} />
            ) : null}
            {overview ? (
              <KpiMethodBlock methods={overview.methods} title="Methode" />
            ) : null}
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
                  Exports et moderation reserves aux admins
                </h2>
                <p className="mt-2 text-sm text-amber-800">
                  Tu vois la synthese KPI, mais les exports CSV/JSON et la
                  moderation restent limites au role{" "}
                  <span className="font-semibold">admin</span>.
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
                ? "badge par fenetre 30/90/365 jours"
                : "faible (donnees absentes)"}
            </p>
            <p>
              Sources: module pilotage overview, actions normalisees,
              agrégations reporting.
            </p>
            <p>
              Methode: comparatifs N vs N-1, priorisation automatique et limites
              documentées par KPI.
            </p>
            <p>
              Perimetre: espace Rapports d&apos;impact (exports + synthese
              multi-horizon).
            </p>
            <div className="pt-1">
              <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <ThirtySecondsSummary
        kpis={summaryKpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label.fr,
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <DecisionPageHeader
        context="Profil decideur"
        title="Rapports d'impact, methode KPI et priorites operationnelles"
        objective="Arbitrer sur 30j/90j/12m avec comparatifs N vs N-1 et priorites auto justifiees."
        actions={[
          { href: "/profil", label: "Retour cockpit" },
          { href: "/sections/elus", label: "Vue collectivites" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tracer
        </p>
        <div className="mt-2">
          <RubriquePdfExportButton rubriqueTitle="Reporting et pilotage" />
        </div>
      </section>

      {overview ? (
        <ReportsWindowComparisonsSection
          comparisonsByWindow={overview.comparisonsByWindow}
        />
      ) : null}

      {overview ? (
        <OperationalPrioritiesPanel priorities={overview.priorities} />
      ) : null}

      {overview ? (
        <KpiMethodBlock methods={overview.methods} title="Methode" />
      ) : null}

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
            Exports et moderation reserves aux admins
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Tu vois la synthese KPI, mais les exports CSV/JSON et la moderation
            restent limites au role <span className="font-semibold">admin</span>
            .
          </p>
        </section>
      )}

      <RolePrimaryActions profile={profile} />
    </div>
  );
}
