import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";

type ReportsPageTabId = "generation" | "pilotage";

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
    accent: "text-red-600",
  },
  {
    id: "pilotage",
    label: "Pilotage",
    description: "KPI, lecture des résultats et méthodes.",
    icon: BarChart3,
    accent: "text-cyan-700",
  },
];

export function ReportsPageTabs({ activeTab }: ReportsPageTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
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
                ? "bg-slate-950 text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.5)]"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                active ? "bg-white/10" : "bg-white text-slate-500"
              } ${tab.accent}`}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">{tab.label}</span>
              <span
                className={`block text-xs leading-5 ${active ? "text-white/72" : "text-slate-500"}`}
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
