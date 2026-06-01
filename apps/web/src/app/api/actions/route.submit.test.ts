import { beforeEach, describe, expect, it, vi } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/data-contract";
import { createInitialFormState } from "@/components/actions/action-declaration/payload";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const pickTraceableActorNameMock = vi.hoisted(() => vi.fn());
const buildPostActionRetentionLoopMock = vi.hoisted(() => vi.fn());
const trackServerEventMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createActionMock = vi.hoisted(() => vi.fn());
const resolveActionOrganizersMock = vi.hoisted(() => vi.fn());
const emitActionCreatedMock = vi.hoisted(() => vi.fn());
const emitSpotCreatedMock = vi.hoisted(() => vi.fn());
const hasAnalyticsConsentCookieMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  pickTraceableActorName: pickTraceableActorNameMock,
}));

vi.mock("@/lib/gamification/progression", () => ({
  buildPostActionRetentionLoop: buildPostActionRetentionLoopMock,
}));

vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsentCookie: hasAnalyticsConsentCookieMock,
}));

vi.mock("@/lib/events/emit", () => ({
  emitActionCreated: emitActionCreatedMock,
  emitSpotCreated: emitSpotCreatedMock,
}));

vi.mock("@/lib/analytics.server", () => ({
  trackServerEvent: trackServerEventMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/store", () => ({
  createAction: createActionMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  resolveActionOrganizers: resolveActionOrganizersMock,
}));

describe("POST /api/actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    createActionMock.mockResolvedValue({ id: "action-test-1" });
    resolveActionOrganizersMock.mockResolvedValue({
      organizers: [
        {
          userId: "user-test-1",
          displayName: "Test User",
          handle: "test@example.org",
          isPrimary: true,
          sourceToken: null,
        },
      ],
      unresolvedTokens: [],
    });
    authMock.mockResolvedValue({ userId: "user-test-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-test-1",
      displayName: "Test User",
      firstName: "Test",
      username: "test@example.org",
      currentLevel: 1,
      actorNameOptions: ["Test User"],
      role: "benevole",
      badges: [],
    });
    pickTraceableActorNameMock.mockReturnValue("Test User");
    trackServerEventMock.mockResolvedValue(undefined);
    buildPostActionRetentionLoopMock.mockResolvedValue(null);
    emitActionCreatedMock.mockResolvedValue({ delivered: 1, failed: 0 });
    emitSpotCreatedMock.mockResolvedValue({ delivered: 1, failed: 0 });
    hasAnalyticsConsentCookieMock.mockReturnValue(true);
  });

  it("creates an action from the dashboard form payload", async () => {
    const { POST } = await import("./route");

    const form = createInitialFormState("Test User");
    form.locationLabel = "Test lieu action";
    form.recordType = "action";
    form.wasteKg = "2.5";
    form.volunteersCount = "4";
    form.durationMinutes = "45";
    form.notes = "Formulaire bénévole de test";
    form.actionDate = "2026-04-22";

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      actionDate: form.actionDate,
      locationLabel: form.locationLabel,
      wasteKg: Number(form.wasteKg),
      cigaretteButts: 0,
      volunteersCount: Number(form.volunteersCount),
      durationMinutes: Number(form.durationMinutes),
      notes: form.notes,
      submissionMode: "quick",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as { id?: string; error?: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe("action-test-1");
    expect(createActionMock).toHaveBeenCalledTimes(1);
    expect(resolveActionOrganizersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerAccounts: [],
      }),
    );
    expect(emitActionCreatedMock).toHaveBeenCalledWith({
      actionId: "action-test-1",
      userId: "user-test-1",
      locationLabel: "Test lieu action",
      wasteKg: 2.5,
    });
    expect(buildPostActionRetentionLoopMock).toHaveBeenCalledWith({}, {
      userId: "user-test-1",
      actionId: "action-test-1",
    });
    expect(trackServerEventMock).not.toHaveBeenCalled();
  }, 15000);

  it("rejects non-spontaneous actions without an explicit organizer", async () => {
    const { POST } = await import("./route");

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Association Sans Murs Paris 15",
      actionDate: "2026-04-22",
      locationLabel: "Test lieu action",
      wasteKg: 2.5,
      cigaretteButts: 0,
      volunteersCount: 4,
      durationMinutes: 45,
      notes: "Formulaire bénévole de test",
      submissionMode: "quick",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as { details?: { organizerAccounts?: string[] } };
    expect(response.status).toBe(422);
    expect(body.details?.organizerAccounts?.[0]).toContain("Renseignez au moins un compte organisateur");
    expect(createActionMock).not.toHaveBeenCalled();
    expect(resolveActionOrganizersMock).not.toHaveBeenCalled();
  }, 15000);

  it("creates a spot when the payload declares a clean place", async () => {
    const { POST } = await import("./route");
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "spot-test-1",
            created_at: "2026-04-22T00:00:00Z",
            label: "Lieu propre test",
            waste_type: "clean_place",
            latitude: 48.8566,
            longitude: 2.3522,
            status: "new",
            notes: "[spot-by:Test User] signalement",
          },
          error: null,
        }),
      }),
    });
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table !== "spots") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          insert: insertMock,
        };
      }),
    };
    getSupabaseServerClientMock.mockReturnValue(supabaseMock);

    const payload = toContractCreatePayload({
      recordType: "clean_place",
      actorName: "Test User",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Lieu propre test",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "signalement",
      submissionMode: "quick",
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as { id?: string; source?: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe("spot-test-1");
    expect(body.source).toBe("spots");
    expect(createActionMock).not.toHaveBeenCalled();
    expect(emitSpotCreatedMock).toHaveBeenCalledWith({
      spotId: "spot-test-1",
      userId: "user-test-1",
      label: "Lieu propre test",
      wasteType: "clean_place",
    });
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "user-test-1",
      "spot_created",
      {
        waste_type: "clean_place",
        location: "Lieu propre test",
      },
      {
        consentGranted: true,
      },
    );
  }, 15000);

  it("rejects unauthenticated submissions", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({
          type: "action",
        }),
      }),
    );

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(401);
    expect(body.error).toBe("Vous devez vous reconnecter pour continuer.");
  });
});
