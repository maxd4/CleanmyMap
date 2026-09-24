import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";

import {
  createSupabaseMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  makeVisibleGroupAction,
  ParticipantRow,
  rebuildUserGamificationBadgesMock,
  refreshProgressionProfileMock,
  requireAuthenticatedAccessMock,
} from "./route.test.helpers";

async function postGroupJoin(actionId: string) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/actions/group-join", {
      method: "POST",
      body: JSON.stringify({ actionId }),
    }),
  );
}

async function expectPendingGroupJoin(response: Response) {
  const body = (await response.json()) as {
    alreadyJoined?: boolean;
    participationStatus?: string;
    participantsCount?: number;
    joinedAt?: string;
  };

  expect(response.status).toBe(200);
  expect(body.alreadyJoined).toBe(false);
  expect(body.participationStatus).toBe("pending");
  expect(body.participantsCount).toBe(0);
  expect(rebuildUserGamificationBadgesMock).not.toHaveBeenCalled();
  expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
}

function seedGroupJoinAction({
  actionId,
  locationLabel,
  status,
  participants,
}: {
  actionId: string;
  locationLabel: string;
  status: "approved" | "pending";
  participants: ParticipantRow[];
}) {
  getSupabaseServerClientMock.mockReturnValue(
    createSupabaseMock({
      actions: [
        makeVisibleGroupAction({
          id: actionId,
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: locationLabel,
          volunteers_count: 12,
          duration_minutes: 45,
          status,
        }),
      ],
      participants,
    }),
  );
}

describe("POST /api/actions/group-join", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    getCurrentUserIdentityMock.mockResolvedValue(null);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it("does not return actions hidden by moderation visibility", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        actions: [
          makeVisibleGroupAction({
            id: "action-hidden",
            created_at: "2026-06-01T10:00:00Z",
            action_date: "2026-06-10",
            location_label: "Parc Nord",
            volunteers_count: 12,
            duration_minutes: 45,
            status: "pending",
            moderation_visibility: "hidden",
            action_phase: "pre_action",
            notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
          }),
        ],
        participants: [],
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/group-join?limit=6"));
    const body = (await response.json()) as { items?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
  });

  it("creates a pending request for an approved action form", async () => {
    const participants: ParticipantRow[] = [];
    seedGroupJoinAction({ actionId: "action-1", locationLabel: "Parc Nord", status: "approved", participants });

    const response = await postGroupJoin("action-1");
    await expectPendingGroupJoin(response);
  });

  it("creates a pending request for a pre-action form", async () => {
    const participants: ParticipantRow[] = [];
    seedGroupJoinAction({ actionId: "action-pre", locationLabel: "Parc Préparation", status: "pending", participants });

    const response = await postGroupJoin("action-pre");
    await expectPendingGroupJoin(response);
  });

  it("re-enters a cancelled participation into the waitlist", async () => {
    const participants: ParticipantRow[] = [
      {
        id: "participant-1",
        created_at: "2026-05-03T10:00:00Z",
        joined_at: "2026-05-03T10:00:00Z",
        updated_at: "2026-05-20T10:00:00Z",
        participation_status: "cancelled",
        participation_source: "admin",
        action_id: "action-1",
        user_id: "user-1",
      },
    ];
    seedGroupJoinAction({ actionId: "action-1", locationLabel: "Parc Nord", status: "approved", participants });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );
    const body = (await response.json()) as {
      alreadyJoined?: boolean;
      participationStatus?: string;
      participationSource?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.alreadyJoined).toBe(false);
    expect(body.participationStatus).toBe("pending");
    expect(body.participationSource).toBe("group_form");
    expect(body.participantsCount).toBe(0);
    expect(participants[0]?.participation_status).toBe("pending");
    expect(participants[0]?.participation_source).toBe("group_form");
  });

  it.each(["admin", "max"] as const)(
    "keeps normal joins pending for %s users",
    async (role) => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-1",
        role,
    });

    const participants: ParticipantRow[] = [];
    const supabase = createSupabaseMock({
      actions: [
        makeVisibleGroupAction({
          id: "action-4",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
        }),
      ],
      participants,
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-4" }),
      }),
    );

    const body = (await response.json()) as {
      participationStatus?: string;
        participationSource?: string;
      participantsCount?: number;
    };

    expect(response.status).toBe(200);
    expect(body.participationStatus).toBe("pending");
      expect(body.participationSource).toBe("group_form");
    expect(body.participantsCount).toBe(0);
    expect(participants[0]?.participation_status).toBe("pending");
      expect(participants[0]?.participation_source).toBe("group_form");
    expect(rebuildUserGamificationBadgesMock).not.toHaveBeenCalled();
    expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
    },
  );

  it("rejects joining a pending action", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-2",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "pending",
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-2" }),
      }),
    );

    const body = (await response.json()) as { details?: { actionId?: string[] } };
    expect(response.status).toBe(404);
    expect(body.details).toBeUndefined();
  });

  it("rejects joining an approved action that is closed by the organizer", async () => {
    const supabase = createSupabaseMock({
      actions: [
        {
          id: "action-3",
          created_at: "2026-05-01T10:00:00Z",
          action_date: "2026-05-10",
          location_label: "Parc Nord",
          volunteers_count: 12,
          duration_minutes: 45,
          status: "approved",
          notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }),
        },
      ],
      participants: [],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-3" }),
      }),
    );

    const body = (await response.json()) as { details?: { actionId?: string[] } };
    expect(response.status).toBe(404);
    expect(body.details).toBeUndefined();
  });

  it("rejects unauthenticated users", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects Clerk auth failures on POST", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/group-join", {
        method: "POST",
        body: JSON.stringify({ actionId: "action-1" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
