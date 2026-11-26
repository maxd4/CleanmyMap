import Link from "next/link";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import type { PilotageLocale } from "../access-screen-constants";
import { PILOTAGE_PAGE_TABS, pilotagePageTabHref, type PilotagePageTab } from "@/lib/pilotage/page-tabs";

const COPY = {
  summary: { fr: "Synthèse", en: "Summary" },
  operations: { fr: "Opérations", en: "Operations" },
  priorities: { fr: "Priorités et zones", en: "Priorities and areas" },
  analysis: { fr: "Analyse et méthode", en: "Analysis and methods" },
  tools: { fr: "Outils et rapports", en: "Tools and reports" },
} as const;

export function PilotageOverviewSurfaceTabs({ locale, activeTab }: { locale: PilotageLocale; activeTab: PilotagePageTab }) {
  return (
    <nav aria-label={locale === "fr" ? "Navigation du pilotage" : "Operations navigation"}
      className={tabStripClassName("family", "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")}>
      {PILOTAGE_PAGE_TABS.map((tab) => (
        <Link key={tab} href={pilotagePageTabHref(tab)} prefetch={false}
          aria-current={activeTab === tab ? "page" : undefined} className={tabItemClassName("family", activeTab === tab)}>
          {COPY[tab][locale]}
        </Link>
      ))}
    </nav>
  );
}
