"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { isPromotionEligibleEluAccessDenied } from "./elus-section-access";
import { ElusSectionContent } from "./elus-section-content";
import type { ElusSectionTab } from "./elus-section-navigation";
import { useElusOverview } from "./elus-section-overview";
import { ElusSectionErrorState } from "./elus-section-states";

export function ElusSection() {
  const { locale } = useSitePreferences();
  const { isLoaded, user, isSignedIn } = useUser();
  const fr = locale === "fr";
  const [activeTab, setActiveTab] = useState<ElusSectionTab>("overview");
  const { data, isLoading, error } = useElusOverview(activeTab, {
    isLoaded,
    isSignedIn,
    userId: user?.id,
  });
  const grantedRoleValue =
    typeof user?.publicMetadata?.role === "string"
      ? user.publicMetadata.role
      : undefined;
  const showPromotionCta = isPromotionEligibleEluAccessDenied(
    error,
    Boolean(isSignedIn),
    grantedRoleValue,
  );

  if (error || (isLoaded && isSignedIn !== true)) {
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
      <ElusSectionContent fr={fr} locale={locale} activeTab={activeTab} onTabChange={setActiveTab} isLoading={isLoading} data={data} />
    </SectionShell>
  );
}
