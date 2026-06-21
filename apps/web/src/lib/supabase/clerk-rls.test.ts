import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    getToken: getTokenMock,
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_test_abcdefghijklmnopqrstuvwxyz",
    NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE: "clerk-supabase",
  },
}));

describe("getSupabaseClerkRlsClient", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    createClientMock.mockReset();
  });

  it("creates a native Clerk/Supabase client using the session token", async () => {
    getTokenMock.mockResolvedValue("native-session-token");
    const client = { from: vi.fn() };
    createClientMock.mockReturnValue(client);

    const { getSupabaseClerkRlsClient } = await import("./clerk-rls");
    await expect(getSupabaseClerkRlsClient()).resolves.toBe(client);

    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(getTokenMock).toHaveBeenCalledWith({
      template: "clerk-supabase",
    });
    expect(createClientMock).toHaveBeenCalledTimes(1);

    const [, , options] = createClientMock.mock.calls[0] ?? [];
    expect(options).toEqual(
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }),
        accessToken: expect.any(Function),
      }),
    );
    await expect(options.accessToken()).resolves.toBe("native-session-token");
  });

  it("returns null when no Clerk session token is available", async () => {
    getTokenMock.mockResolvedValue(null);

    const { getSupabaseClerkRlsClient } = await import("./clerk-rls");
    await expect(getSupabaseClerkRlsClient()).resolves.toBeNull();

    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("throws when a required RLS client cannot be created", async () => {
    getTokenMock.mockResolvedValue(null);

    const { requireSupabaseClerkRlsClient } = await import("./clerk-rls");

    await expect(requireSupabaseClerkRlsClient()).rejects.toThrow(
      "Clerk/Supabase JWT accessToken unavailable for a required RLS flow.",
    );
  });
});
