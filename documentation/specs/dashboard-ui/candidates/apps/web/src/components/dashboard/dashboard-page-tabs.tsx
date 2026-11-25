import Link from "next/link";
import { Activity, Bell, BarChart3, Trophy, UserRound } from "lucide-react";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import { DASHBOARD_TABS, dashboardTabHref, type DashboardTab } from "@/lib/dashboard/tabs";
import type { Locale } from "@/lib/ui/preferences";

const TAB_COPY = {
  today: { fr: "Aujourd'hui", en: "Today", icon: Activity },
  notifications: { fr: "Notifications", en: "Notifications", icon: Bell },
  collective: { fr: "Indicateurs collectifs", en: "Collective metrics", icon: BarChart3 },
  engagement: { fr: "Engagement", en: "Engagement", icon: Trophy },
  account: { fr: "Compte", en: "Account", icon: UserRound },
} as const;

export function DashboardPageTabs({ activeTab, locale }: { activeTab: DashboardTab; locale: Locale }) {
  return (
    <nav aria-label={locale === "fr" ? "Navigation de Mon espace" : "Dashboard navigation"}
      className={tabStripClassName("family", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
      {DASHBOARD_TABS.map((tab) => {
        const Icon = TAB_COPY[tab].icon;
        return (
          <Link key={tab} href={dashboardTabHref(tab)} prefetch={false}
            aria-current={activeTab === tab ? "page" : undefined}
            className={tabItemClassName("family", activeTab === tab)}>
            <Icon size={18} aria-hidden="true" className="mr-2 shrink-0" />
            <span>{TAB_COPY[tab][locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
