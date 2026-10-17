import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: getSupabaseAdminClientMock }));

import {
  buildReportPdfArtifactStoragePath,
  claimReportPdfArtifact,
  markReportPdfArtifactReady,
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
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
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
});
