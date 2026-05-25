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
import { type NavigationGridItem } from"@/components/ui/navigation-grid";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { isFeatureEnabled } from"@/lib/feature-flags";
import { getActionOperationalContext, type ActionDataContract } from"@/lib/actions/data-contract";
import { loadPilotageOverview } from"@/lib/pilotage/overview";
import {
 getProfilePrimaryAction,
 getProfileSecondaryAction,
 getProfileLabel,
 toProfile,
} from"@/lib/profiles";
import { getServerLocale } from"@/lib/server-preferences";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { ReportsPageV1Layout } from "@/components/reports/page-sections/reports-page-v1-layout";

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
  const role =
    userId && clerkReachable
      ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
      : ("anonymous" as const);
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel =
    userId ? getProfileLabel(profile, locale) : locale === "fr" ? "Visiteur" : "Visitor";
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");

  const [data, utils] = await Promise.all([
    loadReportsData().catch(() => null),
    import("@/lib/pilotage/analytics-data-utils"),
  ]);
  const { aggregateMonthlyAnalytics } = utils;
  
  const overview = data?.overview ?? null;
  const contracts = data?.contracts ?? [];
  const monthlyData = aggregateMonthlyAnalytics(contracts);
  const publicAccessBanner = !userId ? (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 cmm-text-small text-rose-900 shadow-sm">
      Lecture publique: parcourez les rapports et exportez un livrable sans
      compte. La connexion sert aux vues personnalisées et à la modération.
    </section>
  ) : null;
  
  const headerActions = userId
    ? [
        { href: "/profil", label: "Cockpit" },
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

  const navigationItems: NavigationGridItem[] = [
    {
      icon: BarChart3,
      title: "Comparaisons",
      desc: "Comparer 30j / 90j / 12m.",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-400",
      accent: "from-rose-600/20 to-red-900/40",
      ring: "ring-rose-500/30",
      dot: "bg-rose-400",
      href: "#comparisons",
    },
    {
      icon: Info,
      title: "Méthode KPI",
      desc: "Lire la méthode et les sources.",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      accent: "from-red-600/20 to-rose-900/40",
      ring: "ring-red-500/30",
      dot: "bg-red-400",
      href: "#method",
    },
    {
      icon: Layers,
      title: "Vue mensuelle",
      desc: "Consulter les agrégats et les tendances.",
      iconBg: "bg-orange-500/20",
      iconColor: "text-orange-400",
      accent: "from-orange-600/20 to-amber-900/40",
      ring: "ring-orange-500/30",
      dot: "bg-orange-400",
      href: "#cockpit",
    },
    {
      icon: DownloadCloud,
      title: "Exports",
      desc: "Exporter PDF, Excel et synthèse.",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-400",
      accent: "from-rose-600/20 to-red-900/40",
      ring: "ring-rose-500/30",
      dot: "bg-rose-400",
      href: "#exports",
    },
  ];

  if (pageTemplateV2Enabled) {
    return (
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
        monthlyData={monthlyData}
        toReportsExportRow={toReportsExportRow}
        publicAccessBanner={publicAccessBanner}
      />
    );
  }

  return (
    <ReportsPageV1Layout
      locale={locale}
      roleLabel={roleLabel}
      profile={profile}
      primaryAction={primaryAction}
      summaryKpis={summaryKpis}
      headerActions={headerActions}
      overview={overview}
      contracts={contracts}
      toReportsExportRow={toReportsExportRow}
      publicAccessBanner={publicAccessBanner}
    />
  );
}
