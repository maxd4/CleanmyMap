import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { canReadGovernanceAggregates } from "@/lib/pilotage/governance-access";
import { getRequestablePromotionRoles } from "@/lib/account/promotion-request-contract";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { RoleProfileSwitcher } from "@/components/account/role-profile-switcher";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { PublishedDecisionScope, PublishedDecisionZones, PublishedDecisionMethods } from "@/components/pilotage/published-decision-panels";
import { DecisionPageNavigation } from "@/components/pilotage/decision-page-navigation";

const TABS = [{ id: "summary", label: "Synthèse" }, { id: "zones", label: "Zones et priorités" }, { id: "methods", label: "Méthodes et rapports" }] as const;

export async function GovernancePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const session = await getSafeAuthSession();
  if (!session.userId) return <ClerkRequiredGate isAuthenticated={false} mode="disabled" signInHref="/sign-in?redirect_url=%2Fsections%2Felus"><div /></ClerkRequiredGate>;
  const identity = await getCurrentUserIdentity({ userId: session.userId }).catch(() => null);
  const allowed = identity && canReadGovernanceAggregates(identity.activeRole);
  const overview = allowed ? await loadPilotageOverview({ periodDays: 30, limit: 1500, publishedCompletedOnly: true }).catch(() => null) : null;
  const tab = TABS.find(item => item.id === searchParams.tab)?.id ?? "summary";
  return <CmmPageLayout>
    <PageHeader title="Gouvernance" subtitle="Aide à la décision sur les actions publiques terminées." />
    {!allowed ? <>
      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">{identity ? "Accès selon votre rôle" : "Droits momentanément indisponibles"}</h2><p className="cmm-text-secondary">{identity ? "Activez Élu ou IMU si votre niveau le permet." : "La vérification de vos droits a échoué."}</p><div className="flex flex-wrap gap-2">{identity && getRequestablePromotionRoles(identity.role).includes("elu") && <CmmButton href="/compte/evolution" tone="primary">Découvrir le niveau Élu</CmmButton>}<CmmButton href="/dashboard" tone="secondary">Mon espace</CmmButton><CmmButton href="/sponsor-portal" tone="secondary">Portail décideur</CmmButton></div></CmmCard>
      {identity && <RoleProfileSwitcher locale="fr" grantedRole={identity.role} activeRole={identity.activeRole} title="Rôles disponibles" />}
    </> : <>
      <DecisionPageNavigation route="/sections/elus" activeTab={tab} tabs={TABS} />
      <p className="text-sm cmm-text-secondary">Lecture globale des données publiées, sans attribution d’un territoire administratif à votre compte.</p>
      {overview ? <PublishedDecisionScope overview={overview} /> : <CmmCard><p role="status" className="cmm-text-secondary">Données momentanément indisponibles.</p></CmmCard>}
      {tab === "summary" && overview && <><ThirtySecondsSummary locale="fr" kpis={overview.summary.kpis} alert={overview.summary.alert} /><CmmCard className="space-y-2"><h2 className="font-bold cmm-text-primary">Recommandation</h2><p className="cmm-text-primary">{overview.summary.recommendedAction.label}</p><p className="text-sm cmm-text-secondary">{overview.summary.recommendedAction.reason}</p></CmmCard></>}
      {tab === "zones" && overview && <PublishedDecisionZones zones={overview.zones} />}
      {tab === "methods" && <PublishedDecisionMethods methods={overview?.methods ?? []} />}
      <div className="flex flex-wrap gap-2"><CmmButton href="/sponsor-portal" tone="secondary">Portail décideur</CmmButton><CmmButton href="/reports" tone="secondary">Rapports</CmmButton></div>
    </>}
  </CmmPageLayout>;
}
