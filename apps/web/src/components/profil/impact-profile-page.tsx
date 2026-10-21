"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { fetchCurrentAccountIdentity, type CurrentAccountIdentity } from "@/lib/account/current-account-identity";
import { useImpactProfileActions } from "@/components/profil/use-impact-profile-actions";
import { ImpactProfileAuthenticatedView } from "@/components/profil/impact-profile-authenticated-view";
import type { GamificationBadgeDefinition } from "@/lib/gamification/progression-types";
import type { EngagementStatus } from "@/lib/gamification/engagement-status";

export type ImpactPageProgression = {
  currentLevel: number;
  dynamicRanking?: { rank: number | null };
  impact?: { wasteKg?: number; totalButts?: number; waterSavedLiters?: number };
  badges?: string[];
  badgeCatalog?: readonly GamificationBadgeDefinition[];
  engagementStatus?: EngagementStatus;
  history?: { timeline: Array<{ id: string; actionDate: string; locationLabel: string; validatedRoleCodes: string[] }> };
};

type GamificationMeResponse = { status: "ok"; progression: ImpactPageProgression | null };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("API Error");
  return response.json();
}

export default function ImpactProfilePage() {
  const [currentAccountIdentity, setCurrentAccountIdentity] = useState<CurrentAccountIdentity | null>(null);
  const classes = getBlockClasses("impact");
  const { data: meData, isLoading } = useSWR<GamificationMeResponse>("gamification-me", () => fetchJson<GamificationMeResponse>("/api/gamification/me"));

  useEffect(() => {
    let cancelled = false;
    fetchCurrentAccountIdentity().then((identity) => {
      if (!cancelled) setCurrentAccountIdentity(identity);
    }).catch(() => {
      if (!cancelled) setCurrentAccountIdentity(null);
    });
    return () => { cancelled = true; };
  }, []);

  const displayName = currentAccountIdentity?.displayName || currentAccountIdentity?.firstName || "Contributeur";
  const actions = useImpactProfileActions(displayName);
  if (isLoading) return <div className="flex min-h-[400px] flex-col items-center justify-center gap-4"><div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" /><span className="animate-pulse text-xs font-black uppercase tracking-widest text-red-400/60">Chargement de votre impact...</span></div>;
  const prog = meData?.progression ?? undefined;
  const validatedRoleHistory = prog?.history?.timeline.filter((item) => item.validatedRoleCodes.length > 0) ?? [];
  if (!currentAccountIdentity) return <ImpactProfileLockedView classes={classes} />;
  return <ImpactProfileAuthenticatedView classes={classes} identity={currentAccountIdentity} prog={prog} validatedRoleHistory={validatedRoleHistory} actions={actions} />;
}

function ImpactProfileLockedView({ classes }: { classes: ReturnType<typeof getBlockClasses> }) {
  return <ClerkRequiredGate isAuthenticated={false} mode="blur" title="Carte d’impact personnelle" description="Connectez-vous pour consulter, télécharger et partager votre carte d’impact." lockedPreview={<div className="grid gap-8 md:grid-cols-2"><div className={cn("rounded-[2rem] border p-6", classes.surface)}><p className="text-xs font-black uppercase tracking-[0.2em] text-red-400/60">Aperçu verrouillé</p><div className="mt-4 rounded-2xl border border-white/5 bg-red-400/5 p-5"><p className="cmm-text-body cmm-text-inverse">La carte d&apos;impact montre tes actions validées, ton niveau et tes badges après connexion.</p></div></div><div className={cn("rounded-[2rem] border p-6", classes.surface)}><p className="text-xs font-black uppercase tracking-[0.2em] text-red-400/60">Actions disponibles</p><div className="mt-4 space-y-3">{["Télécharger le certificat", "Partager l’image de la carte", "Consulter la méthodologie"].map((act) => <div key={act} className="rounded-xl border border-white/5 bg-white/5 p-4 text-xs font-bold text-red-100/30">{act}</div>)}</div></div></div>}><div /></ClerkRequiredGate>;
}
