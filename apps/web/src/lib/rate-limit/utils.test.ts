import { describe, expect, it } from "vitest";
import { getTrustedClientIp, getTrustedClientIpFromHeaders } from "./utils";

describe("rate limit client ip extraction", () => {
  it("prefers trusted platform headers over spoofable x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    });

    expect(getTrustedClientIpFromHeaders(headers)).toBe("198.51.100.20");
  });

  it("uses x-vercel-forwarded-for when available", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-vercel-forwarded-for": "198.51.100.30, 198.51.100.31",
    });

    expect(getTrustedClientIpFromHeaders(headers)).toBe("198.51.100.30");
  });

  it("prefers a direct request ip when present", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    });

    expect(getTrustedClientIp({ headers, ip: "192.0.2.42" })).toBe("192.0.2.42");
  });

  it("falls back to unknown when no trusted ip header exists", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
    });

    expect(getTrustedClientIpFromHeaders(headers)).toBe("unknown");
  });
});
