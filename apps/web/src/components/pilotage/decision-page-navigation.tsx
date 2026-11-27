import Link from "next/link";
import { tabStripClassName, tabItemClassName } from "@/components/ui/cmm-tab-strip.styles";

export function DecisionPageNavigation({ route, activeTab, tabs, locale = "fr" }: { route: string; activeTab: string; tabs: readonly { id: string; label: string }[]; locale?: "fr" | "en" }) {
  return <nav aria-label={locale === "en" ? "Decision views" : "Vues de décision"} className={tabStripClassName("family", tabs.length > 3 ? "grid-cols-1 sm:grid-cols-3 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-3")}>{tabs.map((tab,index) => <Link key={tab.id} href={index === 0 ? route : `${route}?tab=${tab.id}`} prefetch={false} aria-current={activeTab === tab.id ? "page" : undefined} className={tabItemClassName("family",activeTab === tab.id)}>{tab.label}</Link>)}</nav>;
}
