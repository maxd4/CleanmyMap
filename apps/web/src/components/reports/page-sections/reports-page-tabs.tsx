import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";

type ReportsPageTabId = "generation" | "analysis";

type ReportsPageTabsProps = {
  activeTab: ReportsPageTabId;
};

const TAB_DEFINITIONS: Array<{
  id: ReportsPageTabId;
  label: string;
  description: string;
  icon: typeof FileText;
  accent: string;
}> = [
  {
    id: "generation",
    label: "Génération",
    description: "Choix, aperçu et export du rapport.",
    icon: FileText,
    accent: "text-slate-500",
  },
  {
    id: "analysis",
    label: "Analyse",
    description: "KPI, comparaisons, résultats et méthodes.",
    icon: BarChart3,
    accent: "text-red-600",
  },
];

export function ReportsPageTabs({ activeTab }: ReportsPageTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-rose-100/80 bg-white/95 p-2 shadow-[0_14px_30px_-22px_rgba(190,24,93,0.3)]">
      {TAB_DEFINITIONS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        const href = `?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-[220px] flex-1 items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left transition ${
              active
                ? "border border-red-200 bg-red-50/70 text-slate-950 shadow-[0_12px_26px_-20px_rgba(220,38,38,0.3)]"
                : "border border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                active ? "bg-white text-red-600" : "bg-slate-50 text-slate-500"
              } ${tab.accent}`}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">{tab.label}</span>
              <span
                className="block text-xs leading-5 text-slate-500"
              >
                {tab.description}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
