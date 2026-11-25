import Link from "next/link";
import { BarChart3, FileText, FolderOpen, LibraryBig } from "lucide-react";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";

export type ReportsPageTabId = "generation" | "analysis" | "files" | "library";

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
  {
    id: "files",
    label: "Mes fichiers",
    icon: FolderOpen,
  },
  {
    id: "library",
    label: "Tous les fichiers",
    icon: LibraryBig,
  },
];

export function resolveReportsTab(
  requestedTab: string | undefined,
): ReportsPageTabId {
  if (requestedTab === "analysis" || requestedTab === "pilotage") {
    return "analysis";
  }
  if (requestedTab === "files") {
    return "files";
  }
  if (requestedTab === "library") {
    return "library";
  }

  return "generation";
}

export function ReportsPageTabs({ activeTab }: ReportsPageTabsProps) {
  return (
    <nav
      aria-label="Onglets des rapports"
      data-testid="reports-page-tabs"
      className={tabStripClassName("family", "grid-cols-2 sm:grid-cols-4")}
    >
      {TAB_DEFINITIONS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        const href = `?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={tabItemClassName("family", active)}
          >
            <Icon size={17} aria-hidden="true" className="mr-2 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
