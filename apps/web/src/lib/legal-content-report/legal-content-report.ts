import { isPlaceholderHost } from "@/lib/security/validation";

export const LEGAL_CONTENT_REPORT_PATH = "/signaler-contenu-illicite";
export const LEGAL_CONTENT_REPORT_SOURCE = "legal_content_report" as const;
export const LEGAL_CONTENT_REPORT_MAX_URL_LENGTH = 2048;
export const LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH = 5000;
export const LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH = 1000;

export type LegalContentReportStatus = "open" | "treated" | "archived";
export type LegalContentReportCreatorState =
  | "new"
  | "responded"
  | "treated"
  | "archived";

export type LegalContentReportInput = {
  submittedByUserId: string | null;
  notifierName: string | null;
  notifierEmail: string | null;
  identityExceptionReason: string | null;
  contentUrl: string;
  contentType: string | null;
  contentId: string | null;
  allegationReason: string;
  goodFaithConfirmed: true;
};

export type LegalContentReportRecord = LegalContentReportInput & {
  id: string;
  createdAt: string;
  status: LegalContentReportStatus;
  creatorState: LegalContentReportCreatorState;
};

export function normalizeLegalContentReportUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LEGAL_CONTENT_REPORT_MAX_URL_LENGTH) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      isPlaceholderHost(parsed.hostname)
    ) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function normalizeOptionalReportText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}
