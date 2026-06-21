import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

const mockEnv: {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE?: string;
} = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_test_abcdefghijklmnopqrstuvwxyz",
  NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE: "clerk-supabase",
};

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    getToken: getTokenMock,
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

describe("getSupabaseBrowserClient", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    createClientMock.mockReset();
    mockEnv.NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE = "clerk-supabase";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      "sb_test_abcdefghijklmnopqrstuvwxyz";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("passes a Clerk/Supabase accessToken provider to Supabase and resolves the configured JWT template token", async () => {
    getTokenMock.mockResolvedValue("clerk-supabase-token");
    const client = { from: vi.fn() };
    createClientMock.mockReturnValue(client);

    const { buildClerkSupabaseAccessTokenProvider } = await import(
      "../clerk-supabase-token"
    );
    const { getSupabaseBrowserClient } = await import("./client");

    const accessToken = buildClerkSupabaseAccessTokenProvider(getTokenMock);
    expect(getSupabaseBrowserClient(accessToken)).toBe(client);

    expect(createClientMock).toHaveBeenCalledTimes(1);
    const [, , options] = createClientMock.mock.calls[0] ?? [];
    expect(options).toEqual(
      expect.objectContaining({
        accessToken: expect.any(Function),
      }),
    );

    await expect(options.accessToken()).resolves.toBe("clerk-supabase-token");
    expect(getTokenMock).toHaveBeenCalledWith({
      template: "clerk-supabase",
    });
  });
});
