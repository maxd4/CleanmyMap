import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form";
import { BusinessAlertsPanel } from "@/components/dashboard/business-alerts-panel";
import { ClosedLoopPanel } from "@/components/dashboard/closed-loop-panel";
import { DashboardComparisonGrid } from "@/components/dashboard/dashboard-comparison-grid";
import { FunnelConversionPanel } from "@/components/dashboard/funnel-conversion-panel";
import { ReportExportSmokeCard } from "@/components/dashboard/report-export-smoke-card";
import { SystemStatusPanel } from "@/components/dashboard/system-status-panel";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { OperationalPrioritiesPanel } from "@/components/pilotage/operational-priorities-panel";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { PunchySlogan } from "@/components/ui/punchy-slogan";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  toProfile,
} from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function loadDashboardOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 30,
    limit: 1800,
  });
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const identity = await getCurrentUserIdentity();
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const roleLabel = getProfileLabel(profile, "fr");
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const overview = await loadDashboardOverview().catch(() => null);
  const fallbackActorName = userId ?? "unknown-user";
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];
  const kpis = overview
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
  const impactKpis = kpis.slice(0, 3).map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
  }));
  const adaptiveHref = overview?.summary.recommendedAction.href ?? primaryAction.href;
  const adaptiveLabel =
    overview?.summary.recommendedAction.label ?? primaryAction.label.fr;
  const adaptiveReason = overview?.summary.recommendedAction.reason;

  if (pageTemplateV2Enabled) {
    return (
      <div className="flex flex-col gap-6">
        <PunchySlogan />
        <PageReadingTemplate
          context={`Profil ${roleLabel}`}
          title="Cockpit transversal"
        objective="Orienter la priorisation op�rationnelle avec un r�sum� d�cisionnel court, puis des analyses cibl�es sans doublonner Compare, Climate et Reports."
        summary={
          <ThirtySecondsSummary
            kpis={kpis}
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
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Pilotage m�tier
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Synth�se comparative N vs N-1
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Lecture actionnable court terme: impact, qualit�, couverture,
                  mobilisation, d�lai de mod�ration.
                </p>
              </div>

              <DashboardComparisonGrid overview={overview} />

              {overview ? (
                <OperationalPrioritiesPanel priorities={overview.priorities} />
              ) : null}
              <BusinessAlertsPanel />
            </section>

            <FunnelConversionPanel />
            <ClosedLoopPanel
              impactKpis={impactKpis}
              recommendedHref={adaptiveHref}
              recommendedLabel={adaptiveLabel}
              recommendedReason={adaptiveReason}
            />

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Supervision technique
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Sante plateforme et exports critiques
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Etat des services et verification des executions sensibles.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SystemStatusPanel />
                <ReportExportSmokeCard />
              </div>
            </section>

            {overview ? (
              <KpiMethodBlock
                methods={overview.methods.slice(0, 3)}
                title="Methode (KPI cles)"
              />
            ) : null}

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Execution terrain
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Formulaire benevole
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Declaration rapide d&apos;action directement depuis la page
                  d&apos;accueil.
                </p>
              </div>
              <ActionDeclarationForm
                actorNameOptions={actorNameOptions}
                defaultActorName={actorNameOptions[0]}
                clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
                clerkUserId={identity?.userId ?? fallbackActorName}
                initialMode="quick"
              />
            </section>
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
                ? "moyenne a elevee selon les metriques disponibles"
                : "faible (donnees absentes)"}
            </p>
            <p>
              Sources: actions validees, module pilotage overview, metriques
              derivees N/N-1.
            </p>
            <p>
              Methode: deltas absolus et relatifs sur fenetre 30 jours.
              Perimetre: cockpit transversal.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <RubriquePdfExportButton rubriqueTitle="Tableau de bord pilotage" />
              <Link
                href="/reports"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Ouvrir le reporting
              </Link>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="flex w-full flex-col gap-6">
      <PunchySlogan />
      <ThirtySecondsSummary
        kpis={kpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label.fr,
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Espace applicatif
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Tableau de bord {roleLabel.toLowerCase()}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Pilotage decisionnel centre sur l&apos;impact terrain, la mobilisation
          et la fiabilite des donnees.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Utilisateur connecte: <span className="font-mono">{userId}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <RubriquePdfExportButton rubriqueTitle="Tableau de bord pilotage" />
          <Link
            href="/reports"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Ouvrir le reporting
          </Link>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bloc A
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Pilotage metier
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Lecture comparative N vs N-1 pour accelerer la decision
            operationnelle.
          </p>
        </div>

        <DashboardComparisonGrid overview={overview} />

        {overview ? (
          <OperationalPrioritiesPanel priorities={overview.priorities} />
        ) : null}
        <BusinessAlertsPanel />
      </section>

      <FunnelConversionPanel />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bloc B
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Supervision technique
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Sante API/services, alertes techniques et verification des exports
            critiques.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SystemStatusPanel />
          <ReportExportSmokeCard />
        </div>
      </section>

      {overview ? (
        <KpiMethodBlock
          methods={overview.methods.slice(0, 3)}
          title="Methode (KPI cles)"
        />
      ) : null}

      <RolePrimaryActions profile={profile} />
      <ClosedLoopPanel
        impactKpis={impactKpis}
        recommendedHref={adaptiveHref}
        recommendedLabel={adaptiveLabel}
        recommendedReason={adaptiveReason}
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bloc D
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Formulaire benevole
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Declaration rapide d&apos;action directement depuis la page
            d&apos;accueil.
          </p>
        </div>
        <ActionDeclarationForm
          actorNameOptions={actorNameOptions}
          defaultActorName={actorNameOptions[0]}
          clerkIdentityLabel={identity?.displayName ?? fallbackActorName}
          clerkUserId={identity?.userId ?? fallbackActorName}
          initialMode="quick"
        />
      </section>
    </div>
  );
}
