import {
  SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES,
  SIGNALEMENT_EVIDENCE_BUCKET,
  SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES,
  SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS,
  type SignalementEvidenceMimeType,
} from "@/lib/actions/signalement/signalement-media-contract";

export const BUG_REPORT_SCREENSHOT_BUCKET = SIGNALEMENT_EVIDENCE_BUCKET;
export const BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES = SIGNALEMENT_EVIDENCE_MAX_SIZE_BYTES;
export const BUG_REPORT_SCREENSHOT_SIGNED_URL_TTL_SECONDS = SIGNALEMENT_EVIDENCE_SIGNED_URL_TTL_SECONDS;
export const BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES = SIGNALEMENT_EVIDENCE_ALLOWED_MIME_TYPES;

export type BugReportScreenshotMimeType = SignalementEvidenceMimeType;
export type BugReportScreenshotUploadState = "pending" | "ready" | "failed";

export type BugReportScreenshotRecord = {
  feedbackId: string;
  storageBucket: typeof BUG_REPORT_SCREENSHOT_BUCKET;
  storagePath: string;
  originalName: string;
  mimeType: BugReportScreenshotMimeType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  uploadState: BugReportScreenshotUploadState;
};

export type BugReportScreenshotReadItem = BugReportScreenshotRecord & {
  signedUrl: string;
  signedUrlExpiresAt: string;
};
