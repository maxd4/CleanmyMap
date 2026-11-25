"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pilotagePageTabHref, resolveLegacyPilotageAnchor, type PilotagePageTab } from "@/lib/pilotage/page-tabs";

export function PilotageLegacyAnchor({ activeTab }: { activeTab: PilotagePageTab }) {
  const router = useRouter();
  useEffect(() => {
    const handleAnchor = () => {
      const query = new URLSearchParams(window.location.search);
      const tab = resolveLegacyPilotageAnchor(window.location.hash, query.get("tab"), query.get("operations"));
      if (tab && tab !== activeTab) router.replace(pilotagePageTabHref(tab));
    };
    handleAnchor();
    window.addEventListener("hashchange", handleAnchor);
    return () => window.removeEventListener("hashchange", handleAnchor);
  }, [activeTab, router]);
  return null;
}
