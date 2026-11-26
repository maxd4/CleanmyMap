"use client";

import { Download, Share2, ArrowLeft } from "lucide-react";
import { ImpactCard } from "@/components/profil/impact-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import { ACTION_FIELD_ROLE_OPTIONS } from "@/lib/actions/field-roles";
import type { ImpactPageProgression, ImpactCardIdentity } from "./impact-profile-page";

const FIELD_ROLE_LABELS = new Map<string,string>(ACTION_FIELD_ROLE_OPTIONS.map(role => [role.code, role.label]));
type ImpactActions = { activeCardAction: "export" | "share" | null; cardActionMessage: string | null; cardActionError: string | null; handleDownload: () => Promise<void>; handleShare: () => Promise<void> };
type History = NonNullable<NonNullable<ImpactPageProgression["history"]>["timeline"]>;

function ImpactExportControls({ actions }: { actions: ImpactActions }) {
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <CmmButton tone="primary" disabled={Boolean(actions.activeCardAction)} onClick={() => { void actions.handleDownload(); }}><Download size={18} aria-hidden="true" />{actions.activeCardAction === "export" ? "Génération..." : "Télécharger le PNG"}</CmmButton>
      <CmmButton tone="secondary" disabled={Boolean(actions.activeCardAction)} onClick={() => { void actions.handleShare(); }}><Share2 size={18} aria-hidden="true" />{actions.activeCardAction === "share" ? "Préparation..." : "Partager le PNG"}</CmmButton>
    </div>
    {actions.cardActionMessage && <p role="status" className="text-sm cmm-text-success">{actions.cardActionMessage}</p>}
    {actions.cardActionError && <p role="alert" className="text-sm cmm-text-danger">{actions.cardActionError}</p>}
  </div>;
}

function ImpactRoleHistory({ history }: { history: History | undefined }) {
  return <CmmCard as="section" className="space-y-3">
    <h2 className="text-lg font-bold cmm-text-primary">Missions validées</h2>
    <p className="text-sm cmm-text-secondary">Uniquement les missions attestées et confirmées.</p>
    {!history ? <p role="status" className="cmm-text-secondary">Historique indisponible.</p> : history.length === 0 ? <p className="cmm-text-secondary">Aucune mission validée dans votre historique.</p> : <ul className="divide-y divide-current/10">{history.map(item => <li key={item.id} className="space-y-2 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-semibold cmm-text-primary">{item.locationLabel || "Action terrain"}</span><time className="text-sm cmm-text-secondary" dateTime={item.actionDate}>{item.actionDate}</time></div>
      <ul className="flex flex-wrap gap-2">{item.validatedRoleCodes.map(code => <li key={code} className="rounded-full border border-current/20 px-3 py-1 text-sm cmm-text-primary">{FIELD_ROLE_LABELS.get(code) ?? code}</li>)}</ul>
    </li>)}</ul>}
  </CmmCard>;
}

export function ImpactProfileAuthenticatedView({ identity, prog, validatedRoleHistory, actions }: { identity: ImpactCardIdentity; prog: ImpactPageProgression; validatedRoleHistory: History | undefined; actions: ImpactActions }) {
  const { wasteKg, totalButts, waterSavedLiters } = prog.impact ?? {};
  const cardReady = typeof wasteKg === "number" && Number.isFinite(wasteKg) && typeof totalButts === "number" && Number.isFinite(totalButts) && typeof waterSavedLiters === "number" && Number.isFinite(waterSavedLiters);
  return <CmmPageLayout>
    <PageHeader title="Mon impact" subtitle="Vos résultats validés et vos preuves d'engagement." action={<CmmButton href={buildProfileRoute(identity.activeRole)} tone="secondary"><ArrowLeft size={16} aria-hidden="true" />Mon profil</CmmButton>} />
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,400px)_minmax(0,1fr)]">
      <CmmCard className="space-y-4">
        <h2 className="text-lg font-bold cmm-text-primary">Carte d’impact personnelle</h2>
        {cardReady ? <><div className="flex justify-center"><ImpactCard userName={identity.displayName || identity.handle || identity.username || "Contributeur"} level={prog.currentLevel} rank={prog.dynamicRanking?.rank ?? null} totalKg={wasteKg} totalButts={totalButts} waterSaved={waterSavedLiters} topBadges={prog.badges ?? []} /></div><ImpactExportControls actions={actions} /><p className="text-sm cmm-text-secondary">Seule l’image PNG est partagée, jamais l’accès à votre compte.</p></> : <p role="status" className="cmm-text-secondary">Les données nécessaires à la carte ne sont pas toutes disponibles. Aucun résultat fictif n’est exporté.</p>}
      </CmmCard>
      <div className="space-y-4">
        <CmmCard as="section" className="space-y-3">
          <h2 className="text-lg font-bold cmm-text-primary">Valoriser mon engagement</h2>
          <p className="text-sm cmm-text-secondary">Participations confirmées, missions attestées, dossier Markdown privé et modèle d’attestation à faire signer.</p>
          <CmmButton href="/profil/engagement" tone="primary">Ouvrir mon dossier</CmmButton>
        </CmmCard>
        <ImpactRoleHistory history={validatedRoleHistory} />
        <CmmCard className="space-y-3">
          <h2 className="text-lg font-bold cmm-text-primary">Méthodologie</h2>
          <p className="text-sm cmm-text-secondary">Les données proviennent des actions validées. L’eau préservée est un proxy de {IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt} L par mégot extrait, pas une mesure directe de qualité de l’eau.</p>
          <div className="flex flex-wrap gap-2"><CmmButton href="/methodologie" tone="secondary">Protocole scientifique</CmmButton><CmmButton href="/reports" tone="secondary">Rapports collectifs</CmmButton></div>
        </CmmCard>
      </div>
    </div>
  </CmmPageLayout>;
}
