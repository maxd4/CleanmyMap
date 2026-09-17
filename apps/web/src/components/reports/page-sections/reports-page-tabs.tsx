import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";

export type ReportsPageTabId = "generation" | "analysis";

type ReportsPageTabsProps = {
  activeTab: ReportsPageTabId;
};

const TAB_DEFINITIONS: Array<{
  id: ReportsPageTabId;
  label: string;
  icon: typeof FileText;
}> = [
  {
    id: "generation",
    label: "Génération",
    icon: FileText,
  },
  {
    id: "analysis",
    label: "Analyse",
    icon: BarChart3,
  },
];

export function resolveReportsTab(
  requestedTab: string | undefined,
): ReportsPageTabId {
  if (requestedTab === "analysis" || requestedTab === "pilotage") {
    return "analysis";
  }

  return "generation";
}

export function ReportsPageTabs({ activeTab }: ReportsPageTabsProps) {
  return (
    <nav
      aria-label="Onglets des rapports"
      data-testid="reports-page-tabs"
      className="w-fit max-w-full"
    >
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-rose-100 bg-white/90 p-1 shadow-[0_12px_28px_-22px_rgba(190,24,93,0.35)]">
      {TAB_DEFINITIONS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        const href = `?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
              active
                ? "border-red-600 bg-red-600 text-white shadow-[0_10px_22px_-16px_rgba(220,38,38,0.65)]"
                : "border-transparent bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50"
            }`}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
