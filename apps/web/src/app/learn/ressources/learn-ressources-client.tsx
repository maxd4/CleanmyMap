"use client";

import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

import {
  LearnBrowserHistoryCleanupSection,
  LearnDigitalMaintenanceSection,
  LearnMailboxCleanupSection,
  LearnResourceShortcutsSection,
  LearnRessourcesCalendarPanel,
  LearnRessourcesOverview,
  LearnSortingCuesSection,
} from "./learn-ressources-client.sections";

export { LearnArtworkAccordion, LearnRessourcesOverview } from "./learn-ressources-client.sections";

export function LearnRessourcesClient() {
  const { locale } = useSitePreferences();

  return (
    <LearnRubricShell
      title={{ fr: "Ressources", en: "Resources" }}
      subtitle={{
        fr: "Kit terrain, repères de tri et événements utiles",
        en: "Field kit, sorting cues and useful events",
      }}
      description={{
        fr: "Trois portes d'entrée visibles d'abord, puis un calendrier plus léger pour garder la page orientée action.",
        en: "Three visible entry points first, then a lighter calendar to keep the page action-oriented.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      highlights={[
        { fr: "Kit terrain", en: "Field kit" },
        { fr: "Repères de tri", en: "Sorting cues" },
        { fr: "Événements", en: "Events" },
      ]}
      cta={{
        href: "/learn/comprendre",
        label: { fr: "Voir le contexte", en: "See the context" },
      }}
    >
      <LearnPageVisitTracker pageId="bonnes-pratiques" />
      <div className="space-y-6">
        <LearnRessourcesOverview locale={locale} />
        <LearnBlockJourneySection locale={locale} currentPageId="bonnes-pratiques" />

        <LearnResourceShortcutsSection locale={locale} />

        <LearnMailboxCleanupSection locale={locale} />

        <LearnBrowserHistoryCleanupSection locale={locale} />

        <LearnDigitalMaintenanceSection locale={locale} />

        <section id="calendrier">
          <LearnRessourcesCalendarPanel locale={locale} />
        </section>

        <LearnSortingCuesSection locale={locale} />
      </div>
    </LearnRubricShell>
  );
}
