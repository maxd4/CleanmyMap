import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSafeAuthSessionMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadCommunityEventRsvpSummariesMock = vi.hoisted(() => vi.fn());
const getClerkServiceMock = vi.hoisted(() => vi.fn());
const unstableCacheMock = vi.hoisted(() =>
  vi.fn((callback: () => unknown) => callback),
);
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: getSafeAuthSessionMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  getRoleBadge: (role: string) => ({ id: `role_${role}`, label: role, icon: role }),
  getProfileBadge: (profile: string) => ({ id: `profile_${profile}`, label: profile, icon: profile }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/community/event-rsvp-summaries", () => ({
  loadCommunityEventRsvpSummaries: loadCommunityEventRsvpSummariesMock,
}));

vi.mock("@/lib/services/clerk", () => ({
  getClerkService: getClerkServiceMock,
}));

vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));

vi.mock("@/lib/community/discussion-rate-limit", () => ({
  reserveDiscussionMessageSlot: vi.fn(),
  toDiscussionRateLimitErrorPayload: vi.fn(),
}));

vi.mock("@/lib/community/event-notification-targets", () => ({
  getCommunityEventNotificationTargets: vi.fn(),
  loadCommunityEventNotificationProfiles: vi.fn(),
  isProfileEligibleForCommunityEvent: vi.fn(),
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: vi.fn(),
}));

import { GET, POST } from "./route";

const event = {
  id: "event-1",
  created_at: "2026-09-10T08:00:00.000Z",
  organizer_clerk_id: "organizer-1",
  title: "Collecte publique",
  event_date: "2026-09-10",
  location_label: "Paris",
  description: null,
};

function configurePublicRead() {
  const eventsQuery = {
    eq: vi.fn().mockReturnThis(),
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
    getCurrentUserIdentityMock.mockResolvedValue(null);
    getSafeAuthSessionMock.mockResolvedValue({
      userId: null,
      clerkReachable: true,
      state: "anonymous",
    });
    configurePublicRead();
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0 });
    createServerRateLimitResponseMock.mockReturnValue(null);
  });

  it("returns the public event projection anonymously with no personal RSVP status", async () => {
    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0]).toMatchObject({
      id: "event-1",
      rsvpCounts: { yes: 2, maybe: 1, no: 0, total: 3 },
      myRsvpStatus: null,
    });
    expect(loadCommunityEventRsvpSummariesMock).toHaveBeenCalledWith(
      expect.anything(),
      { eventIds: ["event-1"], userId: null },
    );
    expect(response.headers.get("cache-control")).toContain("public");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["community-events", "anonymous|limit:120|event:all"],
      expect.objectContaining({ tags: ["community-events:anonymous", "community-events"] }),
    );
  });

  it("keeps the connected user's RSVP status in a user-isolated cache", async () => {
    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: "user-1",
      clerkReachable: true,
      state: "authenticated",
    });

    const response = await GET(makeGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].myRsvpStatus).toBe("yes");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["community-events", "user:user-1|limit:120|event:all"],
      expect.objectContaining({ tags: ["community-events:user-1", "community-events"] }),
    );
  });
});

describe("POST /api/community/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: 0 });
    createServerRateLimitResponseMock.mockReturnValue(null);
  });

  it("remains authenticated even though GET is public", async () => {
    const response = await POST(
      new Request("http://localhost/api/community/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
