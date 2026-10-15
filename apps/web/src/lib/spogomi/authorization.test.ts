import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getCurrentUserIdentity = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity }));

import { hasSpogomiCapability, resolveSpogomiEventAccess } from "./authorization";

type Fixture = {
  eventId: string;
  actionId: string;
  createdBy: string;
  organizers: string[];
  reviewers: Array<{ clerk_id: string; role: "observer" | "referee"; revoked_at: string | null }>;
  participants: Array<{ id: string; clerk_id: string; account_link_status: string }>;
};

function supabaseFor(fixture: Fixture) {
  return {
    from(table: string) {
      const filters: Record<string, string> = {};
      const query = {
        select() { return query; },
        eq(column: string, value: string) { filters[column] = value; return query; },
        is(column: string, value: null) { filters[`${column}:is`] = String(value); return query; },
        maybeSingle: async () => ({ data: table === "spogomi_events" && filters.id === fixture.eventId ? {
          id: fixture.eventId,
          action_id: fixture.actionId,
          created_by_clerk_id: fixture.createdBy,
          name: "SPOGOMI test",
          event_slug: "test",
          mode: "casual",
          state: "draft",
          starts_at: "2026-01-01T10:00:00.000Z",
          ends_at: null,
          public_visibility: "private",
          public_results_visibility: "hidden",
        } : table === "spogomi_participants"
          ? fixture.participants.find((participant) => participant.clerk_id === filters.clerk_id && participant.account_link_status === "verified") ?? null
          : null, error: null }),
        then(resolve: (value: unknown) => unknown) {
          const data = table === "action_organizers"
            ? fixture.organizers.map((organizer_clerk_id) => ({ organizer_clerk_id }))
            : table === "spogomi_event_reviewers"
              ? fixture.reviewers.filter((reviewer) => reviewer.clerk_id === filters.clerk_id && reviewer.revoked_at === null)
              : [];
          return Promise.resolve(resolve({ data, error: null }));
        },
      };
      return query;
    },
  };
}

const baseFixture = (): Fixture => ({
  eventId: "event-a",
  actionId: "action-a",
  createdBy: "owner-a",
  organizers: ["co-organizer-a"],
  reviewers: [
    { clerk_id: "observer-a", role: "observer", revoked_at: null },
    { clerk_id: "referee-a", role: "referee", revoked_at: null },
    { clerk_id: "revoked-a", role: "observer", revoked_at: "2026-01-02T10:00:00.000Z" },
  ],
  participants: [{ id: "participant-a", clerk_id: "participant-a", account_link_status: "verified" }],
});

describe("SPOGOMI event-scoped authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserIdentity.mockImplementation(async ({ userId }: { userId: string }) => ({
      userId,
      role: "benevole",
      activeRole: "benevole",
    }));
  });

  it("grants management and access assignment only to the event owner", async () => {
    const access = await resolveSpogomiEventAccess({ supabase: supabaseFor(baseFixture()) as never, eventId: "event-a", userId: "owner-a" });
    expect(access?.role).toBe("organizer");
    expect(hasSpogomiCapability(access, "manage")).toBe(true);
    expect(hasSpogomiCapability(access, "assign_event_access")).toBe(true);
  });

  it("keeps admin supervision tied to the active role", async () => {
    getCurrentUserIdentity.mockResolvedValueOnce({ userId: "admin-a", role: "admin", activeRole: "admin" });
    const access = await resolveSpogomiEventAccess({ supabase: supabaseFor(baseFixture()) as never, eventId: "event-a", userId: "admin-a" });
    expect(access?.role).toBe("organizer");
    expect(hasSpogomiCapability(access, "manage")).toBe(true);
  });

  it("gives an observer operational read only and refuses arbitration or mutation", async () => {
    const access = await resolveSpogomiEventAccess({ supabase: supabaseFor(baseFixture()) as never, eventId: "event-a", userId: "observer-a" });
    expect(access?.role).toBe("observer");
    expect(hasSpogomiCapability(access, "observe")).toBe(true);
    expect(hasSpogomiCapability(access, "arbitrate")).toBe(false);
    expect(hasSpogomiCapability(access, "manage")).toBe(false);
    expect(hasSpogomiCapability(access, "assign_event_access")).toBe(false);
  });

  it("gives an active referee arbitration access without management", async () => {
    const access = await resolveSpogomiEventAccess({ supabase: supabaseFor(baseFixture()) as never, eventId: "event-a", userId: "referee-a" });
    expect(access?.role).toBe("referee");
    expect(hasSpogomiCapability(access, "observe")).toBe(true);
    expect(hasSpogomiCapability(access, "arbitrate")).toBe(true);
    expect(hasSpogomiCapability(access, "manage")).toBe(false);
  });

  it("fails closed for revoked access and another event", async () => {
    const fixture = baseFixture();
    const revoked = await resolveSpogomiEventAccess({ supabase: supabaseFor(fixture) as never, eventId: "event-a", userId: "revoked-a" });
    expect(revoked?.role).toBeNull();
    expect(hasSpogomiCapability(revoked, "observe")).toBe(false);

    const otherEvent = await resolveSpogomiEventAccess({ supabase: supabaseFor({ ...fixture, eventId: "event-b" }) as never, eventId: "event-a", userId: "observer-a" });
    expect(otherEvent).toBeNull();
  });
});
