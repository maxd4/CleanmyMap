import type { Metadata } from "next";
import {
  BarChart3,
  DownloadCloud,
  Info,
  Layers,
} from "lucide-react";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { AnimatedImpactMetrics } from "@/components/reports/AnimatedImpactMetrics";
import { computeReportModel } from "@/components/reports/web-document/analytics";
import { DeferredReportsWebDocument } from "@/components/reports/deferred-reports-web-document";
import { ReportsPageV2Layout } from "@/components/reports/page-sections/reports-page-v2-layout";
import { AnalyticsCockpit } from "@/components/reports/analytics-cockpit";
import { ReportsImpactReadingsSection } from "@/components/reports/reports-impact-readings-section";
import { NavigationGrid, type NavigationGridItem } from "@/components/ui/navigation-grid";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { RubriqueExcelExportButton } from "@/components/ui/rubrique-excel-export-button";
import { CTAGroup, SectionHeader } from "@/components/ui/page-structure";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getActionOperationalContext, toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { loadCachedReportCommunityEvents } from "@/lib/community/report-events";
import { aggregateMonthlyAnalytics } from "@/lib/pilotage/analytics-data-utils";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getProfileSecondaryAction,
  isAdminLikeProfile,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import type { Locale } from "@/lib/ui/preferences";
import type { ProfileAction } from "@/lib/profiles";
import type { MethodDefinition } from "@/lib/pilotage/overview";
import type { ReportModel } from "@/components/reports/web-document/types";

type ReportsSummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute: string;
  deltaPercent: string;
  interpretation: "positive" | "negative" | "neutral";
};

type ReportsPageTabId = "generation" | "pilotage";

type ReportsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

type ReportsPilotageContentParams = {
  locale: Locale;
  roleLabel: string;
  primaryAction: ProfileAction;
  secondaryAction?: ProfileAction | null;
  summaryKpis: readonly [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
  navigationItems: NavigationGridItem[];
  overview: { methods: MethodDefinition[] } | null;
  report: ReportModel;
  monthlyData: ReturnType<typeof aggregateMonthlyAnalytics>;
  canAccessExports: boolean;
  exportRows: Record<string, unknown>[] | null;
};

function resolveReportsTab(
  requestedTab: string | undefined,
  canAccessDetailedReports: boolean,
): ReportsPageTabId {
  if (requestedTab === "generation" || requestedTab === "pilotage") {
    return requestedTab;
  }

  return canAccessDetailedReports ? "generation" : "pilotage";
}

function buildReportsPilotageContent({
  locale,
  roleLabel,
  primaryAction,
  secondaryAction,
  summaryKpis,
  navigationItems,
  overview,
  report,
  monthlyData,
  canAccessExports,
  exportRows,
}: ReportsPilotageContentParams) {
  return (
    <div className="space-y-8">
      <PageReadingTemplate
        context={`Profil ${roleLabel}`}
        title="Rapports d'impact"
        objective="Comparer les fenêtres utiles, lire la méthode KPI et exporter les livrables."
        summary={
          <div className="space-y-10">
            <AnimatedImpactMetrics kpis={summaryKpis} />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <section className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                  Réduction Déchets
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">78%</p>
                <p className="mt-1 text-sm text-slate-500">Objectif Q2 2026</p>
              </section>
              <section className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                  Mobilisation
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">45%</p>
                <p className="mt-1 text-sm text-slate-500">Nouveaux bénévoles</p>
              </section>
              <section className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                  Qualité Data
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">92%</p>
                <p className="mt-1 text-sm text-slate-500">Précision GPS</p>
              </section>
              <section className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">
                  Impact CO2
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">65%</p>
                <p className="mt-1 text-sm text-slate-500">Émissions évitées</p>
              </section>
            </div>

            <NavigationGrid
              items={navigationItems}
              columns={{ default: 1, sm: 2, md: 4, xl: 4 }}
            />
          </div>
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
        analysis={<ReportsImpactReadingsSection report={report} />}
      />

      <div className="space-y-8">
        {overview ? (
          <section
            id="method"
            className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md"
          >
            <SectionHeader
              eyebrow="Méthode KPI"
              title="Lire la méthode KPI"
              subtitle="L&apos;explication détaillée reste disponible plus bas."
              titleSize="sm"
              eyebrowClassName="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted"
              subtitleClassName="cmm-text-small cmm-text-secondary mt-1"
            />
            <KpiMethodBlock methods={overview.methods} title="Méthode" />
          </section>
        ) : null}

        <section
          id="cockpit"
          className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md"
        >
          <SectionHeader
            eyebrow="Analyse mensuelle"
            title="Vue mensuelle"
            subtitle="Les comparatifs, les agrégats et les exports restent plus bas."
            titleSize="sm"
            eyebrowClassName="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted"
            subtitleClassName="cmm-text-small cmm-text-secondary mt-1"
          />
          <AnalyticsCockpit data={monthlyData} />
        </section>

        <section
          id="exports"
          className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md"
        >
          <SectionHeader
            eyebrow="Exports"
            title="Livrables"
            subtitle="Les exports sont regroupés plus bas pour alléger l&apos;ouverture."
            titleSize="sm"
            eyebrowClassName="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted"
            subtitleClassName="cmm-text-small cmm-text-secondary mt-1"
          />
          {canAccessExports ? (
            <CTAGroup>
              <RubriqueExcelExportButton
                rubriqueTitle="Reporting et pilotage"
                data={exportRows ?? undefined}
              />
            </CTAGroup>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                Export réservé
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Les exports détaillés sont réservés aux profils administratifs pour éviter les
                téléchargements répétés et les réponses trop lourdes.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

async function loadPilotageData() {
  const [overview, communityEvents] = await Promise.all([
    loadPilotageOverview({
      periodDays: 90,
      limit: 2200,
    }),
    loadCachedReportCommunityEvents(120).catch(() => []),
  ]);

  const actionListItems = overview.contracts.map((contract) => toActionListItem(contract));
  const actionMapItems = overview.contracts.map((contract) => toActionMapItem(contract));

  return {
    overview,
    communityEvents,
    report: computeReportModel({
      allItems: actionListItems,
      approvedItems: actionListItems,
      mapItems: actionMapItems,
      events: communityEvents,
    }),
    monthlyData: aggregateMonthlyAnalytics(overview.contracts),
  };
}

async function loadGenerationData() {
  const [contractsResult, weather] = await Promise.all([
    import("@/lib/actions/unified-source-cache").then(({ fetchCachedUnifiedActionContracts }) =>
      fetchCachedUnifiedActionContracts({
        limit: 1000,
        status: "approved",
        floorDate: null,
        requireCoordinates: false,
        types: null,
      }),
    ),
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
      { next: { revalidate: 900 } },
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
  ]);

  return {
    contracts: contractsResult.items,
    weather,
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

function buildSummaryKpis(
  overview: Awaited<ReturnType<typeof loadPilotageOverview>> | null,
): [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi] {
  if (!overview) {
    return [
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
  }

  return overview.summary.kpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    previousValue: kpi.previousValue,
    deltaAbsolute: kpi.deltaAbsolute ?? "",
    deltaPercent: kpi.deltaPercent ?? "",
    interpretation: kpi.interpretation ?? "neutral",
  })) as [ReportsSummaryKpi, ReportsSummaryKpi, ReportsSummaryKpi];
}

export const metadata: Metadata = {
  title: "Rapports d'impact - CleanMyMap",
  description:
    "Analysez les données de nettoyage participatif, téléchargez des rapports détaillés et visualisez l'évolution de l'impact environnemental.",
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [{ userId, clerkReachable }, locale] = await Promise.all([
    getSafeAuthSession(),
    getServerLocale(),
  ]);
  const resolvedSearchParams = await searchParams;
  const accountCompletion = userId
    ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
    : null;
  const role =
    userId && clerkReachable
      ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
      : ("anonymous" as const);
  const profile = toProfile(role);
  const canAccessReportsPage = Boolean(userId);
  const canAccessDetailedReports = isAdminLikeProfile(profile);
  const activeTab = resolveReportsTab(resolvedSearchParams.tab, canAccessDetailedReports);
  const primaryAction = getProfilePrimaryAction(profile);
  const secondaryAction = getProfileSecondaryAction(profile);
  const roleLabel =
    userId ? getProfileLabel(profile, locale) : locale === "fr" ? "Visiteur" : "Visitor";

  if (!canAccessReportsPage) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        lockedPreview={
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700">
              Niveau connecté requis
            </p>
            <p className="mt-3 text-sm leading-6 text-red-900">
              Les rapports détaillés sont réservés aux comptes connectés pour éviter de charger
              des données lourdes côté visiteur.
            </p>
          </section>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  if (activeTab === "generation") {
    if (canAccessDetailedReports) {
      const [generationData, communityEvents] = await Promise.all([
        loadGenerationData().catch(() => null),
        loadCachedReportCommunityEvents(120).catch(() => []),
      ]);

      const generationContent = generationData ? (
        <DeferredReportsWebDocument
          contracts={generationData.contracts}
          communityEvents={communityEvents}
          weather={generationData.weather}
          overviewGeneratedAt={null}
        />
      ) : (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
            Génération indisponible
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Le document détaillé n&apos;a pas pu être chargé
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Réessayez dans un instant. Le chargement serveur des contrats ou de la météo a
            échoué.
          </p>
        </section>
      );

      return (
        <AccountCompletionGate state={accountCompletion}>
          <ReportsPageV2Layout activeTab={activeTab} generationContent={generationContent} />
        </AccountCompletionGate>
      );
    }

    return (
      <AccountCompletionGate state={accountCompletion}>
        <ReportsPageV2Layout
          activeTab={activeTab}
          generationContent={
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">
                Génération réservée
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Aperçu détaillé verrouillé
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Le document complet, les exports et les vues de génération restent réservés aux
                profils administratifs.
              </p>
            </section>
          }
        />
      </AccountCompletionGate>
    );
  }

  const pilotageData = await loadPilotageData().catch(() => null);
  const overview = pilotageData?.overview ?? null;
  const report = pilotageData?.report ?? computeReportModel({
    allItems: [],
    approvedItems: [],
    mapItems: [],
    events: [],
  });
  const monthlyData = pilotageData?.monthlyData ?? [];
  const summaryKpis = buildSummaryKpis(overview);
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

  const pilotageContent = buildReportsPilotageContent({
    locale,
    roleLabel,
    primaryAction,
    secondaryAction,
    summaryKpis,
    navigationItems,
    overview,
    report,
    monthlyData,
    canAccessExports: canAccessDetailedReports,
    exportRows: overview ? overview.contracts.map(toReportsExportRow) : null,
  });

  return (
    <AccountCompletionGate state={accountCompletion}>
      <ReportsPageV2Layout activeTab={activeTab} pilotageContent={pilotageContent} />
    </AccountCompletionGate>
  );
}
