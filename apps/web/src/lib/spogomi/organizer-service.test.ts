import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRow } from "./preparation-service";

const identityMock = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));

import { listSpogomiEventsForOrganizer } from "./organizer-service";

type OrganizerRow = { action_id: string; organizer_clerk_id: string };

function event(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "event-1",
    action_id: "action-1",
    created_by_clerk_id: "creator-1",
    name: "SPOGOMI",
    location_label: "Paris",
    mode: "casual",
    state: "draft",
    starts_at: "2026-10-13T10:00:00.000Z",
    ends_at: null,
    official_timezone: "Europe/Paris",
    team_size_config: { casual: { minMembers: 3, maxMembers: 5 } },
    creation_state: "ready",
    event_slug: "spogomi",
    public_visibility: "private",
    public_results_visibility: "hidden",
    ...overrides,
  };
}

function createSupabaseMock({
  events,
  organizerRows,
  error,
}: {
  events: EventRow[];
  organizerRows: OrganizerRow[];
  error?: Error;
}) {
  const fromCalls: string[] = [];
  const supabase = {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      const filters = new Map<string, string>();
      let actionIds: string[] | null = null;
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn((field: string, value: string) => {
          filters.set(field, value);
          return query;
        }),
        in: vi.fn((_field: string, values: string[]) => {
          actionIds = values;
          return query;
        }),
        order: vi.fn(() => query),
        range: vi.fn((from: number, to: number) => {
          if (error) return Promise.resolve({ data: null, error: { message: error.message }, count: null });
          const source = table === "spogomi_events" ? events : organizerRows;
          const filtered = source.filter((row) => {
            for (const [field, value] of filters) {
              if (String(row[field as keyof typeof row]) !== value) return false;
            }
            if (actionIds && table === "spogomi_events") {
              return actionIds.includes(String((row as EventRow).action_id));
            }
            return true;
          });
          return Promise.resolve({
            data: filtered.slice(from, to + 1),
            error: null,
            count: filtered.length,
          });
        }),
      };
      return query;
    }),
  };
  return { supabase: supabase as never, fromCalls };
}

function identity(userId: string, activeRole: "benevole" | "admin" | "max" = "benevole", role = activeRole) {
  return { userId, role, activeRole };
}

describe("listSpogomiEventsForOrganizer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a private event created by the current identity", async () => {
    identityMock.mockResolvedValue(identity("user-1"));
    const { supabase } = createSupabaseMock({
      events: [
        event({ id: "owned", created_by_clerk_id: "user-1" }),
        event({ id: "other", created_by_clerk_id: "user-2", action_id: "action-2" }),
      ],
      organizerRows: [],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).resolves.toMatchObject([
      { id: "owned", public_visibility: "private" },
    ]);
  });

  it("returns an event reached through action_organizers", async () => {
    identityMock.mockResolvedValue(identity("organizer-1"));
    const { supabase } = createSupabaseMock({
      events: [event({ id: "co-organized", action_id: "action-2", created_by_clerk_id: "creator-2" })],
      organizerRows: [{ action_id: "action-2", organizer_clerk_id: "organizer-1" }],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "organizer-1")).resolves.toMatchObject([
      { id: "co-organized" },
    ]);
  });

  it("returns no event for an authenticated identity without an ownership relation", async () => {
    identityMock.mockResolvedValue(identity("user-1"));
    const { supabase } = createSupabaseMock({
      events: [event({ created_by_clerk_id: "user-2" })],
      organizerRows: [],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).resolves.toEqual([]);
  });

  it("does not expose an unrelated private event", async () => {
    identityMock.mockResolvedValue(identity("user-1"));
    const { supabase } = createSupabaseMock({
      events: [event({ id: "private-other", created_by_clerk_id: "user-2" })],
      organizerRows: [],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).resolves.toEqual([]);
  });

  it.each(["admin", "max"] as const)("keeps global catalog access for ACTIVE_ROLE=%s", async (activeRole) => {
    identityMock.mockResolvedValue(identity("privileged-user", activeRole));
    const { supabase, fromCalls } = createSupabaseMock({
      events: [event({ id: "private-1" }), event({ id: "draft-2", state: "draft" })],
      organizerRows: [],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "privileged-user")).resolves.toHaveLength(2);
    expect(fromCalls).toEqual(["spogomi_events"]);
  });

  it("does not infer global access from a granted max role when ACTIVE_ROLE is ordinary", async () => {
    identityMock.mockResolvedValue(identity("user-1", "benevole", "max"));
    const { supabase } = createSupabaseMock({
      events: [event({ id: "global-only", created_by_clerk_id: "user-2" })],
      organizerRows: [],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).resolves.toEqual([]);
  });

  it("deduplicates an event found through creation and co-organization", async () => {
    identityMock.mockResolvedValue(identity("user-1"));
    const duplicate = event({ id: "same-event", action_id: "action-1", created_by_clerk_id: "user-1" });
    const { supabase } = createSupabaseMock({
      events: [duplicate],
      organizerRows: [{ action_id: "action-1", organizer_clerk_id: "user-1" }],
    });

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).resolves.toHaveLength(1);
  });

  it("fails closed when a scoped Supabase read fails", async () => {
    identityMock.mockResolvedValue(identity("user-1"));
    const { supabase } = createSupabaseMock({ events: [], organizerRows: [], error: new Error("database unavailable") });

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).rejects.toThrow("database unavailable");
  });

  it("keeps a large global catalog paginated without dropping events", async () => {
    identityMock.mockResolvedValue(identity("max-user", "max"));
    const events = Array.from({ length: 1_017 }, (_, index) =>
      event({ id: `event-${String(index).padStart(4, "0")}` }),
    );
    const { supabase } = createSupabaseMock({ events, organizerRows: [] });

    await expect(listSpogomiEventsForOrganizer(supabase, "max-user")).resolves.toHaveLength(1_017);
  });

  it("uses a bounded number of reads instead of one authorization query per event", async () => {
    identityMock.mockResolvedValue(identity("organizer-1"));
    const events = Array.from({ length: 40 }, (_, index) =>
      event({ id: `event-${index}`, action_id: `action-${index}`, created_by_clerk_id: `creator-${index}` }),
    );
    const organizerRows = events.map((candidate) => ({
      action_id: candidate.action_id,
      organizer_clerk_id: "organizer-1",
    }));
    const { supabase, fromCalls } = createSupabaseMock({ events, organizerRows });

    await expect(listSpogomiEventsForOrganizer(supabase, "organizer-1")).resolves.toHaveLength(40);
    expect(fromCalls.filter((table) => table === "spogomi_events")).toHaveLength(2);
    expect(fromCalls.filter((table) => table === "action_organizers")).toHaveLength(1);
  });
});
