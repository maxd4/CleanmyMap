import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getServerLocale } from "@/lib/server-preferences";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { canReadGovernanceAggregates } from "@/lib/pilotage/governance-access";
import { getRequestablePromotionRoles } from "@/lib/account/promotion-request-contract";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { SystemStateRetryButton } from "@/components/ui/system-state-retry-button";
import { RoleProfileSwitcher } from "@/components/account/role-profile-switcher";
import { ThirtySecondsSummary, localizeSummaryText } from "@/components/pilotage/thirty-seconds-summary";
import { PublishedDecisionScope, PublishedDecisionZones, PublishedDecisionMethods } from "@/components/pilotage/published-decision-panels";
import { DecisionPageNavigation } from "@/components/pilotage/decision-page-navigation";

function buildRouteWithSearch(basePath: string, searchParams: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value.length > 0) query.set(key, value);
    else if (Array.isArray(value)) for (const item of value) if (item) query.append(key, item);
  }
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function GovernancePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const session = await getSafeAuthSession();
  if (!session.userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        authUnavailable={!session.clerkReachable}
        mode="disabled"
        signInHref={buildSignInRedirectHref(buildRouteWithSearch("/sections/elus", searchParams))}
      >
        <div />
      </ClerkRequiredGate>
    );
  }
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const tabs = [
    { id: "summary", label: isEn ? "Summary" : "Synthèse" },
    { id: "zones", label: isEn ? "Zones and priorities" : "Zones et priorités" },
    { id: "methods", label: isEn ? "Methods and reports" : "Méthodes et rapports" },
  ] as const;
  const identity = await getCurrentUserIdentity({ userId: session.userId }).catch(() => null);
  const allowed = identity && canReadGovernanceAggregates(identity.activeRole);
  const overview = allowed ? await loadPilotageOverview({ periodDays: 30, limit: 1500, publishedCompletedOnly: true }).catch(() => null) : null;
  const actionsUnavailable = !overview || Boolean(overview.dataAvailability?.sourceHealth?.failedSources.includes("actions"));
  const tab = tabs.find(item => item.id === searchParams.tab)?.id ?? "summary";
  return <CmmPageLayout>
    <PageHeader title={isEn ? "Governance" : "Gouvernance"} subtitle={isEn ? "Decision support on completed public actions." : "Aide à la décision sur les actions publiques terminées."} />
    {!allowed ? <>
      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">{identity ? (isEn ? "Access by role" : "Accès selon votre rôle") : (isEn ? "Permissions temporarily unavailable" : "Droits momentanément indisponibles")}</h2><p className="text-sm cmm-text-secondary">{identity ? (isEn ? "Activate Elected or IMU if your level allows it." : "Activez Élu ou IMU si votre niveau le permet.") : (isEn ? "Permission verification failed." : "La vérification de vos droits a échoué.")}</p><div className="flex flex-wrap gap-2">{identity && getRequestablePromotionRoles(identity.role).includes("elu") && <CmmButton href="/compte/evolution" tone="primary">{isEn ? "Discover Elected level" : "Découvrir le niveau Élu"}</CmmButton>}<CmmButton href="/dashboard" tone="secondary">{isEn ? "My space" : "Mon espace"}</CmmButton><CmmButton href="/sponsor-portal" tone="secondary">{isEn ? "Decision portal" : "Portail décideur"}</CmmButton></div></CmmCard>
      {identity && <RoleProfileSwitcher locale={locale} grantedRole={identity.role} activeRole={identity.activeRole} title={isEn ? "Available roles" : "Rôles disponibles"} />}
    </> : <>
      <DecisionPageNavigation route="/sections/elus" activeTab={tab} tabs={tabs} locale={locale} />
      <p className="text-sm cmm-text-secondary">{isEn ? "Platform-wide reading of published data, without assigning an administrative territory to your account." : "Lecture globale des données publiées, sans attribution d’un territoire administratif à votre compte."}</p>
      {actionsUnavailable ? <CmmCard className="space-y-3"><p role="status" className="text-sm cmm-text-secondary">{isEn ? "Governance data temporarily unavailable." : "Données momentanément indisponibles."}</p><SystemStateRetryButton label={isEn ? "Retry" : "Réessayer"} /></CmmCard> : <PublishedDecisionScope overview={overview} locale={locale} />}
      {tab === "summary" && !actionsUnavailable && <><ThirtySecondsSummary locale={locale} kpis={overview.summary.kpis} alert={overview.summary.alert} /><CmmCard className="space-y-2"><h2 className="font-bold cmm-text-primary">{isEn ? "Recommendation" : "Recommandation"}</h2><p className="cmm-text-primary">{localizeSummaryText(overview.summary.recommendedAction.label, locale)}</p><p className="text-sm cmm-text-secondary">{localizeSummaryText(overview.summary.recommendedAction.reason, locale)}</p></CmmCard></>}
      {tab === "zones" && !actionsUnavailable && <PublishedDecisionZones zones={overview.zones} locale={locale} />}
      {tab === "methods" && <PublishedDecisionMethods methods={overview?.methods ?? []} locale={locale} />}
      <div className="flex flex-wrap gap-2"><CmmButton href="/sponsor-portal" tone="secondary">{isEn ? "Decision portal" : "Portail décideur"}</CmmButton><CmmButton href="/reports" tone="secondary">{isEn ? "Reports" : "Rapports"}</CmmButton></div>
    </>}
  </CmmPageLayout>;
}
