"use client";

import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

/** Registry compatibility: the actual protected route is rendered server-side. */
export function ElusSection() {
  const { locale } = useSitePreferences();
  return <CmmCard className="space-y-3"><p className="cmm-text-secondary">{locale === "fr" ? "Consultez la gouvernance selon votre rôle actif." : "View governance according to your active role."}</p><CmmButton href="/sections/elus" tone="primary">{locale === "fr" ? "Ouvrir Gouvernance" : "Open governance"}</CmmButton></CmmCard>;
}
