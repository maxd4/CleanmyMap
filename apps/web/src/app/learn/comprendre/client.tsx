"use client";

import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { EnvironmentalPolicyRecord } from "@/lib/learning/policies/environmental-policy-registry";
import type { PresidentialPublicArchive } from "@/lib/learning/policies/presidential-environmental-corpus";
import { LearnComprendreTabs } from "./learn-comprendre-tabs";

type LearnComprendrePageContentProps = {
  publishedPolicies: EnvironmentalPolicyRecord[];
  presidentialArchive: PresidentialPublicArchive;
};

export default function LearnComprendrePageContent({ publishedPolicies, presidentialArchive }: LearnComprendrePageContentProps) {
  const { locale } = useSitePreferences();

  return (
    <LearnRubricShell
      title={{ fr: "Vulgarisation", en: "Environmental science" }}
      subtitle={{ fr: "Comprendre les enjeux environnementaux", en: "Understand environmental challenges" }}
      description={{
        fr: "Des notions essentielles aux données scientifiques : explorez les impacts, les grands enjeux planétaires et les réponses collectives.",
        en: "From essential concepts to scientific evidence: explore impacts, planetary challenges and collective responses.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      showVisualPanel={false}
      cta={{ href: "/learn/sentrainer", label: { fr: "S'entraîner", en: "Practise" }, tone: "primary" }}
    >
      <LearnPageVisitTracker pageId="comprendre" />
      <LearnComprendreTabs locale={locale} publishedPolicies={publishedPolicies} presidentialArchive={presidentialArchive} />
      <LearnBlockJourneySection locale={locale} currentPageId="comprendre" compact />
    </LearnRubricShell>
  );
}
