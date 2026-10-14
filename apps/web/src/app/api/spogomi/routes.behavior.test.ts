import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    range: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    upsert: vi.fn(() => query),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve, reject),
  };
  const supabase = {
    from: vi.fn(() => query),
    rpc: vi.fn(),
    schema: vi.fn(() => ({ from: vi.fn(() => query) })),
  };
  const event = {
    id: "event-1",
    action_id: "action-1",
    event_slug: "paris-2026",
    name: "SPOGOMI Paris",
    state: "draft",
    mode: "casual",
    starts_at: "2026-06-01T08:00:00.000Z",
    ends_at: null,
  };
  const requireAuthenticatedAccess = vi.fn();
  const auth = vi.fn();
  const currentUser = vi.fn();
  const getSupabaseServerClient = vi.fn();
  const enforceServerRateLimit = vi.fn();
  const enforceServerRateLimitForAuthenticatedUser = vi.fn();
  const loadAuthorizedSpogomiEvent = vi.fn();
  const loadSpogomiEventForOrganizer = vi.fn();
  const createSpogomiEvent = vi.fn();
  const updateSpogomiEvent = vi.fn();
  const attachOfficialGpx = vi.fn();
  const autoComposeTeams = vi.fn();
  const lockSpogomiTeams = vi.fn();
  const moveParticipantToTeam = vi.fn();
  const previewRosterImportChanges = vi.fn();
  const confirmRosterImport = vi.fn();
  const renameSpogomiTeam = vi.fn();
  const issueSpogomiIdentityCode = vi.fn();
  const loadSpogomiTeamResultForm = vi.fn();
  const saveSpogomiTeamSubmission = vi.fn();
  const loadSpogomiResultsProjection = vi.fn();
  const loadSpogomiEventResultReviews = vi.fn();
  const resolveSpogomiReviewerRole = vi.fn();
  const reviewSpogomiTeamSubmission = vi.fn();
  const assignSpogomiReferee = vi.fn();
  const revokeSpogomiReferee = vi.fn();
  const buildSpogomiConsolidationPreview = vi.fn();
  const publishSpogomiConsolidation = vi.fn();
  const loadSpogomiGalleryEntries = vi.fn();
  const upsertSpogomiGalleryPhoto = vi.fn();
  const withdrawSpogomiGalleryPhoto = vi.fn();
  const reconcileSpogomiRecognition = vi.fn();
  const getSpogomiRecognitionPartialDetails = vi.fn();
  const loadSpogomiVolunteerEventForUser = vi.fn();
  const buildSpogomiVolunteerSourceFingerprint = vi.fn();
  const resolveSpogomiVolunteerContributionStatus = vi.fn();
  const issueSpogomiVolunteerCertificate = vi.fn();
  const loadSpogomiCertificateForUser = vi.fn();
  const revokeSpogomiVolunteerCertificate = vi.fn();
  const consumeSpogomiTeamAccessToken = vi.fn();
  const issueSpogomiTeamAccessGrant = vi.fn();
  const revokeSpogomiTeamAccessGrant = vi.fn();
  const parseSpogomiImportMapping = vi.fn();
  const previewRosterFile = vi.fn();
  const loadPublishedSpogomiEventForAction = vi.fn();
  const buildXlsxWorkbook = vi.fn();
  const safeXlsxFilename = vi.fn();
  const buildPdfReportLines = vi.fn();
  const buildSimplePdf = vi.fn();
  const parseJsonBodyWithValidation = vi.fn();
  const validationErrorResponse = vi.fn();
  const handleApiError = vi.fn();

  class SpogomiCompositionProtectionError extends Error {}
  class SpogomiIdentityLinkError extends Error {
    kind = "already_linked";
  }

  return {
    query,
    supabase,
    event,
    requireAuthenticatedAccess,
    auth,
    currentUser,
    getSupabaseServerClient,
    enforceServerRateLimit,
    enforceServerRateLimitForAuthenticatedUser,
    loadAuthorizedSpogomiEvent,
    loadSpogomiEventForOrganizer,
    createSpogomiEvent,
    updateSpogomiEvent,
    attachOfficialGpx,
    autoComposeTeams,
    lockSpogomiTeams,
    moveParticipantToTeam,
    previewRosterImportChanges,
    confirmRosterImport,
    renameSpogomiTeam,
    issueSpogomiIdentityCode,
    loadSpogomiTeamResultForm,
    saveSpogomiTeamSubmission,
    loadSpogomiResultsProjection,
    loadSpogomiEventResultReviews,
    resolveSpogomiReviewerRole,
    reviewSpogomiTeamSubmission,
    assignSpogomiReferee,
    revokeSpogomiReferee,
    buildSpogomiConsolidationPreview,
    publishSpogomiConsolidation,
    loadSpogomiGalleryEntries,
    upsertSpogomiGalleryPhoto,
    withdrawSpogomiGalleryPhoto,
    reconcileSpogomiRecognition,
    getSpogomiRecognitionPartialDetails,
    loadSpogomiVolunteerEventForUser,
    buildSpogomiVolunteerSourceFingerprint,
    resolveSpogomiVolunteerContributionStatus,
    issueSpogomiVolunteerCertificate,
    loadSpogomiCertificateForUser,
    revokeSpogomiVolunteerCertificate,
    consumeSpogomiTeamAccessToken,
    issueSpogomiTeamAccessGrant,
    revokeSpogomiTeamAccessGrant,
    parseSpogomiImportMapping,
    previewRosterFile,
    loadPublishedSpogomiEventForAction,
    buildXlsxWorkbook,
    safeXlsxFilename,
    buildPdfReportLines,
    buildSimplePdf,
    parseJsonBodyWithValidation,
    validationErrorResponse,
    handleApiError,
    SpogomiCompositionProtectionError,
    SpogomiIdentityLinkError,
  };
});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimit: mocks.enforceServerRateLimit,
  enforceServerRateLimitForAuthenticatedUser: mocks.enforceServerRateLimitForAuthenticatedUser,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: mocks.handleApiError,
  validationErrorResponse: mocks.validationErrorResponse,
  parseJsonBodyWithValidation: mocks.parseJsonBodyWithValidation,
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn(() => ({ value: "session-token" })) })) }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/preparation-service", () => ({
  attachOfficialGpx: mocks.attachOfficialGpx,
  autoComposeTeams: mocks.autoComposeTeams,
  confirmRosterImport: mocks.confirmRosterImport,
  createSpogomiEvent: mocks.createSpogomiEvent,
  loadSpogomiEventForOrganizer: mocks.loadSpogomiEventForOrganizer,
  lockSpogomiTeams: mocks.lockSpogomiTeams,
  moveParticipantToTeam: mocks.moveParticipantToTeam,
  previewRosterImportChanges: mocks.previewRosterImportChanges,
  updateSpogomiEvent: mocks.updateSpogomiEvent,
  SpogomiCompositionProtectionError: mocks.SpogomiCompositionProtectionError,
}));
vi.mock("@/lib/spogomi/result-service", () => ({
  assignSpogomiReferee: mocks.assignSpogomiReferee,
  loadSpogomiEventResultReviews: mocks.loadSpogomiEventResultReviews,
  loadSpogomiTeamResultForm: mocks.loadSpogomiTeamResultForm,
  resolveSpogomiReviewerRole: mocks.resolveSpogomiReviewerRole,
  reviewSpogomiTeamSubmission: mocks.reviewSpogomiTeamSubmission,
  revokeSpogomiReferee: mocks.revokeSpogomiReferee,
  saveSpogomiTeamSubmission: mocks.saveSpogomiTeamSubmission,
}));
vi.mock("@/lib/spogomi/team-access", () => ({
  consumeSpogomiTeamAccessToken: mocks.consumeSpogomiTeamAccessToken,
  issueSpogomiTeamAccessGrant: mocks.issueSpogomiTeamAccessGrant,
  revokeSpogomiTeamAccessGrant: mocks.revokeSpogomiTeamAccessGrant,
  SPOGOMI_TEAM_SESSION_COOKIE: "cmm_spogomi_team_session",
}));
vi.mock("@/lib/spogomi/consolidation-service", () => ({
  buildSpogomiConsolidationPreview: mocks.buildSpogomiConsolidationPreview,
  publishSpogomiConsolidation: mocks.publishSpogomiConsolidation,
}));
vi.mock("@/lib/spogomi/photo-gallery-service", () => ({
  loadSpogomiGalleryEntries: mocks.loadSpogomiGalleryEntries,
  upsertSpogomiGalleryPhoto: mocks.upsertSpogomiGalleryPhoto,
  withdrawSpogomiGalleryPhoto: mocks.withdrawSpogomiGalleryPhoto,
}));
vi.mock("@/lib/spogomi/recognition-service", () => ({
  getSpogomiRecognitionPartialDetails: mocks.getSpogomiRecognitionPartialDetails,
  reconcileSpogomiRecognition: mocks.reconcileSpogomiRecognition,
}));
vi.mock("@/lib/spogomi/volunteer", () => ({
  buildSpogomiVolunteerSourceFingerprint: mocks.buildSpogomiVolunteerSourceFingerprint,
  issueSpogomiVolunteerCertificate: mocks.issueSpogomiVolunteerCertificate,
  loadSpogomiCertificateForUser: mocks.loadSpogomiCertificateForUser,
  loadSpogomiVolunteerEventForUser: mocks.loadSpogomiVolunteerEventForUser,
  resolveSpogomiVolunteerContributionStatus: mocks.resolveSpogomiVolunteerContributionStatus,
  revokeSpogomiVolunteerCertificate: mocks.revokeSpogomiVolunteerCertificate,
}));
vi.mock("@/lib/spogomi/results-projection-service", () => ({
  loadSpogomiResultsProjection: mocks.loadSpogomiResultsProjection,
}));
vi.mock("@/lib/spogomi/identity-link", () => ({
  issueSpogomiIdentityCode: mocks.issueSpogomiIdentityCode,
  SpogomiIdentityLinkError: mocks.SpogomiIdentityLinkError,
}));
vi.mock("@/lib/spogomi/import-route-schemas", () => ({ parseSpogomiImportMapping: mocks.parseSpogomiImportMapping }));
vi.mock("@/lib/spogomi/preparation", () => ({ previewRosterFile: mocks.previewRosterFile }));
vi.mock("@/lib/spogomi/public-service", () => ({ loadPublishedSpogomiEventForAction: mocks.loadPublishedSpogomiEventForAction }));
vi.mock("@/lib/spogomi/ticket-reconciliation", () => ({ isCachanTicketCompositionEligible: vi.fn(() => true) }));
vi.mock("@/lib/reports/xlsx-export", () => ({ buildXlsxWorkbook: mocks.buildXlsxWorkbook, safeXlsxFilename: mocks.safeXlsxFilename }));
vi.mock("@/lib/pdf-export/simple-pdf", () => ({ buildPdfReportLines: mocks.buildPdfReportLines, buildSimplePdf: mocks.buildSimplePdf }));

const eventContext = { params: Promise.resolve({ eventId: "event-1" }) };
const teamContext = { params: Promise.resolve({ eventId: "event-1", teamId: "team-1" }) };
const participantContext = { params: Promise.resolve({ eventId: "event-1", participantId: "participant-1" }) };

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formRequest(url: string, fields: Record<string, string | File>, method = "POST") {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request(url, { method, body: form });
}

describe("SPOGOMI persistence routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.event.state = "draft";
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.currentUser.mockResolvedValue({ firstName: "Alex", lastName: "Martin", username: "alex" });
    mocks.getSupabaseServerClient.mockReturnValue(mocks.supabase);
    mocks.enforceServerRateLimit.mockResolvedValue(null);
    mocks.enforceServerRateLimitForAuthenticatedUser.mockResolvedValue(null);
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: mocks.supabase, authorized: { event: mocks.event } });
    mocks.loadSpogomiEventForOrganizer.mockResolvedValue(mocks.event);
    mocks.createSpogomiEvent.mockResolvedValue({ event: mocks.event });
    mocks.updateSpogomiEvent.mockResolvedValue(mocks.event);
    mocks.attachOfficialGpx.mockResolvedValue({ route: { source: "upload" } });
    mocks.autoComposeTeams.mockResolvedValue({ teams: [], unassignedParticipantIds: [], proposalFingerprint: "proposal" });
    mocks.lockSpogomiTeams.mockResolvedValue({ status: "locked" });
    mocks.moveParticipantToTeam.mockResolvedValue({ status: "moved" });
    mocks.renameSpogomiTeam.mockResolvedValue({ id: "team-1", publicName: "Alpha" });
    mocks.previewRosterImportChanges.mockResolvedValue({ importSummary: { created: 1 } });
    mocks.confirmRosterImport.mockResolvedValue({ alreadyImported: false, status: "confirmed" });
    mocks.issueSpogomiIdentityCode.mockResolvedValue({ code: "SPOGOMI-1234567890123456", expiresAt: "2026-06-01T10:00:00.000Z" });
    mocks.loadSpogomiTeamResultForm.mockResolvedValue({ event: { name: "SPOGOMI Paris" }, items: [] });
    mocks.saveSpogomiTeamSubmission.mockResolvedValue({ status: "saved" });
    mocks.loadSpogomiEventResultReviews.mockResolvedValue([]);
    mocks.resolveSpogomiReviewerRole.mockResolvedValue("referee");
    mocks.reviewSpogomiTeamSubmission.mockResolvedValue({ status: "certified" });
    mocks.assignSpogomiReferee.mockResolvedValue({ clerkId: "referee-1" });
    mocks.revokeSpogomiReferee.mockResolvedValue(undefined);
    mocks.buildSpogomiConsolidationPreview.mockResolvedValue({ sourceHash: "a".repeat(64), conflicts: [] });
    mocks.publishSpogomiConsolidation.mockResolvedValue({ sourceHash: "a".repeat(64) });
    mocks.loadSpogomiGalleryEntries.mockResolvedValue([]);
    mocks.upsertSpogomiGalleryPhoto.mockResolvedValue({ id: "photo-1" });
    mocks.withdrawSpogomiGalleryPhoto.mockResolvedValue(true);
    mocks.reconcileSpogomiRecognition.mockResolvedValue({ status: "reconciled" });
    mocks.getSpogomiRecognitionPartialDetails.mockReturnValue(null);
    mocks.loadSpogomiVolunteerEventForUser.mockResolvedValue(null);
    mocks.buildSpogomiVolunteerSourceFingerprint.mockReturnValue("fingerprint");
    mocks.resolveSpogomiVolunteerContributionStatus.mockReturnValue("available");
    mocks.issueSpogomiVolunteerCertificate.mockResolvedValue({ certificateReference: "cert-1", eventId: "event-1", issuedAt: "2026-06-01T10:00:00.000Z" });
    mocks.loadSpogomiCertificateForUser.mockResolvedValue(null);
    mocks.revokeSpogomiVolunteerCertificate.mockResolvedValue(undefined);
    mocks.consumeSpogomiTeamAccessToken.mockResolvedValue({ eventSlug: "paris-2026", sessionToken: "session-1" });
    mocks.issueSpogomiTeamAccessGrant.mockResolvedValue({ token: "grant-token", expiresAt: "2026-06-01T10:00:00.000Z" });
    mocks.revokeSpogomiTeamAccessGrant.mockResolvedValue(undefined);
    mocks.parseSpogomiImportMapping.mockReturnValue({ ok: true, mapping: {} });
    mocks.previewRosterFile.mockResolvedValue({ rows: [], errors: [] });
    mocks.loadPublishedSpogomiEventForAction.mockResolvedValue({ event: { id: "event-1" }, results: {} });
    mocks.buildXlsxWorkbook.mockReturnValue(new Uint8Array([80, 75]));
    mocks.safeXlsxFilename.mockReturnValue("spogomi-export.xlsx");
    mocks.buildPdfReportLines.mockReturnValue(["line"]);
    mocks.buildSimplePdf.mockReturnValue(new Uint8Array([37, 80, 68, 70]));
    mocks.parseJsonBodyWithValidation.mockResolvedValue({ ok: true, data: { expectedPublicName: "Old", publicName: "Alpha" } });
    mocks.validationErrorResponse.mockImplementation((details: unknown) => new Response(JSON.stringify({ details }), { status: 422 }));
    mocks.handleApiError.mockImplementation(() => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }));
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.query.single.mockResolvedValue({ data: {}, error: null });
    mocks.supabase.rpc.mockResolvedValue({ data: {}, error: null });
  });

  it("protects event creation, event updates and team composition mutations", async () => {
    const events = await import("./events/route");
    expect((await events.POST(jsonRequest("http://localhost/api/spogomi/events", {}))).status).toBe(422);
    const created = await events.POST(jsonRequest("http://localhost/api/spogomi/events", {
      idempotencyKey: "idempotency-1",
      name: "SPOGOMI Paris",
      locationLabel: "Paris",
      mode: "casual",
      startsAt: "2026-06-01T08:00:00.000Z",
      casualTeamSize: 3,
    }));
    expect(created.status).toBe(201);
    expect(mocks.createSpogomiEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    expect(mocks.createSpogomiEvent.mock.calls[0]?.[0].input).not.toHaveProperty("casualTeamSize");

    const eventRoute = await import("./events/[eventId]/route");
    expect((await eventRoute.GET(new Request("http://localhost"), eventContext)).status).toBe(200);
    expect((await eventRoute.PATCH(jsonRequest("http://localhost", { name: "SPOGOMI Paris 2" }, "PATCH"), eventContext)).status).toBe(200);
    expect(mocks.updateSpogomiEvent).toHaveBeenCalledWith(expect.objectContaining({ actorClerkId: "user-1" }));

    const auto = await import("./events/[eventId]/teams/auto/route");
    expect((await auto.POST(jsonRequest("http://localhost", {}), eventContext)).status).toBe(200);
    expect((await auto.POST(jsonRequest("http://localhost", { confirm: true, proposalFingerprint: "proposal", expectedRevision: 1 }), eventContext)).status).toBe(200);

    const lock = await import("./events/[eventId]/teams/lock/route");
    expect((await lock.POST(jsonRequest("http://localhost", { expectedRevision: 1 }), eventContext)).status).toBe(200);

    const move = await import("./events/[eventId]/teams/move/route");
    expect((await move.POST(jsonRequest("http://localhost", { participantId: "11111111-1111-4111-8111-111111111111", teamId: "22222222-2222-4222-8222-222222222222", expectedRevision: 1 }), eventContext)).status).toBe(200);

    const rename = await import("./events/[eventId]/teams/[teamId]/route");
    expect((await rename.PATCH(jsonRequest("http://localhost", { expectedPublicName: "Old", publicName: "Alpha" }, "PATCH"), teamContext)).status).toBe(200);

    const teamAccess = await import("./events/[eventId]/teams/[teamId]/access/route");
    expect((await teamAccess.POST(new Request("http://localhost"), teamContext)).status).toBe(201);
    expect((await teamAccess.DELETE(new Request("http://localhost", { method: "DELETE" }), teamContext)).status).toBe(200);
    expect(mocks.issueSpogomiTeamAccessGrant).toHaveBeenCalledWith(expect.objectContaining({ eventId: "event-1", teamId: "team-1" }));
    expect(mocks.revokeSpogomiTeamAccessGrant).toHaveBeenCalledWith(expect.objectContaining({ eventId: "event-1", teamId: "team-1" }));
  });

  it("protects imports, route attachments and identity-code issuance", async () => {
    const file = new File(["name\nAlex"], "roster.csv", { type: "text/csv" });
    const preview = await import("./events/[eventId]/imports/preview/route");
    expect((await preview.POST(formRequest("http://localhost", { file }), eventContext)).status).toBe(200);

    const confirm = await import("./events/[eventId]/imports/confirm/route");
    expect((await confirm.POST(formRequest("http://localhost", { file, acceptedRowNumbers: "[2]" }), eventContext)).status).toBe(201);

    const gpx = await import("./events/[eventId]/route-gpx/route");
    expect((await gpx.POST(formRequest("http://localhost", { file: new File(["<gpx />"], "route.gpx", { type: "application/gpx+xml" }) }), eventContext)).status).toBe(201);

    const identityCode = await import("./events/[eventId]/participants/[participantId]/identity-code/route");
    const response = await identityCode.POST(jsonRequest("http://localhost", {}), participantContext);
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("issued");
  });

  it("covers consolidation, review, ranking, gallery and export behavior", async () => {
    const consolidation = await import("./events/[eventId]/consolidation/route");
    expect((await consolidation.GET(new Request("http://localhost"), eventContext)).status).toBe(200);
    expect((await consolidation.POST(jsonRequest("http://localhost", { action: "preview" }), eventContext)).status).toBe(200);
    expect((await consolidation.POST(jsonRequest("http://localhost", { action: "publish", sourceHash: "a".repeat(64) }), eventContext)).status).toBe(200);

    const reviewers = await import("./events/[eventId]/reviewers/route");
    expect((await reviewers.POST(jsonRequest("http://localhost", { clerkId: "referee-1" }), eventContext)).status).toBe(201);
    expect((await reviewers.DELETE(jsonRequest("http://localhost", { clerkId: "referee-1" }), eventContext)).status).toBe(200);

    const results = await import("./events/[eventId]/results/route");
    expect((await results.GET(new Request("http://localhost"), eventContext)).status).toBe(200);
    expect((await results.POST(jsonRequest("http://localhost", { teamId: "11111111-1111-4111-8111-111111111111", submissionId: "22222222-2222-4222-8222-222222222222", decision: "certified", reason: null }), eventContext)).status).toBe(200);

    mocks.event.state = "certified";
    mocks.loadSpogomiResultsProjection.mockResolvedValue({
      event: { name: "SPOGOMI Paris", mode: "casual", startsAt: "2026-06-01", endsAt: null, state: "certified" },
      teams: [{
        teamNumber: 1,
        teamId: "team-1",
        publicName: "Alpha",
        registeredParticipants: 3,
        presentParticipants: 2,
        submissionStatus: "certified",
        submissionVersion: 2,
        sportRank: 1,
        sportStatus: "certified",
        sportScore: 10,
        buttsRank: 2,
        buttsStatus: "certified",
        buttsCount: 3,
        buttsPerParticipant: 1.5,
        categories: [{
          code: "plastic",
          label: "Plastique",
          measurementKind: "mass",
          unit: "g",
          quantity: 2,
          massGrams: 12,
          objectCount: 3,
          environmentalCategorySlug: "plastic",
          provenance: "field",
          measurementMethod: "scale",
        }],
      }],
      results: {
        regulationComplete: true,
        visibility: "certified",
        sport: { status: "available", entries: [{ teamNumber: 1, rank: 1, eligible: true, score: 10 }] },
        butts: { status: "available", entries: [{ teamNumber: 1, rank: 2, eligible: true, ratio: 1.5 }] },
        environmental: { projectionVersion: "v1", sourceHash: "hash", participantsPresent: 2, totalWasteMassGrams: 12, cigaretteButtsCount: 3, cigaretteButtsMassGrams: 1 },
      },
      regulation: { version: "v1", status: "complete", sourceReference: "fixture" },
      sourceSubmissionIds: [],
      publicationSourceSnapshot: { version: "v1" },
    });
    mocks.supabase.rpc.mockResolvedValue({ data: 2, error: null });
    const rankings = await import("./events/[eventId]/rankings/route");
    expect((await rankings.POST(new Request("http://localhost"), eventContext)).status).toBe(200);
    const exportRoute = await import("./events/[eventId]/export.xlsx/route");
    expect((await exportRoute.GET(new Request("http://localhost"), eventContext)).status).toBe(200);

    const gallery = await import("./events/[eventId]/gallery/route");
    expect((await gallery.GET(new Request("http://localhost"), eventContext)).status).toBe(200);
    const photo = { id: "photo-1", url: "https://example.test/photo.jpg", alt: "Photo", caption: null, credit: null, sourceUrl: "https://example.test/source", ownerName: "CleanMyMap", status: "draft" };
    expect((await gallery.POST(jsonRequest("http://localhost", photo), eventContext)).status).toBe(200);
    expect((await gallery.DELETE(new Request("http://localhost?photoId=photo-1", { method: "DELETE" }), eventContext)).status).toBe(200);
  });

  it("preserves private team, contribution, certificate and public lookup contracts", async () => {
    const teamForm = await import("./team-form/route");
    expect((await teamForm.GET(new Request("http://localhost"))).status).toBe(200);
    expect((await teamForm.POST(jsonRequest("http://localhost", { submissionId: null, idempotencyKey: "submission-idempotency", status: "draft", correctionReason: null, items: [] }))).status).toBe(200);

    const teamAccess = await import("./team-access/route");
    expect((await teamAccess.GET(new Request("http://localhost/api/spogomi/team-access"))).status).toBe(404);
    const accessUrl = new URL("http://localhost/api/spogomi/team-access");
    accessUrl.searchParams.set("token", "t");
    accessUrl.searchParams.set("eventSlug", "paris");
    const accessResponse = await teamAccess.GET(new Request(accessUrl));
    expect(accessResponse.status).toBe(303);
    expect(accessResponse.headers.get("Referrer-Policy")).toBe("no-referrer");

    const contributions = await import("./events/[eventId]/contributions/route");
    expect((await contributions.GET(new Request("http://localhost"), eventContext)).status).toBe(200);

    const certificates = await import("./certificates/route");
    expect((await certificates.POST(jsonRequest("http://localhost", {}))).status).toBe(400);
    const certificate = await import("./certificates/[certificateReference]/route");
    expect((await certificate.GET(new Request("http://localhost"), { params: Promise.resolve({ certificateReference: "cert-1" }) })).status).toBe(404);
    mocks.loadSpogomiCertificateForUser.mockResolvedValue({
      certificateReference: "cert-1",
      eventId: "event-1",
      status: "active",
      sourceFingerprint: "fingerprint",
    });
    mocks.loadSpogomiVolunteerEventForUser.mockResolvedValue({
      eventName: "SPOGOMI Paris",
      eventDate: "2026-06-01",
      locationLabel: "Paris",
      eventState: "certified",
      identityVerified: true,
      attendanceStatus: "present",
      actionParticipationConfirmed: true,
      missions: [{ id: "mission-1", kind: "collector", status: "certified", evidenceReference: "evidence", certificationVersion: "v1" }],
    });
    expect((await certificate.GET(new Request("http://localhost"), { params: Promise.resolve({ certificateReference: "cert-1" }) })).status).toBe(200);

    const publicByAction = await import("./public/by-action/[actionId]/route");
    expect((await publicByAction.GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) })).status).toBe(200);

    const recognition = await import("./events/[eventId]/recognition/reconcile/route");
    expect((await recognition.POST(new Request("http://localhost"), eventContext)).status).toBe(200);

    const attestations = await import("./events/[eventId]/recognition/attestations/route");
    expect((await attestations.POST(jsonRequest("http://localhost", { participantId: "11111111-1111-4111-8111-111111111111", kind: "collector", status: "certified", evidenceReference: "evidence", certificationVersion: "v1" }), eventContext)).status).toBe(200);
  });
});
