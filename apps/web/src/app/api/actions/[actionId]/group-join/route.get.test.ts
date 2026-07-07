import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinProfile,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  seedGroupJoinTestDefaults,
} from "./route.test.helpers";

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  loadActionOrganizerIdsForActionMock,
  refreshProgressionProfileMock,
} = groupJoinMocks;

describe("GET /api/actions/:actionId/group-join", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["user-1"]);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("returns pending and confirmed participants for admin moderators", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "admin" });
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
    getSupabaseServerClientMock.mockReturnValue(
      createGroupJoinSupabaseMock({
        action: createGroupJoinAction({
          createdByClerkId: "user-1",
          status: "approved",
          groupJoinEnabled: true,
        }),
        participants,
        profiles: [
          createGroupJoinProfile({
            id: "user-2",
            display_name: "Alice",
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

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/group-join"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      count?: number;
      pendingRequests?: Array<{ id?: string; displayName?: string }>;
      confirmedParticipants?: Array<{ id?: string; displayName?: string }>;
      canReview?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.count).toBe(1);
    expect(body.canReview).toBe(true);
    expect(body.pendingRequests?.[0]?.id).toBe("participant-1");
    expect(body.pendingRequests?.[0]?.displayName).toBe("Alice");
    expect(body.confirmedParticipants?.[0]?.id).toBe("participant-2");
    expect(body.confirmedParticipants?.[0]?.displayName).toBe("Bob");
  }, 15000);

  it("hides moderation rows for anonymous visitors", async () => {
    authMock.mockResolvedValue({ userId: null });
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

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/group-join"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      count?: number;
      pendingRequests?: Array<{ id?: string; displayName?: string }>;
      confirmedParticipants?: Array<{ id?: string; displayName?: string }>;
      canReview?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.count).toBe(0);
    expect(body.canReview).toBe(false);
    expect(body.pendingRequests).toEqual([]);
    expect(body.confirmedParticipants).toEqual([]);
  }, 15000);

  it("searches candidate accounts for admin moderators", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "elu" });
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

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/action-1/group-join?q=alice"),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );

    const body = (await response.json()) as {
      status?: string;
      mode?: string;
      count?: number;
      items?: Array<{ userId?: string; displayName?: string }>;
      canReview?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.mode).toBe("search");
    expect(body.canReview).toBe(true);
    expect(body.count).toBe(1);
    expect(body.items?.[0]?.userId).toBe("user-2");
  }, 15000);
});
