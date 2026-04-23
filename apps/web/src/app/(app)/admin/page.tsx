import { auth } from "@clerk/nextjs/server";
import { BusinessAlertsPanel } from "@/components/dashboard/business-alerts-panel";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";

import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { getProfilePrimaryAction, toProfile } from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function loadAdminOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 30,
    limit: 1800,
  });
}

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Administration"
        description="Cette fonctionnalité nécessite une connexion Clerk."
        lockedPreview={
          <section className="grid gap-3 md:grid-cols-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Supervision
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Alertes et priorités de l'administration.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Modération
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Actions réservées au back-office connecté.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Export
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Les livrables d'administration nécessitent un compte autorisé.
              </p>
            </article>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const locale = await getServerLocale();
  const primaryAction = getProfilePrimaryAction(profile);

  if (role !== "admin") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Admin requis
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-amber-900">
          Administration réservée aux admins
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Demande l&apos;attribution du rôle{" "}
          <span className="font-semibold">admin</span> dans Clerk.
        </p>
      </section>
    );
  }

  const overview = await loadAdminOverview().catch(() => null);

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
          label: "Qualité data",
          value: "n/a",
          previousValue: "n/a",
          deltaAbsolute: "n/a",
          deltaPercent: "n/a",
          interpretation: "neutral",
        },
      ] as const);

  return (
    <div data-rubrique-report-root className="space-y-4">
      <ThirtySecondsSummary
        kpis={kpis}
        alert={overview ? overview.summary.alert : undefined}
        recommendedAction={{
          href: overview?.summary.recommendedAction.href ?? primaryAction.href,
          label:
            overview?.summary.recommendedAction.label ?? primaryAction.label[locale],
        }}
        recommendedReason={overview?.summary.recommendedAction.reason}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Workflow admin guide
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Administration
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Modération, import/export et supervision des opérations critiques avec
          garde-fous explicites.
        </p>
        <div className="mt-4">
          <RubriquePdfExportButton rubriqueTitle="Administration" />
        </div>
      </section>

      <BusinessAlertsPanel />
      <ActionsReportPanel />
      <RolePrimaryActions profile={profile} />
    </div>
  );
}
