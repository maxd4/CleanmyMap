import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicAction } from "@/fixtures/public-action";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const readActionRegistrationRecordMock = vi.hoisted(() => vi.fn());
const canManageActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock, getCurrentUserIdentity: getCurrentUserIdentityMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsForActionMock }));
vi.mock("@/lib/actions/participation/registration-records", () => ({ readActionRegistrationRecord: readActionRegistrationRecordMock }));
vi.mock("@/lib/actions/permissions", () => ({ canManageAction: canManageActionMock }));

describe("GET /api/actions/[actionId]/day", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "owner-1", role: "member", activeRole: "member" });
    getSupabaseServerClientMock.mockReturnValue({});
    loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue([]);
    canManageActionMock.mockReturnValue(true);
  });

  it("returns a briefing projection without creating attendance or claim data", async () => {
    loadActionByIdMock.mockResolvedValue({
      ...publicAction,
      preparation_data: {
        ...publicAction.preparation_data,
        pointDeRendezVous: "Entrée nord",
        meetingTime: "09:45",
        safetyInstructions: "Rester avec le groupe.",
        recommendedMaterials: "Gants",
        materialsProvided: "Sacs",
        preparationChecklist: [{ key: "water", label: "Eau", checked: false }],
      },
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/day"), { params: Promise.resolve({ actionId: publicAction.id }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.access).toBe("organizer");
    expect(body.action).toMatchObject({ meetingPoint: "Entrée nord", meetingTime: "09:45", safetyInstructions: "Rester avec le groupe." });
    expect(body.action).not.toHaveProperty("participantAccounts");
    expect(readActionRegistrationRecordMock).not.toHaveBeenCalled();
  });

  it("denies an authenticated requester whose future registration is only pending", async () => {
    loadActionByIdMock.mockResolvedValue(publicAction);
    canManageActionMock.mockReturnValue(false);
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "pending" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/day"), { params: Promise.resolve({ actionId: publicAction.id }) });
    expect(response.status).toBe(403);
    expect(readActionRegistrationRecordMock).toHaveBeenCalledWith(expect.anything(), { actionId: publicAction.id, userId: "owner-1" });
  });
});
