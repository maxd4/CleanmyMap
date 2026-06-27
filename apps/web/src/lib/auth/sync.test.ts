import { afterEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn(async () => null));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import { syncClerkUserToSupabase } from "./sync";

type MockState = {
  select: string | null;
  filterColumn: string | null;
  filterValue: string | null;
};

function createSupabaseMock(options: {
  existingProfile?: {
    id: string;
    handle: string | null;
    display_name_mode?: string | null;
    metadata?: Record<string, unknown> | null;
    paris_arrondissement?: number | null;
  } | null;
  takenHandles?: Record<string, string | null>;
  upsertError?: unknown;
}) {
  const state: MockState = {
    select: null,
    filterColumn: null,
    filterValue: null,
  };

  const single = vi.fn(async () => ({
    data: options.upsertError ? null : { id: "user", handle: "resolved_handle" },
    error: options.upsertError ?? null,
  }));
  const upload = vi.fn(async () => ({
    data: { path: "profiles/user/avatar.jpg" },
    error: null,
  }));
  const getPublicUrl = vi.fn((path: string) => ({
    data: {
      publicUrl: `https://supabase.test/storage/v1/object/public/avatars/${path}`,
    },
  }));

  const upsert = vi.fn(() => ({
    select: () => ({
      single,
    }),
  }));

  const maybeSingle = vi.fn(async () => {
    if (state.select?.includes("display_name_mode") && state.filterColumn === "id") {
      return {
        data: options.existingProfile ?? null,
        error: null,
      };
    }

    if (state.select === "id" && state.filterColumn === "handle") {
      const matchedId = options.takenHandles?.[state.filterValue ?? ""];
      return {
        data: matchedId ? { id: matchedId, handle: state.filterValue } : null,
        error: null,
      };
    }

    return { data: null, error: null };
  });

  const eq = vi.fn((column: string, value: string) => {
    state.filterColumn = column;
    state.filterValue = value;
    return chain;
  });

  const select = vi.fn((columns: string) => {
    state.select = columns;
    return chain;
  });

  const chain = {
    select,
    eq,
    maybeSingle,
    upsert,
  };

  const supabase = {
    from: vi.fn(() => chain),
    storage: {
      from: vi.fn(() => ({
        upload,
        getPublicUrl,
      })),
    },
  };

  return { supabase, upsert, select, eq, maybeSingle, state, single, upload, getPublicUrl };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("syncClerkUserToSupabase", () => {
  it("preserves an existing handle on update", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: { id: "user_1", handle: "custom_handle" },
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_1",
      username: "custom_handle",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: {},
      privateMetadata: {},
      firstName: "Maxence",
      lastName: "Demo",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "custom_handle",
        display_name: "Maxence Demo",
        display_name_mode: "full_name",
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("generates a unique fallback handle when the base handle is taken", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: null,
      takenHandles: {
        max: "user_other",
      },
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_abcdef123456",
      username: "max",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: {},
      privateMetadata: {},
      firstName: "Max",
      lastName: "",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "max_123456",
        display_name: "Max",
        display_name_mode: "full_name",
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("promotes profile metadata admin into the Supabase role label", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: null,
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_admin",
      username: "admin",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: { profile: "admin" },
      privateMetadata: {},
      firstName: "Ada",
      lastName: "Admin",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        role_label: "admin",
        display_name: "Ada Admin",
        display_name_mode: "full_name",
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("stores IMU as the Supabase role label for the owner", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: null,
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_max",
      username: "max",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: { role: "max" },
      privateMetadata: {},
      firstName: "Max",
      lastName: "Owner",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        role_label: "imu",
        display_name: "Max Owner",
        display_name_mode: "full_name",
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("derives the arrondissement from a district zone name during sync", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: null,
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_zone",
      username: "zone_user",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: {
        zoneName: "5e arrondissement",
      },
      privateMetadata: {},
      firstName: "Zone",
      lastName: "User",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        paris_arrondissement: 5,
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("backfills new territory metadata from the legacy arrondissement column", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: {
        id: "user_legacy",
        handle: "legacy_handle",
        display_name_mode: null,
        metadata: null,
        paris_arrondissement: 15,
      },
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_legacy",
      username: "legacy_handle",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: {},
      privateMetadata: {},
      firstName: "Legacy",
      lastName: "Profile",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        paris_arrondissement: 15,
        metadata: expect.objectContaining({
          territoryCountry: "France",
          territoryLevel: "arrondissement",
          territoryLabel: "Paris 15e",
          territoryArrondissement: 15,
          territoryLocationType: "residence",
          zoneName: "Paris 15e",
          parisArrondissement: 15,
          parisLocationType: "residence",
        }),
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("preserves a pseudo display preference during sync", async () => {
    const { supabase, upsert } = createSupabaseMock({
      existingProfile: {
        id: "user_2",
        handle: "custom_handle",
        display_name_mode: "pseudo",
      },
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_2",
      username: "handle_mode",
      emailAddresses: [],
      imageUrl: "https://example.com/avatar.png",
      publicMetadata: {},
      privateMetadata: {},
      firstName: "Mode",
      lastName: "Pseudo",
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "custom_handle",
        display_name_mode: "pseudo",
        display_name: "handle_mode",
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("mirrors Clerk avatars into Supabase Storage when available", async () => {
    const { supabase, upsert, upload } = createSupabaseMock({
      existingProfile: null,
    });
    getSupabaseAdminClientMock.mockReturnValue(supabase);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Blob(["avatar-bytes"], { type: "image/jpeg" }), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
      ),
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await syncClerkUserToSupabase({
      id: "user_clerk_avatar",
      username: "avatar_user",
      emailAddresses: [],
      imageUrl: "https://img.clerk.com/avatar.png",
      publicMetadata: {},
      privateMetadata: {},
      firstName: "Avatar",
      lastName: "User",
    } as never);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_url: expect.stringContaining("/storage/v1/object/public/avatars/"),
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
