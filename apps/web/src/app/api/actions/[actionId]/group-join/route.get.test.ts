import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinProfile,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  invokeGroupJoinRoute,
  invokeGroupJoinRouteJson,
  seedGroupJoinTestDefaults,
} from "./route.test.helpers";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
  refreshProgressionProfileMock,
} = groupJoinMocks;

type GroupJoinListingBody = {
  status?: string;
  count?: number;
  pendingRequests?: Array<{ id?: string; displayName?: string }>;
  confirmedParticipants?: Array<{ id?: string; displayName?: string }>;
  canReview?: boolean;
};

function seedGroupJoinListing(
  participants: ReturnType<typeof createGroupJoinParticipant>[],
  profiles: ReturnType<typeof createGroupJoinProfile>[],
  createdByClerkId: string,
) {
  getSupabaseServerClientMock.mockReturnValue(
    createGroupJoinSupabaseMock({
      action: createGroupJoinAction({
        createdByClerkId,
        status: "approved",
        groupJoinEnabled: true,
      }),
      participants,
      profiles,
    }),
  );
}

function expectVisibleGroupJoinListing(body: {
  status?: string;
  count?: number;
  canReview?: boolean;
}) {
  expect(body.status).toBe("ok");
  expect(body.count).toBe(1);
  expect(body.canReview).toBe(true);
}

function expectSearchResult(body: {
  status?: string;
  mode?: string;
  count?: number;
  canReview?: boolean;
}) {
  expect(body.status).toBe("ok");
  expect(body.mode).toBe("search");
  expect(body.canReview).toBe(true);
  expect(body.count).toBe(1);
}

describe("GET /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("returns pending and confirmed participants for admin moderators", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "admin",
      activeRole: "admin",
    });
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "pending",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
      createGroupJoinParticipant({
        id: "participant-2",
        created_at: "2026-06-02T10:00:00Z",
        joined_at: "2026-06-02T10:00:00Z",
        participation_status: "confirmed",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-3",
      }),
    ];
    seedGroupJoinListing(
      participants,
      [
        createGroupJoinProfile({ id: "user-2", display_name: "Alice", handle: "alice" }),
        createGroupJoinProfile({ id: "user-3", display_name: "Bob", handle: "bob" }),
      ],
      "user-1",
    );

    const { response, body } = await invokeGroupJoinRouteJson<GroupJoinListingBody>("GET");

    expect(response.status).toBe(200);
    expectVisibleGroupJoinListing(body);
    expect(body.pendingRequests?.[0]?.id).toBe("participant-1");
    expect(body.pendingRequests?.[0]?.displayName).toBe("Alice");
    expect(body.confirmedParticipants?.[0]?.id).toBe("participant-2");
    expect(body.confirmedParticipants?.[0]?.displayName).toBe("Bob");
  }, 15000);

  it("returns empty moderation queues when there are no registrations", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "admin",
      activeRole: "admin",
    });
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants: [],
      }),
    );

    const response = await invokeGroupJoinRoute("GET");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pendingRequests).toEqual([]);
    expect(body.confirmedParticipants).toEqual([]);
    expect(body.canReview).toBe(true);
  }, 15000);

  it("returns pending and confirmed participants for action organizers", async () => {
    const participants = [
      createGroupJoinParticipant({
        id: "participant-1",
        created_at: "2026-06-01T10:00:00Z",
        joined_at: "2026-06-01T10:00:00Z",
        participation_status: "pending",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-2",
      }),
      createGroupJoinParticipant({
        id: "participant-2",
        created_at: "2026-06-02T10:00:00Z",
        joined_at: "2026-06-02T10:00:00Z",
        participation_status: "confirmed",
        participation_source: "group_form",
        action_id: "action-1",
        user_id: "user-3",
      }),
    ];
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "benevole",
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce(["user-1"]);
    seedGroupJoinListing(
      participants,
      [
        createGroupJoinProfile({ id: "user-2", display_name: "Alice", handle: "alice" }),
        createGroupJoinProfile({ id: "user-3", display_name: "Bob", handle: "bob" }),
      ],
      "user-owner",
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      count?: number;
      pendingRequests?: Array<{ id?: string }>;
      confirmedParticipants?: Array<{ id?: string }>;
      canReview?: boolean;
    }>("GET");

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.canReview).toBe(true);
    expect(body.pendingRequests?.[0]?.id).toBe("participant-1");
    expect(body.confirmedParticipants?.[0]?.id).toBe("participant-2");
  }, 15000);

  it("exposes prior registration only as context for a post-action claim", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "admin",
      activeRole: "admin",
    });
    const participants = [
      createGroupJoinParticipant({
        id: "claim-1",
        action_id: "action-1",
        user_id: "user-2",
        created_at: "2026-09-12T10:00:00Z",
        participation_status: "pending",
        participation_source: "post_action_claim",
      }),
    ];
    const registrations = [
      createGroupJoinParticipant({
        action_id: "action-1",
        user_id: "user-2",
        created_at: "2026-09-12T09:00:00Z",
        registered_at: "2026-09-12T09:00:00Z",
        registration_status: "confirmed",
        registration_source: "group_form",
      }),
    ];
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "owner-1",
          status: "approved",
          actionPhase: "post_action_complete",
          groupJoinEnabled: true,
        }),
        participants,
        registrations,
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          }),
        ],
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      pendingRequests?: Array<{ id?: string; wasRegisteredBeforeAction?: boolean }>;
    }>("GET");

    expect(response.status).toBe(200);
    expect(body.pendingRequests).toEqual([
      expect.objectContaining({
        id: "claim-1",
        wasRegisteredBeforeAction: true,
      }),
    ]);
  }, 15000);

  it("hides moderation rows for anonymous visitors", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue([]);
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants: [
          createGroupJoinParticipant({
            id: "participant-1",
            created_at: "2026-06-01T10:00:00Z",
            joined_at: "2026-06-01T10:00:00Z",
            participation_status: "pending",
            participation_source: "group_form",
            action_id: "action-1",
            user_id: "user-2",
          }),
        ],
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice",
            handle: "alice",
          }),
        ],
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<GroupJoinListingBody>("GET");

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.count).toBe(0);
    expect(body.canReview).toBe(false);
    expect(body.pendingRequests).toEqual([]);
    expect(body.confirmedParticipants).toEqual([]);
  }, 15000);

  it("searches candidate accounts for admin moderators", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "admin",
    });
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice Martin",
            handle: "alice",
          }),
          createGroupJoinProfile({
            id: "user-3",
            display_name: "Bob",
            handle: "bob",
          }),
        ],
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      status?: string;
      mode?: string;
      count?: number;
      items?: Array<{ userId?: string; displayName?: string }>;
      canReview?: boolean;
    }>("GET", { query: "?q=alice" });

    expect(response.status).toBe(200);
    expectSearchResult(body);
    expect(body.items?.[0]?.userId).toBe("user-2");
  }, 15000);

  it("searches candidate accounts for action organizers", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
      role: "benevole",
    });
    loadActionOrganizerIdsForActionMock.mockResolvedValueOnce(["user-1"]);
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice Martin",
            handle: "alice",
          }),
        ],
      }),
    );

    const { response, body } = await invokeGroupJoinRouteJson<{
      status?: string;
      mode?: string;
      count?: number;
      canReview?: boolean;
    }>("GET", { query: "?q=alice" });

    expect(response.status).toBe(200);
    expectSearchResult(body);
  }, 15000);

  it("rejects account searches when the current user cannot review the action", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce(null);
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
      }),
    );

    const response = await invokeGroupJoinRoute("GET", { query: "?q=alice" });

    expect(response.status).toBe(403);
  }, 15000);

  it("rejects an empty action id before loading the queue", async () => {
    const response = await invokeGroupJoinRoute("GET", {
      requestActionId: "",
      paramsActionId: "  ",
    });

    expect(response.status).toBe(422);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  }, 15000);

  it("keeps the public queue available when Clerk lookup fails", async () => {
    getCurrentUserIdentityMock.mockRejectedValueOnce(new Error("Clerk unavailable"));
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-owner",
          status: "approved",
          groupJoinEnabled: true,
        }),
      }),
    );

    const response = await invokeGroupJoinRoute("GET");

    expect(response.status).toBe(200);
    expect((await response.json()).canReview).toBe(false);
  }, 15000);

  it("rejects a queue for a cancelled action", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({ status: "cancelled" }),
      }),
    );

    const response = await invokeGroupJoinRoute("GET");

    expect(response.status).toBe(404);
  }, 15000);

  it("rejects a queue for a rejected non-pre-action", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({ status: "rejected", actionPhase: "post_action_draft" }),
      }),
    );

    const response = await invokeGroupJoinRoute("GET");

    expect(response.status).toBe(404);
  }, 15000);
});
