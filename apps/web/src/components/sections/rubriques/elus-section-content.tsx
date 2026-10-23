"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ElusSectionMethodsPanel } from "./elus-section-methods-panel";
import { ElusSectionNavigation, type ElusSectionTab } from "./elus-section-navigation";
import { ElusSectionOverviewPanel } from "./elus-section-overview-panel";
import { ElusSectionSecurityFooter } from "./elus-section-security-footer";
import { ElusSectionLoadingState } from "./elus-section-states";
import { ElusSectionZonesPanel } from "./elus-section-zones-panel";

export function ElusSectionContent({
  fr,
  locale,
  activeTab,
  onTabChange,
  isLoading,
  data,
}: {
  fr: boolean;
  locale: "fr" | "en";
  activeTab: ElusSectionTab;
  onTabChange: (tab: ElusSectionTab) => void;
  isLoading: boolean;
  data: Parameters<typeof ElusSectionOverviewPanel>[0]["data"] | null | undefined;
}) {
  return (
    <div className="space-y-16 pt-8">
      <ElusSectionNavigation fr={fr} activeTab={activeTab} onTabChange={onTabChange} />
      <AnimatePresence mode="wait">
        {isLoading ? <ElusSectionLoadingState /> : data ? <motion.div key={activeTab} initial={{ opacity: 1, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="space-y-20">
          {activeTab === "overview" ? <ElusSectionOverviewPanel data={data} locale={locale} /> : null}
          {activeTab === "zones" ? <ElusSectionZonesPanel data={data} fr={fr} /> : null}
          {activeTab === "methods" ? <ElusSectionMethodsPanel data={data} /> : null}
        </motion.div> : null}
      </AnimatePresence>
      <ElusSectionSecurityFooter fr={fr} />
    </div>
  );
}
