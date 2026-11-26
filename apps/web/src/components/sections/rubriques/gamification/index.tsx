"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PageHeader } from "@/components/ui/page-header";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmButton } from "@/components/ui/cmm-button";
import { GamificationTabs } from "./gamification-tabs";
import { TerrainSpecializationsPanel } from "./terrain-specializations-panel";
import { CelebrationsPanel, EngagementPanel, RecognitionPanel } from "./gamification-panels";
import type { MeResponse } from "./gamification-types";
import type { UserProgressionResponse } from "@/lib/gamification/progression/progression-types";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { GamificationCatalogPanel } from "./gamification-catalog-panel";
import { GamificationRulesMigrationNotice } from "./gamification-rules-migration-notice";
import { GamificationImpactPanel } from "./gamification-impact-panel";
import { GamificationLevelProgressPanel } from "./gamification-level-progress-panel";
import { GamificationReconciliationNotice } from "./gamification-reconciliation-notice";
import { GamificationReconciliationHistory } from "./gamification-reconciliation-history";
import { GamificationSpogomiCollection } from "./gamification-spogomi-collection";
import { TerritorialLegendsPanel } from "./territorial-legends-panel";
import { GamificationBrigadeVertePanel } from "./gamification-brigade-verte-panel";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasProgressionScalars(value: Record<string, unknown>): boolean {
  return typeof value.userId === "string" &&
    ["xpTotal", "xpValidated", "xpPending", "currentLevel", "potentialLevel"].every((key) => typeof value[key] === "number");
}

function hasProgressionCollections(value: Record<string, unknown>): boolean {
  return isRecord(value.nextLevel) && Array.isArray(value.badges) &&
    value.badges.every((badge) => typeof badge === "string") &&
    Array.isArray(value.badgeCatalog) && value.badgeCatalog.every(isRecord);
}

function hasProgressionSections(value: Record<string, unknown>): boolean {
  return isRecord(value.summary) && isRecord(value.engagementStatus) &&
    isRecord(value.impact) && isRecord(value.impactMethodology) &&
    isRecord(value.dynamicRanking) && isRecord(value.monthlyMilestone) &&
    isRecord(value.recognition) && isRecord(value.annualRecognition) &&
    isRecord(value.yearToDateImpact);
}

function hasProgressionHistory(value: Record<string, unknown>): boolean {
  return isRecord(value.history) && Array.isArray(value.history.timeline) &&
    value.history.timeline.every(isRecord) && Array.isArray(value.history.mapPoints) &&
    value.history.mapPoints.every(isRecord);
}

function isUserProgressionResponse(value: unknown): value is UserProgressionResponse {
  return isRecord(value) && hasProgressionScalars(value) &&
    hasProgressionCollections(value) && hasProgressionSections(value) &&
    hasProgressionHistory(value);
}

function isMeResponse(value: unknown): value is MeResponse {
  return isRecord(value)
    && value.status === "ok"
    && isUserProgressionResponse(value.progression)
    && (value.reconciliation === null || isRecord(value.reconciliation))
    && Array.isArray(value.reconciliationHistory)
    && value.reconciliationHistory.every(isRecord)
    && (value.reconciliationTarget === null || isRecord(value.reconciliationTarget));
}

async function fetchJson<T>(url: string, guard: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Requête API impossible.";
    throw new Error(message);
  }
  if (!guard(body)) throw new Error("Réponse API invalide.");
  return body;
}
export function GamificationSection() {
  const { locale, displayMode } = useSitePreferences();
  const fr = locale === "fr";
  const searchParams = useSearchParams();
  const receiptId = searchParams?.get("receipt") ?? null;

  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
    mutate: mutateMe,
  } = useSWR<MeResponse, unknown>(
    ["gamification-me", receiptId],
    () => fetchJson(receiptId
      ? `/api/gamification/me?receipt=${encodeURIComponent(receiptId)}`
      : "/api/gamification/me", isMeResponse),
    swrRecentViewOptions,
  );

  const progression = meData?.progression;
  const panelProps = { progression, loading: meLoading, error: meError, locale };
  const catalogProps = { summary: progression?.summary, loading: meLoading, error: meError, locale };

  return (
    <SectionShell id="gamification" hideHeader gradient="from-[#fff8f5] via-white to-transparent">
      <div className="space-y-5 pb-8 pt-5 sm:space-y-6">
        <PageHeader title={fr ? "Progression & badges" : "Progress & badges"} subtitle={fr ? "Vos contributions. Vos paliers. Vos récompenses." : "Your contributions. Your milestones. Your rewards."} />
        <GamificationLevelProgressPanel {...panelProps} />
        <GamificationReconciliationNotice reconciliation={meData?.reconciliation} progression={progression} locale={locale} onAcknowledged={async () => { await mutateMe(); }} />
        <GamificationRulesMigrationNotice summary={progression?.summary} locale={locale} onAcknowledged={async () => { await mutateMe(); }} />

        <GamificationTabs locale={locale} summary={progression?.summary} receiptId={receiptId} renderPanel={(tab) => {
          if (tab === "acquired") return <>
            <GamificationCatalogPanel {...catalogProps} view="acquired" />
            <GamificationImpactPanel {...panelProps} />
            <CmmDisclosure summary={fr ? "Parcours d’engagement" : "Engagement journey"} tone="rose"><EngagementPanel {...panelProps} /></CmmDisclosure>
          </>;
          if (tab === "active") return <GamificationCatalogPanel {...catalogProps} view="active" />;
          if (tab === "discover") return <>
            <GamificationCatalogPanel {...catalogProps} view="discover" />
            <div className="flex flex-wrap gap-2"><CmmButton href="/sections/rejoindre-une-action" tone="primary" size="sm">{fr ? "Rejoindre une action" : "Join an action"}</CmmButton><CmmButton href="/actions/new" tone="secondary" size="sm">{fr ? "Créer une action" : "Create an action"}</CmmButton><CmmButton href="/learn/sentrainer" tone="secondary" size="sm">{fr ? "S’entraîner" : "Practice"}</CmmButton></div>
          </>;
          if (tab === "community") return <>
            <RecognitionPanel {...panelProps} />
            <TerritorialLegendsPanel locale={locale} />
            <GamificationBrigadeVertePanel locale={locale} displayMode={displayMode} />
          </>;
          return <>
            <GamificationCatalogPanel {...catalogProps} view="badges" />
            {!meError && progression?.summary ? <TerrainSpecializationsPanel specializations={progression.summary.terrainSpecializations ?? []} locale={locale} /> : null}
            <GamificationSpogomiCollection locale={locale} />
            <CmmDisclosure summary={fr ? "Aperçu des célébrations" : "Celebration preview"} tone="slate"><CelebrationsPanel locale={locale} /></CmmDisclosure>
          </>;
        }} />
        <GamificationReconciliationHistory history={meData?.reconciliationHistory} targetedEntry={meData?.reconciliationTarget} {...panelProps} />
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-4">
          <CmmButton href="/methodologie" tone="secondary" size="sm">{fr ? "Comment sont calculés les résultats ?" : "How are results calculated?"}</CmmButton>
          <CmmButton href="/reglages" tone="secondary" size="sm">{fr ? "Préférences" : "Preferences"}</CmmButton>
        </div>
      </div>
    </SectionShell>
  );
}
