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
    const response = await GET();
    const body = (await response.json()) as { status: string; criticalStatus: string };

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=120, stale-while-revalidate=300",
    );
    expect(body.status).toBe("ok");
    expect(body.criticalStatus).toBe("ok");
  });
});
