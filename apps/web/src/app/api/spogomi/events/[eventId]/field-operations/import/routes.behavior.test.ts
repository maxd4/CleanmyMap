import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadAccessMock = vi.hoisted(() => vi.fn());
const previewMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/field-operations-service", () => ({ loadSpogomiFieldOperationsAccess: loadAccessMock }));
vi.mock("@/lib/spogomi/field-measurement-import", () => ({
  previewSpogomiMeasurementWorkbook: previewMock,
  confirmSpogomiMeasurementImport: confirmMock,
}));

const eventId = "11111111-1111-4111-8111-111111111111";
const divisionId = "22222222-2222-4222-8222-222222222222";
const importId = "33333333-3333-4333-8333-333333333333";

function context() {
  return { params: Promise.resolve({ eventId }) };
}

function formRequest(values: Record<string, string | File>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return new Request(`http://localhost/api/spogomi/events/${eventId}/field-operations/import/preview`, { method: "POST", body: formData });
}

function jsonRequest(body: unknown) {
  return new Request(`http://localhost/api/spogomi/events/${eventId}/field-operations/import/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function workbook() {
  return new File(["team,category,mass\nAlpha,plastic,10"], "measurements.csv", { type: "text/csv" });
}

describe("SPOGOMI measurement import API boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "operator-1" });
    getSupabaseServerClientMock.mockReturnValue({});
    loadAccessMock.mockResolvedValue({ isOrganizer: false, capabilities: new Set(["measurement_entry"]) });
    previewMock.mockResolvedValue({ importId, rows: [{ rowNumber: 2, status: "ready" }] });
    confirmMock.mockResolvedValue({ importId, status: "confirmed", acceptedRows: 1 });
  });

  it("rejects unauthenticated preview and confirmation before touching imports", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const { POST: preview } = await import("./preview/route");
    const { POST: confirm } = await import("./confirm/route");

    expect((await preview(formRequest({ divisionId, file: workbook() }), context())).status).toBe(401);
    expect((await confirm(jsonRequest({ divisionId, importId }), context())).status).toBe(401);
    expect(previewMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("validates the required preview file and confirmation identifiers", async () => {
    const { POST: preview } = await import("./preview/route");
    const { POST: confirm } = await import("./confirm/route");

    expect((await preview(formRequest({ divisionId }), context())).status).toBe(422);
    expect((await confirm(jsonRequest({ divisionId }), context())).status).toBe(422);
    expect(previewMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("checks operational access and preserves the actor and division in preview", async () => {
    const { POST } = await import("./preview/route");
    const response = await POST(formRequest({ divisionId, file: workbook(), sheetName: "Results" }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ preview: { importId, rows: [{ rowNumber: 2, status: "ready" }] } });
    expect(previewMock).toHaveBeenCalledWith(expect.objectContaining({ eventId, divisionId, actorClerkId: "operator-1", sheetName: "Results", file: expect.any(File) }));

    loadAccessMock.mockResolvedValue(null);
    expect((await POST(formRequest({ divisionId, file: workbook() }), context())).status).toBe(403);
  });

  it("allows organizer access and confirms only the validated payload", async () => {
    loadAccessMock.mockResolvedValue({ isOrganizer: true, capabilities: new Set() });
    const { POST } = await import("./confirm/route");
    const response = await POST(jsonRequest({ divisionId, importId, selectedRowNumbers: [2, 3] }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ importId, status: "confirmed", acceptedRows: 1 });
    expect(confirmMock).toHaveBeenCalledWith({ supabase: {}, eventId, divisionId, importId, selectedRowNumbers: [2, 3], actorClerkId: "operator-1" });
  });

  it("normalizes importer failures without leaking provider details", async () => {
    previewMock.mockRejectedValue(new Error("private parser detail"));
    const { POST } = await import("./preview/route");
    const response = await POST(formRequest({ divisionId, file: workbook() }), context());

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private parser detail");
  });
});
