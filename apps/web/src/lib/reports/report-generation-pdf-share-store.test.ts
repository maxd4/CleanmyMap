import { describe, expect, it } from "vitest";
import {
  createReportPdfShareToken,
  hashReportPdfShareToken,
  isReportPdfShareExpiryValid,
  REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS,
  REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS,
} from "./report-generation-pdf-share-store";

describe("report-generation-pdf-share-store token contract", () => {
  it("creates an unpredictable base64url bearer and stores only its SHA-256-sized digest", () => {
    const token = createReportPdfShareToken();
    const secondToken = createReportPdfShareToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(secondToken).not.toBe(token);
    expect(hashReportPdfShareToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashReportPdfShareToken(token)).not.toContain(token);
  });

  it("bounds share expiry server-side", () => {
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS)).toBe(true);
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS)).toBe(true);
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS - 1)).toBe(false);
    expect(isReportPdfShareExpiryValid(REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS + 1)).toBe(false);
    expect(isReportPdfShareExpiryValid(3600.5)).toBe(false);
  });
});
