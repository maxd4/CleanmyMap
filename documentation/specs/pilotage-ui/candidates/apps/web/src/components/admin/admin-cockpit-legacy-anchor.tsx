"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminCockpitHref, resolveLegacyAdminAnchor, type AdminCockpitTab } from "@/lib/admin/cockpit-tabs";

export function AdminCockpitLegacyAnchor({ activeTab }: { activeTab: AdminCockpitTab }) {
  const router = useRouter();
  useEffect(() => {
    const handleAnchor = () => {
      const query = new URLSearchParams(window.location.search);
      const tab = resolveLegacyAdminAnchor(window.location.hash, query.get("tab"), query.get("moderation"));
      if (tab && tab !== activeTab) router.replace(adminCockpitHref(tab));
    };
    handleAnchor();
    window.addEventListener("hashchange", handleAnchor);
    return () => window.removeEventListener("hashchange", handleAnchor);
  }, [activeTab, router]);
  return null;
}
