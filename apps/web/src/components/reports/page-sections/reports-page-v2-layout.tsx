import type { ReactNode } from "react";
import { CmmGrid, CmmGridItem } from "@/components/ui/cmm-grid";
import { ReportsPageTabs } from "./reports-page-tabs";

type ReportsPageTabId = "generation" | "analysis";

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
  return (
    <CmmGrid data-rubrique-report-root contentClassName="gap-4 lg:gap-6">
      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <ReportsPageTabs activeTab={activeTab} />
      </CmmGridItem>

      <CmmGridItem span={{ mobile: 4, tablet: 6, desktop: 12 }}>
        <div className="min-w-0">
          {activeTab === "generation" ? generationContent : analysisContent}
        </div>
      </CmmGridItem>
    </CmmGrid>
  );
}
