import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
  CLERK_SECRET_KEY: "sk_test_456",
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
  isConfigured: (value: string | undefined) => Boolean(value?.trim()),
}));

import { GET } from "./route";

describe("uptime route", () => {
  beforeEach(() => {
    Object.assign(mockEnv, {
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      CLERK_SECRET_KEY: "sk_test_456",
      SENTRY_DSN: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
    });
  });

  it("returns cacheable uptime status payload", async () => {
    mockEnv.SENTRY_DSN = "https://sentry.test/123";
    const response = await GET();
    const body = (await response.json()) as Record<string, unknown> & {
      status: string;
      criticalStatus: string;
      optionalStatus: string;
      criticalConfiguredCount: number;
      criticalAlertCount: number;
      optionalConfiguredCount: number;
      optionalAlertCount: number;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
    );
    expect(body.status).toBe("ok");
    expect(body.criticalStatus).toBe("ok");
    expect(body.optionalStatus).toBe("ok");
    expect(body.criticalConfiguredCount).toBe(4);
    expect(body.criticalAlertCount).toBe(0);
    expect(body.optionalConfiguredCount).toBe(1);
    expect(body.optionalAlertCount).toBe(0);
    expect(Object.keys(body).sort()).toEqual([
      "criticalAlertCount",
      "criticalConfiguredCount",
      "criticalStatus",
      "optionalAlertCount",
      "optionalConfiguredCount",
      "optionalStatus",
      "status",
      "timestamp",
    ]);
    expect(JSON.stringify(body)).not.toMatch(
      /checks|categories|diagnostics|clerk_publishable_mode|clerk_secret_mode|node_env|clerk_keys|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY/,
    );
  });

  it("returns degraded critical aggregates without exposing check details", async () => {
    mockEnv.NEXT_PUBLIC_SUPABASE_URL = "";

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      criticalStatus: string;
      optionalStatus: string;
      criticalConfiguredCount: number;
      criticalAlertCount: number;
      optionalConfiguredCount: number;
      optionalAlertCount: number;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.criticalStatus).toBe("degraded");
    expect(body.optionalStatus).toBe("warning");
    expect(body.criticalConfiguredCount).toBe(3);
    expect(body.criticalAlertCount).toBe(1);
    expect(body.optionalConfiguredCount).toBe(0);
    expect(body.optionalAlertCount).toBe(1);
    expect(JSON.stringify(body)).not.toMatch(
      /checks|categories|diagnostics|clerk_publishable_mode|clerk_secret_mode|node_env|clerk_keys|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY/,
    );
  });
});
