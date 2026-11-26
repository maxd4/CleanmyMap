import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import { computeImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { PublishedDecisionScope, PublishedDecisionZones, PublishedDecisionMethods } from "@/components/pilotage/published-decision-panels";
import { DecisionPageNavigation } from "@/components/pilotage/decision-page-navigation";

const SPONSOR_WINDOW_DAYS = 730;
const TABS = [{ id: "summary", label: "Bilan d'impact" }, { id: "zones", label: "Zones observées" }, { id: "methods", label: "Méthodes et rapports" }] as const;
export const dynamic = "force-dynamic";
type SponsorOverview = Awaited<ReturnType<typeof loadPilotageOverview>>;

function SponsorMetrics({ overview }: { overview: SponsorOverview }) {
  const current = overview.comparison.current;
  const mass = current.wasteKnownActions > 0 ? current.impactVolumeKg : null;
  const co2 = mass === null ? null : Math.round(mass * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg);
  const savings = mass === null ? null : computeImpactTerrain2026StreetCleaningSavings({ wasteKg: mass, durationMinutes: current.totalDurationMinutes });
  const format = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const items = [
    ["Valorisation de voirie estimée", savings ? `${format(savings.lowerBoundEuros)} à ${format(savings.upperBoundEuros)} €` : "Indisponible", "Fourchette méthodologique, pas une économie comptable."],
    ["CO₂ évité estimé", co2 === null ? "Indisponible" : `${format(co2)} kg`, "Proxy calculé sur la masse renseignée."],
    ["Participations déclarées", format(current.mobilizationCount), "Somme déclarée, pas un nombre de personnes uniques."],
    ["Masse renseignée", mass === null ? "Non renseignée" : `${format(mass)} kg`, `${format(current.wasteCoverageRate)} % des actions renseignées.`],
  ];
  return <section aria-label="Bilan d'impact" className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(([label,value,detail]) => <CmmCard key={label} className="space-y-2"><h2 className="text-sm font-semibold cmm-text-primary">{label}</h2><p className="text-2xl font-bold tabular-nums break-words cmm-text-primary">{value}</p><p className="text-sm cmm-text-primary">{detail}</p></CmmCard>)}</section>;
}
export default async function SponsorPortalPage({ searchParams }: { searchParams?: Promise<{ tab?: string | string[] }> } = {}) {
  const { userId, clerkReachable } = await getSafeAuthSession();
  if (!userId) return <ClerkRequiredGate isAuthenticated={false} mode="disabled"><div /></ClerkRequiredGate>;
  const params = await searchParams;
  const tab = TABS.find(item => item.id === params?.tab)?.id ?? "summary";
  const accountCompletion = await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null);
  const overview = await loadPilotageOverview({ periodDays: SPONSOR_WINDOW_DAYS, limit: 5000, publishedCompletedOnly: true }).catch(() => null);
  return <AccountCompletionGate state={accountCompletion}><CmmPageLayout>
    <PageHeader title="Portail décideur" subtitle="Impact consolidé des actions publiques terminées." action={<CmmButton href="/reports" tone="primary">Rapports et exports</CmmButton>} />
    <DecisionPageNavigation route="/sponsor-portal" activeTab={tab} tabs={TABS} />
    {overview ? <PublishedDecisionScope overview={overview} /> : <CmmCard><p role="status" className="cmm-text-secondary">Données d’impact momentanément indisponibles.</p></CmmCard>}
    {tab === "summary" && overview && <SponsorMetrics overview={overview} />}
    {tab === "zones" && overview && <PublishedDecisionZones zones={overview.zones.slice(0,3)} />}
    {tab === "methods" && <><CmmCard className="space-y-2"><h2 className="font-bold cmm-text-primary">Valorisation et émissions</h2><p className="cmm-text-secondary">La valorisation croise deux estimations, par masse et par durée. Elle ne constitue ni une économie comptable ni une certification. Le CO₂ est un proxy.</p></CmmCard><PublishedDecisionMethods methods={overview?.methods ?? []} /></>}
    <div className="flex flex-wrap gap-2"><CmmButton href="/pilotage" tone="secondary">Pilotage</CmmButton><CmmButton href="/sections/elus" tone="secondary">Gouvernance</CmmButton></div>
  </CmmPageLayout></AccountCompletionGate>;
}
