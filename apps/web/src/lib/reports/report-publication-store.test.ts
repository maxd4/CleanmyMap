import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import { createReportPublication } from "./report-publication-store";

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
});
