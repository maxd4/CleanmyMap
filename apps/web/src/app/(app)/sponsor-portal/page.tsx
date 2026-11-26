import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import { computeImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { getServerLocale } from "@/lib/server-preferences";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import { PublishedDecisionScope, PublishedDecisionZones, PublishedDecisionMethods } from "@/components/pilotage/published-decision-panels";
import { DecisionPageNavigation } from "@/components/pilotage/decision-page-navigation";

const SPONSOR_WINDOW_DAYS = 730;
export const dynamic = "force-dynamic";
type SponsorOverview = Awaited<ReturnType<typeof loadPilotageOverview>>;

function buildSponsorRoute(params?: { tab?: string | string[] }): string {
  const rawTab = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  return rawTab ? `/sponsor-portal?tab=${encodeURIComponent(rawTab)}` : "/sponsor-portal";
}

function SponsorMetrics({ overview, locale }: { overview: SponsorOverview; locale: "fr" | "en" }) {
  const isEn = locale === "en";
  const current = overview.comparison.current;
  const mass = current.wasteKnownActions > 0 ? current.impactVolumeKg : null;
  const co2 = mass === null ? null : Math.round(mass * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg);
  const savings = mass === null ? null : computeImpactTerrain2026StreetCleaningSavings({ wasteKg: mass, durationMinutes: current.totalDurationMinutes });
  const format = (n: number) => n.toLocaleString(isEn ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 });
  const items = isEn
    ? [
        ["Estimated street cleaning value", savings ? `${format(savings.lowerBoundEuros)} to ${format(savings.upperBoundEuros)} €` : "Unavailable", "Methodological range, not an accounting saving."],
        ["Estimated CO₂ avoided", co2 === null ? "Unavailable" : `${format(co2)} kg`, "Proxy calculated from reported mass."],
        ["Declared participations", format(current.mobilizationCount), "Declared sum, not a count of unique people."],
        ["Reported mass", mass === null ? "Not reported" : `${format(mass)} kg`, `${format(current.wasteCoverageRate)}% of actions reported.`],
      ]
    : [
        ["Valorisation de voirie estimée", savings ? `${format(savings.lowerBoundEuros)} à ${format(savings.upperBoundEuros)} €` : "Indisponible", "Fourchette méthodologique, pas une économie comptable."],
        ["CO₂ évité estimé", co2 === null ? "Indisponible" : `${format(co2)} kg`, "Proxy calculé sur la masse renseignée."],
        ["Participations déclarées", format(current.mobilizationCount), "Somme déclarée, pas un nombre de personnes uniques."],
        ["Masse renseignée", mass === null ? "Non renseignée" : `${format(mass)} kg`, `${format(current.wasteCoverageRate)} % des actions renseignées.`],
      ];
  return <section aria-label={isEn ? "Impact summary" : "Bilan d'impact"} className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(([label,value,detail]) => <CmmCard key={label} className="space-y-2"><h2 className="text-sm font-semibold cmm-text-primary">{label}</h2><p className="text-2xl font-bold tabular-nums break-words cmm-text-primary">{value}</p><p className="text-sm cmm-text-primary">{detail}</p></CmmCard>)}</section>;
}
export default async function SponsorPortalPage({ searchParams }: { searchParams?: Promise<{ tab?: string | string[] }> } = {}) {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const params = await searchParams;
  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        authUnavailable={!clerkReachable}
        mode="disabled"
        signInHref={buildSignInRedirectHref(buildSponsorRoute(params))}
      >
        <div />
      </ClerkRequiredGate>
    );
  }
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const tabs = [
    { id: "summary", label: isEn ? "Impact summary" : "Bilan d'impact" },
    { id: "zones", label: isEn ? "Observed zones" : "Zones observées" },
    { id: "methods", label: isEn ? "Methods and reports" : "Méthodes et rapports" },
  ] as const;
  const tab = tabs.find(item => item.id === params?.tab)?.id ?? "summary";
  const accountCompletion = await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null);
  const overview = await loadPilotageOverview({ periodDays: SPONSOR_WINDOW_DAYS, limit: 5000, publishedCompletedOnly: true }).catch(() => null);
  const actionsUnavailable = !overview || Boolean(overview.dataAvailability?.sourceHealth?.failedSources.includes("actions"));
  return <AccountCompletionGate state={accountCompletion}><CmmPageLayout>
    <PageHeader title={isEn ? "Decision portal" : "Portail décideur"} subtitle={isEn ? "Consolidated impact of completed public actions." : "Impact consolidé des actions publiques terminées."} action={<CmmButton href="/reports" tone="primary">{isEn ? "Reports and exports" : "Rapports et exports"}</CmmButton>} />
    <DecisionPageNavigation route="/sponsor-portal" activeTab={tab} tabs={tabs} locale={locale} />
    {actionsUnavailable ? <CmmCard className="space-y-3"><p role="status" className="text-sm cmm-text-secondary">{isEn ? "Impact data temporarily unavailable." : "Données d’impact momentanément indisponibles."}</p><SystemStateRetryButton label={isEn ? "Retry" : "Réessayer"} /></CmmCard> : <PublishedDecisionScope overview={overview} locale={locale} />}
    {tab === "summary" && !actionsUnavailable && <SponsorMetrics overview={overview} locale={locale} />}
    {tab === "zones" && !actionsUnavailable && <PublishedDecisionZones zones={overview.zones.slice(0,3)} locale={locale} />}
    {tab === "methods" && <><CmmCard className="space-y-2"><h2 className="font-bold cmm-text-primary">{isEn ? "Valuation and emissions" : "Valorisation et émissions"}</h2><p className="text-sm cmm-text-secondary">{isEn ? "Valuation combines two estimates, by mass and by duration. It is neither an accounting saving nor a certification. CO₂ is a proxy." : "La valorisation croise deux estimations, par masse et par durée. Elle ne constitue ni une économie comptable ni une certification. Le CO₂ est un proxy."}</p></CmmCard><PublishedDecisionMethods methods={overview?.methods ?? []} locale={locale} /></>}
    <div className="flex flex-wrap gap-2"><CmmButton href="/pilotage" tone="secondary">{isEn ? "Steering" : "Pilotage"}</CmmButton><CmmButton href="/sections/elus" tone="secondary">{isEn ? "Governance" : "Gouvernance"}</CmmButton></div>
  </CmmPageLayout></AccountCompletionGate>;
}
