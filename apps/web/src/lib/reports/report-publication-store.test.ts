import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  createReportPublication,
  getActiveReportPublicationById,
  getReportPublicationForOwner,
  getReportPublicationStatuses,
  listPublicReportLibraryPage,
  revokeReportPublication,
} from "./report-publication-store";

const params = {
  generationId: "11111111-1111-4111-8111-111111111111",
  artifactId: "22222222-2222-4222-8222-222222222222",
  createdByClerkId: "owner-1",
  title: "Rapport public",
  periodId: "six_months" as const,
  scopeLabel: "Toutes les actions",
  theme: "scientific" as const,
  publicAuthorLabel: null,
};

function databaseRow(publishedAt: string, revokedAt: string | null) {
  return {
    id: "publication-1",
    generation_id: params.generationId,
    artifact_id: params.artifactId,
    created_by_clerk_id: params.createdByClerkId,
    title: params.title,
    period_id: params.periodId,
    scope_label: params.scopeLabel,
    theme: params.theme,
    published_at: publishedAt,
    revoked_at: revokedAt,
    public_author_label: null,
  };
}

function configureStore(current: { publishedAt: string; revokedAt: string | null } | null) {
  const ownerMaybeSingle = vi.fn().mockResolvedValue({
    data: current ? databaseRow(current.publishedAt, current.revokedAt) : null,
    error: null,
  });
  const ownerQuery = { eq: vi.fn(), maybeSingle: ownerMaybeSingle };
  ownerQuery.eq.mockReturnValue(ownerQuery);

  const upsertSingle = vi.fn().mockResolvedValue({
    data: databaseRow("2026-10-18T12:00:00.000Z", null),
    error: null,
  });
  const upsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: upsertSingle }),
  });
  const client = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(ownerQuery),
      upsert,
    }),
  };
  getSupabaseAdminClientMock.mockReturnValue(client);
  return { upsert, upsertSingle };
}

function configureLibraryPage(rows: unknown[], count: number) {
  const query = {
    select: vi.fn(),
    is: vi.fn(),
    ilike: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue({ data: rows, error: null, count }),
  };
  for (const method of ["select", "is", "ilike", "eq", "order"]) {
    query[method as keyof typeof query] = vi.fn().mockReturnValue(query) as never;
  }
  getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
  return query;
}

describe("report publication dates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores a publication date for the first publication", async () => {
    const { upsert } = configureStore(null);

    await createReportPublication(params);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ published_at: "2026-10-18T12:00:00.000Z", revoked_at: null }),
      { onConflict: "generation_id" },
    );
  });

  it("preserves the date when an active publication is posted again", async () => {
    const { upsert } = configureStore({ publishedAt: "2026-10-18T10:00:00.000Z", revokedAt: null });

    await createReportPublication(params);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ published_at: "2026-10-18T10:00:00.000Z", revoked_at: null }),
      { onConflict: "generation_id" },
    );
  });

  it("assigns a new date when a revoked publication is republished", async () => {
    const { upsert } = configureStore({ publishedAt: "2026-10-18T10:00:00.000Z", revokedAt: "2026-10-18T11:00:00.000Z" });

    const publication = await createReportPublication(params);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ published_at: "2026-10-18T12:00:00.000Z", revoked_at: null }),
      { onConflict: "generation_id" },
    );
    expect(publication.id).toBe("publication-1");
  });

  it("keeps the public library query active-only, bounded and filter-scoped", async () => {
    const query = configureLibraryPage([databaseRow("2026-10-18T12:00:00.000Z", null)], 51);

    const page = await listPublicReportLibraryPage({ page: 0, pageSize: 100, search: "  public  ", periodId: "six_months", theme: "scientific", sort: "asc" });

    expect(query.is).toHaveBeenCalledWith("revoked_at", null);
    expect(query.ilike).toHaveBeenCalledWith("title", "%public%");
    expect(query.eq).toHaveBeenCalledWith("period_id", "six_months");
    expect(query.eq).toHaveBeenCalledWith("theme", "scientific");
    expect(query.range).toHaveBeenCalledWith(0, 49);
    expect(page).toMatchObject({ page: 1, pageSize: 50, total: 51, hasNextPage: true, hasPreviousPage: false });
    expect(JSON.stringify(page)).not.toContain("createdByClerkId");
  });

  it("distinguishes active, absent and failed owner-scoped publication reads", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: databaseRow("2026-10-18T12:00:00.000Z", null), error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error("publication read failed") }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    await expect(getActiveReportPublicationById("publication-1")).resolves.toMatchObject({ id: "publication-1", revokedAt: null });
    expect(query.is).toHaveBeenCalledWith("revoked_at", null);
    await expect(getReportPublicationForOwner({ generationId: params.generationId, createdByClerkId: params.createdByClerkId })).resolves.toBeNull();
    await expect(getReportPublicationForOwner({ generationId: params.generationId, createdByClerkId: params.createdByClerkId })).rejects.toThrow("publication read failed");
  });

  it("reconciles owner-scoped revocation and preserves the no-row result", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: databaseRow("2026-10-18T12:00:00.000Z", "2026-10-18T13:00:00.000Z"), error: null }),
    };
    for (const method of ["update", "eq", "is", "select"]) query[method as keyof typeof query] = vi.fn().mockReturnValue(query) as never;
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    await expect(revokeReportPublication({ generationId: params.generationId, createdByClerkId: params.createdByClerkId })).resolves.toMatchObject({ revokedAt: "2026-10-18T13:00:00.000Z" });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ revoked_at: expect.any(String) }));
    expect(query.is).toHaveBeenCalledWith("revoked_at", null);

    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(revokeReportPublication({ generationId: params.generationId, createdByClerkId: params.createdByClerkId })).resolves.toBeNull();
  });

  it("propagates publication insertion failures and missing returned rows", async () => {
    const { upsert, upsertSingle } = configureStore(null);
    upsertSingle.mockResolvedValueOnce({ data: null, error: new Error("publication insert failed") });
    await expect(createReportPublication(params)).rejects.toThrow("publication insert failed");

    configureStore(null).upsertSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(createReportPublication(params)).rejects.toThrow();
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("returns no publication statuses for an empty input and maps revoked rows to private", async () => {
    getSupabaseAdminClientMock.mockClear();
    await expect(getReportPublicationStatuses([])).resolves.toEqual(new Map());
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();

    const query = {
      select: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({
      data: [
        { generation_id: params.generationId, published_at: "2026-10-18T12:00:00.000Z", revoked_at: null },
        { generation_id: "other-generation", published_at: "2026-10-18T12:00:00.000Z", revoked_at: "2026-10-18T13:00:00.000Z" },
      ],
      error: null,
    });
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
    await expect(getReportPublicationStatuses([params.generationId, "other-generation"])).resolves.toEqual(new Map([
      [params.generationId, { status: "published", publishedAt: "2026-10-18T12:00:00.000Z" }],
      ["other-generation", { status: "private", publishedAt: null }],
    ]));
  });

  it("does not convert a status query failure into private data", async () => {
    const query = { select: vi.fn(), in: vi.fn() };
    query.select.mockReturnValue(query);
    query.in.mockResolvedValue({ data: null, error: new Error("status query failed") });
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
    await expect(getReportPublicationStatuses([params.generationId])).rejects.toThrow("status query failed");
  });

  it("propagates a revocation query error and a public-library query error", async () => {
    const revokeQuery = {
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("revoke query failed") }),
    };
    for (const method of ["update", "eq", "is", "select"]) revokeQuery[method as keyof typeof revokeQuery] = vi.fn().mockReturnValue(revokeQuery) as never;
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(revokeQuery) });
    await expect(revokeReportPublication({ generationId: params.generationId, createdByClerkId: params.createdByClerkId })).rejects.toThrow("revoke query failed");

    const libraryQuery = {
      select: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error("library query failed"), count: null }),
    };
    for (const method of ["select", "is", "order"]) libraryQuery[method as keyof typeof libraryQuery] = vi.fn().mockReturnValue(libraryQuery) as never;
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(libraryQuery) });
    await expect(listPublicReportLibraryPage({ search: "   " })).rejects.toThrow("library query failed");
  });

  it("uses bounded defaults for non-finite public-library pagination", async () => {
    const query = configureLibraryPage([], 0);
    await expect(listPublicReportLibraryPage({ page: Number.NaN, pageSize: Number.POSITIVE_INFINITY })).resolves.toMatchObject({
      page: 1,
      pageSize: 12,
      total: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(query.range).toHaveBeenCalledWith(0, 11);
  });
});
