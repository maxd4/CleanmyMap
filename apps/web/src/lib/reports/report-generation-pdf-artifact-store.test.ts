import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: getSupabaseAdminClientMock }));

import {
  buildReportPdfArtifactStoragePath,
  claimReportPdfArtifact,
  markReportPdfArtifactReady,
  reclaimMissingReportPdfArtifact,
  REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION,
} from "./report-generation-pdf-artifact-store";

const row = {
  id: "22222222-2222-4222-8222-222222222222",
  generation_id: "11111111-1111-4111-8111-111111111111",
  created_by_clerk_id: "user-1",
  theme: "impact",
  renderer_version: REPORT_PDF_ARTIFACT_RENDERER_VERSION,
  storage_path: "report-generations/11111111-1111-4111-8111-111111111111/chromium-official-report-pdf-v1/impact.pdf",
  status: "rendering",
  byte_size: null,
  updated_at: new Date().toISOString(),
};

function configureClient(params: {
  insertResult: { data: unknown; error: unknown };
  maybeSingleResults?: Array<{ data: unknown; error: unknown }>;
  updateResult?: { data: unknown; error: unknown };
}) {
  const chain = {
    from: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    lt: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.lt.mockReturnValue(chain);
  chain.single.mockResolvedValue(params.insertResult);
  for (const result of params.maybeSingleResults ?? []) chain.maybeSingle.mockResolvedValueOnce(result);
  chain.maybeSingle.mockResolvedValue(params.updateResult ?? { data: null, error: null });
  getSupabaseAdminClientMock.mockReturnValue(chain);
  return chain;
}

describe("report PDF artifact store", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses an immutable generation/theme/renderer path", () => {
    expect(buildReportPdfArtifactStoragePath({
      generationId: row.generation_id,
      theme: "scientific",
    })).toBe("report-generations/11111111-1111-4111-8111-111111111111/chromium-official-report-pdf-v1/scientific.pdf");
  });

  it("claims the unique variant once and marks only the rendering row ready", async () => {
    const chain = configureClient({ insertResult: { data: row, error: null } });

    const claim = await claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });
    expect(claim.kind).toBe("owner");
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "rendering" }));

    chain.single.mockResolvedValueOnce({ data: { ...row, status: "ready", byte_size: 123 }, error: null });
    const ready = await markReportPdfArtifactReady({ artifactId: row.id, byteSize: 123 });
    expect(ready.status).toBe("ready");
    expect(chain.eq).toHaveBeenLastCalledWith("status", "rendering");
  });

  it("returns ready or rendering instead of starting a second render after a unique conflict", async () => {
    const chain = configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: { ...row, status: "ready", byte_size: 321 }, error: null }],
    });
    const ready = await claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });
    expect(ready.kind).toBe("ready");
    expect(chain.update).not.toHaveBeenCalled();

    configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: row, error: null }, { data: row, error: null }],
    });
    const rendering = await claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });
    expect(rendering.kind).toBe("rendering");
  });

  it("recovers an expired rendering lease with a compare-and-swap update", async () => {
    const expired = {
      ...row,
      updated_at: new Date(Date.now() - REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS - 1).toISOString(),
    };
    const recovered = { ...expired, updated_at: new Date().toISOString() };
    const chain = configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: expired, error: null }],
      updateResult: { data: recovered, error: null },
    });

    const claim = await claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });

    expect(claim.kind).toBe("owner");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "rendering" }));
    expect(chain.lt).toHaveBeenCalledWith("updated_at", expired.updated_at);
  });

  it("does not reclaim an active rendering lease", async () => {
    const chain = configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: row, error: null }, { data: row, error: null }],
    });

    const claim = await claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });

    expect(claim.kind).toBe("rendering");
    expect(chain.update).not.toHaveBeenCalled();
  });

  it("lets only one of two concurrent recovery attempts win the compare-and-swap", async () => {
    const expired = {
      ...row,
      updated_at: new Date(Date.now() - REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS - 1).toISOString(),
    };
    const chain = configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [
        { data: expired, error: null },
        { data: expired, error: null },
        { data: { ...expired, updated_at: new Date().toISOString() }, error: null },
        { data: null, error: null },
        { data: { ...expired, updated_at: new Date().toISOString() }, error: null },
      ],
      updateResult: { data: null, error: null },
    });

    const claimParams = {
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact" as const,
    };
    const claims = await Promise.all([
      claimReportPdfArtifact(claimParams),
      claimReportPdfArtifact(claimParams),
    ]);

    expect(claims.filter((claim) => claim.kind === "owner")).toHaveLength(1);
    expect(claims.filter((claim) => claim.kind === "rendering")).toHaveLength(1);
    expect(chain.update).toHaveBeenCalledTimes(2);
  });

  it("reclaims a ready artifact only through an atomic ready-to-rendering transition", async () => {
    const chain = configureClient({
      insertResult: { data: null, error: null },
      updateResult: { data: { ...row, status: "rendering", updated_at: new Date().toISOString() }, error: null },
    });

    const claim = await reclaimMissingReportPdfArtifact({
      artifactId: row.id,
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });

    expect(claim.kind).toBe("owner");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "rendering",
      last_error_code: "storage_object_missing",
    }));
    expect(chain.eq).toHaveBeenCalledWith("status", "ready");
  });
});
