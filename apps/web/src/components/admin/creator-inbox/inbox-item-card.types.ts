import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionOrigin,
} from "@/lib/legal-content-report/legal-content-report";

export type InboxActionParams = {
  source: CreatorInboxSource;
  itemId: string;
  action: "mark_treated" | "responded" | "archive" | "delete";
  reason: string;
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
