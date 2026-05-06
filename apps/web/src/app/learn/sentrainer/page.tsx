"use client";
import { useEffect } from "react";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { CognitivePrimer } from "@/components/learn/cognitive-primer";
import { EnvironmentalQuiz } from "@/components/learn/environmental-quiz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

export default function LearnSentrainerPage() {
  const { locale } = useSitePreferences();

  useEffect(() => {
    recordLearnPageVisit("sentrainer");
  }, []);

  return (
    <LearnRubricShell
      title={{ fr: "S'entraîner", en: "Practice" }}
      subtitle={{
        fr: "Ancrer les repères sans alourdir la lecture",
        en: "Anchor the cues without making the reading heavy",
      }}
      description={{
        fr: "Cette page propose des exercises et des quiz pour ancrer les bonnes pratiques de depollution urbaine.",
        en: "This page offers exercises and quizzes to anchor good urban cleanup practices.",
      }}
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au hub", en: "Back to hub" }}
      accent="blue"
      highlights={[
        { fr: "Quiz interactif", en: "Interactive quiz" },
        { fr: "Exercices visuels", en: "Visual exercises" },
        { fr: "Validation connaissances", en: "Knowledge validation" },
      ]}
      cta={{
        href: "/learn/bonnes-pratiques",
        label: { fr: "Voir les bonnes pratiques", en: "See best practices" },
      }}
    >
      <section className="grid gap-8 lg:grid-cols-2">
        <CognitivePrimer locale={locale} />
        <EnvironmentalQuiz />
      </section>
    </LearnRubricShell>
  );
}
