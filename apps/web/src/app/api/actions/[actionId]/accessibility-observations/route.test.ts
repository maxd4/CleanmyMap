import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const resolveAccessibilitySupportOrganizerAccessMock = vi.hoisted(() => vi.fn());
const updateActionAccessibilityObservationMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/actions/accessibility-support-access", () => ({ resolveAccessibilitySupportOrganizerAccess: resolveAccessibilitySupportOrganizerAccessMock }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: handleApiErrorMock }));
vi.mock("@/lib/actions/accessibility-observations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/actions/accessibility-observations")>();
  return {
    ...actual,
    updateActionAccessibilityObservation: updateActionAccessibilityObservationMock,
  };
});

const context = { params: Promise.resolve({ actionId: "action-1" }) };
const revision = "2026-11-22T10:00:00.000Z";
const measure = { key: "pause-plan", definitionHash: "c".repeat(64), label: "Modalités de pause prévues" };

describe("/api/actions/[actionId]/accessibility-observations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "unauthorized" }, { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({});
    resolveAccessibilitySupportOrganizerAccessMock.mockResolvedValue({
      action: { updated_at: revision, preparation_data: { accessibilityPausePlan: "Pause près du banc" } },
      isOrganizer: true,
    });
    updateActionAccessibilityObservationMock.mockResolvedValue({
      revision: "2026-11-22T10:01:00.000Z",
      measures: [measure],
      observations: [],
    });
    handleApiErrorMock.mockReturnValue(Response.json({ error: "server" }, { status: 500 }));
  });

  it("returns only current measurement definitions and attestations with private no-store headers", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.test"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ status: "ok", revision, measures: [expect.objectContaining({ key: "pause-plan" })], observations: [] });
  });

  it("uses the current authorization boundary before updating an observation", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH",
      body: JSON.stringify({
        expectedRevision: revision,
        measurementKey: measure.key,
        definitionHash: measure.definitionHash,
        observed: true,
        evidenceKind: "organizer_observation",
        observedAt: new Date().toISOString().slice(0, 10),
      }),
    }), context);
    expect(response.status).toBe(200);
    expect(resolveAccessibilitySupportOrganizerAccessMock).toHaveBeenCalledWith({}, { actionId: "action-1", userId: "organizer-1" });
    expect(updateActionAccessibilityObservationMock).toHaveBeenCalledWith({}, expect.objectContaining({ actionId: "action-1", expectedRevision: revision, measurementKey: measure.key }));
  });

  it("rejects future observation dates before any write", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH",
      body: JSON.stringify({
        expectedRevision: revision,
        measurementKey: measure.key,
        definitionHash: measure.definitionHash,
        observed: true,
        evidenceKind: "organizer_observation",
        observedAt: "2999-01-01",
      }),
    }), context);
    expect(response.status).toBe(422);
    expect(updateActionAccessibilityObservationMock).not.toHaveBeenCalled();
  });

  it("refuses observation writes for a non-organizer", async () => {
    resolveAccessibilitySupportOrganizerAccessMock.mockResolvedValueOnce({
      action: { updated_at: revision, preparation_data: {} },
      isOrganizer: false,
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("https://example.test", {
      method: "PATCH",
      body: JSON.stringify({ expectedRevision: revision, measurementKey: measure.key, definitionHash: measure.definitionHash, observed: false }),
    }), context);
    expect(response.status).toBe(403);
    expect(updateActionAccessibilityObservationMock).not.toHaveBeenCalled();
  });
});
