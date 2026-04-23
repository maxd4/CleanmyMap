import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BusinessAlertsPanel } from "@/components/dashboard/business-alerts-panel";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";

import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { listAdminOperationAudit } from "@/lib/admin/operation-audit";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { listPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";
import { listPublishedPartnerAnnuaireEntries } from "@/lib/partners/published-annuaire-entries-store";
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
  const onboardingRequests = await listPartnerOnboardingRequests(500).catch(() => []);
  const publishedEntries = await listPublishedPartnerAnnuaireEntries().catch(() => []);
  const adminAudit = await listAdminOperationAudit(25).catch(() => []);

  const onboardingStatus = {
    pending: onboardingRequests.filter((item) => item.status === "pending_admin_review")
      .length,
    accepted: onboardingRequests.filter((item) => item.status === "accepted").length,
    rejected: onboardingRequests.filter((item) => item.status === "rejected").length,
  };

  const publicationStatus = {
    pending: publishedEntries.filter(
      (item) => item.publicationStatus === "pending_admin_review",
    ).length,
    accepted: publishedEntries.filter((item) => item.publicationStatus === "accepted")
      .length,
    rejected: publishedEntries.filter((item) => item.publicationStatus === "rejected")
      .length,
  };

  const moderationAudit = {
    success: adminAudit.filter((item) => item.outcome === "success").length,
    error: adminAudit.filter((item) => item.outcome === "error").length,
  };

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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Administration
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Modération, import/export et supervision des opérations critiques avec
              garde-fous explicites.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <RubriquePdfExportButton rubriqueTitle="Administration" />
            <Link
              href="/admin/services"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Supervision des services
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Vues gouvernance
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          Etats metier relies au pilotage
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Les compteurs ci-dessous reprennent les cycles de decision actifs:
          onboarding partenaire, revue de publication et execution des operations
          admin.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Onboarding partenaires
            </p>
            <p className="mt-2 text-xs text-slate-600">Etat: pending / accepted / rejected</p>
            <p className="mt-3 text-xs text-slate-700">
              pending: <span className="font-semibold">{onboardingStatus.pending}</span>
            </p>
            <p className="text-xs text-slate-700">
              accepted: <span className="font-semibold">{onboardingStatus.accepted}</span>
            </p>
            <p className="text-xs text-slate-700">
              rejected: <span className="font-semibold">{onboardingStatus.rejected}</span>
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Publication annuaire
            </p>
            <p className="mt-2 text-xs text-slate-600">Etat: pending / accepted / rejected</p>
            <p className="mt-3 text-xs text-slate-700">
              pending: <span className="font-semibold">{publicationStatus.pending}</span>
            </p>
            <p className="text-xs text-slate-700">
              accepted: <span className="font-semibold">{publicationStatus.accepted}</span>
            </p>
            <p className="text-xs text-slate-700">
              rejected: <span className="font-semibold">{publicationStatus.rejected}</span>
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Journal operations admin (25)
            </p>
            <p className="mt-2 text-xs text-slate-600">Etat: success / error</p>
            <p className="mt-3 text-xs text-slate-700">
              success: <span className="font-semibold">{moderationAudit.success}</span>
            </p>
            <p className="text-xs text-slate-700">
              error: <span className="font-semibold">{moderationAudit.error}</span>
            </p>
          </article>
        </div>
      </section>

      <BusinessAlertsPanel />
      <ActionsReportPanel />
      <RolePrimaryActions profile={profile} />
    </div>
  );
}
