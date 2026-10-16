import {
  BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES,
  BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES,
  type BugReportScreenshotMimeType,
} from "./bug-report-screenshot-contract";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BugReportScreenshotError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "validation"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "storage_missing"
      | "storage_invalid"
      | "storage_error",
  ) {
    super(message);
    this.name = "BugReportScreenshotError";
  }
}

function isAllowedMimeType(value: string): value is BugReportScreenshotMimeType {
  return (BUG_REPORT_SCREENSHOT_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function validateBugReportScreenshotInput(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
}): asserts input is {
  originalName: string;
  mimeType: BugReportScreenshotMimeType;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
} {
  if (input.originalName.trim().length < 1 || input.originalName.trim().length > 255) {
    throw new BugReportScreenshotError("Le nom de la capture est invalide.", "validation");
  }
  if (!isAllowedMimeType(input.mimeType)) {
    throw new BugReportScreenshotError("Le format de capture n'est pas accepté.", "validation");
  }
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > BUG_REPORT_SCREENSHOT_MAX_SIZE_BYTES
  ) {
    throw new BugReportScreenshotError("La capture dépasse la taille autorisée.", "validation");
  }
  for (const dimension of [input.width, input.height]) {
    if (
      dimension !== undefined &&
      dimension !== null &&
      (!Number.isInteger(dimension) || dimension < 1 || dimension > 10000)
    ) {
      throw new BugReportScreenshotError("Les dimensions de la capture sont invalides.", "validation");
    }
  }
}

export function assertFeedbackId(feedbackId: string): void {
  if (!UUID_PATTERN.test(feedbackId)) {
    throw new BugReportScreenshotError("La référence du feedback est invalide.", "validation");
  }
}

export function buildBugReportScreenshotPath(feedbackId: string): string {
  assertFeedbackId(feedbackId);
  return `feedback/${feedbackId}/screenshot`;
}

export function buildBugReportScreenshotAttemptPath(
  feedbackId: string,
  attemptId: string,
): string {
  assertFeedbackId(feedbackId);
  assertFeedbackId(attemptId);
  return `feedback/${feedbackId}/screenshot/${attemptId}`;
}

export function buildBugReportScreenshotPrefix(feedbackId: string): string {
  assertFeedbackId(feedbackId);
  return `feedback/${feedbackId}/screenshot`;
}

export function detectImageMimeType(
  bytes: Uint8Array,
): BugReportScreenshotMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
