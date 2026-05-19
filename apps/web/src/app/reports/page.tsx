import { RolePrimaryActions } from"@/components/navigation/role-primary-actions";
import { KpiMethodBlock } from"@/components/pilotage/kpi-method-block";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Rapports d\'impact - CleanMyMap',
  description: 'Analysez les données de nettoyage participatif, téléchargez des rapports détaillés et visualisez l\'évolution de l\'impact environnemental.',
};

import { ThirtySecondsSummary } from"@/components/pilotage/thirty-seconds-summary";
import { ActionsReportPanel } from"@/components/reports/actions-report-panel";
import { ReportsKpiSummary } from"@/components/reports/reports-kpi-summary";
import { ReportsWindowComparisonsSection } from"@/components/reports/reports-window-comparisons-section";
import { ReportsWebDocument } from"@/components/reports/reports-web-document";
import { DecisionPageHeader } from"@/components/ui/decision-page-header";
import { PageReadingTemplate } from"@/components/ui/page-reading-template";
import { AnimatedImpactMetrics } from "@/components/reports/AnimatedImpactMetrics";
import { RadialProgressGauge } from "@/components/reports/RadialProgressGauge";
import { EcologicalTimeline } from "@/components/reports/EcologicalTimeline";
import { 
 BarChart3, 
 Layers, 
 Info, 
 DownloadCloud 
} from"lucide-react";
import { NavigationGrid, type NavigationGridItem } from"@/components/ui/navigation-grid";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { isFeatureEnabled } from"@/lib/feature-flags";
import { RubriqueExcelExportButton } from"@/components/ui/rubrique-excel-export-button";
import { getActionOperationalContext, type ActionDataContract } from"@/lib/actions/data-contract";
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
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 cmm-text-small text-emerald-900 shadow-sm">
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
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      accent: "from-blue-600/20 to-blue-900/40",
      ring: "ring-blue-500/30",
      dot: "bg-blue-400",
      href: "#comparisons",
    },
    {
      icon: Info,
      title: "Méthode KPI",
      desc: "Lire la méthode et les sources.",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
      accent: "from-emerald-600/20 to-emerald-900/40",
      ring: "ring-emerald-500/30",
      dot: "bg-emerald-400",
      href: "#method",
    },
    {
      icon: Layers,
      title: "Vue mensuelle",
      desc: "Consulter les agrégats et les tendances.",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
      accent: "from-purple-600/20 to-purple-900/40",
      ring: "ring-purple-500/30",
      dot: "bg-purple-400",
      href: "#cockpit",
    },
    {
      icon: DownloadCloud,
      title: "Exports",
      desc: "Exporter PDF, Excel et synthèse.",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      accent: "from-amber-600/20 to-amber-900/40",
      ring: "ring-amber-500/30",
      dot: "bg-amber-400",
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
