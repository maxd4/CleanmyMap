import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

import {
  createSupabaseMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  makeVisibleGroupAction,
  refreshProgressionProfileMock,
} from "./route.test.helpers";

describe("GET /api/actions/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "user-1" });
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("returns approved actions with participation state", async () => {
    const supabase = createSupabaseMock({
      actions: [
        makeVisibleGroupAction({
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        }),
        {
          id: "action-2",
          created_at: "2026-05-02T10:00:00Z",
          action_date: "2026-05-11",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "pending",
        },
      ],
      participants: [
        {
          id: "participant-1",
          created_at: "2026-05-03T10:00:00Z",
          action_id: "action-1",
          user_id: "user-1",
        },
        {
          id: "participant-2",
          created_at: "2026-05-03T11:00:00Z",
          action_id: "action-1",
          user_id: "user-2",
        },
      ],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as {
      authenticated?: boolean;
      count?: number;
      items?: Array<{ id: string; participantsCount: number; joined: boolean }>;
    };

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.count).toBe(1);
    expect(body.items?.[0]).toMatchObject({
      id: "action-1",
      participantsCount: 2,
      joined: true,
    });
  }, 15000);

  it("keeps the list available when Clerk auth cannot resolve the session", async () => {
    getCurrentUserIdentityMock.mockRejectedValueOnce(new Error("Clerk auth unavailable"));

    const supabase = createSupabaseMock({
      actions: [
        makeVisibleGroupAction({
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        }),
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as {
      authenticated?: boolean;
      count?: number;
      items?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
    expect(body.count).toBe(1);
    expect(body.items?.[0]?.id).toBe("action-1");
  }, 15000);

  it("includes approved actions even when the organizer has not opened participation", async () => {
    const supabase = createSupabaseMock({
      actions: [
        makeVisibleGroupAction({
          id: "action-open",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        }),
        {
          id: "action-closed",
          created_at: "2026-05-02T10:00:00Z",
          action_date: "2026-05-09",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "approved",
          notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }),
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as {
      count?: number;
      items?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.items?.[0]?.id).toBe("action-open");
    expect(body.items?.some((item) => item.id === "action-closed")).toBe(false);
  }, 15000);

  it("prioritizes a requested approved action even when it is outside the default slice", async () => {
    const supabase = createSupabaseMock({
      actions: [
        makeVisibleGroupAction({
          id: "action-1",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        }),
        makeVisibleGroupAction({
          id: "action-2",
          created_at: "2026-05-02T10:00:00Z",
          action_date: "2026-05-09",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "approved",
        }),
        makeVisibleGroupAction({
          id: "action-3",
          created_at: "2026-05-03T10:00:00Z",
          action_date: "2026-05-08",
          location_label: "Place Sud",
          volunteers_count: 6,
          duration_minutes: 25,
          status: "approved",
        }),
        makeVisibleGroupAction({
          id: "action-4",
          created_at: "2026-05-04T10:00:00Z",
          action_date: "2026-05-07",
          location_label: "Bois Ouest",
          volunteers_count: 5,
          duration_minutes: 35,
          status: "approved",
        }),
        makeVisibleGroupAction({
          id: "action-5",
          created_at: "2026-05-05T10:00:00Z",
          action_date: "2026-05-06",
          location_label: "Canal",
          volunteers_count: 10,
          duration_minutes: 40,
          status: "approved",
        }),
        makeVisibleGroupAction({
          id: "action-6",
          created_at: "2026-05-06T10:00:00Z",
          action_date: "2026-05-05",
          location_label: "Rive",
          volunteers_count: 9,
          duration_minutes: 20,
          status: "approved",
        }),
        makeVisibleGroupAction({
          id: "action-7",
          created_at: "2026-04-01T10:00:00Z",
          action_date: "2026-05-11",
          location_label: "Zone ciblée",
          volunteers_count: 4,
          duration_minutes: 15,
          status: "approved",
        }),
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/actions/group-join?limit=6&actionId=action-7"),
    );
    const body = (await response.json()) as {
      count?: number;
      items?: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.count).toBe(6);
    expect(body.items?.[0]?.id).toBe("action-7");
    expect(body.items?.map((item) => item.id)).toContain("action-7");
  }, 15000);

  it("returns a personal history of joined actions for the authenticated user", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-open",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-14",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
          notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
        },
        {
          id: "action-closed",
          created_at: "2026-04-01T10:00:00Z",
          action_date: "2026-04-11",
          location_label: "Quai Est",
          volunteers_count: 8,
          duration_minutes: 30,
          status: "approved",
          notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }),
        },
      ],
      participants: [
        {
          id: "participant-1",
          created_at: "2026-05-03T10:00:00Z",
          action_id: "action-open",
          user_id: "user-1",
        },
        {
          id: "participant-2",
          created_at: "2026-04-03T10:00:00Z",
          action_id: "action-closed",
          user_id: "user-1",
        },
      ],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6&historyLimit=8"));
    const body = (await response.json()) as {
      history?: Array<{ id: string; joined: boolean; joinedAt: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.history).toHaveLength(2);
    expect(body.history?.[0]?.id).toBe("action-open");
    expect(body.history?.[0]?.joined).toBe(true);
    expect(body.history?.[1]?.id).toBe("action-closed");
  }, 15000);
});
