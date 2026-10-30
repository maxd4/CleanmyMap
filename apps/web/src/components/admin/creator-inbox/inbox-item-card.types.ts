import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionOrigin,
} from "@/lib/legal-content-report/legal-content-report";

export type InboxActionParams = {
  source: CreatorInboxSource;
  itemId: string;
  action: "mark_treated" | "responded" | "archive" | "delete" | "change_priority";
  reason: string;
  priority?: "normal" | "high" | "critical";
};

export type LegalDecisionParams = {
  item: CreatorInboxItem;
  action: LegalContentReportDecisionAction;
  origin: LegalContentReportDecisionOrigin;
  reason: string;
  automatedMeansUsed: boolean;
  legalBasis?: string;
  termsBasis?: string;
};
