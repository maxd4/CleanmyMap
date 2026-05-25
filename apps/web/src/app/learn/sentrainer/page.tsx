"use client";
import { useEffect } from "react";
import { LearnPracticeVisualIntro } from "@/components/learn/learn-practice-visual-intro";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { QuizArchitectureStrip } from "@/components/learn/quiz-architecture-strip";
import { EnvironmentalQuiz } from "@/components/learn/environmental-quiz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

export default function LearnSentrainerPage() {
  const { locale } = useSitePreferences();
  const practiceCard = LEARN_OVERVIEW_CARDS[locale][1];

  useEffect(() => {
    recordLearnPageVisit("sentrainer");
  }, []);

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
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au hub", en: "Back to hub" }}
      accent="yellow"
      highlights={[
        { fr: "Rappel actif", en: "Active recall" },
        { fr: "Rythme court", en: "Short rhythm" },
        { fr: "Révision visible", en: "Visible review" },
      ]}
      cta={{
        href: "/learn/bonnes-pratiques",
        label: { fr: "Voir les bonnes pratiques", en: "See best practices" },
      }}
    >
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
          <EnvironmentalQuiz />
        </section>
      </div>
    </LearnRubricShell>
  );
}
