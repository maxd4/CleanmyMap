import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSafeAuthSessionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadCommunityEventRsvpSummariesMock = vi.hoisted(() => vi.fn());
const getClerkServiceMock = vi.hoisted(() => vi.fn());
const unstableCacheMock = vi.hoisted(() =>
  vi.fn((callback: () => unknown) => callback),
);

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: getSafeAuthSessionMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/community/event-rsvp-summaries", () => ({
  indexCommunityEventRsvpSummaries: (summaries: Array<{ eventId: string }>) =>
    new Map(summaries.map((row) => [row.eventId, row])),
  loadCommunityEventRsvpSummaries: loadCommunityEventRsvpSummariesMock,
}));

vi.mock("@/lib/services/clerk", () => ({
  getClerkService: getClerkServiceMock,
}));

vi.mock("@/lib/community/event-cache-invalidation", () => ({
  COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS: 900,
  COMMUNITY_EVENTS_CACHE_TAG: "community-events",
}));

import { GET, POST } from "./route";

const event = {
  id: "event-1",
  created_at: "2026-09-10T08:00:00.000Z",
  organizer_clerk_id: "organizer-1",
  title: "Collecte publique",
  event_date: "2026-09-10",
  location_label: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
  location_source: "manual",
  description: null,
  private_note: "internal-only",
};

function configurePublicRead() {
  const eventsQuery = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [event], error: null }),
  };
  getSupabaseServerClientMock.mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(eventsQuery),
    }),
  });
  getClerkServiceMock.mockResolvedValue({
    resolveUsers: vi.fn().mockResolvedValue(
      new Map([
        [
          "organizer-1",
          {
            userId: "organizer-1",
            displayName: "Organisateur",
            roleBadge: { id: "role_benevole", label: "Bénévole", icon: "RBV" },
            profileBadge: { id: "profile_benevole", label: "Profil bénévole", icon: "PBV" },
          },
        ],
      ]),
    ),
  });
  loadCommunityEventRsvpSummariesMock.mockImplementation(
    async (_supabase: unknown, params: { userId: string | null }) => [
      {
        eventId: "event-1",
        yesCount: 2,
        maybeCount: 1,
        noCount: 0,
        totalCount: 3,
        myRsvpStatus: params.userId ? "yes" : null,
      },
    ],
  );
}

function makeGetRequest() {
  return new Request("http://localhost/api/community/events?limit=120");
}

describe("GET /api/community/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
    getSafeAuthSessionMock.mockResolvedValue({
      userId: null,
      clerkReachable: true,
      state: "anonymous",
    });
    configurePublicRead();
  });

  it("returns the public event projection anonymously with no personal RSVP status", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: "event-1",
      location: {
        label: "Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        source: "manual",
      },
      rsvpCounts: { yes: 2, maybe: 1, no: 0, total: 3 },
      myRsvpStatus: null,
      canEditOwnOps: false,
    });
    expect(body.items[0].organizerClerkId).toBeNull();
    expect(body.items[0].organizer.userId).toBeNull();
    expect(body.items[0]).not.toHaveProperty("private_note");
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(loadCommunityEventRsvpSummariesMock).toHaveBeenCalledWith(
      expect.anything(),
      { eventIds: ["event-1"], userId: null },
    );
    expect(response.headers.get("cache-control")).toContain("public");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["community-events", expect.stringMatching(/^limit:120:today:\d{4}-\d{2}-\d{2}$/)],
      expect.objectContaining({ tags: ["community-events"] }),
    );
  });

  it("prioritizes upcoming events before filling the limit with recent history", async () => {
    const upcoming = { ...event, id: "event-future", event_date: "2099-09-10" };
    const past = { ...event, id: "event-past", event_date: "2020-09-10" };
    let range: "upcoming" | "past" | "direct" = "direct";
    const eventsQuery = {
      eq: vi.fn().mockImplementation(() => {
        range = "direct";
        return eventsQuery;
      }),
      gte: vi.fn().mockImplementation(() => {
        range = "upcoming";
        return eventsQuery;
      }),
      lt: vi.fn().mockImplementation(() => {
        range = "past";
        return eventsQuery;
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => ({
        data: range === "upcoming" ? [upcoming] : range === "past" ? [past] : [],
        error: null,
      })),
    };
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(eventsQuery) }),
    });

    const response = await GET(new Request("http://localhost/api/community/events?limit=2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(["event-future", "event-past"]);
    expect(eventsQuery.gte).toHaveBeenCalledWith("event_date", expect.any(String));
    expect(eventsQuery.lt).toHaveBeenCalledWith("event_date", expect.any(String));
  });

  it("keeps ownership false for another connected account", async () => {
    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: "user-1",
      clerkReachable: true,
      state: "authenticated",
    });

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].myRsvpStatus).toBe("yes");
    expect(body.items[0].canEditOwnOps).toBe(false);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["community-events", expect.stringMatching(/^limit:120:today:\d{4}-\d{2}-\d{2}$/)],
      expect.objectContaining({ tags: ["community-events"] }),
    );
  });

  it("keeps event-specific lookups out of the shared Data Cache", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/community/events?eventId=11111111-1111-4111-8111-111111111111&limit=1",
      ),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(1);
    expect(unstableCacheMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid eventId before any privileged read", async () => {
    const response = await GET(
      new Request("http://localhost/api/community/events?eventId=not-a-uuid"),
    );

    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(unstableCacheMock).not.toHaveBeenCalled();
  });

  it("derives ownership true only for the current organizer", async () => {
    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: "organizer-1",
      clerkReachable: true,
      state: "authenticated",
    });

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].canEditOwnOps).toBe(true);
    expect(body.items[0].organizerClerkId).toBeNull();
    expect(body.items[0].organizer.userId).toBeNull();
  });
});

describe("POST /api/community/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
  });

  it("remains authenticated even though GET is public", async () => {
    const response = await POST();

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("refuses direct creation and points authenticated creators to the canonical action flow", async () => {
    authMock.mockResolvedValue({ userId: "organizer-1" });

    const response = await POST();

    expect(response.status).toBe(410);
    expect((await response.json()).error).toContain("/actions/new");
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
