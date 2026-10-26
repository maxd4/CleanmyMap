"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { HeroBlock } from "./gamification-shell";
import { buildPersonalizationSnapshot } from "./personalization-panel";
import {
  CelebrationsPanel,
  CollectionsPanel,
  EngagementPanel,
  MethodologyBanner,
  OperationalStatusCard,
  ProfileSettingsCard,
  QuizProgressionCard,
  RecognitionPanel,
  WhyGamification,
} from "./gamification-panels";
import type { MeResponse } from "./gamification-types";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { GamificationCatalogPanel } from "./gamification-catalog-panel";
import { GamificationRulesMigrationNotice } from "./gamification-rules-migration-notice";
import { GamificationImpactPanel } from "./gamification-impact-panel";
import { GamificationLevelProgressPanel } from "./gamification-level-progress-panel";
import { GamificationReconciliationNotice } from "./gamification-reconciliation-notice";
import { GamificationReconciliationHistory } from "./gamification-reconciliation-history";
import { GamificationSpogomiCollection } from "./gamification-spogomi-collection";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserProgressionResponse(value: unknown): value is UserProgressionResponse {
  if (!isRecord(value)
    || typeof value.userId !== "string"
    || !["xpTotal", "xpValidated", "xpPending", "currentLevel", "potentialLevel"].every((key) => typeof value[key] === "number")
    || !isRecord(value.nextLevel)
    || !Array.isArray(value.badges)
    || !value.badges.every((badge) => typeof badge === "string")
    || !Array.isArray(value.badgeCatalog)
    || !value.badgeCatalog.every(isRecord)
    || !isRecord(value.summary)
    || !isRecord(value.engagementStatus)
    || !isRecord(value.impact)
    || !isRecord(value.impactMethodology)
    || !isRecord(value.dynamicRanking)
    || !isRecord(value.history)
    || !Array.isArray(value.history.timeline)
    || !value.history.timeline.every(isRecord)
    || !Array.isArray(value.history.mapPoints)
    || !value.history.mapPoints.every(isRecord)
    || !isRecord(value.monthlyMilestone)
    || !isRecord(value.recognition)
    || !isRecord(value.annualRecognition)
    || !isRecord(value.yearToDateImpact)) {
    return false;
  }
  return true;
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
  const { locale, theme, displayMode, setDisplayMode, toggleTheme } = useSitePreferences();
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
  const personalization = useMemo(
    () => buildPersonalizationSnapshot(locale, theme, displayMode),
    [locale, theme, displayMode],
  );

  return (
    <SectionShell
      id="gamification"
      hideHeader
      gradient="from-[#fff8f5] via-white to-transparent"
    >
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fff8f6_48%,#ffffff_100%)] text-[#241311]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_74%_12%,rgba(255,118,108,0.16)_0%,rgba(255,118,108,0.08)_18%,transparent_40%),radial-gradient(circle_at_82%_20%,rgba(197,31,31,0.10)_0%,transparent_24%),radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.95)_0%,transparent_55%)]" />
        <div className="pb-12 lg:pb-16">
          <HeroBlock fr={fr} />

          <div className="space-y-6">
            <GamificationReconciliationNotice
              reconciliation={meData?.reconciliation}
              progression={progression}
              locale={locale}
              onAcknowledged={async () => {
                await mutateMe();
              }}
            />
            <GamificationLevelProgressPanel
              progression={progression}
              loading={meLoading}
              error={meError}
              locale={locale}
            />

            <GamificationCatalogPanel
              summary={progression?.summary}
              loading={meLoading}
              error={meError}
              locale={locale}
            />

            <GamificationReconciliationHistory
              history={meData?.reconciliationHistory}
              targetedEntry={meData?.reconciliationTarget}
              progression={progression}
              loading={meLoading}
              error={meError}
              locale={locale}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <EngagementPanel
                progression={progression}
                loading={meLoading}
                error={meError}
                locale={locale}
              />
              <RecognitionPanel
                progression={progression}
                loading={meLoading}
                error={meError}
                locale={locale}
              />
            </div>

            <GamificationImpactPanel
              progression={progression}
              loading={meLoading}
              error={meError}
              locale={locale}
            />

            <GamificationSpogomiCollection locale={locale} />

            <div className="grid gap-6 lg:grid-cols-2">
              <CollectionsPanel
                summary={progression?.summary}
                loading={meLoading}
                error={meError}
                locale={locale}
              />
              <CelebrationsPanel locale={locale} />
            </div>

            <GamificationRulesMigrationNotice
              summary={progression?.summary}
              locale={locale}
              onAcknowledged={async () => {
                await mutateMe();
              }}
            />

            <QuizProgressionCard locale={locale} />

            <MethodologyBanner locale={locale} />

            <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
              <OperationalStatusCard locale={locale} />
              <ProfileSettingsCard
                locale={locale}
                displayMode={displayMode}
                personalization={personalization}
                setDisplayMode={setDisplayMode}
                toggleTheme={toggleTheme}
              />
            </div>

            <WhyGamification locale={locale} />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
