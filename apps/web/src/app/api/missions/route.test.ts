import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  canManageAction: vi.fn(),
  loadActionById: vi.fn(),
  loadCanonicalActionOrganizerIdsForAction: vi.fn(),
  readParticipantRecord: vi.fn(),
  readActionRegistrationRecord: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: mocks.requireAuthenticatedAccess,
}));
vi.mock("@/lib/authz-identity", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));
vi.mock("@/lib/actions/permissions", () => ({
  canManageAction: mocks.canManageAction,
}));
vi.mock("@/lib/actions/store", () => ({
  loadActionById: mocks.loadActionById,
}));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: mocks.loadCanonicalActionOrganizerIdsForAction,
}));
vi.mock("@/lib/actions/participation/group-participation.helpers", () => ({
  ACTIVE_PARTICIPATION_STATUS: "confirmed",
  readParticipantRecord: mocks.readParticipantRecord,
}));
vi.mock("@/lib/actions/participation/registration-records", () => ({
  readActionRegistrationRecord: mocks.readActionRegistrationRecord,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

import { POST } from "./route";

const action = {
  id: "11111111-1111-4111-8111-111111111111",
  created_by_clerk_id: "organizer-1",
};

function request(body: unknown): Request {
  return new Request("https://cleanmymap.test/api/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/missions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.getCurrentUserIdentity.mockResolvedValue({
      userId: "user-1",
      activeRole: "benevole",
    });
    mocks.loadActionById.mockResolvedValue(action);
    mocks.loadCanonicalActionOrganizerIdsForAction.mockResolvedValue([]);
    mocks.readParticipantRecord.mockResolvedValue({ participation_status: "confirmed" });
    mocks.readActionRegistrationRecord.mockResolvedValue(null);
    mocks.canManageAction.mockReturnValue(false);
    mocks.insert.mockReturnValue({
      select: () => ({
        single: async () => ({
          data: { id: "mission-1", action_id: action.id, status: "pending" },
          error: null,
        }),
      }),
    });
    mocks.getSupabaseServerClient.mockReturnValue({
      from: () => ({ insert: mocks.insert }),
    });
  });

  it("rejects an invalid or missing action payload", async () => {
    const response = await POST(request({ label: "Terrain" }));

    expect(response.status).toBe(400);
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("allows a confirmed participant and writes the relation server-side", async () => {
    const response = await POST(request({ actionId: action.id, label: "Terrain" }));

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({
      volunteer_id: "user-1",
      label: "Terrain",
      action_id: action.id,
    });
  });

  it("rejects a user who is neither organizer nor confirmed participant", async () => {
    mocks.readParticipantRecord.mockResolvedValue(null);
    mocks.readActionRegistrationRecord.mockResolvedValue(null);

    const response = await POST(request({ actionId: action.id, label: "Terrain" }));

    expect(response.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
