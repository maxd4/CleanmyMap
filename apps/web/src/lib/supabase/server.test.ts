import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_test_abcdefghijklmnopqrstuvwxyz",
    SUPABASE_SERVICE_ROLE_KEY: "service_role_test_abcdefghijklmnopqrstuvwxyz",
  },
}));

describe("server Supabase client boundary", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    createClientMock.mockReturnValue({});
  });

  it("uses the anon key unless the service role is explicitly requested", async () => {
    const { getSupabaseServerClient, getSupabaseAdminClient } = await import("./server");

    getSupabaseServerClient();
    getSupabaseServerClient(true);
    getSupabaseAdminClient();

    expect(createClientMock.mock.calls.map(([, key]) => key)).toEqual([
      "sb_test_abcdefghijklmnopqrstuvwxyz",
      "service_role_test_abcdefghijklmnopqrstuvwxyz",
      "service_role_test_abcdefghijklmnopqrstuvwxyz",
    ]);
  });
});
