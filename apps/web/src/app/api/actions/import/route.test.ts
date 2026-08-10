import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const normalizeExternalActionImportMock = vi.hoisted(() => vi.fn());
const createActionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const verifyDryRunProofMock = vi.hoisted(() => vi.fn());
const createDryRunProofMock = vi.hoisted(() => vi.fn());
const hashImportPayloadMock = vi.hoisted(() => vi.fn());

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
vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/admin/dry-run-proof", () => ({
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

describe("POST /api/actions/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    hashImportPayloadMock.mockReturnValue("payload-hash");
    createDryRunProofMock.mockReturnValue("proof-token-123456789012345678");
    verifyDryRunProofMock.mockReturnValue({ ok: true });
    getSupabaseServerClientMock.mockReturnValue({});
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
  });
});
