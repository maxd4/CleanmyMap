import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicyReportOnly } from "./csp";

function parsePolicy(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(";").map((part) => {
      const [directive, ...sources] = part.trim().split(/\s+/);
      return [directive, sources];
    }),
  );
}

describe("CSP report-only contract", () => {
  it("contains the required restrictive directives without an all-origins wildcard", () => {
    const policy = buildContentSecurityPolicyReportOnly({});
    const directives = parsePolicy(policy);

    for (const directive of [
      "default-src",
      "script-src",
      "style-src",
      "connect-src",
      "img-src",
      "font-src",
      "frame-src",
      "object-src",
      "base-uri",
      "frame-ancestors",
      "form-action",
    ]) {
      expect(directives.has(directive)).toBe(true);
    }

    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("form-action")).toEqual(["'self'"]);
    expect(policy).not.toContain("'nonce-");
    expect(policy).not.toMatch(/(?:^|\s)(?:https?:|wss?:|\*)(?:\s|;|$)/);
    expect(directives.get("script-src")).not.toContain("'unsafe-eval'");
    expect(directives.get("script-src")).toContain("https://va.vercel-scripts.com");
    expect(directives.get("connect-src")).toEqual(
      expect.arrayContaining([
        "https://eu.i.posthog.com",
        "https://eu-assets.i.posthog.com",
      ]),
    );
    expect(directives.get("img-src")).toEqual(
      expect.arrayContaining([
        "https://*.tile.openstreetmap.fr",
        "https://*.basemaps.cartocdn.com",
      ]),
    );
  });

  it("derives exact build-time service origins and Supabase realtime", () => {
    const policy = buildContentSecurityPolicyReportOnly({
      CLERK_DOMAIN: "tenant.clerk.com",
      NEXT_PUBLIC_CLERK_PROXY_URL: "https://clerk-proxy.example.test/clerk",
      NEXT_PUBLIC_POSTHOG_HOST: "https://analytics.example.test",
      NEXT_PUBLIC_SENTRY_DSN: "https://example.ingest.sentry.test/42",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    });
    const directives = parsePolicy(policy);

    expect(directives.get("connect-src")).toEqual(
      expect.arrayContaining([
        "https://tenant.clerk.com",
        "https://clerk-proxy.example.test",
        "https://analytics.example.test",
        "https://example.ingest.sentry.test",
        "https://project.supabase.co",
        "wss://project.supabase.co",
      ]),
    );
    expect(directives.get("script-src")).toContain("https://tenant.clerk.com");
    expect(directives.get("frame-src")).toContain("https://tenant.clerk.com");
    expect(directives.get("img-src")).toContain("https://project.supabase.co");
  });

  it("keeps the production Clerk origin explicitly allowlisted", () => {
    const policy = buildContentSecurityPolicyReportOnly({
      CLERK_DOMAIN: "clerk.cleanmymap.fr",
    });
    const directives = parsePolicy(policy);

    for (const directive of ["script-src", "connect-src", "frame-src"]) {
      expect(directives.get(directive)).toContain("https://clerk.cleanmymap.fr");
    }
  });

  it("keeps the Next header in Report-Only mode and does not add enforcement", () => {
    const nextConfig = readFileSync(new URL("../../../next.config.ts", import.meta.url), "utf8");

    expect(nextConfig).toContain("Content-Security-Policy-Report-Only");
    expect(nextConfig).not.toContain('key: "Content-Security-Policy"');
    expect(nextConfig).not.toContain("force-dynamic");
  });
});
