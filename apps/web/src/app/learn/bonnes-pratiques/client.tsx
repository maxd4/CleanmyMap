"use client";

import { Suspense } from "react";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnBehaviorAwarenessSection } from "@/components/learn/learn-behavior-awareness-section";
import { LearnTriContextSection } from "@/components/learn/learn-tri-context-section";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { LearnPracticeThemeTabs } from "@/components/learn/learn-practice-theme-tabs";
import { LearnPracticeThemeSelection } from "@/components/learn/learn-practice-theme-selection";
import { LearnGestesPropresInsightsSection } from "@/components/learn/learn-gestes-propres-insights-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ReactNode } from "react";

export default function LearnBonnesPratiquesPage({
  staticIntro,
}: {
  staticIntro?: ReactNode;
}) {
  const { locale } = useSitePreferences();

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
      staticIntro={staticIntro}
    >
      <LearnPageVisitTracker pageId="bonnes-pratiques" />
      <div className="space-y-6">
        <Suspense
          fallback={
            <LearnPracticeThemeTabs
              locale={locale}
              activeTheme="tri"
              onThemeChange={() => undefined}
            />
          }
        >
          <LearnPracticeThemeSelection locale={locale} />
        </Suspense>

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
