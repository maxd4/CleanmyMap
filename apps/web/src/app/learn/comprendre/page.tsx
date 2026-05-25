"use client";
import { useEffect } from "react";
import { LearnComprendreVisualIntro } from "@/components/learn/learn-comprendre-visual-intro";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { ImpactOrderOfMagnitudeSection } from "@/components/learn/impact-order-of-magnitude";
import { GIECContent } from "@/components/learn/giac-content";
import { PlanetaryBoundariesInteractive } from "@/components/learn/planetary-boundaries";
import { SustainableGoalsInteractive } from "@/components/learn/sustainable-goals";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

export default function LearnComprendrePage() {
  const { locale } = useSitePreferences();
  const understandCard = LEARN_OVERVIEW_CARDS[locale][0];

  useEffect(() => {
    recordLearnPageVisit("comprendre");
  }, []);

  return (
    <LearnRubricShell
      title={{ fr: "Comprendre", en: "Understand" }}
      subtitle={{
        fr: "Lire le contexte avant d'agir",
        en: "Read the context before acting",
      }}
      description={{
        fr: "Cette page rassemble les repères scientifiques, les ordres de grandeur et les renvois vers la méthodologie pour vérifier les calculs.",
        en: "This page groups scientific context, orders of magnitude and links to methodology to verify the calculations.",
      }}
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au hub", en: "Back to hub" }}
      accent="yellow"
      highlights={[
        { fr: "Contexte scientifique", en: "Scientific context" },
        { fr: "Ordres de grandeur", en: "Orders of magnitude" },
        { fr: "Méthodologie", en: "Methodology" },
      ]}
      cta={{
        href: "/learn/sentrainer",
        label: { fr: "Passer à l'entraînement", en: "Move to practice" },
      }}
    >
      <div className="space-y-8">
        <LearnComprendreVisualIntro
          locale={locale}
          card={understandCard}
          question={locale === "fr" ? "Comprendre avant d'agir" : "Understand before acting"}
          clue={
            locale === "fr"
              ? "Repères, ordres de grandeur et méthode se lisent ensemble avant de passer au geste."
              : "Cues, orders of magnitude and method are read together before moving to action."
          }
          action={{
            href: "/learn/sentrainer",
            label: locale === "fr" ? "Passer au quiz" : "Go to quiz",
          }}
          className="border-yellow-200 bg-white/88"
        />
        <ImpactOrderOfMagnitudeSection />
        <GIECContent />
        <PlanetaryBoundariesInteractive />
        <SustainableGoalsInteractive />
      </div>
    </LearnRubricShell>
  );
}
