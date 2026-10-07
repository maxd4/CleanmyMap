"use client";

import { Beaker, MapPin, Scaling, Sparkles } from "lucide-react";
import { buildActionImpactMethodology } from "@/lib/actions/impact-calculators";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { AppProfile } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PageHeader } from "@/components/ui/page-header";
import type {
  EnvironmentalImpactElectricityEstimate,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
  EnvironmentalImpactWaterEstimate,
} from "@/lib/environmental-impact-estimator/types";
import { buildWaterEstimate } from "@/lib/environmental-impact-estimator/services/water";
import { buildElectricityEstimate } from "@/lib/environmental-impact-estimator/services/electricity";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import type { PublicLandingActionAggregation } from "@/lib/accueil/action-participant-aggregation";
import {
  ActionMapMethodologySection as ActionMapMethodologySectionImpl,
  type OpenSourceDoc,
} from "./action-map-methodology-section";
import {
  MethodologieNavigationSections,
  MethodologieReportSections,
  MethodologieTransverseSections,
} from "./methodologie-page-content-sections";

export type MethodologiePageClientProps = {
  currentProfile?: AppProfile;
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactTotals: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  impactSnapshots: EnvironmentalImpactSnapshotRecord[];
  impactGeneratedAt: string | null;
  impactLaunchedAt: string | null;
  githubStats: GitHubRepositoryStats | null;
  impactTerrainResults?: PublicLandingActionAggregation | null;
  impactElectricity?: EnvironmentalImpactElectricityEstimate | null;
  impactWater?: EnvironmentalImpactWaterEstimate | null;
};

type LegacyMethodologieContentProps = MethodologiePageClientProps & {
  contentOnly?: boolean;
  includeMapAndRouteContent?: boolean;
  includeReportsContent?: boolean;
  includeTransverseContent?: boolean;
};

const IMPACT_DOC: OpenSourceDoc = {
  id: "impact",
  title: { fr: "Calcul des indicateurs d’impact", en: "Impact indicator calculations" },
  desc: { fr: "Formules runtime, distinction entre valeurs déclarées et estimées, sources configurées et limites des proxys utilisés.", en: "Runtime formulas, the distinction between declared and estimated values, configured sources, and the limits of the proxies used." },
  href: "/docs/plans/rapport_impact/impact_IA.md",
  icon: <Scaling className="h-6 w-6" />,
  isPdf: false,
};

const QUOTA_SERVICES_DOC: OpenSourceDoc = {
  id: "quota-free-services",
  title: { fr: "Impact numérique des services suivis", en: "Digital impact of tracked services" },
  desc: { fr: "Services d’infrastructure suivis, limites de plan et estimation d’impact associée.", en: "Tracked infrastructure services, plan limits, and the associated impact estimate." },
  href: "/docs/plans/journal_impact_DU.md",
  icon: <Sparkles className="h-6 w-6" />,
  isPdf: false,
  secondaryAction: { href: "#impact-services", label: { fr: "Voir le bloc", en: "View block" } },
};

const ACTION_MAP_DOC: OpenSourceDoc = {
  id: "action-map-methodology",
  title: { fr: "Méthodologie de la carte d’actions", en: "Action map methodology" },
  desc: { fr: "Distinction entre mémoire des actions, pollution constatée, pollution projetée et signalements Trash Spotter observés.", en: "Distinction between action history, observed pollution, projected pollution, and observed Trash Spotter reports." },
  href: "/docs/product/methodologie-carte-actions.md",
  icon: <MapPin className="h-6 w-6" />,
  isPdf: false,
  secondaryAction: { href: "#methodologie-carte-actions", label: { fr: "Voir la section sur cette page", en: "View this page section" } },
};

export function ActionMapMethodologySection({ isFrench }: { isFrench: boolean }) {
  return <ActionMapMethodologySectionImpl isFrench={isFrench} actionMapDoc={ACTION_MAP_DOC} />;
}

export function LegacyMethodologieContent({
  contentOnly = false,
  includeMapAndRouteContent = true,
  includeReportsContent = true,
  includeTransverseContent = true,
  freePlanServices,
  impactTotals,
  impactSnapshots,
  impactGeneratedAt,
  impactLaunchedAt,
  githubStats,
  impactTerrainResults = null,
  impactElectricity,
  impactWater,
}: LegacyMethodologieContentProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const methodology = buildActionImpactMethodology();
  const { sources, version } = methodology;
  const { t } = useTranslation("methodologie");
  const electricity = impactElectricity ?? buildElectricityEstimate({ monthlyElectricityKwh: null }, null);
  const water = impactWater ?? buildWaterEstimate({ monthlyElectricityKwh: null, monthlyDirectWaterConsumptionLiters: null, monthlyEvaporatedWaterLiters: null });

  return (
    <div className={cn(contentOnly ? "space-y-10" : "relative left-1/2 w-screen -translate-x-1/2 isolate overflow-x-clip bg-[linear-gradient(180deg,rgba(255,244,246,0.98)_0%,rgba(255,251,252,0.92)_28%,rgba(15,23,42,1)_100%)] pb-20 pt-6")}>
      {!contentOnly ? <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.26)_0%,rgba(251,113,133,0.12)_24%,rgba(255,255,255,0.88)_52%,rgba(15,23,42,0.98)_100%)]" /> : null}
      <div className={cn("flex flex-col space-y-10", !contentOnly && "cmm-page-width px-4 pt-2 sm:px-6 lg:px-8")}>
        {!contentOnly ? <PageHeader align="center" tone="red" title={<span className="inline-flex items-center gap-3"><Beaker size={24} aria-hidden="true" /><span>{t("header_title")}</span></span>} subtitle={t("header_desc")} /> : null}

        <MethodologieNavigationSections
          actionMapSection={<ActionMapMethodologySection isFrench={isFrench} />}
          includeMapAndRouteContent={includeMapAndRouteContent}
          includeReportsContent={includeReportsContent}
          impactTerrainResults={impactTerrainResults}
          isFrench={isFrench}
        />
        <MethodologieTransverseSections
          freePlanServices={freePlanServices}
          githubStats={githubStats}
          impactTotals={impactTotals}
          includeTransverseContent={includeTransverseContent}
          isFrench={isFrench}
          locale={locale}
          methodology={methodology}
          quotaServicesDoc={QUOTA_SERVICES_DOC}
        />
        <MethodologieReportSections
          electricity={electricity}
          freePlanServices={freePlanServices}
          githubStats={githubStats}
          impactDoc={IMPACT_DOC}
          impactGeneratedAt={impactGeneratedAt}
          impactLaunchedAt={impactLaunchedAt}
          impactSnapshots={impactSnapshots}
          impactTotals={impactTotals}
          includeReportsContent={includeReportsContent}
          isFrench={isFrench}
          methodology={methodology}
          sources={sources}
          t={t}
          water={water}
        />

        <footer className="flex flex-col items-center justify-between gap-10 border-t border-rose-100 pt-10 sm:flex-row">
          <div className="space-y-3 text-center sm:text-left">
            <p className="cmm-text-caption font-black uppercase tracking-[0.4em] text-rose-700">CleanMyMap Engine v{version}</p>
            <p className="max-w-md text-xs font-bold leading-relaxed text-rose-800">Les formules, sources et limites sont documentées dans les références associées à cette page.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
