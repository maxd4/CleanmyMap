import { describe, expect, it, vi } from "vitest";
import { listSpogomiEventChangesForUser, listSpogomiEventsForUser } from "./personal-events-service";

vi.mock("server-only", () => ({}));

type TableRow = Record<string, unknown>;

function createSupabaseFixture(options: {
  events: TableRow[];
  organizers: TableRow[];
  reviewers: TableRow[];
  participants: TableRow[];
  requests?: TableRow[];
  changes?: TableRow[];
  acknowledgements?: TableRow[];
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
          : query.table === "spogomi_participants"
            ? options.participants
            : query.table === "spogomi_team_join_requests"
              ? options.requests ?? []
              : query.table === "spogomi_event_change_history"
                ? options.changes ?? []
                : options.acknowledgements ?? [];
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
  official_timezone: "Europe/Paris",
  public_visibility: visibility,
  public_results_visibility: "hidden",
});

describe("listSpogomiEventsForUser", () => {
  it("deduplicates multi-role relations and paginates every relation source", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a", "published"), event("event-b", "action-b")],
      organizers: [{ action_id: "action-a", organizer_clerk_id: "user-1" }, { action_id: "action-b", organizer_clerk_id: "user-1" }],
      reviewers: [
        { event_id: "event-a", clerk_id: "user-1", role: "referee", revoked_at: null },
        { event_id: "event-a", clerk_id: "user-1", role: "checkin", revoked_at: null },
      ],
      participants: [{ event_id: "event-a", clerk_id: "user-1", account_link_status: "verified" }],
    });

    const result = await listSpogomiEventsForUser(supabase as never, "user-1");

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "event-a", relations: ["organizer", "referee", "checkin", "participant"], accesses: ["manage", "arbitrate", "checkin", "participate"] });
    expect(result[1]?.links.space).toBe("/spogomi/event-a-slug/espace");
    expect(result[1]?.links.public).toBe("/spogomi/event-a-slug");
    expect(result[1]).not.toHaveProperty("action_id");
  });

  it("routes active reviewers to the capability-scoped event space", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a")],
      organizers: [],
      reviewers: [{ event_id: "event-a", clerk_id: "user-1", role: "observer", revoked_at: null }],
      participants: [],
    });

    const [result] = await listSpogomiEventsForUser(supabase as never, "user-1");

    expect(result?.links.space).toBe("/spogomi/event-a-slug/espace");
  });

  it("returns an active check-in assignment with only pointage access", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a")],
      organizers: [],
      reviewers: [{ event_id: "event-a", clerk_id: "user-1", role: "checkin", revoked_at: null }],
      participants: [],
    });

    const [result] = await listSpogomiEventsForUser(supabase as never, "user-1");

    expect(result).toMatchObject({
      relations: ["checkin"],
      accesses: ["checkin"],
      links: { space: "/spogomi/event-a-slug/espace", public: null },
    });
  });

  it("includes active field-operation assignments without turning them into organizer access", async () => {
    const supabase = createSupabaseFixture({
      events: [event("event-a", "action-a")],
      organizers: [],
      reviewers: [{ event_id: "event-a", clerk_id: "user-1", role: "weigher", revoked_at: null }],
      participants: [],
    });

    const [result] = await listSpogomiEventsForUser(supabase as never, "user-1");

    expect(result).toMatchObject({ relations: ["field_operator"], accesses: ["operate"], links: { space: "/spogomi/event-a-slug/espace" } });
    expect(result?.accesses).not.toContain("manage");
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

describe("listSpogomiEventChangesForUser", () => {
  it("returns only the account-scoped receipt projection and never snapshots", async () => {
    const supabase = createSupabaseFixture({
      events: [], organizers: [], reviewers: [],
      participants: [
        { event_id: "event-a", clerk_id: "user-1", account_link_status: "verified", registration_status: "registered" },
        { event_id: "event-b", clerk_id: "other-user", account_link_status: "verified", registration_status: "registered" },
      ],
      changes: [
        { id: "change-a", event_id: "event-a", revision: 3, changed_fields: ["schedule", "location"], requires_confirmation: true, created_at: "2026-06-01T12:00:00.000Z", previous_snapshot: { secret: "never" }, current_snapshot: { secret: "never" } },
        { id: "change-b", event_id: "event-b", revision: 4, changed_fields: ["name"], requires_confirmation: false, created_at: "2026-06-01T13:00:00.000Z", previous_snapshot: { secret: "never" }, current_snapshot: { secret: "never" } },
      ],
      acknowledgements: [{ change_id: "change-a", event_id: "event-a", clerk_id: "user-1", acknowledged_at: "2026-06-01T12:05:00.000Z" }],
    });

    await expect(listSpogomiEventChangesForUser(supabase as never, "user-1")).resolves.toEqual([{
      id: "change-a",
      eventId: "event-a",
      revision: 3,
      changedFields: ["schedule", "location"],
      requiresConfirmation: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      acknowledgedAt: "2026-06-01T12:05:00.000Z",
    }]);
    const result = await listSpogomiEventChangesForUser(supabase as never, "user-1");
    expect(result[0]).not.toHaveProperty("previousSnapshot");
    expect(result[0]).not.toHaveProperty("currentSnapshot");
  });

  it("accepts a pending request as a personal relation while excluding revoked or rejected relations", async () => {
    const supabase = createSupabaseFixture({
      events: [], organizers: [], reviewers: [],
      participants: [
        { event_id: "revoked", clerk_id: "user-1", account_link_status: "unlinked", registration_status: "registered" },
        { event_id: "cancelled", clerk_id: "user-1", account_link_status: "verified", registration_status: "cancelled" },
      ],
      requests: [
        { event_id: "pending", requester_clerk_id: "user-1", status: "pending" },
        { event_id: "rejected", requester_clerk_id: "user-1", status: "rejected" },
      ],
      changes: [
        { id: "pending-change", event_id: "pending", revision: 1, changed_fields: ["schedule"], requires_confirmation: true, created_at: "2026-06-01T12:00:00.000Z" },
        { id: "revoked-change", event_id: "revoked", revision: 1, changed_fields: ["schedule"], requires_confirmation: true, created_at: "2026-06-01T12:00:00.000Z" },
        { id: "rejected-change", event_id: "rejected", revision: 1, changed_fields: ["schedule"], requires_confirmation: true, created_at: "2026-06-01T12:00:00.000Z" },
      ],
      acknowledgements: [],
    });

    await expect(listSpogomiEventChangesForUser(supabase as never, "user-1")).resolves.toEqual([expect.objectContaining({ id: "pending-change", eventId: "pending" })]);
  });
});
