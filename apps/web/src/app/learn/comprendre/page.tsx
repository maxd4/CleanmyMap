"use client";

import { LearnComprendreVisualIntro } from "@/components/learn/learn-comprendre-visual-intro";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  LearnDeepDiveSection,
  LearnDirectPathSection,
  LearnReadingFlowSection,
  LearnReferenceSystemsSection,
  LearnScaleSection,
} from "./learn-comprendre-sections";

export default function LearnVulgarisationPage() {
  const { locale } = useSitePreferences();
  const understandCard = LEARN_OVERVIEW_CARDS[locale][0];

  return (
    <LearnRubricShell
      title={{ fr: "Vulgarisation", en: "Explanation" }}
      subtitle={{
        fr: "Rendre le contexte lisible sans perdre l'échelle",
        en: "Make the context readable without losing scale",
      }}
      description={{
        fr: "Cette page rend les repères scientifiques plus lisibles, garde les ordres de grandeur et relie les calculs à la méthodologie.",
        en: "This page makes scientific cues easier to read, keeps orders of magnitude and links the calculations to methodology.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      highlights={[
        { fr: "Vulgarisation", en: "Explanation" },
        { fr: "Ordres de grandeur", en: "Orders of magnitude" },
        { fr: "Méthodologie", en: "Methodology" },
      ]}
      cta={{
        href: "/learn/sentrainer",
        label: { fr: "Passer au quiz", en: "Go to quiz" },
      }}
    >
      <LearnPageVisitTracker pageId="comprendre" />
      <div className="space-y-8">
        <LearnComprendreVisualIntro
          locale={locale}
          card={understandCard}
          question={locale === "fr" ? "Vulgariser avant d'agir" : "Explain it clearly before acting"}
          clue={
            locale === "fr"
              ? "Repères, ordres de grandeur et méthode se lisent ensemble avant de passer au geste."
              : "Cues, orders of magnitude and method are read together before moving to action."
          }
          action={{
            href: "/learn/sentrainer",
            label: locale === "fr" ? "Passer au quiz" : "Go to quiz",
          }}
          className="border-amber-200 bg-white/88"
        />
        <LearnDirectPathSection locale={locale} />
        <LearnReadingFlowSection locale={locale} />
        <LearnScaleSection locale={locale} />
        <LearnReferenceSystemsSection locale={locale} />
        <LearnDeepDiveSection locale={locale} />
      </div>
    </LearnRubricShell>
  );
}
