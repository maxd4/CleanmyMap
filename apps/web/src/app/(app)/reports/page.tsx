import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Rapports d\'impact - CleanMyMap',
  description: 'Analysez les données de nettoyage participatif, téléchargez des rapports détaillés et visualisez l\'évolution de l\'impact environnemental.',
};

import { 
 BarChart3, 
 Layers, 
 Info, 
 DownloadCloud 
} from"lucide-react";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { type NavigationGridItem } from"@/components/ui/navigation-grid";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { isFeatureEnabled } from"@/lib/feature-flags";
import { getActionOperationalContext, toActionListItem, type ActionDataContract } from"@/lib/actions/data-contract";
import { fetchCommunityEvents } from "@/lib/community/http";
import { loadPilotageOverview } from"@/lib/pilotage/overview";
import {
 getProfilePrimaryAction,
 getProfileSecondaryAction,
 getProfileLabel,
  isAdminLikeProfile,
  toProfile,
} from"@/lib/profiles";
import { getServerLocale } from"@/lib/server-preferences";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { ReportsPageV1Layout } from "@/components/reports/page-sections/reports-page-v1-layout";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { listAdminOperationAudit } from "@/lib/admin/operation-audit";

type ReportsSummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute: string;
  deltaPercent: string;
  interpretation: "positive" | "negative" | "neutral";
};

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

async function loadReportsData(showAdminWorkflow: boolean) {
  const supabase = getSupabaseServerClient();
  const { fetchUnifiedActionContracts } = await import("@/lib/actions/unified-source");

  const [overview, contractsResult, communityEvents, weather, adminWorkflowPreview, adminWorkflowAudit] = await Promise.all([
    loadPilotageOverview({
      supabase,
      periodDays: 90,
      limit: 2200,
    }),
    fetchUnifiedActionContracts(supabase, {
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: null,
    }),
    fetchCommunityEvents({ limit: 240 }).then((result) => result.items).catch(() => []),
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
      { cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<{
          current?: {
            temperature_2m?: number;
            precipitation?: number;
            wind_speed_10m?: number;
          };
        }>;
      })
      .catch(() => null),
    showAdminWorkflow
      ? fetchUnifiedActionContracts(supabase, {
          limit: 250,
          status: null,
          floorDate: buildDateFloor(90),
          requireCoordinates: false,
          types: null,
        })
          .then((result) => ({
            status: "ok" as const,
            count: result.items.length,
            items: result.items.map((contract) => toActionListItem(contract)),
          }))
          .catch(() => null)
      : Promise.resolve(null),
    showAdminWorkflow
      ? listAdminOperationAudit(25)
          .then((items) => items.slice(0, 25).map((entry) => ({
            operationId: entry.operationId,
            at: entry.at,
            actorUserId: entry.actorUserId,
            operationType: entry.operationType,
            outcome: entry.outcome,
            targetId: entry.targetId,
            details: entry.details,
          })))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    overview,
    contracts: contractsResult.items,
    communityEvents,
    weather,
    adminWorkflowPreview,
    adminWorkflowAudit,
  };
}

function toReportsExportRow(contract: ActionDataContract) {
  const operational = getActionOperationalContext(contract);
  return {
    Date: contract.dates.observedAt,
    Lieu: contract.location.label,
    Masse_Kg: contract.metadata.wasteKg || 0,
    Megots: contract.metadata.cigaretteButts || 0,
    Bénévoles: operational.volunteersCount,
    Durée_Min: operational.durationMinutes,
    Charge_Terrain_Min: operational.engagementMinutes,
    Type_Lieu: operational.placeTypeLabel,
    Trajet: operational.routeStyleLabel,
    Ajustement_Trajet: operational.routeAdjustmentMessage ?? "",
    Type: contract.type,
    Source: contract.source,
  };
}

export default async function ReportsPage() {
  const [{ userId, clerkReachable }, locale] = await Promise.all([
    getSafeAuthSession(),
    getServerLocale(),
  ]);
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;
  const role =
    userId && clerkReachable
      ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
      : ("anonymous" as const);
  const profile = toProfile(role);
  const isAdmin = isAdminLikeProfile(profile);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel =
    userId ? getProfileLabel(profile, locale) : locale === "fr" ? "Visiteur" : "Visitor";
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");

  const [data, utils] = await Promise.all([
    loadReportsData(isAdmin).catch(() => null),
    import("@/lib/pilotage/analytics-data-utils"),
  ]);
  const { aggregateMonthlyAnalytics } = utils;
  
  const overview = data?.overview ?? null;
  const contracts = data?.contracts ?? [];
  const communityEvents = data?.communityEvents ?? [];
  const weather = data?.weather ?? null;
  const adminWorkflowPreview = data?.adminWorkflowPreview ?? null;
  const adminWorkflowAudit = data?.adminWorkflowAudit ?? null;
  const monthlyData = aggregateMonthlyAnalytics(contracts);
  const publicAccessBanner = !userId ? (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 cmm-text-small text-red-900 shadow-sm">
      Lecture publique: parcourez les rapports et exportez un livrable sans
      compte. La connexion sert aux vues personnalisées et à la modération.
    </section>
  ) : null;
  
  const headerActions = userId
    ? [
        { href: PROFIL_ROUTE, label: "Cockpit" },
        { href: "/learn/hub", label: "Apprendre" },
      ]
    : [
        { href: "/learn/hub", label: "Apprendre" },
        { href: "/sign-in", label: "Se connecter" },
      ];

  const summaryKpis: [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi] = overview
    ? [
        {
          label: overview.summary.kpis[0].label,
          value: overview.summary.kpis[0].value,
          previousValue: overview.summary.kpis[0].previousValue,
          deltaAbsolute: overview.summary.kpis[0].deltaAbsolute ?? "",
          deltaPercent: overview.summary.kpis[0].deltaPercent ?? "",
          interpretation: overview.summary.kpis[0].interpretation ?? "neutral",
        },
        {
          label: overview.summary.kpis[1].label,
          value: overview.summary.kpis[1].value,
          previousValue: overview.summary.kpis[1].previousValue,
          deltaAbsolute: overview.summary.kpis[1].deltaAbsolute ?? "",
          deltaPercent: overview.summary.kpis[1].deltaPercent ?? "",
          interpretation: overview.summary.kpis[1].interpretation ?? "neutral",
        },
        {
          label: overview.summary.kpis[2].label,
          value: overview.summary.kpis[2].value,
          previousValue: overview.summary.kpis[2].previousValue,
          deltaAbsolute: overview.summary.kpis[2].deltaAbsolute ?? "",
          deltaPercent: overview.summary.kpis[2].deltaPercent ?? "",
          interpretation: overview.summary.kpis[2].interpretation ?? "neutral",
        },
      ]
    : [
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
      ];

  const navigationItems: NavigationGridItem[] = [
    {
      icon: BarChart3,
      title: "Comparaisons",
      desc: "Comparer 30j / 90j / 12m.",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      accent: "from-red-600/20 to-red-950/40",
      ring: "ring-red-500/30",
      dot: "bg-red-400",
      href: "#comparisons",
    },
    {
      icon: Info,
      title: "Méthode KPI",
      desc: "Lire la méthode et les sources.",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-400",
      accent: "from-cyan-600/20 to-sky-900/40",
      ring: "ring-cyan-500/30",
      dot: "bg-cyan-400",
      href: "#method",
    },
    {
      icon: Layers,
      title: "Vue mensuelle",
      desc: "Consulter les agrégats et les tendances.",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      accent: "from-red-600/20 to-cyan-900/40",
      ring: "ring-red-500/30",
      dot: "bg-red-400",
      href: "#cockpit",
    },
    {
      icon: DownloadCloud,
      title: "Exports",
      desc: "Exporter PDF, Excel et synthèse.",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-400",
      accent: "from-cyan-600/20 to-red-900/40",
      ring: "ring-cyan-500/30",
      dot: "bg-cyan-400",
      href: "#exports",
    },
  ];

  if (pageTemplateV2Enabled) {
    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          locale={locale}
          roleLabel={roleLabel}
          profile={profile}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          summaryKpis={summaryKpis}
          navigationItems={navigationItems}
          overview={overview}
          contracts={contracts}
          communityEvents={communityEvents}
          weather={weather}
          adminWorkflowPreview={adminWorkflowPreview}
          adminWorkflowAudit={adminWorkflowAudit}
          monthlyData={monthlyData}
          toReportsExportRow={toReportsExportRow}
          publicAccessBanner={publicAccessBanner}
        />
      </AccountCompletionGate>
    );
  }

  return (
    <AccountCompletionGate state={accountCompletion}>
      <ReportsPageV1Layout
        locale={locale}
        roleLabel={roleLabel}
        profile={profile}
        primaryAction={primaryAction}
        summaryKpis={summaryKpis}
        headerActions={headerActions}
        overview={overview}
        contracts={contracts}
        communityEvents={communityEvents}
        weather={weather}
        adminWorkflowPreview={adminWorkflowPreview}
        adminWorkflowAudit={adminWorkflowAudit}
        publicAccessBanner={publicAccessBanner}
      />
    </AccountCompletionGate>
  );
}
