import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicAction } from "@/fixtures/public-action";
import { PLANNER_WEATHER_SNAPSHOT_VERSION } from "@/lib/weather/planner-weather";

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
        equipmentInventory: { glovesPairs: 0, grabbers: 2, firstAidKitAvailable: true },
        refreshmentsProvided: { waterDuringAction: true, snackAfterAction: true },
        preparationChecklist: [{ key: "water", label: "Eau", checked: false }],
        routeCalibrationContext: {
          plannerSnapshot: {
            weatherContext: {
              version: PLANNER_WEATHER_SNAPSHOT_VERSION,
              provider: "open-meteo",
              source: "forecast",
              fetchedAt: "2026-10-19T08:00:00.000Z",
              coveredWindow: { startAt: "2026-10-20T09:00", endAt: "2026-10-20T11:00" },
              status: "available",
              weatherStatus: "available",
              location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
              hourly: [],
              summary: null,
              operationalRisk: { status: "nominal", riskLevel: "vert", reasons: ["day-private-planner-context"], ruleVersion: "weather-operational-rules-v1", ruleSource: "apps/web/src/lib/weather/ops-weather", operationalLimitMinutes: null },
            },
          },
        },
      },
    });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/day"), { params: Promise.resolve({ actionId: publicAction.id }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.access).toBe("organizer");
    expect(body.action).toMatchObject({ meetingPoint: "Entrée nord", meetingTime: "09:45", safetyInstructions: "Rester avec le groupe." });
    expect(body.action.equipmentProvided).toEqual(["Pinces de ramassage : 2", "Trousse de premiers secours"]);
    expect(body.action.equipmentNotProvided).toEqual(["Paires de gants : aucune unité fournie"]);
    expect(body.action.refreshmentsProvided).toEqual(["Eau fournie pendant l'action", "Collation prévue après l'action"]);
    expect(body.action).not.toHaveProperty("participantAccounts");
    const serialized = JSON.stringify(body.action);
    expect(serialized).not.toContain("day-private-planner-context");
    expect(serialized).not.toContain("routeCalibrationContext");
    expect(serialized).not.toContain("plannerSnapshot");
    expect(serialized).not.toContain("weatherContext");
    expect(readActionRegistrationRecordMock).not.toHaveBeenCalled();
  }, 15000);

  it("denies an authenticated requester whose future registration is only pending", async () => {
    loadActionByIdMock.mockResolvedValue(publicAction);
    canManageActionMock.mockReturnValue(false);
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "pending" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/a/day"), { params: Promise.resolve({ actionId: publicAction.id }) });
    expect(response.status).toBe(403);
    expect(readActionRegistrationRecordMock).toHaveBeenCalledWith(expect.anything(), { actionId: publicAction.id, userId: "owner-1" });
  });

  it("allows a confirmed registrant to read the private action briefing without treating the action as public", async () => {
    loadActionByIdMock.mockResolvedValue({
      ...publicAction,
      access_mode: "invite_link",
      preparation_data: { ...publicAction.preparation_data, participantMessage: "Rendez-vous sur place." },
    });
    canManageActionMock.mockReturnValue(false);
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/private/day"), { params: Promise.resolve({ actionId: publicAction.id }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.access).toBe("confirmed_volunteer");
    expect(body.action.participantMessage).toBe("Rendez-vous sur place.");
    expect(body.action).not.toHaveProperty("logisticsNotes");
  });

  it("does not let a private actionId bypass a pending registration", async () => {
    loadActionByIdMock.mockResolvedValue({ ...publicAction, access_mode: "invite_link" });
    canManageActionMock.mockReturnValue(false);
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "pending" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/private/day"), { params: Promise.resolve({ actionId: publicAction.id }) });
    expect(response.status).toBe(403);
  });
});
