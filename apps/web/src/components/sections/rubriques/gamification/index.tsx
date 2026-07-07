"use client";

import { useMemo, useState } from "react";
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
import { swrRecentViewOptions } from "@/lib/swr-config";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Requête API impossible.";
    throw new Error(message);
  }
  return body as T;
}

export function GamificationSection() {
  const { locale, theme, displayMode, setDisplayMode, toggleTheme } = useSitePreferences();
  const fr = locale === "fr";
  const [scope, setScope] = useState<"individual" | "collective">("individual");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
  } = useSWR(
    "gamification-me",
    () => fetchJson<MeResponse>("/api/gamification/me"),
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
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <HeroBlock fr={fr} />

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <EngagementPanel
                progression={progression}
                loading={meLoading}
                error={meError}
                locale={locale}
              />
              <RecognitionPanel
                locale={locale}
                scope={scope}
                setScope={setScope}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <CollectionsPanel
                loading={meLoading}
                error={meError}
                locale={locale}
              />
              <CelebrationsPanel locale={locale} />
            </div>

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

export default GamificationSection;
