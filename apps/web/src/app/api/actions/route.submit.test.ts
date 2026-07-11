import { beforeEach, describe, expect, it, vi } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/data-contract";
import {
  buildCreateActionPayload,
  createInitialFormState,
} from "@/components/actions/action-declaration/payload";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const pickTraceableActorNameMock = vi.hoisted(() => vi.fn());
const buildPostActionRetentionLoopMock = vi.hoisted(() => vi.fn());
const trackServerEventMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createActionMock = vi.hoisted(() => vi.fn());
const resolveActionCreationStatusMock = vi.hoisted(() =>
  vi.fn((isAutoApprovedSubmission: boolean) =>
    isAutoApprovedSubmission ? "approved" : "pending",
  ),
);
const resolveActionOrganizersMock = vi.hoisted(() => vi.fn());
const resolveActionParticipantsMock = vi.hoisted(() => vi.fn());
const resolveDefaultActionOrganizerIdsMock = vi.hoisted(() => vi.fn());
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
  resolveActionCreationStatus: resolveActionCreationStatusMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  resolveActionOrganizers: resolveActionOrganizersMock,
  resolveActionParticipants: resolveActionParticipantsMock,
  resolveDefaultActionOrganizerIds: resolveDefaultActionOrganizerIdsMock,
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
    resolveActionParticipantsMock.mockResolvedValue({
      participants: [],
      unresolvedTokens: [],
    });
    resolveDefaultActionOrganizerIdsMock.mockReturnValue(["user-admin-default"]);
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
    expect(resolveActionParticipantsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        participantAccounts: undefined,
        organizerIds: ["user-test-1"],
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

  it("accepts quick pre-action submissions without waste and keeps them pending", async () => {
    const { POST } = await import("./route");

    const form = createInitialFormState("Test User");
    form.actionTitle = "Préparation terrain";
    form.shortDescription = "Préparer une action de nettoyage.";
    form.communeZoneLabel = "Paris 15";
    form.departureLocationLabel = "Place de la Mairie";
    form.actionDate = "2026-04-22";
    form.meetingTime = "09:00";
    form.departureTime = "09:30";
    form.durationMinutes = "30";
    form.plannedObjective = "nettoyage";
    form.placeType = "parc";
    form.estimatedDifficulty = "moderee";
    form.accessibility = "Accessible en transport";
    form.safetyInstructions = "Gants recommandés.";
    form.recommendedMaterials = "Sacs, pinces, gants";
    form.participantMessage = "Réponse souhaitée avant la veille.";
    form.creatorRole = "organisateur";
    form.preparationState = "pret_a_partager";
    form.logisticsNotes = "Point de rendez-vous confirmé.";
    form.checklistBeforeDeparture = "Eau, gants, sacs";
    form.volunteersCount = "1";

    const payload = toContractCreatePayload(
      buildCreateActionPayload({
        form,
        declarationMode: "quick",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        photos: [],
        visionEstimate: null,
        userMetadata: {
          userId: "user-test-1",
          displayName: "Test User",
        },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as { id?: string; error?: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe("action-test-1");
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "pending",
      }),
    );
  }, 15000);

  it("auto-approves an admin-like pre-action created by its author", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "user-test-1",
      displayName: "Test User",
      firstName: "Test",
      username: "test@example.org",
      currentLevel: 1,
      actorNameOptions: ["Test User"],
      role: "admin",
      badges: [],
    });

    const { POST } = await import("./route");

    const form = createInitialFormState("Test User");
    form.actionTitle = "Préparation terrain";
    form.shortDescription = "Préparer une action de nettoyage.";
    form.communeZoneLabel = "Paris 15";
    form.departureLocationLabel = "Place de la Mairie";
    form.actionDate = "2026-04-22";
    form.meetingTime = "09:00";
    form.departureTime = "09:30";
    form.durationMinutes = "30";
    form.plannedObjective = "nettoyage";
    form.placeType = "parc";
    form.estimatedDifficulty = "moderee";
    form.accessibility = "Accessible en transport";
    form.safetyInstructions = "Gants recommandés.";
    form.recommendedMaterials = "Sacs, pinces, gants";
    form.participantMessage = "Réponse souhaitée avant la veille.";
    form.creatorRole = "organisateur";
    form.preparationState = "pret_a_partager";
    form.logisticsNotes = "Point de rendez-vous confirmé.";
    form.checklistBeforeDeparture = "Eau, gants, sacs";
    form.volunteersCount = "1";

    const payload = toContractCreatePayload(
      buildCreateActionPayload({
        form,
        declarationMode: "quick",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        photos: [],
        visionEstimate: null,
        userMetadata: {
          userId: "user-test-1",
          displayName: "Test User",
        },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "approved",
      }),
    );
  }, 15000);

  it("falls back to the admin organizer when no organizer is provided", async () => {
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

    const body = (await response.json()) as { id?: string; error?: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe("action-test-1");
    expect(resolveDefaultActionOrganizerIdsMock).toHaveBeenCalledWith({
      creatorUserId: "user-test-1",
      creatorIsAdminLike: false,
    });
    expect(resolveActionOrganizersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerAccounts: ["user-admin-default"],
      }),
    );
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "approved",
      }),
    );
  }, 15000);

  it("passes manual participant accounts to the creation pipeline", async () => {
    resolveActionParticipantsMock.mockResolvedValueOnce({
      participants: [
        {
          userId: "user-manual-1",
          displayName: "Participant manuel",
          handle: "manual",
          sourceToken: "user-manual-1",
        },
      ],
      unresolvedTokens: [],
    });

    const { POST } = await import("./route");

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Test lieu action",
      wasteKg: 2.5,
      cigaretteButts: 0,
      volunteersCount: 4,
      durationMinutes: 45,
      notes: "Formulaire bénévole de test",
      submissionMode: "quick",
      participantAccounts: ["user-manual-1"],
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
    expect(createActionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        manualParticipants: [
          {
            userId: "user-manual-1",
            displayName: "Participant manuel",
            handle: "manual",
            sourceToken: "user-manual-1",
          },
        ],
      }),
    );
  }, 15000);

  it("rejects unknown manual participant accounts", async () => {
    resolveActionParticipantsMock.mockResolvedValueOnce({
      participants: [],
      unresolvedTokens: ["missing-user"],
    });

    const { POST } = await import("./route");

    const payload = toContractCreatePayload({
      actorName: "Test User",
      associationName: "Action spontanée",
      actionDate: "2026-04-22",
      locationLabel: "Test lieu action",
      wasteKg: 2.5,
      cigaretteButts: 0,
      volunteersCount: 4,
      durationMinutes: 45,
      notes: "Formulaire bénévole de test",
      submissionMode: "quick",
      participantAccounts: ["missing-user"],
    });

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as {
      details?: { participantAccounts?: string[] };
    };
    expect(response.status).toBe(422);
    expect(body.details?.participantAccounts?.[0]).toContain("Comptes participants introuvables");
    expect(createActionMock).not.toHaveBeenCalled();
  }, 15000);

  it("rejects volunteer actions without waste or cigarette butts", async () => {
    const { POST } = await import("./route");

    const payload = {
      type: "action",
      source: "web_form",
      location: {
        label: "Test lieu action",
      },
      dates: {
        observedAt: "2026-04-22",
      },
      metadata: {
        associationName: "Action spontanée",
        wasteKg: 0,
        cigaretteButts: 0,
        volunteersCount: 1,
        durationMinutes: 45,
        notes: "Formulaire bénévole de test",
      },
    };

    const response = await POST(
      new Request("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const body = (await response.json()) as {
      details?: { wasteKg?: string[] };
    };
    expect(response.status).toBe(422);
    expect(body.details?.wasteKg?.[0]).toContain("déchets ou des mégots");
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
