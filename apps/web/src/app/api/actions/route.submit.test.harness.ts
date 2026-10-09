import { expect, vi } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/data-contract";
import {
  buildCreateActionPayload,
  createInitialFormState,
} from "@/components/actions/action-declaration/payload";
import {
  authenticatedRouteMocks,
  createAnalyticsConsentModule,
  createAuthenticatedRouteAuthzModule,
  createRateLimitModule,
  createSignalementModule,
  createSupabaseServerModule,
  rateLimitMocks,
} from "@/app/api/test-helpers";

export const requireAuthenticatedAccessMock = authenticatedRouteMocks.requireAuthenticatedAccess;
export const getCurrentUserIdentityMock = authenticatedRouteMocks.getCurrentUserIdentity;
export const pickTraceableActorNameMock = authenticatedRouteMocks.pickTraceableActorName;
export const getSupabaseServerClientMock = authenticatedRouteMocks.getSupabaseServerClient;
export const createSignalementMock = authenticatedRouteMocks.createSignalement;
const hasAnalyticsConsentCookieMock = authenticatedRouteMocks.hasAnalyticsConsentCookie;
const verifyRateLimitMock = rateLimitMocks.verifyRateLimit;
const createServerRateLimitResponseMock = rateLimitMocks.createServerRateLimitResponse;

export function mockAdminIdentity(options: { activeRole?: string } = {}) {
  getCurrentUserIdentityMock.mockResolvedValueOnce({
    userId: "user-test-1",
    displayName: "Test User",
    firstName: "Test",
    username: "test@example.org",
    currentLevel: 1,
    actorNameOptions: ["Test User"],
    role: "admin",
    ...(options.activeRole ? { activeRole: options.activeRole } : {}),
    badges: [],
  });
}

export async function postSubmitPayload(payload: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/actions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export function buildQuickPreActionPayload() {
  const form = createInitialFormState("Test User");
  form.organizerType = "spontaneous";
  form.organizerName = "Organisateur en attente de compte";
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
  form.logisticsNotes = "Point de rendez-vous confirmé.";
  form.checklistBeforeDeparture = "Eau, gants, sacs";
  form.volunteersCount = "1";

  return toContractCreatePayload(
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
}

type SubmitPayloadInput = Parameters<typeof toContractCreatePayload>[0];

export function buildSubmitPayload(overrides: Partial<SubmitPayloadInput> = {}) {
  return toContractCreatePayload({
    actorName: "Test User",
    associationName: "Action spontanée",
    organizerType: "spontaneous",
    actionDate: "2026-04-22",
    locationLabel: "Test lieu action",
    wasteKg: 2.5,
    cigaretteButts: 0,
    volunteersCount: 4,
    durationMinutes: 45,
    notes: "Formulaire bénévole de test",
    organizerAccounts: ["user-test-1"],
    submissionMode: "quick",
    ...overrides,
  });
}

export function expectPendingActionCreation() {
  expect(createActionMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ status: "pending" }),
  );
}

export async function expectCreatedActionResponse(response: Response) {
  const body = (await response.json()) as { id?: string; error?: string };
  expect(response.status).toBe(201);
  expect(body.id).toBe("action-test-1");
  return body;
}

const buildPostActionRetentionLoopMock = vi.hoisted(() => vi.fn());
const trackServerEventMock = vi.hoisted(() => vi.fn());
const createActionMock = vi.hoisted(() => vi.fn());
const invalidateSnapshotsMock = vi.hoisted(() => vi.fn());
const resolveActionOrganizersMock = vi.hoisted(() => vi.fn());
const resolveActionOrganizerMock = vi.hoisted(() => vi.fn());
const resolveActionParticipantsMock = vi.hoisted(() => vi.fn());
const resolveDefaultActionOrganizerIdsMock = vi.hoisted(() => vi.fn());
const trackActionCreatedMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => createAuthenticatedRouteAuthzModule());
vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());
vi.mock("@/lib/gamification/progression", () => ({
  buildPostActionRetentionLoop: buildPostActionRetentionLoopMock,
  trackActionCreated: trackActionCreatedMock,
}));
vi.mock("@/lib/analytics-consent", () => createAnalyticsConsentModule());
vi.mock("@/lib/analytics.server", () => ({
  trackServerEvent: trackServerEventMock,
}));
vi.mock("@/lib/supabase/server", () =>
  createSupabaseServerModule(getSupabaseServerClientMock),
);
vi.mock("@/lib/actions/store", () => ({
  createAction: createActionMock,
}));
vi.mock("@/lib/public-surface-snapshots", () => ({
  invalidatePublicSurfaceSnapshotsByRoute: invalidateSnapshotsMock,
}));
vi.mock("@/lib/actions/signalement/create-signalement", () => createSignalementModule());
vi.mock("@/lib/actions/participation/organizers", () => ({
  resolveActionOrganizers: resolveActionOrganizersMock,
  resolveActionParticipants: resolveActionParticipantsMock,
  resolveDefaultActionOrganizerIds: resolveDefaultActionOrganizerIdsMock,
}));
vi.mock("@/lib/actions/organizer-directory-registry", async () => ({
  ...(await vi.importActual<typeof import("@/lib/actions/organizer-directory-registry")>(
    "@/lib/actions/organizer-directory-registry",
  )),
  resolveActionOrganizer: resolveActionOrganizerMock,
}));

export {
  buildPostActionRetentionLoopMock,
  createActionMock,
  trackActionCreatedMock,
  invalidateSnapshotsMock,
  resolveActionOrganizersMock,
  resolveActionParticipantsMock,
  resolveDefaultActionOrganizerIdsMock,
  trackServerEventMock,
};

export function resetSubmitRouteMocks() {
  vi.resetModules();
  vi.clearAllMocks();
  getSupabaseServerClientMock.mockReturnValue({});
  resolveActionOrganizerMock.mockImplementation(async (params: {
    organizerId?: string | null;
    organizerName?: string | null;
    organizerType: string;
  }) => ({
    organizerId:
      params.organizerType === "spontaneous"
        ? null
        : params.organizerId ?? "directory-test-1",
    organizerName:
      params.organizerName?.trim() ||
      (params.organizerType === "spontaneous"
        ? "Action spontanée"
        : "Structure de test"),
    legacyAssociationName:
      params.organizerType === "spontaneous"
        ? "Action spontanée"
        : params.organizerName?.trim() || "Structure de test",
  }));
  createActionMock.mockResolvedValue({ id: "action-test-1" });
  invalidateSnapshotsMock.mockResolvedValue(undefined);
  createSignalementMock.mockResolvedValue({
    id: "spot-test-1",
    created_at: "2026-04-22T00:00:00Z",
    created_by_clerk_id: "user-test-1",
    label: "Lieu propre test",
    spot_type: "clean_place",
    latitude: 48.8566,
    longitude: 2.3522,
    status: "new",
    notes: "[spot-by:Test User] signalement",
  });
  resolveActionOrganizersMock.mockImplementation(async (params: {
    organizerAccounts?: string[];
  }) => ({
    organizers: (params.organizerAccounts ?? []).map((userId, index) => ({
      userId,
      displayName: userId === "user-test-1" ? "Test User" : userId,
      handle: userId === "user-test-1" ? "test@example.org" : userId,
      isPrimary: index === 0,
      sourceToken: null,
    })),
    unresolvedTokens: [],
  }));
  resolveActionParticipantsMock.mockResolvedValue({
    participants: [],
    unresolvedTokens: [],
  });
  resolveDefaultActionOrganizerIdsMock.mockReturnValue(["user-admin-default"]);
  requireAuthenticatedAccessMock.mockResolvedValue({
    ok: true,
    userId: "user-test-1",
  });
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
  buildPostActionRetentionLoopMock.mockResolvedValue({
    summary: "2.5 kg collectes",
    badge: null,
    xpAwarded: 0,
    thanksMessage: "Merci.",
    share: { text: "Action", url: "/actions/history" },
    nextActionSuggestion: "Voir la carte.",
  });
  trackActionCreatedMock.mockResolvedValue(undefined);
  hasAnalyticsConsentCookieMock.mockReturnValue(true);
  verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: undefined });
  createServerRateLimitResponseMock.mockReturnValue(null);
}
