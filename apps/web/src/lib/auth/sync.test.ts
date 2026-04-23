import { afterEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

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
  existingProfile?: { id: string; handle: string | null } | null;
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

  const upsert = vi.fn(() => ({
    select: () => ({
      single,
    }),
  }));

  const maybeSingle = vi.fn(async () => {
    if (state.select === "id, handle" && state.filterColumn === "id") {
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
  };

  return { supabase, upsert, select, eq, maybeSingle, state, single };
}

afterEach(() => {
  vi.restoreAllMocks();
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
      }),
      { onConflict: "id" },
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
