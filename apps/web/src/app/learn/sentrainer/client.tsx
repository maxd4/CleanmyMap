"use client";

import { Suspense } from "react";
import { LearnPracticeVisualIntro } from "@/components/learn/learn-practice-visual-intro";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { QuizArchitectureStrip } from "@/components/learn/quiz/quiz-architecture-strip";
import { DeferredEnvironmentalQuiz } from "@/components/learn/learn-deferred-panels";
import { LearnSentrainerQuizEntry } from "@/components/learn/learn-sentrainer-quiz-entry";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { parseQuizSentrainerEntryState } from "@/lib/learning/quiz/quiz-entry-state";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ReactNode } from "react";

export default function LearnSentrainerPage({
  staticIntro,
}: {
  staticIntro?: ReactNode;
}) {
  const { locale } = useSitePreferences();
  const practiceCard = LEARN_OVERVIEW_CARDS[locale][1];
  const defaultQuizEntryState = parseQuizSentrainerEntryState(null);

  return (
    <LearnRubricShell
      title={{ fr: "S'entraîner", en: "Practice" }}
      subtitle={{
        fr: "Ancrer les repères par la répétition",
        en: "Anchor the cues through repetition",
      }}
      description={{
        fr: "Sessions courtes, questions mélangées et retour immédiat.",
        en: "Short sessions, mixed questions and immediate feedback.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      staticIntro={staticIntro}
      highlights={[
        { fr: "Rappel actif", en: "Active recall" },
        { fr: "Rythme court", en: "Short rhythm" },
        { fr: "Révision visible", en: "Visible review" },
      ]}
      cta={{
        href: "/learn/bonnes-pratiques",
        label: {
          fr: "Voir tri, compost, comportements",
          en: "See sorting, composting, behaviors",
        },
      }}
    >
      <LearnPageVisitTracker pageId="sentrainer" />
      <div className="space-y-8">
        <LearnPracticeVisualIntro
          locale={locale}
          card={practiceCard}
          question={locale === "fr" ? "S'entraîner pour ancrer vite" : "Practice to anchor fast"}
          clue={
            locale === "fr"
              ? "Des sessions courtes, des questions mélangées et un retour immédiat pour garder le rythme."
              : "Short sessions, mixed questions, and immediate feedback keep the rhythm going."
          }
          action={{
            href: "#quiz-architecture",
            label: locale === "fr" ? "Voir le panneau de session" : "See the session panel",
          }}
        />
        <LearnBlockJourneySection locale={locale} currentPageId="sentrainer" />

        <section id="quiz-architecture">
          <QuizArchitectureStrip
            locale={locale}
            summary={{
              total: 12,
              counts: { new: 3, failed: 2, due: 4, mastered: 3 },
              nextReviewAt: "2026-06-01T09:00:00.000Z",
            }}
          />
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <Suspense
            fallback={
              <DeferredEnvironmentalQuiz
                locale={locale}
                {...defaultQuizEntryState}
              />
            }
          >
            <LearnSentrainerQuizEntry locale={locale} />
          </Suspense>
        </section>
      </div>
    </LearnRubricShell>
  );
}
