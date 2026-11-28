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
import { EnterpriseOrganizationWorkspace } from "@/components/pilotage/enterprise-organization-workspace";
import { EnterpriseActionLinks } from "@/components/pilotage/enterprise-action-links";
import { getCurrentUserActiveRole } from "@/lib/authz";
import { listOrganizations } from "@/lib/organizations/service";

const SPONSOR_WINDOW_DAYS = 730;
// Justification: Portail protege par session Clerk et lecture serveur dynamique des donnees sponsor/decideur.
export const dynamic = "force-dynamic";
type SponsorOverview = Awaited<ReturnType<typeof loadPilotageOverview>>;

function buildSponsorRoute(params?: { tab?: string | string[] }): string {
  const rawTab = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  return rawTab ? `/sponsor-portal?tab=${encodeURIComponent(rawTab)}` : "/sponsor-portal";
}

function SponsorMetrics({ overview, locale }: { overview: SponsorOverview; locale: "fr" | "en" }) {
  const isEn = locale === "en";
  const current = overview.comparison.current;
  const totalActions = current.approvedActions;
  const volunteersKnownActions = current.volunteersKnownActions;
  const mass = current.wasteKnownActions > 0 ? current.impactVolumeKg : null;
  const co2 = mass === null ? null : Math.round(mass * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg);
  const savings = mass === null ? null : computeImpactTerrain2026StreetCleaningSavings({ wasteKg: mass, durationMinutes: current.totalDurationMinutes });
  const format = (n: number) => n.toLocaleString(isEn ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 });
  const participationsValue =
    totalActions === 0
      ? isEn
        ? "Unavailable (no actions)"
        : "Indisponible (aucune action)"
      : volunteersKnownActions === 0
        ? isEn
          ? "Not reported"
          : "Non renseignées"
        : format(current.mobilizationCount);
  const participationsDetail =
    totalActions === 0
      ? isEn
        ? "No completed public actions in the window."
        : "Aucune action publique terminée dans la période."
      : volunteersKnownActions === 0
        ? isEn
          ? `0/${totalActions} actions have reported participants.`
          : `0/${totalActions} actions avec effectif renseigné.`
        : volunteersKnownActions < totalActions
          ? isEn
            ? `Partial coverage (${volunteersKnownActions}/${totalActions} actions); declared sum, not unique people.`
            : `Couverture partielle (${volunteersKnownActions}/${totalActions} actions) ; somme déclarée, pas un nombre de personnes uniques.`
          : isEn
            ? `Declared sum (${volunteersKnownActions}/${totalActions} actions), not a count of unique people.`
            : `Somme déclarée (${volunteersKnownActions}/${totalActions} actions), pas un nombre de personnes uniques.`;
  const items = isEn
    ? [
        ["Estimated street cleaning value", savings ? `${format(savings.lowerBoundEuros)} to ${format(savings.upperBoundEuros)} €` : "Unavailable", "Methodological range, not an accounting saving."],
        ["Estimated CO₂ avoided", co2 === null ? "Unavailable" : `${format(co2)} kg`, "Proxy calculated from reported mass."],
        ["Declared participations", participationsValue, participationsDetail],
        ["Reported mass", mass === null ? "Not reported" : `${format(mass)} kg`, `${format(current.wasteCoverageRate)}% of actions reported.`],
      ]
    : [
        ["Valorisation de voirie estimée", savings ? `${format(savings.lowerBoundEuros)} à ${format(savings.upperBoundEuros)} €` : "Indisponible", "Fourchette méthodologique, pas une économie comptable."],
        ["CO₂ évité estimé", co2 === null ? "Indisponible" : `${format(co2)} kg`, "Proxy calculé sur la masse renseignée."],
        ["Participations déclarées", participationsValue, participationsDetail],
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
  const hasOrganizationAccess = (await listOrganizations(userId).catch(() => [])).length > 0;
  const isEnterprise = await getCurrentUserActiveRole().then((role) => role === "entreprise").catch(() => false);
  const tabs = [
    { id: "summary", label: isEn ? "Impact summary" : "Bilan d'impact" },
    { id: "zones", label: isEn ? "Observed zones" : "Zones observées" },
    { id: "methods", label: isEn ? "Methods and reports" : "Méthodes et rapports" },
    ...(isEnterprise ? [
      { id: "actions", label: isEn ? "Organize" : "Organiser" },
      { id: "opportunities", label: isEn ? "Opportunities" : "Opportunités" },
    ] as const : []),
    ...(hasOrganizationAccess ? [{ id: "organization", label: isEn ? "My organization" : "Mon organisation" }] as const : []),
  ] as const;
  const requestedTab = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  const tab = tabs.find(item => item.id === requestedTab)?.id ?? "summary";
  const isResourceTab = tab === "actions" || tab === "opportunities" || tab === "organization";
  const accountCompletion = await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null);
  const overview = isResourceTab ? null : await loadPilotageOverview({ periodDays: SPONSOR_WINDOW_DAYS, limit: 5000, publishedCompletedOnly: true }).catch(() => null);
  const actionsUnavailable = !overview || Boolean(overview.dataAvailability?.sourceHealth?.failedSources.includes("actions"));
  return <AccountCompletionGate state={accountCompletion}><CmmPageLayout>
    <PageHeader title={tab==="organization"?(isEn?"Enterprise workspace":"Espace entreprise"):isEnterprise?(isEn?"Enterprise workspace":"Espace entreprise"):(isEn?"Decision portal":"Portail décideur")} subtitle={tab==="organization"?(isEn?"Your organization and its authorized resources.":"Votre organisation et ses ressources autorisées."):isEn?"Consolidated impact of completed public actions.":"Impact consolidé des actions publiques terminées."} action={<CmmButton href="/reports" tone="primary">{isEn ? "Reports and exports" : "Rapports et exports"}</CmmButton>} />
    <DecisionPageNavigation route="/sponsor-portal" activeTab={tab} tabs={tabs} locale={locale} />
    {tab === "organization" ? <EnterpriseOrganizationWorkspace locale={locale} /> : tab === "actions" || tab === "opportunities" ? <EnterpriseActionLinks locale={locale} view={tab} /> : actionsUnavailable ? <CmmCard className="space-y-3"><p role="status" className="text-sm cmm-text-secondary">{isEn ? "Impact data temporarily unavailable." : "Données d’impact momentanément indisponibles."}</p><SystemStateRetryButton label={isEn ? "Retry" : "Réessayer"} /></CmmCard> : <PublishedDecisionScope overview={overview} locale={locale} />}
    {tab === "summary" && !actionsUnavailable && <SponsorMetrics overview={overview} locale={locale} />}
    {tab === "zones" && !actionsUnavailable && <PublishedDecisionZones zones={overview.zones.slice(0,3)} locale={locale} />}
    {tab === "methods" && <><CmmCard className="space-y-2"><h2 className="font-bold cmm-text-primary">{isEn ? "Valuation and emissions" : "Valorisation et émissions"}</h2><p className="text-sm cmm-text-secondary">{isEn ? "Valuation combines two estimates, by mass and by duration. It is neither an accounting saving nor a certification. CO₂ is a proxy." : "La valorisation croise deux estimations, par masse et par durée. Elle ne constitue ni une économie comptable ni une certification. Le CO₂ est un proxy."}</p></CmmCard><PublishedDecisionMethods methods={overview?.methods ?? []} locale={locale} /></>}
    {!isEnterprise ? <div className="flex flex-wrap gap-2"><CmmButton href="/pilotage" tone="secondary">{isEn ? "Steering" : "Pilotage"}</CmmButton><CmmButton href="/sections/elus" tone="secondary">{isEn ? "Governance" : "Gouvernance"}</CmmButton></div> : null}
  </CmmPageLayout></AccountCompletionGate>;
}
