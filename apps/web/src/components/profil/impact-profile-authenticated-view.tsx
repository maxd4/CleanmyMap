"use client";

import Link from "next/link";
import { Download, Share2, ArrowLeft, ShieldCheck } from "lucide-react";
import { ImpactCard } from "@/components/profil/impact-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { ACTION_FIELD_ROLE_OPTIONS } from "@/lib/actions/field-roles";
import type { CurrentAccountIdentity } from "@/lib/account/current-account-identity";
import type { ImpactPageProgression } from "./impact-profile-page";

const FIELD_ROLE_LABELS = new Map<string, string>(ACTION_FIELD_ROLE_OPTIONS.map((role) => [role.code, role.label]));

type ImpactActions = {
  activeCardAction: "export" | "share" | null;
  cardActionMessage: string | null;
  cardActionError: string | null;
  handleDownload: () => Promise<void>;
  handleShare: () => Promise<void>;
};

export function ImpactProfileAuthenticatedView({ classes, identity, prog, validatedRoleHistory, actions }: {
  classes: ReturnType<typeof import("@/lib/ui/block-accents").getBlockClasses>;
  identity: CurrentAccountIdentity;
  prog: ImpactPageProgression | undefined;
  validatedRoleHistory: NonNullable<NonNullable<ImpactPageProgression["history"]>["timeline"]>;
  actions: ImpactActions;
}) {
  return <div className="w-full space-y-10 pb-20">
    <ImpactProfileHeader />
    <div className="grid grid-cols-1 items-start gap-12 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
      <div className="sticky top-24 flex justify-center"><ImpactCardPreview identity={identity} prog={prog} /></div>
      <div className="space-y-10">
        <ImpactProfileIntro classes={classes} actions={actions} />
        <ImpactMethodology classes={classes} />
        <ImpactRoleHistory classes={classes} history={validatedRoleHistory} />
        <ImpactCollectiveSection classes={classes} />
      </div>
    </div>
  </div>;
}

function ImpactProfileHeader() {
  return <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
    <Link href={DASHBOARD_ROUTE} className="group flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-red-400/40 transition-colors hover:text-red-400"><ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />Retour au cockpit</Link>
    <div className="flex items-center gap-3 rounded-full border border-red-400/20 bg-red-400/5 px-6 py-2"><ShieldCheck size={14} className="text-red-400" /><h1 className="text-xs font-black uppercase tracking-[0.3em] text-red-400/80">Carte d&apos;impact personnelle</h1></div>
  </header>;
}

function ImpactCardPreview({ identity, prog }: { identity: CurrentAccountIdentity; prog: ImpactPageProgression | undefined }) {
  return <ImpactCard userName={identity.displayName || identity.handle || identity.username || "Contributeur anonyme"} level={prog?.currentLevel || 1} rank={prog?.dynamicRanking?.rank ?? null} totalKg={prog?.impact?.wasteKg || 0} totalButts={prog?.impact?.totalButts || 0} waterSaved={prog?.impact?.waterSavedLiters || 0} topBadges={prog?.badges || []} />;
}

function ImpactProfileIntro({ classes, actions }: { classes: ReturnType<typeof import("@/lib/ui/block-accents").getBlockClasses>; actions: ImpactActions }) {
  const { activeCardAction, cardActionMessage, cardActionError, handleDownload, handleShare } = actions;
  return <>
    <div className="space-y-5"><div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-slate-600"><span className="rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-red-700">Carte d&apos;impact personnelle</span><span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-slate-500">Exportable et partageable</span></div><div className="space-y-3"><h2 className="max-w-3xl text-4xl font-black tracking-tighter text-slate-950 sm:text-5xl xl:text-[3.5rem] xl:leading-[0.95]">Votre impact en temps réel<span className="block text-red-600">sans perdre la lisibilité.</span></h2><p className="cmm-text-body max-w-2xl">Générez une carte haute fidélité qui résume vos actions validées sur le terrain, votre niveau d&apos;expertise et vos distinctions, avec une lecture plus directe sur desktop et mobile.</p></div></div>
    <div className="flex flex-col gap-4 sm:flex-row"><CmmButton type="button" onClick={() => { void /* fire-and-forget -- the impact card action owns export state and errors. */ handleDownload(); }} disabled={Boolean(activeCardAction)} tone="destructive" className={cn("flex-1 flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-8 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-red-600/20 hover:bg-red-500 disabled:opacity-50", classes.shadow)}><Download size={18} />{activeCardAction === "export" ? "Génération de la carte..." : "Exporter la carte"}</CmmButton><CmmButton type="button" onClick={() => { void /* fire-and-forget -- the impact card action owns share state and errors. */ handleShare(); }} disabled={Boolean(activeCardAction)} tone="secondary" className="flex-1 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-sm font-black uppercase tracking-widest text-red-100/60 transition-[background-color,color] hover:bg-white/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"><Share2 size={18} />{activeCardAction === "share" ? "Préparation du partage..." : "Partager la carte"}</CmmButton></div>
    <div className="min-h-6" aria-live="polite" aria-atomic="true">{cardActionMessage ? <p className="text-center text-xs font-bold text-red-100/80">{cardActionMessage}</p> : null}{cardActionError ? <p role="alert" className="text-center text-xs font-bold text-rose-200">{cardActionError}</p> : null}</div>
  </>;
}

function ImpactMethodology({ classes }: { classes: ReturnType<typeof import("@/lib/ui/block-accents").getBlockClasses> }) {
  return <div className={cn("relative space-y-6 overflow-hidden rounded-[2rem] border p-8", classes.surface)}><div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-red-500/10 blur-2xl" /><div className="space-y-2"><p className="text-xs font-black uppercase tracking-widest text-red-400/40">Méthodologie</p><p className="cmm-text-body cmm-text-inverse">Les données d&apos;impact sont consolidées à partir de vos actions validées. L&apos;eau préservée est un proxy calculé avec {IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt} L par mégot extrait ; elle ne constitue pas une mesure directe de la qualité de l&apos;eau.</p></div><Link href="/methodologie" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-400 transition-colors hover:text-red-300">Consulter le protocole scientifique <span className="text-lg">→</span></Link></div>;
}

function ImpactRoleHistory({ classes, history }: { classes: ReturnType<typeof import("@/lib/ui/block-accents").getBlockClasses>; history: NonNullable<NonNullable<ImpactPageProgression["history"]>["timeline"]> }) {
  return <section aria-labelledby="validated-role-history-title" className={cn("space-y-4 rounded-[2rem] border p-8", classes.surface)}><div className="space-y-2"><p className="text-xs font-black uppercase tracking-widest text-red-400/40">Historique personnel</p><h3 id="validated-role-history-title" className="text-lg font-black tracking-tight text-slate-950">Missions validées</h3><p className="cmm-text-body">Les rôles affichés ici correspondent uniquement aux attestations confirmées pour vos actions.</p></div>{history.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-600">Aucune mission validée dans votre historique.</p> : <ul className="space-y-3">{history.map((item) => <li key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-bold text-slate-950">{item.locationLabel || "Action terrain"}</span><time className="text-xs font-semibold text-slate-500" dateTime={item.actionDate}>{item.actionDate}</time></div><ul className="mt-2 flex flex-wrap gap-2">{item.validatedRoleCodes.map((roleCode) => <li key={roleCode} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">{FIELD_ROLE_LABELS.get(roleCode) ?? roleCode}</li>)}</ul></li>)}</ul>}</section>;
}

function ImpactCollectiveSection({ classes }: { classes: ReturnType<typeof import("@/lib/ui/block-accents").getBlockClasses> }) {
  return <section className={cn("space-y-4 rounded-[2rem] border p-8", classes.surface)}><div className="space-y-2"><p className="text-xs font-black uppercase tracking-widest text-red-400/40">Impact collectif</p><h3 className="text-lg font-black tracking-tight text-slate-950">Les comparaisons globales restent dans les rapports</h3><p className="cmm-text-body">Cette page reste centrée sur votre progression, vos badges et vos actions validées. Les indicateurs territoriaux, les méthodes et les exports collectifs sont regroupés dans la surface de rapports.</p></div><Link href="/reports" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-600 transition-colors hover:text-red-500">Consulter les rapports collectifs <span className="text-lg">→</span></Link></section>;
}
