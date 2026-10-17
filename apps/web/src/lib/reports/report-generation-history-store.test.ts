import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
  listReportGenerationHistory,
  persistReportGeneration,
} from "./report-generation-history-store";

const payload = {
  title: "Rapport d'impact - Paris - Par défaut",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  snapshotSchemaVersion: 2 as const,
  snapshotMetadata: {
    snapshotSchemaVersion: 2 as const,
    templateVersion: "reports-template-v1" as const,
    rendererVersion: "official-report-html-v1" as const,
    generatedAt: "2026-08-27T10:30:00.000Z",
    period: { id: "six_months" as const, from: "2026-02-27", to: "2026-08-27", timeZone: "UTC" as const },
    scope: { kind: "global" as const, value: "", label: "Paris" },
    detailLevel: "default" as const,
    modules: { dataAndCartography: true, transparencyAndMethods: true, rawData: false, detailedFiles: true },
    provenance: { type: "multi_action" as const, source: "public.actions" as const, resolvedAt: "2026-08-27T10:30:00.000Z", actionCount: 1 },
    methodology: { proxyVersion: "impact-proxy-v1", qualityRulesVersion: "quality-v1" },
    dataAvailability: { truncated: false, availableSources: ["actions"], failedSources: [], communityEvents: "available" as const },
  },
  data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Résumé"] },
};

const dbRow = {
  id: "generation-1",
  created_at: "2026-08-27T10:30:01.000Z",
  generated_at: "2026-08-27T10:30:00.000Z",
  created_by_clerk_id: "user-admin",
  title: payload.title,
  filename: "rapport_reporting_six_months.pdf",
  period_id: payload.periode,
  scope_kind: "global",
  scope_value: "",
  scope_label: "Paris",
  detail_level: "default",
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
  snapshot: payload,
};
const historicalId = "11111111-1111-4111-8111-111111111111";
const historicalRow = {
  ...dbRow,
  id: historicalId,
  generated_at: payload.data.generatedAt,
};

describe("report generation history store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists persisted rows newest first with a bounded limit", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [dbRow], error: null });
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(listReportGenerationHistory("user-1", 99)).resolves.toMatchObject([
      {
        id: "generation-1",
        period: "Six mois",
        perimeter: "Paris",
        detail: "Par défaut",
      },
    ]);
    expect(select).toHaveBeenCalledWith(
      "id, generated_at, title, period_id, scope_label, detail_level",
    );
    expect(eq).toHaveBeenCalledWith("created_by_clerk_id", "user-1");
    expect(order).toHaveBeenCalledWith("generated_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(12);
  });

  it("persists the exact payload and server-derived filename", async () => {
    const single = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    });

    await expect(
      persistReportGeneration({
        createdByClerkId: "user-admin",
        input: {
          payload,
          scopeKind: "global",
          scopeValue: "",
          scopeLabel: "Paris",
          detailLevel: "default",
          modules: {
            dataAndCartography: true,
            transparencyAndMethods: true,
            rawData: false,
            detailedFiles: true,
          },
        },
      }),
    ).resolves.toMatchObject({ id: "generation-1", report: payload.title });

    expect(select).toHaveBeenCalledWith(
      "id, generated_at, title, period_id, scope_label, detail_level",
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_clerk_id: "user-admin",
        filename: "rapport_reporting_six_months.pdf",
        generated_at: payload.data.generatedAt,
        snapshot: payload,
      }),
    );
  });

  it("loads only the requested snapshot by validated UUID", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: historicalRow, error: null });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).resolves.toMatchObject({
      id: historicalId,
      filename: historicalRow.filename,
      generatedAt: historicalRow.generated_at,
      scopeKind: "global",
      scopeValue: "",
      snapshot: payload,
    });
    expect(select).toHaveBeenCalledWith(
      "id, filename, generated_at, snapshot, period_id, scope_kind, scope_value, scope_label, detail_level, modules",
    );
    expect(idEq).toHaveBeenCalledWith("id", historicalId);
    expect(ownerEq).toHaveBeenCalledWith("created_by_clerk_id", "user-1");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid UUID before querying Supabase", async () => {
    await expect(getReportGenerationSnapshotById("not-a-uuid", "user-1")).rejects.toBeInstanceOf(
      InvalidReportGenerationIdError,
    );
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

  it("rejects a stored snapshot whose generatedAt does not match its metadata", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { ...historicalRow, generated_at: "2026-08-27T11:30:00.000Z" },
      error: null,
    });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow(
      "invalid or incompatible",
    );
  });

  it("accepts a legacy snapshot for reading without upgrading or recalculating it", async () => {
    const legacySnapshot = {
      title: "Legacy",
      rubrique: "reporting",
      periode: "six_months",
      organizationType: "Global",
      data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Legacy"] },
    };
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { ...historicalRow, snapshot: legacySnapshot },
      error: null,
    });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).resolves.toMatchObject({
      snapshot: legacySnapshot,
    });
  });

  it("does not persist a legacy or incomplete snapshot as a new generation", async () => {
    await expect(persistReportGeneration({
      createdByClerkId: "user-admin",
      input: {
        ...({
          payload: {
            title: "Legacy",
            rubrique: "reporting",
            periode: "six_months",
            organizationType: "Global",
            data: { generatedAt: "2026-08-27T10:30:00.000Z" },
          },
          scopeKind: "global",
          scopeValue: "",
          scopeLabel: "Paris",
          detailLevel: "default",
          modules: dbRow.modules,
        }),
      },
    })).rejects.toThrow("invalid or incompatible");
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

  it("rejects a current snapshot whose stored ownership metadata was altered", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { ...historicalRow, scope_label: "Autre périmètre" },
      error: null,
    });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow(
      "invalid or incompatible",
    );
  });
});
