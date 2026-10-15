import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadAccessMock = vi.hoisted(() => vi.fn());
const loadDashboardMock = vi.hoisted(() => vi.fn());
const assertCapabilityMock = vi.hoisted(() => vi.fn());
const callOperationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/field-operations-service", () => ({
  assertSpogomiFieldCapability: assertCapabilityMock,
  callSpogomiFieldOperation: callOperationMock,
  loadSpogomiFieldOperationsAccess: loadAccessMock,
  loadSpogomiFieldOperationsDashboard: loadDashboardMock,
}));

const eventId = "11111111-1111-4111-8111-111111111111";
const divisionId = "22222222-2222-4222-8222-222222222222";
const teamId = "33333333-3333-4333-8333-333333333333";
const incidentId = "44444444-4444-4444-8444-444444444444";
const measurementId = "55555555-5555-4555-8555-555555555555";
const categoryRuleId = "66666666-6666-4666-8666-666666666666";

function context() {
  return { params: Promise.resolve({ eventId }) };
}

function getRequest(division = divisionId) {
  return new Request(`http://localhost/api/spogomi/events/${eventId}/field-operations?divisionId=${division}`);
}

function postRequest(body: unknown) {
  return new Request(`http://localhost/api/spogomi/events/${eventId}/field-operations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const phaseBody = { action: "phase", divisionId, phase: "collection", at: "2026-10-15T10:00:00.000Z", reason: "Ouverture", provenance: "ordre-1" };

describe("SPOGOMI field operations API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    getSupabaseServerClientMock.mockReturnValue({});
    loadAccessMock.mockResolvedValue({ isOrganizer: true, capabilities: new Set(["timing", "arrival", "arbitration", "measurement_entry", "weighing", "certification"]) });
    loadDashboardMock.mockResolvedValue({ incidents: [{ id: incidentId }], measurements: [{ id: measurementId }], categories: [{ id: categoryRuleId }], teams: [{ id: teamId }] });
    assertCapabilityMock.mockImplementation(() => undefined);
    callOperationMock.mockResolvedValue({ id: "operation-1", status: "recorded" });
  });

  it("authenticates GET before reading the private field dashboard", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("./route");
    const response = await GET(getRequest(), context());

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(loadDashboardMock).not.toHaveBeenCalled();
  });

  it("returns the complete organizer dashboard and filters restricted projections", async () => {
    const { GET } = await import("./route");
    const organizerResponse = await GET(getRequest(), context());
    expect(organizerResponse.status).toBe(200);
    expect(await organizerResponse.json()).toEqual(expect.objectContaining({ incidents: [{ id: incidentId }], measurements: [{ id: measurementId }] }));

    loadAccessMock.mockResolvedValue({ isOrganizer: false, capabilities: new Set(["arrival"]) });
    const restrictedResponse = await GET(getRequest(), context());
    const restrictedBody = await restrictedResponse.json();
    expect(restrictedResponse.status).toBe(200);
    expect(restrictedBody.incidents).toEqual([]);
    expect(restrictedBody.measurements).toEqual([]);
    expect(restrictedBody.categories).toEqual([]);
    expect(restrictedBody.teams).toEqual([{ id: teamId }]);
  });

  it("rejects missing access and malformed mutations without invoking persistence", async () => {
    loadAccessMock.mockResolvedValue(null);
    const { GET, POST } = await import("./route");
    expect((await GET(getRequest(), context())).status).toBe(403);

    loadAccessMock.mockResolvedValue({ isOrganizer: true, capabilities: new Set(["timing"]) });
    expect((await POST(postRequest({ action: "phase", divisionId }), context())).status).toBe(422);
    expect(callOperationMock).not.toHaveBeenCalled();
  });

  it.each([
    ["configure", { action: "configure", divisionId, timezoneName: "Europe/Paris", regulationVersion: "v1", officialStartAt: null, collectionLimitAt: null, sortingLimitAt: null, weighingStartAt: null, weighingEndAt: null, reason: "Configuration", provenance: "registre" }, "spogomi_configure_field_operation", "timing"],
    ["phase", phaseBody, "spogomi_launch_field_phase", "timing"],
    ["return", { action: "return", divisionId, teamId, actualReturnAt: "2026-10-15T12:00:00.000Z", note: null, reason: "Retour" }, "spogomi_record_team_return", "arrival"],
    ["incident", { action: "incident", divisionId, teamId, category: "warning", observedAt: "2026-10-15T12:00:00.000Z", location: "zone A", rawObservation: "Observation", reason: "Arbitrage" }, "spogomi_record_field_incident", "arbitration"],
    ["incident decision", { action: "incident_decision", divisionId, incidentId, decisionKind: "warning", decisionPoints: 1, ruleReference: "R1", justification: "Justifié", scoreEffect: {} }, "spogomi_decide_field_incident", "arbitration"],
    ["measurement", { action: "measurement", divisionId, teamId, categoryRuleId, measurementKind: "mass", unit: "g", quantity: 10, massGrams: 10, objectCount: null, measurementMethod: "balance", provenance: "fiche", sourceKind: "field_entry", sourceReference: null, reason: "Mesure" }, "spogomi_upsert_operational_measurement", undefined],
    ["measurement decision", { action: "measurement_decision", divisionId, measurementId, decision: "certified", rejectionReason: null }, "spogomi_decide_operational_measurement", "certification"],
  ])("routes %s to its canonical operation", async (_label, body, expectedRpc, capability) => {
    const { POST } = await import("./route");
    const response = await POST(postRequest(body), context());

    expect(response.status).toBe(201);
    expect(callOperationMock).toHaveBeenCalledWith(expect.objectContaining({ rpc: expectedRpc, args: expect.objectContaining({ p_event_id: eventId, p_division_id: divisionId, p_actor_clerk_id: "organizer-1" }) }));
    if (capability) expect(assertCapabilityMock).toHaveBeenCalledWith(expect.anything(), capability);
  });

  it("converts forbidden capabilities and provider failures to safe responses", async () => {
    assertCapabilityMock.mockImplementation(() => { throw new Error("SPOGOMI field operation is forbidden."); });
    const { POST } = await import("./route");
    expect((await POST(postRequest(phaseBody), context())).status).toBe(403);

    assertCapabilityMock.mockImplementation(() => undefined);
    callOperationMock.mockRejectedValue(new Error("provider failure"));
    const failedResponse = await POST(postRequest(phaseBody), context());
    expect(failedResponse.status).toBe(500);
    expect(JSON.stringify(await failedResponse.json())).not.toContain("provider failure");
  });
});
