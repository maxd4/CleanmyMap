"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnBehaviorAwarenessSection } from "@/components/learn/learn-behavior-awareness-section";
import { LearnTriContextSection } from "@/components/learn/learn-tri-context-section";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import {
  LearnPracticeThemeTabs,
  type LearnPracticeThemeId,
} from "@/components/learn/learn-practice-theme-tabs";
import { LearnGestesPropresInsightsSection } from "@/components/learn/learn-gestes-propres-insights-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

const VALID_THEMES: LearnPracticeThemeId[] = ["tri", "compost", "reduire"];

function normalizeTheme(theme: string | null): LearnPracticeThemeId {
  return VALID_THEMES.includes(theme as LearnPracticeThemeId)
    ? (theme as LearnPracticeThemeId)
    : "tri";
}

export default function LearnBonnesPratiquesPage() {
  const { locale } = useSitePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const themeFromUrl = normalizeTheme(searchParams.get("theme"));

  const handleThemeChange = (theme: LearnPracticeThemeId) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("theme", theme);
    const nextUrl = `${pathname}?${nextParams.toString()}`;
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <LearnRubricShell
      title={{ fr: "Bonnes pratiques", en: "Good practices" }}
      subtitle={{
        fr: "Lecture progressive",
        en: "Progressive reading",
      }}
      description={{
        fr: "L’essentiel d’abord, puis les détails utiles à la demande.",
        en: "The essentials first, then useful details on demand.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      showVisualPanel={false}
      showHeaderBadges={false}
    >
      <LearnPageVisitTracker pageId="bonnes-pratiques" />
      <div className="space-y-6">
        <LearnPracticeThemeTabs
          locale={locale}
          activeTheme={themeFromUrl}
          onThemeChange={handleThemeChange}
        />

        <span id="guides-courts" className="sr-only" aria-hidden="true" />
        <LearnTriContextSection locale={locale} />
        <LearnBehaviorAwarenessSection locale={locale} id="ressources-utiles" />
        <LearnBlockJourneySection
          locale={locale}
          currentPageId="bonnes-pratiques"
          compact
        />
        <LearnGestesPropresInsightsSection locale={locale} scope="overview" />
      </div>
    </LearnRubricShell>
  );
}
