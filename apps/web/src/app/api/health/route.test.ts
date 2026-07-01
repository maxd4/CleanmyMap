import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
  CLERK_SECRET_KEY: "sk_test_456",
}));

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const limitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: mockEnv,
  isConfigured: (value: string | undefined) => Boolean(value?.trim()),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

import { GET } from "./route";

describe("health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockEnv, {
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      CLERK_SECRET_KEY: "sk_test_456",
    });

    limitMock.mockResolvedValue({ error: null });
    selectMock.mockReturnValue({ limit: limitMock });
    fromMock.mockReturnValue({ select: selectMock });
    getSupabaseServerClientMock.mockReturnValue({ from: fromMock });
  });

  it("returns a cacheable response and uses a lightweight Supabase health probe", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
    );
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(false);
    expect(fromMock).toHaveBeenCalledWith("actions");
    expect(selectMock).toHaveBeenCalledWith("id", { head: true });
    expect(limitMock).toHaveBeenCalledWith(1);
  });

  it("returns a degraded response without hitting Supabase when the config is incomplete", async () => {
    mockEnv.SUPABASE_SERVICE_ROLE_KEY = "";

    const response = await GET();
    const body = (await response.json()) as { ok: boolean; status: string };

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
    );
    expect(body.ok).toBe(false);
    expect(body.status).toBe("degraded");
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
