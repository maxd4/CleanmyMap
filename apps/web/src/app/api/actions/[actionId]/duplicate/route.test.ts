import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicAction } from "@/fixtures/public-action";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const canManageActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock, getCurrentUserIdentity: getCurrentUserIdentityMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsForActionMock }));
vi.mock("@/lib/actions/permissions", () => ({ canManageAction: canManageActionMock }));

describe("GET /api/actions/[actionId]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "owner-1", role: "benevole", activeRole: "benevole" });
    getSupabaseServerClientMock.mockReturnValue({});
    loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue([]);
    canManageActionMock.mockReturnValue(true);
  });

  it("returns only reusable preparation and never historical or participation state", async () => {
    loadActionByIdMock.mockResolvedValue({
      ...publicAction,
      status: "approved",
      preparation_data: {
        actionTitle: "Régulière",
        actionDate: "2020-01-01",
        pointDeRendezVous: "Entrée nord",
        participantMessage: "Prendre de l'eau",
        groupJoinEnabled: true,
        volunteerParticipation: { participantsCount: 9 },
        preparationChecklist: [{ key: "done", label: "Déjà fait", checked: true }],
      },
      notes: "Privé",
      waste_kg: 12,
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/duplicate"), { params: Promise.resolve({ actionId: publicAction.id }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.prefill).toMatchObject({ title: "Régulière", meetingPoint: "Entrée nord", participantMessage: "Prendre de l'eau" });
    expect(body.prefill).not.toHaveProperty("actionId");
    expect(body.prefill).not.toHaveProperty("actionDate");
    expect(body.prefill).not.toHaveProperty("notes");
    expect(body.prefill).not.toHaveProperty("volunteerParticipation");
    expect(body.prefill).not.toHaveProperty("groupJoinEnabled");
  });

  it("denies a public action when the requester has no management capability", async () => {
    loadActionByIdMock.mockResolvedValue(publicAction);
    canManageActionMock.mockReturnValue(false);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/duplicate"), { params: Promise.resolve({ actionId: publicAction.id }) });
    expect(response.status).toBe(403);
  });

  it("rejects cancelled actions even for their former organizer", async () => {
    loadActionByIdMock.mockResolvedValue({ ...publicAction, status: "cancelled" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/duplicate"), { params: Promise.resolve({ actionId: publicAction.id }) });
    expect(response.status).toBe(409);
    expect(canManageActionMock).not.toHaveBeenCalled();
  });
});
