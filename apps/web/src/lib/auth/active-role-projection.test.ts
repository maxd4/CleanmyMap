import { afterEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import { syncActiveRoleProjectionToSupabase } from "./active-role-projection";

function createSupabaseMock(activeRole: string | null) {
  const update = vi.fn(() => chain);
  const maybeSingle = vi.fn(async () => ({
    data: { active_role_label: activeRole },
    error: null,
  }));
  const eq = vi.fn(() => chain);
  const select = vi.fn(() => chain);
  const chain = { select, eq, maybeSingle, update };
  return { supabase: { from: vi.fn(() => chain) }, update };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncActiveRoleProjectionToSupabase", () => {
  it("projects ACTIVE_ROLE from Clerk and never writes role_label", async () => {
    const { supabase, update } = createSupabaseMock(null);
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    await expect(
      syncActiveRoleProjectionToSupabase({
        id: "user_active_admin",
        username: "active_admin",
        emailAddresses: [],
        publicMetadata: { role: "max", activeRole: "admin" },
        privateMetadata: {},
        firstName: "Active",
        lastName: "Admin",
      } as never),
    ).resolves.toBe("admin");

    expect(update).toHaveBeenCalledWith({ active_role_label: "admin" });
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({ role_label: expect.anything() }),
    );
  });

  it("does not write an already-correct projection", async () => {
    const { supabase, update } = createSupabaseMock("max");
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    await expect(
      syncActiveRoleProjectionToSupabase({
        id: "user_active_max",
        username: "active_max",
        emailAddresses: [],
        publicMetadata: { role: "max", activeRole: "max" },
        privateMetadata: {},
        firstName: "Active",
        lastName: "Max",
      } as never),
    ).resolves.toBe("max");

    expect(update).not.toHaveBeenCalled();
  });

  it("fails closed when Clerk cannot resolve a user", async () => {
    getSupabaseAdminClientMock.mockClear();
    await expect(syncActiveRoleProjectionToSupabase(null)).resolves.toBeNull();
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();
  });
});
