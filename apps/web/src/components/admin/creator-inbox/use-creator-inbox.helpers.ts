import type { CreatorInboxItem } from "@/lib/community/creator-inbox";

export type CreatorInboxSummary = {
  feedback: number;
  promotion: number;
  partner: number;
  event: number;
  legalContentReport: number;
};

export function resolveInboxMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

export function buildCreatorInboxSummary(items: CreatorInboxItem[]): CreatorInboxSummary {
  return {
    feedback: items.filter((item) => item.source === "feedback").length,
    promotion: items.filter((item) => item.source === "promotion").length,
    partner: items.filter((item) => item.source === "partner").length,
    event: items.filter((item) => item.source === "event").length,
    legalContentReport: items.filter((item) => item.source === "legal_content_report").length,
  };
}
