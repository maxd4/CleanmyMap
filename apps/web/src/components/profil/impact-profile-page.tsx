"use client";

import useSWR from "swr";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import type { CurrentAccountIdentity } from "@/lib/account/current-account-identity";
import { CmmPageLayout } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { useImpactProfileActions } from "@/components/profil/use-impact-profile-actions";
import { ImpactProfileAuthenticatedView } from "@/components/profil/impact-profile-authenticated-view";
import type { GamificationBadgeDefinition } from "@/lib/gamification/progression/progression-types";
import type { EngagementStatus } from "@/lib/gamification/progression/engagement-status";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGamificationMeResponse(value: unknown): value is GamificationMeResponse {
  if (!isRecord(value) || value.status !== "ok") return false;
  if (value.progression === null) return true;
  if (!isRecord(value.progression) || typeof value.progression.currentLevel !== "number") {
    return false;
  }
  const history = value.progression.history;
  return history === undefined
    || (isRecord(history)
      && Array.isArray(history.timeline)
      && history.timeline.every((item) => isRecord(item)
        && typeof item.id === "string"
        && typeof item.actionDate === "string"
        && typeof item.locationLabel === "string"
        && Array.isArray(item.validatedRoleCodes)
        && item.validatedRoleCodes.every((code) => typeof code === "string")));
}

async function fetchJson<T>(url: string, guard: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("API Error");
  const body: unknown = await response.json();
  if (!guard(body)) throw new Error("Réponse API invalide.");
  return body;
}

export type ImpactCardIdentity = Pick<CurrentAccountIdentity, "userId" | "displayName" | "firstName" | "handle" | "username" | "activeRole">;

export default function ImpactProfilePage({ identity, authUnavailable = false }: { identity: ImpactCardIdentity | null; authUnavailable?: boolean }) {
  const { data: meData, isLoading, error, mutate } = useSWR<GamificationMeResponse, Error>(
    identity ? ["/api/gamification/me", identity.userId] : null,
    () => fetchJson("/api/gamification/me", isGamificationMeResponse),
    { keepPreviousData: false },
  );
  const actions = useImpactProfileActions(identity?.displayName || identity?.firstName || "Contributeur");
  if (!identity) return <ClerkRequiredGate isAuthenticated={false} authUnavailable={authUnavailable} mode="blur" title="Carte d’impact personnelle" description="Connectez-vous pour consulter et exporter votre carte personnelle." lockedPreview={<CmmCard><p className="cmm-text-secondary">Votre progression et vos missions validées après connexion.</p></CmmCard>}><div /></ClerkRequiredGate>;
  if (isLoading) return <CmmPageLayout><PageHeader title="Mon impact" /><CmmSkeleton className="h-64" /></CmmPageLayout>;
  if (error || !meData?.progression) return <CmmPageLayout><PageHeader title="Mon impact" /><CmmCard className="space-y-3"><p role="status" className="cmm-text-secondary">{error ? "La progression n'a pas pu être chargée." : "Aucune progression disponible pour le moment."}</p><div className="flex flex-wrap gap-2"><CmmButton tone="secondary" onClick={() => { void mutate(); }}>Réessayer</CmmButton><CmmButton href="/profil/engagement" tone="primary">Mon dossier d’engagement</CmmButton></div></CmmCard></CmmPageLayout>;
  const prog = meData.progression;
  const history = prog.history?.timeline.filter(item => item.validatedRoleCodes.length > 0);
  return <ImpactProfileAuthenticatedView identity={identity} prog={prog} validatedRoleHistory={history} actions={actions} />;
}
