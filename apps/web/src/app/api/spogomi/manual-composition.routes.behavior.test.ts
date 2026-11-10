import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  loadAuthorizedSpogomiEvent: vi.fn(),
  createSpogomiTeam: vi.fn(),
  createSpogomiManualPlace: vi.fn(),
  updateSpogomiParticipantPrivateLabel: vi.fn(),
  saveSpogomiCompositionDraft: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  parseJsonBodyWithValidation: async (request: Request, schema: { parse: (value: unknown) => unknown }) => {
    try {
      return { ok: true, data: schema.parse(await request.json()) };
    } catch {
      return { ok: false, response: new Response(JSON.stringify({ error: "invalid" }), { status: 422 }) };
    }
  },
  handleApiError: (error: unknown) => new Response(JSON.stringify({ error: String(error) }), { status: 500 }),
}));
vi.mock("@/lib/spogomi/preparation-service", () => ({
  createSpogomiTeam: mocks.createSpogomiTeam,
  createSpogomiManualPlace: mocks.createSpogomiManualPlace,
  updateSpogomiParticipantPrivateLabel: mocks.updateSpogomiParticipantPrivateLabel,
}));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/preparation/composition-mutation-service", () => ({ saveSpogomiCompositionDraft: mocks.saveSpogomiCompositionDraft }));

const eventContext = { params: Promise.resolve({ eventId: "event-1" }) };
const participantContext = { params: Promise.resolve({ eventId: "event-1", participantId: "participant-1" }) };
const divisionId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown, method = "POST") {
  return new Request("http://localhost/api/spogomi/events/event-1", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("SPOGOMI manual composition routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "organizer-1" });
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({
      supabase: { id: "server-client" },
      authorized: { event: { id: "event-1", composition_revision: 4 } },
    });
    mocks.createSpogomiTeam.mockResolvedValue({ team: { id: "team-1" }, compositionRevision: 5 });
    mocks.createSpogomiManualPlace.mockResolvedValue({ participant: { id: "participant-1" }, compositionRevision: 5 });
    mocks.updateSpogomiParticipantPrivateLabel.mockResolvedValue({ participantId: "participant-1", displayName: "Ada", compositionRevision: 5 });
    mocks.saveSpogomiCompositionDraft.mockResolvedValue({ divisionId, compositionRevision: 5, already_processed: false });
  });

  it("refuses anonymous requests before loading the event or mutating composition", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    const route = await import("./events/[eventId]/teams/route");

    expect((await route.POST(request({ divisionId }), eventContext)).status).toBe(401);
    expect(mocks.loadAuthorizedSpogomiEvent).not.toHaveBeenCalled();
    expect(mocks.createSpogomiTeam).not.toHaveBeenCalled();
  });

  it("validates and binds team creation to the authenticated organizer and division", async () => {
    const route = await import("./events/[eventId]/teams/route");

    expect((await route.POST(request({ divisionId, expectedRevision: 4, publicName: "Équipe Ada" }), eventContext)).status).toBe(200);
    expect(mocks.createSpogomiTeam).toHaveBeenCalledWith({
      supabase: { id: "server-client" },
      event: { id: "event-1", composition_revision: 4 },
      actorClerkId: "organizer-1",
      divisionId,
      expectedRevision: 4,
      publicName: "Équipe Ada",
    });
    expect((await route.POST(request({ divisionId, publicName: "x".repeat(61) }), eventContext)).status).toBe(422);
    expect(mocks.createSpogomiTeam).toHaveBeenCalledTimes(1);
  });

  it("keeps manual place creation and label editing private and revision-scoped", async () => {
    const createRoute = await import("./events/[eventId]/participants/manual/route");
    const updateRoute = await import("./events/[eventId]/participants/[participantId]/route");

    expect((await createRoute.POST(request({ divisionId, expectedRevision: 4, privateLabel: "Ada" }), eventContext)).status).toBe(200);
    expect(mocks.createSpogomiManualPlace).toHaveBeenCalledWith(expect.objectContaining({ actorClerkId: "organizer-1", divisionId, privateLabel: "Ada", expectedRevision: 4 }));
    expect((await updateRoute.PATCH(request({ divisionId, expectedRevision: 4, expectedPrivateLabel: null, privateLabel: "Ada corrigée" }, "PATCH"), participantContext)).status).toBe(200);
    expect(mocks.updateSpogomiParticipantPrivateLabel).toHaveBeenCalledWith(expect.objectContaining({ actorClerkId: "organizer-1", participantId: "participant-1", divisionId, expectedPrivateLabel: null, privateLabel: "Ada corrigée", expectedRevision: 4 }));
  });

  it("authenticates one grouped division draft and keeps its local keys in one payload", async () => {
    const route = await import("./events/[eventId]/teams/draft/route");
    expect((await route.POST(request({ divisionId, expectedRevision: 4, teams: [{ id: null, clientKey: "local-team-1", publicName: "Équipe locale", expectedPublicName: null }], participants: [{ id: null, clientKey: "local-place-1", privateLabel: "Place locale", teamKey: "local-team-1" }] }), eventContext)).status).toBe(200);
    expect(mocks.saveSpogomiCompositionDraft).toHaveBeenCalledWith({
      supabase: { id: "server-client" },
      event: { id: "event-1", composition_revision: 4 },
      actorClerkId: "organizer-1",
      divisionId,
      expectedRevision: 4,
      teams: [{ id: null, clientKey: "local-team-1", publicName: "Équipe locale", expectedPublicName: null }],
      participants: [{ id: null, clientKey: "local-place-1", privateLabel: "Place locale", teamKey: "local-team-1" }],
    });
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    expect((await route.POST(request({ divisionId, expectedRevision: 4, teams: [], participants: [] }), eventContext)).status).toBe(401);
    expect(mocks.saveSpogomiCompositionDraft).toHaveBeenCalledTimes(1);
  });
});
