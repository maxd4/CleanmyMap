import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type { CommunityEventItem } from "@/lib/community/http";
import type { CommunityEventsAvailability } from "@/lib/reports/data-availability";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportGenerationResumeConfig } from "@/lib/reports/report-generation-resume";

export type ReportsResumeStatus = "not_found" | "invalid" | "unavailable" | "action_unavailable";

export type ReportsWebDocumentProps = {
  contracts: ActionDataContract[];
  isTruncated?: boolean;
  sourceHealth?: UnifiedSourceHealth;
  communityEvents: CommunityEventItem[];
  communityEventsAvailability?: CommunityEventsAvailability;
  dailyExportAvailability?: ReportExportAvailability;
  actionMediaReadyCountByActionId?: Record<string, number>;
  actionMediaAvailability?: "available" | "unavailable";
  resumeConfig?: ReportGenerationResumeConfig;
  resumeStatus?: ReportsResumeStatus;
  singleAction?: { actionId: string; scopeLabel: string };
};
