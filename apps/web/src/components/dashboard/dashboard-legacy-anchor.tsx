"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardTabHref, resolveLegacyDashboardAnchor, type DashboardTab } from "@/lib/dashboard/tabs";

export function DashboardLegacyAnchor({ activeTab }: { activeTab: DashboardTab }) {
  const router = useRouter();
  useEffect(() => {
    const openLegacyAnchor = () => {
      const tab = resolveLegacyDashboardAnchor(window.location.hash, new URLSearchParams(window.location.search).get("tab"));
      if (tab && tab !== activeTab) router.replace(dashboardTabHref(tab));
    };
    openLegacyAnchor();
    window.addEventListener("hashchange", openLegacyAnchor);
    return () => window.removeEventListener("hashchange", openLegacyAnchor);
  }, [activeTab, router]);
  return null;
}
