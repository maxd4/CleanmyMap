import { describe, expect, it, vi } from "vitest";
import { listSpogomiEventsForUser } from "./personal-events-service";

vi.mock("server-only", () => ({}));

type TableRow = Record<string, unknown>;

function createSupabaseFixture(options: {
  events: TableRow[];
  organizers: TableRow[];
  reviewers: TableRow[];
  participants: TableRow[];
}) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const selected = { table, filters };
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) { filters[column] = value; return query; },
        is(column: string, value: unknown) { filters[column] = value; return query; },
        in(column: string, values: readonly unknown[]) { filters[column] = values; return query; },
        order() { return query; },
        range(from: number, to: number) {
          const rows = rowsFor(selected).slice(from, to + 1);
          return Promise.resolve({ data: rows, error: null, count: rowsFor(selected).length });
        },
      };
      return query;
    },
  };

  function rowsFor(query: { table: string; filters: Record<string, unknown> }): TableRow[] {
    const source = query.table === "spogomi_events"
      ? options.events
      : query.table === "action_organizers"
        ? options.organizers
        : query.table === "spogomi_event_reviewers"
          ? options.reviewers
          : options.participants;
    return source.filter((row) => Object.entries(query.filters).every(([column, value]) => {
      if (Array.isArray(value)) return value.includes(row[column]);
      if (column === "revoked_at" && value === null) return row[column] === null;
      return row[column] === value;
    }));
  }
}

const event = (id: string, actionId: string, visibility: "private" | "published" = "private") => ({
  id,
  action_id: actionId,
  name: `SPOGOMI ${id}`,
  event_slug: `${id}-slug`,
  mode: "casual",
  state: "draft",
  starts_at: `2026-06-${id === "event-a" ? "02" : "03"}T10:00:00.000Z`,
  ends_at: null,
  public_visibility: visibility,
  public_results_visibility: "hidden",
});

describe("listSpogomiEventsForUser", () => {
  it("deduplicates multi-role relations and paginates every relation source", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a", "published"), event("event-b", "action-b")],
      organizers: [{ action_id: "action-a", organizer_clerk_id: "user-1" }, { action_id: "action-b", organizer_clerk_id: "user-1" }],
      reviewers: [{ event_id: "event-a", clerk_id: "user-1", role: "referee", revoked_at: null }],
      participants: [{ event_id: "event-a", clerk_id: "user-1", account_link_status: "verified" }],
    });

    const result = await listSpogomiEventsForUser(supabase as never, "user-1");

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "event-a", relations: ["organizer", "referee", "participant"], accesses: ["manage", "arbitrate", "participate"] });
    expect(result[1]?.links.space).toBe("/spogomi/event-a-slug/espace");
    expect(result[1]?.links.public).toBe("/spogomi/event-a-slug");
    expect(result[1]).not.toHaveProperty("action_id");
  });

  it("keeps relations found after the first 1,000-row page", async () => {
    const events = Array.from({ length: 1001 }, (_, index) => event(`event-${index}`, `action-${index}`));
    const supabase = createSupabaseFixture({
      events,
      organizers: [],
      reviewers: events.map((current) => ({ event_id: current.id, clerk_id: "user-1", role: "observer", revoked_at: null })),
      participants: [],
    });

    const result = await listSpogomiEventsForUser(supabase as never, "user-1");

    expect(result).toHaveLength(1001);
    expect(result.some((current) => current.id === "event-1000")).toBe(true);
  });

  it("uses only verified participant links and active reviewer assignments", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a"), event("event-b", "action-b")],
      organizers: [],
      reviewers: [{ event_id: "event-a", clerk_id: "user-1", role: "observer", revoked_at: "2026-01-01T00:00:00.000Z" }],
      participants: [{ event_id: "event-b", clerk_id: "user-1", account_link_status: "unlinked" }],
    });

    await expect(listSpogomiEventsForUser(supabase as never, "user-1")).resolves.toEqual([]);
  });

  it("does not include events reached only by another user's relations", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a")],
      organizers: [{ action_id: "action-a", organizer_clerk_id: "other-user" }],
      reviewers: [{ event_id: "event-a", clerk_id: "other-user", role: "observer", revoked_at: null }],
      participants: [{ event_id: "event-a", clerk_id: "other-user", account_link_status: "verified" }],
    });

    await expect(listSpogomiEventsForUser(supabase as never, "user-1")).resolves.toEqual([]);
  });
});
