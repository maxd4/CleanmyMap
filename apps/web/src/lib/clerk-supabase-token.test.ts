import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.hoisted(() => vi.fn());

const mockEnv: {
  NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE?: string;
} = {
  NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE: "clerk-supabase",
};

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

describe("clerk supabase token helpers", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    mockEnv.NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE = "clerk-supabase";
    vi.resetModules();
  });

  it("returns the configured Clerk Supabase JWT template", async () => {
    const { getClerkSupabaseJwtTemplate } = await import("./clerk-supabase-token");

    expect(getClerkSupabaseJwtTemplate()).toBe("clerk-supabase");
  });

  it("builds a token provider that requests the configured template", async () => {
    getTokenMock.mockResolvedValue("template-token");

    const { buildClerkSupabaseAccessTokenProvider } = await import(
      "./clerk-supabase-token"
    );
    const provider = buildClerkSupabaseAccessTokenProvider(getTokenMock);

    await expect(provider()).resolves.toBe("template-token");
    expect(getTokenMock).toHaveBeenCalledWith({
      template: "clerk-supabase",
    });
  });

  it("falls back to the default session token when no template is configured", async () => {
    mockEnv.NEXT_PUBLIC_CLERK_SUPABASE_JWT_TEMPLATE = undefined;
    getTokenMock.mockResolvedValue("default-token");

    const { buildClerkSupabaseAccessTokenProvider } = await import(
      "./clerk-supabase-token"
    );
    const provider = buildClerkSupabaseAccessTokenProvider(getTokenMock);

    await expect(provider()).resolves.toBe("default-token");
    expect(getTokenMock).toHaveBeenCalledWith();
  });
});
