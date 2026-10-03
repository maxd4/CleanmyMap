"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { isPromotionEligibleEluAccessDenied } from "./elus-section-access";
import { ElusSectionMethodsPanel } from "./elus-section-methods-panel";
import { ElusSectionNavigation, type ElusSectionTab } from "./elus-section-navigation";
import { ElusSectionOverviewPanel } from "./elus-section-overview-panel";
import { useElusOverview } from "./elus-section-overview";
import { ElusSectionSecurityFooter } from "./elus-section-security-footer";
import { ElusSectionErrorState, ElusSectionLoadingState } from "./elus-section-states";
import { ElusSectionZonesPanel } from "./elus-section-zones-panel";

export function ElusSection() {
  const { locale } = useSitePreferences();
  const { user, isSignedIn } = useUser();
  const fr = locale === "fr";
  const [activeTab, setActiveTab] = useState<ElusSectionTab>("overview");
  const { data, isLoading, error } = useElusOverview();
  const grantedRoleValue =
    typeof user?.publicMetadata?.role === "string"
      ? user.publicMetadata.role
      : undefined;
  const showPromotionCta = isPromotionEligibleEluAccessDenied(
    error,
    Boolean(isSignedIn),
    grantedRoleValue,
  );

  if (error) {
    return <ElusSectionErrorState showPromotionCta={showPromotionCta} />;
  }

  return (
    <SectionShell
      id="pilotage"
      title={fr ? "Pilotage Institutionnel" : "Institutional Pilotage"}
      subtitle={fr ? "Intelligence territoriale et aide à la décision pour les élus et gestionnaires publics." : "Territorial intelligence and decision support for elected officials and public managers."}
      icon={ShieldCheck}
      gradient="from-blue-600/20 via-slate-900/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        <ElusSectionNavigation fr={fr} activeTab={activeTab} onTabChange={setActiveTab} />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <ElusSectionLoadingState />
          ) : data ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 1, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-20"
            >
              {activeTab === "overview" ? <ElusSectionOverviewPanel data={data} locale={locale} /> : null}
              {activeTab === "zones" ? <ElusSectionZonesPanel data={data} fr={fr} /> : null}
              {activeTab === "methods" ? <ElusSectionMethodsPanel data={data} /> : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ElusSectionSecurityFooter fr={fr} />
      </div>
    </SectionShell>
  );
}
