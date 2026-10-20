import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
  listReportGenerationHistory,
  listReportGenerationHistoryPage,
  persistDerivedReportGeneration,
  persistReportGeneration,
  resolveDirectReportGenerationPersistence,
  resolveDerivedReportGenerationPersistence,
} from "./report-generation-history-store";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./report-advanced-filters";

const payload = {
  title: "Rapport d'impact - Paris - Par défaut",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  snapshotSchemaVersion: 2 as const,
  snapshotMetadata: {
    snapshotSchemaVersion: 2 as const,
    templateVersion: "reports-template-v1",
    rendererVersion: "official-report-html-v1",
    generationId: "11111111-1111-4111-8111-111111111111",
    sourceGenerationId: null,
    filtersVersion: "reports-filters-v1",
    advancedFiltersVersion: "reports-advanced-filters-v1",
    filters: REPORT_ADVANCED_FILTER_DEFAULTS,
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
  id: "11111111-1111-4111-8111-111111111111",
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
    const range = vi.fn().mockResolvedValue({ data: [dbRow], error: null, count: 1 });
    const order = vi.fn(() => ({ order, range }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(listReportGenerationHistory("user-1", 99)).resolves.toMatchObject([
      {
        id: "11111111-1111-4111-8111-111111111111",
        period: "Six mois",
        perimeter: "Paris",
        detail: "Par défaut",
      },
    ]);
    expect(select).toHaveBeenCalledWith(
      "id, generated_at, title, period_id, scope_label, detail_level, theme",
      { count: "exact" },
    );
    expect(eq).toHaveBeenCalledWith("created_by_clerk_id", "user-1");
    expect(order).toHaveBeenCalledWith("generated_at", { ascending: false });
    expect(range).toHaveBeenCalledWith(0, 49);
  });

  it("applies owner-scoped pagination, title search, period, theme and chronological sort", async () => {
    const range = vi.fn().mockResolvedValue({ data: [dbRow], error: null, count: 13 });
    const order = vi.fn(() => ({ order, range }));
    const themeEq = vi.fn(() => ({ order }));
    const periodEq = vi.fn(() => ({ eq: themeEq }));
    const ilike = vi.fn(() => ({ eq: periodEq }));
    const ownerEq = vi.fn(() => ({ ilike }));
    const select = vi.fn(() => ({ eq: ownerEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(listReportGenerationHistoryPage("user-1", {
      page: 2,
      pageSize: 12,
      search: "Paris",
      periodId: "six_months",
      theme: "scientific",
      sort: "asc",
    })).resolves.toMatchObject({ page: 2, pageSize: 12, total: 13, hasPreviousPage: true, hasNextPage: false });

    expect(ownerEq).toHaveBeenCalledWith("created_by_clerk_id", "user-1");
    expect(ilike).toHaveBeenCalledWith("title", "%Paris%");
    expect(periodEq).toHaveBeenCalledWith("period_id", "six_months");
    expect(themeEq).toHaveBeenCalledWith("theme", "scientific");
    expect(order).toHaveBeenCalledWith("generated_at", { ascending: true });
    expect(range).toHaveBeenCalledWith(12, 23);
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
    ).resolves.toMatchObject({ id: "11111111-1111-4111-8111-111111111111", report: payload.title });

    expect(select).toHaveBeenCalledWith(
      "id, generated_at, title, period_id, scope_label, detail_level, theme",
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

  it("persists a derived immutable row with source lineage", async () => {
    const targetId = "22222222-2222-4222-8222-222222222222";
    const generatedAt = "2026-10-17T12:05:00.000Z";
    const derivedRow = {
      ...dbRow,
      id: targetId,
      generated_at: generatedAt,
      snapshot: {
        ...payload,
        data: { ...payload.data, generatedAt },
        snapshotMetadata: {
          ...payload.snapshotMetadata,
          generationId: targetId,
          sourceGenerationId: historicalId,
          generatedAt,
        },
      },
    };
    const single = vi.fn().mockResolvedValue({ data: derivedRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    });
    const source = {
      id: historicalId,
      filename: historicalRow.filename,
      generatedAt: historicalRow.generated_at,
      scopeKind: "global" as const,
      scopeValue: "",
      scopeLabel: "Paris",
      detailLevel: "default" as const,
      snapshot: payload,
    };

    await expect(
      persistDerivedReportGeneration({
        createdByClerkId: "user-admin",
        source,
        generationId: targetId,
        generatedAt,
      }),
    ).resolves.toMatchObject({ id: targetId, report: payload.title });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: targetId,
      created_by_clerk_id: "user-admin",
      generated_at: generatedAt,
      snapshot: expect.objectContaining({
        snapshotMetadata: expect.objectContaining({
          generationId: targetId,
          sourceGenerationId: historicalId,
        }),
        data: expect.objectContaining({ generatedAt }),
      }),
    }));
    expect(payload.snapshotMetadata.sourceGenerationId).toBeNull();
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
      "id, filename, generated_at, snapshot, period_id, scope_kind, scope_value, scope_label, detail_level, modules, theme",
    );
    expect(idEq).toHaveBeenCalledWith("id", historicalId);
    expect(ownerEq).toHaveBeenCalledWith("created_by_clerk_id", "user-1");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("reads a current snapshot when PostgREST returns the equivalent UTC offset", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { ...historicalRow, generated_at: "2026-08-27T10:30:00.000+00:00" },
      error: null,
    });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).resolves.toMatchObject({
      generatedAt: "2026-08-27T10:30:00.000+00:00",
      snapshot: payload,
    });
  });

  it("resolves an uncertain derived persistence by its immutable id and lineage", async () => {
    const targetId = "22222222-2222-4222-8222-222222222222";
    const generatedAt = "2026-10-17T12:05:00.000Z";
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        ...historicalRow,
        id: targetId,
        generated_at: generatedAt,
        snapshot: {
          ...payload,
          data: { ...payload.data, generatedAt },
          snapshotMetadata: {
            ...payload.snapshotMetadata,
            generationId: targetId,
            sourceGenerationId: historicalId,
            generatedAt,
          },
        },
      },
      error: null,
    });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(resolveDerivedReportGenerationPersistence({
      createdByClerkId: "user-admin",
      generationId: targetId,
      sourceGenerationId: historicalId,
    })).resolves.toMatchObject({
      kind: "persisted",
      item: { id: targetId, report: payload.title },
    });
    expect(ownerEq).toHaveBeenCalledWith("created_by_clerk_id", "user-admin");
  });

  it("distinguishes an absent row from an unreadable persistence result", async () => {
    const maybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(resolveDerivedReportGenerationPersistence({
      createdByClerkId: "user-admin",
      generationId: "22222222-2222-4222-8222-222222222222",
      sourceGenerationId: historicalId,
    })).resolves.toEqual({ kind: "not_persisted" });

    maybeSingle.mockResolvedValueOnce({ data: null, error: new Error("read failed") });
    await expect(resolveDerivedReportGenerationPersistence({
      createdByClerkId: "user-admin",
      generationId: "22222222-2222-4222-8222-222222222222",
      sourceGenerationId: historicalId,
    })).resolves.toEqual({ kind: "uncertain" });
  });

  it("reconciles a direct persistence only for the owner and a null source lineage", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: historicalRow, error: null });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(resolveDirectReportGenerationPersistence({
      createdByClerkId: "user-admin",
      generationId: historicalId,
    })).resolves.toMatchObject({
      kind: "persisted",
      item: { id: historicalId, report: payload.title },
    });
    expect(ownerEq).toHaveBeenCalledWith("created_by_clerk_id", "user-admin");

    maybeSingle.mockResolvedValueOnce({
      data: {
        ...historicalRow,
        snapshot: {
          ...payload,
          snapshotMetadata: {
            ...payload.snapshotMetadata,
            sourceGenerationId: "22222222-2222-4222-8222-222222222222",
          },
        },
      },
      error: null,
    });
    await expect(resolveDirectReportGenerationPersistence({
      createdByClerkId: "user-admin",
      generationId: historicalId,
    })).resolves.toEqual({ kind: "uncertain" });
  });

  it("accepts equivalent UTC offsets and preserves sub-millisecond precision", async () => {
    const generatedAt = "2026-08-27T10:30:00.123456Z";
    const fractionalPayload = {
      ...payload,
      snapshotMetadata: { ...payload.snapshotMetadata, generatedAt },
      data: { ...payload.data, generatedAt },
    };
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        ...historicalRow,
        generated_at: "2026-08-27T11:30:00.123456+01:00",
        snapshot: fractionalPayload,
      },
      error: null,
    });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).resolves.toMatchObject({
      snapshot: fractionalPayload,
    });
  });

  it("rejects a stored snapshot when fractional instants differ", async () => {
    const generatedAt = "2026-08-27T10:30:00.123456Z";
    const fractionalPayload = {
      ...payload,
      snapshotMetadata: { ...payload.snapshotMetadata, generatedAt },
      data: { ...payload.data, generatedAt },
    };
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        ...historicalRow,
        generated_at: "2026-08-27T10:30:00.123457+00:00",
        snapshot: fractionalPayload,
      },
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

  it("rejects a stored snapshot with an invalid generated_at format", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { ...historicalRow, generated_at: "not-an-instant" },
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

describe("report generation history persistence failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not treat an absent direct insert response as a successful generation", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ insert })) });

    await expect(persistReportGeneration({
      createdByClerkId: "user-admin",
      input: {
        payload,
        scopeKind: "global",
        scopeValue: "",
        scopeLabel: "Paris",
        detailLevel: "default",
        modules: dbRow.modules,
      },
    })).rejects.toThrow("history row was not returned");
  });

  it("does not treat an absent derived insert response as a successful generation", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ insert })) });
    const source = {
      id: historicalId,
      filename: historicalRow.filename,
      generatedAt: historicalRow.generated_at,
      scopeKind: "global" as const,
      scopeValue: "",
      scopeLabel: "Paris",
      detailLevel: "default" as const,
      snapshot: payload,
    };

    await expect(persistDerivedReportGeneration({
      createdByClerkId: "user-admin",
      source,
      generationId: "22222222-2222-4222-8222-222222222222",
      generatedAt: "2026-10-17T12:05:00.000Z",
    })).rejects.toThrow("Derived report generation row was not returned");
  });

  it("rejects an inserted direct row whose timestamp is invalid", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { ...dbRow, generated_at: "not-an-instant" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ insert })) });

    await expect(persistReportGeneration({
      createdByClerkId: "user-admin",
      input: {
        payload,
        scopeKind: "global",
        scopeValue: "",
        scopeLabel: "Paris",
        detailLevel: "default",
        modules: dbRow.modules,
      },
    })).rejects.toThrow("invalid generated_at");
  });

  it("rejects a current input whose stored metadata does not match the request", async () => {
    await expect(persistReportGeneration({
      createdByClerkId: "user-admin",
      input: {
        payload,
        scopeKind: "account",
        scopeValue: "account-1",
        scopeLabel: "Compte",
        detailLevel: "default",
        modules: dbRow.modules,
      },
    })).rejects.toThrow("invalid or incompatible");
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

  it("maps a snapshot read error to the caller instead of inventing a missing row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: new Error("read failed") });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow("read failed");
  });
});

describe("report generation history store response boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps publication statuses when available and keeps history private on an optional projection failure", async () => {
    const historyQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn().mockResolvedValue({ data: [dbRow], error: null, count: 1 }),
    };
    for (const method of ["select", "eq", "order"]) historyQuery[method as keyof typeof historyQuery] = vi.fn().mockReturnValue(historyQuery) as never;
    const statusQuery = { select: vi.fn(), in: vi.fn() };
    statusQuery.select.mockReturnValue(statusQuery);
    statusQuery.in.mockResolvedValue({
      data: [{ generation_id: dbRow.id, published_at: "2026-08-28T10:00:00.000Z", revoked_at: null }],
      error: null,
    });
    const from = vi.fn()
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(statusQuery)
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(statusQuery);
    getSupabaseAdminClientMock.mockReturnValue({ from });

    await expect(listReportGenerationHistoryPage("user-admin", { pageSize: 1 })).resolves.toMatchObject({
      rows: [{ id: dbRow.id, publicationStatus: "published", publicationPublishedAt: "2026-08-28T10:00:00.000Z" }],
    });

    statusQuery.in.mockRejectedValueOnce(new Error("optional projection unavailable"));
    await expect(listReportGenerationHistoryPage("user-admin", { pageSize: 1 })).resolves.toMatchObject({
      rows: [{ id: dbRow.id, publicationStatus: "private" }],
    });
  });

  it("preserves DB errors and empty pages instead of converting them to private rows", async () => {
    const error = new Error("history query failed");
    const errorQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data: null, error, count: null }) };
    for (const method of ["select", "eq", "order"]) errorQuery[method as keyof typeof errorQuery] = vi.fn().mockReturnValue(errorQuery) as never;
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(errorQuery) });
    await expect(listReportGenerationHistoryPage("user-admin")).rejects.toThrow("history query failed");

    const emptyQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }) };
    for (const method of ["select", "eq", "order"]) emptyQuery[method as keyof typeof emptyQuery] = vi.fn().mockReturnValue(emptyQuery) as never;
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(emptyQuery) });
    await expect(listReportGenerationHistoryPage("user-admin", { page: 0, pageSize: Number.POSITIVE_INFINITY })).resolves.toMatchObject({
      rows: [], page: 1, pageSize: 12, total: 0, hasNextPage: false, hasPreviousPage: false,
    });
  });

  it("distinguishes an absent snapshot from an incompatible stored payload and normalizes invalid modules", async () => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { ...historicalRow, snapshot: { title: "not a current payload" } }, error: null })
      .mockResolvedValueOnce({
        data: {
          ...historicalRow,
          modules: { rawData: true },
          theme: null,
          snapshot: {
            title: "Legacy",
            rubrique: "reporting",
            periode: "six_months",
            organizationType: "Global",
            data: { generatedAt: payload.data.generatedAt, summary: ["Legacy"] },
          },
        },
        error: null,
      });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).resolves.toBeNull();
    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow("invalid or incompatible");
    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).resolves.toMatchObject({ modules: null, theme: null });
  });

  it("rejects impossible instants and a forged generation lineage", async () => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: { ...historicalRow, generated_at: "2026-08-27T25:30:00Z" }, error: null })
      .mockResolvedValueOnce({ data: { ...historicalRow, generated_at: "2026-02-29T10:30:00Z" }, error: null })
      .mockResolvedValueOnce({
        data: {
          ...historicalRow,
          id: "22222222-2222-4222-8222-222222222222",
        },
        error: null,
      });
    const ownerEq = vi.fn(() => ({ maybeSingle }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const select = vi.fn(() => ({ eq: idEq }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow("invalid or incompatible");
    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow("invalid or incompatible");
    await expect(getReportGenerationSnapshotById(historicalId, "user-1")).rejects.toThrow("invalid or incompatible");
  });

  it("propagates an insert error after validating the immutable snapshot", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error("history insert failed") });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ insert })) });

    await expect(persistReportGeneration({
      createdByClerkId: "user-admin",
      input: {
        payload,
        scopeKind: "global",
        scopeValue: "",
        scopeLabel: "Paris",
        detailLevel: "default",
        modules: dbRow.modules,
      },
    })).rejects.toThrow("history insert failed");
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
