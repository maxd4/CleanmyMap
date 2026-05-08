import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicRateLimitPayload,
  createPublicRateLimitResponse,
  hasHoneypotSignal,
  hasRecentSubmission,
  is24HourTimeString,
  isIsoDateString,
  isPlaceholderHost,
  isPlaceholderUrl,
  normalizePublicChannelUrl,
} from "./validation";

const helperEmail = ["hello", "cleanmymap.fr"].join("@");

describe("security validation helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates placeholder hosts and public URLs explicitly", () => {
    expect(isPlaceholderHost("localhost")).toBe(true);
    expect(isPlaceholderHost("example.com")).toBe(true);
    expect(isPlaceholderHost("cleanmymap.fr")).toBe(false);
    expect(isPlaceholderUrl("https://example.com/demo")).toBe(true);
    expect(isPlaceholderUrl("https://cleanmymap.fr/demo")).toBe(false);
  });

  it("normalizes allowed public channel URLs and rejects unsafe values", () => {
    expect(normalizePublicChannelUrl("https://cleanmymap.fr/network")).toBe(
      "https://cleanmymap.fr/network",
    );
    expect(normalizePublicChannelUrl(`mailto:${helperEmail}`)).toBe(
      `mailto:${helperEmail}`,
    );
    expect(normalizePublicChannelUrl("tel:+33102030405")).toBe("tel:+33102030405");
    expect(normalizePublicChannelUrl("javascript:alert(1)")).toBeNull();
    expect(normalizePublicChannelUrl("https://localhost/demo")).toBeNull();
  });

  it("parses ISO dates and 24h times without regex shortcuts", () => {
    expect(isIsoDateString("2026-05-07")).toBe(true);
    expect(isIsoDateString("2026-02-30")).toBe(false);
    expect(isIsoDateString("07/05/2026")).toBe(false);

    expect(is24HourTimeString("00:00")).toBe(true);
    expect(is24HourTimeString("23:59")).toBe(true);
    expect(is24HourTimeString("24:00")).toBe(false);
    expect(is24HourTimeString("9:15")).toBe(false);
  });

  it("detects anti-spam signals deterministically", () => {
    const now = 1_750_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    expect(hasHoneypotSignal(" bot ")).toBe(true);
    expect(hasHoneypotSignal("")).toBe(false);
    expect(hasRecentSubmission(now - 1000)).toBe(true);
    expect(hasRecentSubmission(now - 2000)).toBe(false);
  });

  it("creates a homogeneous public rate limit payload", async () => {
    const payload = buildPublicRateLimitPayload("Message bloqué", {
      code: "rate_limited",
      retryAfterSeconds: 42,
    });

    expect(payload).toEqual({
      error: "Message bloqué",
      kind: "validation",
      status: "rate_limited",
      code: "rate_limited",
      retryAfterSeconds: 42,
    });

    const response = createPublicRateLimitResponse("Message bloqué", {
      code: "rate_limited",
      retryAfterSeconds: 42,
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject(payload);
  });
});
