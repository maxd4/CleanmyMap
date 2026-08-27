import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const normalizeExternalActionImportMock = vi.hoisted(() => vi.fn());
const createActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const verifyDryRunProofMock = vi.hoisted(() => vi.fn());
const createDryRunProofMock = vi.hoisted(() => vi.fn());
const hashImportPayloadMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));
vi.mock("@/lib/actions/unified-source", () => ({
  normalizeExternalActionImport: normalizeExternalActionImportMock,
}));
vi.mock("@/lib/actions/store", () => ({
  createAction: createActionMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));
vi.mock("@/lib/admin/import/dry-run-proof", () => ({
  createDryRunProof: createDryRunProofMock,
  hashImportPayload: hashImportPayloadMock,
  verifyDryRunProof: verifyDryRunProofMock,
}));
vi.mock("@/lib/backpressure", () => ({
  acquireBackpressure: () => ({ allowed: true }),
  releaseBackpressure: vi.fn(),
}));

const quality = (status: "ok" | "blocking") => ({
  version: "test",
  status,
  anomalies: status === "blocking" ? [{ code: "partial_coordinates", severity: "blocking", message: "partial" }] : [],
  blockingAnomalies: status === "blocking" ? [{ code: "partial_coordinates", severity: "blocking", message: "partial" }] : [],
  warnings: [],
  geolocation: {
    state: status === "blocking" ? "partial" : "valid",
    provenance: "measured",
    hasCoordinates: status !== "blocking",
    hasGeometry: false,
  },
  provenance: { measures: "measured", geometry: "missing", impact: "derived" },
  confidence: null,
});

function payload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        actionDate: "2026-08-04",
        locationLabel: "Quai de test",
        latitude: 48.85,
        longitude: 2.35,
        wasteKg: 4,
        cigaretteButts: 20,
        volunteersCount: 2,
        durationMinutes: 60,
        ...overrides,
      },
    ],
  };
}

function payloadWithItems(count: number) {
  return {
    items: Array.from({ length: count }, (_, index) => ({
      ...payload().items[0],
      actionDate: `2026-08-${String(index + 4).padStart(2, "0")}`,
    })),
  };
}

describe("POST /api/actions/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    hashImportPayloadMock.mockReturnValue("payload-hash");
    createDryRunProofMock.mockReturnValue("proof-token-123456789012345678");
    verifyDryRunProofMock.mockReturnValue({ ok: true });
    getSupabaseServerClientMock.mockReturnValue({});
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    normalizeExternalActionImportMock.mockImplementation((input) => ({
      payload: {
        actionDate: input.dates.observedAt,
        locationLabel: input.location.label,
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        wasteKg: input.metadata.wasteKg,
        cigaretteButts: input.metadata.cigaretteButts ?? 0,
        volunteersCount: input.metadata.volunteersCount ?? 1,
        durationMinutes: input.metadata.durationMinutes ?? 0,
        notes: input.metadata.notes,
        recordType: "action",
      },
      dataQuality: quality("ok"),
    }));
  });

  it("reports geolocation coverage during dry-run", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import", {
        method: "POST",
        body: JSON.stringify(payload()),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "dry_run",
      count: 1,
      stats: { withCoordinates: 1, blockingAnomalies: 0 },
    });
    expect(normalizeExternalActionImportMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "import_dry_run",
        outcome: "success",
        details: expect.objectContaining({ count: 1, payloadHash: "payload-hash" }),
      }),
    );
  });

  it("does not let a dry-run query parameter select the write path", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import?dryRun=0", {
        method: "POST",
        body: JSON.stringify(payload()),
      }),
    );

    expect(response.status).toBe(200);
    expect(createActionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ status: "dry_run" });
  });

  it("keeps missing, partial and invalid geolocation counts distinct", async () => {
    const baseQuality = quality("ok");
    const missingQuality = {
      ...baseQuality,
      geolocation: {
        ...baseQuality.geolocation,
        state: "missing" as const,
        hasCoordinates: false,
      },
    };
    const partialQuality = quality("blocking");
    const invalidQuality = {
      ...partialQuality,
      geolocation: {
        ...partialQuality.geolocation,
        state: "invalid" as const,
      },
    };

    normalizeExternalActionImportMock
      .mockReturnValueOnce({ payload: {}, dataQuality: missingQuality })
      .mockReturnValueOnce({ payload: {}, dataQuality: partialQuality })
      .mockReturnValueOnce({ payload: {}, dataQuality: invalidQuality });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import?dryRun=1", {
        method: "POST",
        body: JSON.stringify({
          items: [payload().items[0], payload().items[0], payload().items[0]],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      stats: {
        withCoordinates: 0,
        missingCoordinates: 1,
        partialCoordinates: 1,
        invalidCoordinates: 1,
      },
    });
  });

  it("refuses a confirmed import with a blocking normalized anomaly", async () => {
    normalizeExternalActionImportMock.mockReturnValueOnce({
      payload: {
        actionDate: "2026-08-04",
        locationLabel: "Quai de test",
        latitude: 48.85,
        longitude: undefined,
        wasteKg: 4,
        cigaretteButts: 20,
        volunteersCount: 2,
        durationMinutes: 60,
        recordType: "action",
      },
      dataQuality: quality("blocking"),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import", {
        method: "POST",
        body: JSON.stringify({
          ...payload({ longitude: null }),
          dryRunProof: "proof-token-123456789012345678",
          confirmPhrase: "CONFIRMER IMPORT",
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(createActionMock).not.toHaveBeenCalled();
  });

  it("writes through createAction after a valid dry-run confirmation", async () => {
    createActionMock.mockResolvedValue({ id: "action-1" });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import", {
        method: "POST",
        body: JSON.stringify({
          ...payload(),
          dryRunProof: "proof-token-123456789012345678",
          confirmPhrase: "CONFIRMER IMPORT",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createActionMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        payload: expect.objectContaining({ recordType: "action" }),
        organizers: [expect.objectContaining({ userId: "admin-1", isPrimary: true })],
      }),
    );
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "import_confirm",
        outcome: "success",
        details: expect.objectContaining({
          count: 1,
          attemptedCount: 1,
          importedCount: 1,
          currentItemIndex: 0,
          totalCount: 1,
          stage: "audit_finalize",
        }),
      }),
    );
  });

  it("audits a first item write failure without partial mutation", async () => {
    const externalError = "supabase item payload leaked";
    createActionMock.mockRejectedValue(new Error(externalError));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import", {
        method: "POST",
        body: JSON.stringify({
          ...payloadWithItems(1),
          dryRunProof: "proof-token-123456789012345678",
          confirmPhrase: "CONFIRMER IMPORT",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "import_confirm",
        outcome: "error",
        details: expect.objectContaining({
          attemptedCount: 1,
          importedCount: 0,
          currentItemIndex: 0,
          failedItemIndex: 0,
          totalCount: 1,
          stage: "item_write",
          partialMutation: false,
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0])).not.toContain(
      externalError,
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0])).not.toContain(
      "Quai de test",
    );
  });

  it("audits exact counters and partial mutation after an intermediate item failure", async () => {
    const externalError = "third-party database detail";
    createActionMock
      .mockResolvedValueOnce({ id: "action-1" })
      .mockResolvedValueOnce({ id: "action-2" })
      .mockRejectedValueOnce(new Error(externalError));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/actions/import", {
        method: "POST",
        body: JSON.stringify({
          ...payloadWithItems(3),
          dryRunProof: "proof-token-123456789012345678",
          confirmPhrase: "CONFIRMER IMPORT",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(createActionMock).toHaveBeenCalledTimes(3);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "import_confirm",
        outcome: "error",
        details: expect.objectContaining({
          attemptedCount: 3,
          importedCount: 2,
          currentItemIndex: 2,
          failedItemIndex: 2,
          totalCount: 3,
          stage: "item_write",
          partialMutation: true,
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0])).not.toContain(
      externalError,
    );
  });
});
