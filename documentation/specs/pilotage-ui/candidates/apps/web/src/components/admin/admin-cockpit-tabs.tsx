import Link from "next/link";
import { LayoutDashboard, ListChecks, Inbox, History, Settings, Shield } from "lucide-react";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import { ADMIN_COCKPIT_TABS, adminCockpitHref, type AdminCockpitTab } from "@/lib/admin/cockpit-tabs";

const COPY = {
  summary: { fr: "Synthèse", en: "Summary", icon: LayoutDashboard },
  moderation: { fr: "Modération", en: "Moderation", icon: ListChecks },
  inbox: { fr: "Boîte créateur", en: "Creator inbox", icon: Inbox },
  audit: { fr: "Journal", en: "Audit", icon: History },
  tools: { fr: "Outils", en: "Tools", icon: Settings },
  advanced: { fr: "Administration avancée", en: "Advanced administration", icon: Shield },
} as const;

export function AdminCockpitTabs({ activeTab, isMax, locale }: { activeTab: AdminCockpitTab; isMax: boolean; locale: "fr" | "en" }) {
  return (
    <nav aria-label={locale === "fr" ? "Navigation administrative" : "Administration navigation"}
      className={tabStripClassName("family", isMax ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")}>
      {ADMIN_COCKPIT_TABS.filter((tab) => tab !== "advanced" || isMax).map((tab) => {
        const Icon = COPY[tab].icon;
        return <Link key={tab} href={adminCockpitHref(tab)} prefetch={false}
          aria-current={activeTab === tab ? "page" : undefined} className={tabItemClassName("family", activeTab === tab)}>
          <Icon size={18} aria-hidden="true" className="mr-2 shrink-0" /><span>{COPY[tab][locale]}</span>
        </Link>;
      })}
    </nav>
  );
}
