"use client";
import { useEffect } from "react";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { ImpactOrderOfMagnitudeSection } from "@/components/learn/impact-order-of-magnitude";
import { GIECContent } from "@/components/learn/giac-content";
import { PlanetaryBoundariesInteractive } from "@/components/learn/planetary-boundaries";
import { SustainableGoalsInteractive } from "@/components/learn/sustainable-goals";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

export default function LearnComprendrePage() {
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
      accent="purple"
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
        <ImpactOrderOfMagnitudeSection />
        <GIECContent />
        <PlanetaryBoundariesInteractive />
        <SustainableGoalsInteractive />
      </div>
    </LearnRubricShell>
  );
}
