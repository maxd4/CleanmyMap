import { expect, vi } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/data-contract";
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

export async function postSubmitPayload(payload: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/actions", {
      method: "POST",
      body: JSON.stringify(payload),
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
