import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { DecisionPageHeader } from"@/components/ui/decision-page-header";
import { ClerkRequiredGate } from"@/components/ui/clerk-required-gate";
import { PageReadingTemplate } from"@/components/ui/page-reading-template";
import { SectionHeader, StatCard } from"@/components/ui/page-structure";
import { isFeatureEnabled } from"@/lib/feature-flags";
import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";

export default async function ActionsHistoryPage() {
 const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
 const { userId, clerkReachable } = await getSafeAuthSession();
 const accountCompletion = userId
  ? await loadAccountCompletionGateState({ userId, clerkReachable }).catch(() => null)
  : null;

 if (!userId) {
 return (
 <ClerkRequiredGate
 isAuthenticated={false}
 mode="blur"
 title="Historique des actions validées"
 description="Cette fonctionnalité nécessite une connexion Clerk."
 lockedPreview={
 <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
 <div className="grid gap-3 md:grid-cols-3">
 <article className="rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Qualité
 </p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Score et grade se déverrouillent après connexion.
 </p>
 </article>
 <article className="rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Corrections
 </p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Les lignes à corriger restent cachées tant que tu n&apos;es pas connecté.
 </p>
 </article>
 <article className="rounded-2xl border border-slate-200 bg-white p-4">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Traçabilité
 </p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 La méthode complète s&apos;affiche après connexion.
 </p>
 </article>
 </div>
 </section>
 }
 >
 <div />
 </ClerkRequiredGate>
 );
 }

 if (pageTemplateV2Enabled) {
  return (
   <AccountCompletionGate state={accountCompletion}>
    <PageReadingTemplate
     context="Profil supervision"
     title="Historique des actions validées"
     objective="Prioriser les fiches à corriger et fiabiliser l'historique."
     summary={
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
        <StatCard
         label="Qualité visible"
         value="Score + grade"
         period="N-1: score partiel"
         description="Delta abs: n/a | Delta %: n/a"
         tone="slate"
         size="sm"
        />
        <StatCard
         label="Raisons explicites"
         value="Facteurs détaillés"
         period="N-1: tooltip partiel"
         description="Delta abs: n/a | Delta %: n/a"
         tone="slate"
         size="sm"
        />
        <StatCard
         label="Filtrage qualité"
         value="A / B / C + à corriger"
         period="N-1: filtrage limité"
         description="Delta abs: n/a | Delta %: n/a"
         tone="slate"
         size="sm"
        />
       </div>
       <SectionHeader
        eyebrow="Alerte prioritaire"
        title="Traiter en premier les lignes grade C pour limiter les biais d’analyse."
        titleSize="sm"
        eyebrowClassName="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-800"
        subtitleClassName="text-sm text-rose-800"
       />
       <SectionHeader
        eyebrow="Action recommandée"
        title="Appliquer le filtre “à corriger” puis corriger les champs géoloc/trace en priorité."
        titleSize="sm"
        eyebrowClassName="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800"
        subtitleClassName="text-sm text-emerald-900"
       />
      </div>
     }
     primaryAction={{ href:"/actions/new", label:"Déclarer" }}
     secondaryAction={{ href:"/reports", label:"Ouvrir reporting" }}
     analysis={<ActionsHistoryList />}
    />
   </AccountCompletionGate>
   );
 }

 return (
  <AccountCompletionGate state={accountCompletion}>
   <div data-rubrique-report-root className="space-y-4">
   <DecisionPageHeader
    context="Profil supervision"
    title="Historique terrain"
    objective="Identifier les fiches à corriger et fiabiliser l'historique."
    actions={[
     {
      href:"/actions/new",
      label:"Nouvelle déclaration",
      tone:"primary",
     },
     { href:"/reports", label:"Ouvrir reporting" },
    ]}
   />

   <SectionHeader
    eyebrow="Tracer"
    title="L&apos;export PDF est disponible directement dans la liste filtrable."
    titleSize="sm"
    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    eyebrowClassName="text-[11px] font-semibold uppercase tracking-[0.14em] cmm-text-muted"
    subtitleClassName="mt-2 cmm-text-small cmm-text-secondary"
   />

   <ActionsHistoryList />
  </div>
 </AccountCompletionGate>
 );
}
