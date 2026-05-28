"use client";
import { useEffect } from "react";
import { LearnComprendreVisualIntro } from "@/components/learn/learn-comprendre-visual-intro";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { ImpactOrderOfMagnitudeSection } from "@/components/learn/impact-order-of-magnitude";
import Link from "next/link";
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
      backLabel={{ fr: "Retour au point de départ", en: "Back to start" }}
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
          className="border-amber-200 bg-white/88"
        />
        <ImpactOrderOfMagnitudeSection />
        <div className="flex justify-end">
          <Link
            href="/methodologie"
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
          >
            {locale === "fr" ? "Comprendre la méthodologie complète" : "Explore our full methodology"}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>
        <GIECContent />
        <PlanetaryBoundariesInteractive />
        <SustainableGoalsInteractive />
      </div>
    </LearnRubricShell>
  );
}
