import type { ReactNode } from "react";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { ReportsPageTabs } from "./reports-page-tabs";
import type { ReportsPageTabId } from "./reports-page-tabs";

type ReportsPageV2LayoutProps = {
  activeTab: ReportsPageTabId;
  generationContent?: ReactNode;
  analysisContent?: ReactNode;
};

export function ReportsPageV2Layout({
  activeTab,
  generationContent,
  analysisContent,
}: ReportsPageV2LayoutProps) {
  const pageFamily = resolvePageFamily("/reports");

  return (
    <CmmGrid data-rubrique-report-root contentClassName="gap-4 lg:gap-6">
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <PageHeader
          family={pageFamily}
          title="Rapports d’impact"
          className="w-full"
        />
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <ReportsPageTabs activeTab={activeTab} />
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <div
          id={`reports-tabpanel-${activeTab}`}
          data-testid="reports-tab-content"
          className="min-w-0"
        >
          {activeTab === "generation" ? generationContent : analysisContent}
        </div>
      </CmmGridItem>
    </CmmGrid>
  );
}
