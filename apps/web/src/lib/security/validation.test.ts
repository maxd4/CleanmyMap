import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  buildPublicRateLimitPayload,
  createPublicRateLimitResponse,
  hasHttpsProtocol,
  hasHoneypotSignal,
  hasRecentSubmission,
  is24HourTimeString,
  isIsoDateString,
  isPlaceholderHost,
  isPlaceholderUrl,
  normalizePublicChannelUrl,
  parseJsonBodyWithSchema,
  rejectPublicFormAbuse,
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

  it("accepts only absolute HTTPS URLs for security boundaries", () => {
    expect(hasHttpsProtocol("https://cleanmymap.fr")).toBe(true);
    expect(hasHttpsProtocol("http://cleanmymap.fr")).toBe(false);
    expect(hasHttpsProtocol("https-not-an-url")).toBe(false);
    expect(hasHttpsProtocol(undefined)).toBe(false);
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

  it("rejects honeypot and too-rapid submissions while allowing a clean payload", async () => {
    const now = 1_750_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const honeypotResponse = rejectPublicFormAbuse({ honeypot: "filled by a bot" });
    expect(honeypotResponse?.status).toBe(429);
    await expect(honeypotResponse?.json()).resolves.toMatchObject({
      status: "rate_limited",
    });

    const recentResponse = rejectPublicFormAbuse({ submittedAt: now - 1 });
    expect(recentResponse?.status).toBe(429);
    expect(rejectPublicFormAbuse({ submittedAt: now - 2_000 })).toBeNull();
  });

  it("fails closed for malformed JSON and schema-invalid payloads without echoing content", async () => {
    const schema = z.object({ name: z.string().min(1) }).strict();

    const malformed = await parseJsonBodyWithSchema(
      new Request("https://cleanmymap.fr/api/contact", {
        method: "POST",
        body: "{\"name\":",
      }),
      schema,
    );
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) {
      expect(malformed.response.status).toBe(400);
      await expect(malformed.response.json()).resolves.toEqual({
        error: "Invalid JSON payload",
      });
    }

    const secret = "do-not-echo";
    const invalid = await parseJsonBodyWithSchema(
      new Request("https://cleanmymap.fr/api/contact", {
        method: "POST",
        body: JSON.stringify({ name: "", secret }),
      }),
      schema,
    );
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.response.status).toBe(400);
      const body = await invalid.response.json();
      expect(body.error).toBe("Invalid payload");
      expect(JSON.stringify(body)).not.toContain(secret);
    }

    const valid = await parseJsonBodyWithSchema(
      new Request("https://cleanmymap.fr/api/contact", {
        method: "POST",
        body: JSON.stringify({ name: "Alice" }),
      }),
      schema,
    );
    expect(valid).toEqual({ ok: true, data: { name: "Alice" } });
  });

  it("rejects non-string, overlong and malformed channel inputs", () => {
    expect(normalizePublicChannelUrl(null)).toBeNull();
    expect(normalizePublicChannelUrl(" ")).toBeNull();
    expect(normalizePublicChannelUrl("x".repeat(2_049))).toBeNull();
    expect(normalizePublicChannelUrl("not a URL")).toBeNull();
    expect(isPlaceholderUrl("not a URL")).toBe(false);
    expect(isIsoDateString(null)).toBe(false);
    expect(isIsoDateString("2026-13-01")).toBe(false);
    expect(is24HourTimeString(null)).toBe(false);
    expect(is24HourTimeString("12-00")).toBe(false);
    expect(is24HourTimeString("123:00")).toBe(false);
  });
});
