import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: getSupabaseAdminClientMock }));

import {
  buildReportPdfArtifactStoragePath,
  claimReportPdfArtifact,
  downloadReportPdfArtifact,
  getReportPdfArtifactById,
  getReportPdfArtifactForOwner,
  isConfirmedReportPdfArtifactStorageAbsence,
  markReportPdfArtifactFailed,
  markReportPdfArtifactReady,
  reclaimMissingReportPdfArtifact,
  REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION,
  waitForReportPdfArtifact,
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

  it("distinguishes confirmed Storage absence from temporary failures", () => {
    expect(isConfirmedReportPdfArtifactStorageAbsence({ statusCode: 404 })).toBe(true);
    expect(isConfirmedReportPdfArtifactStorageAbsence({ code: "not_found" })).toBe(true);
    expect(isConfirmedReportPdfArtifactStorageAbsence({ status: 503, code: "service_unavailable" })).toBe(false);
    expect(isConfirmedReportPdfArtifactStorageAbsence(new Error("Storage unavailable"))).toBe(false);
  });

  it("uses an immutable generation/theme/renderer path", () => {
    expect(buildReportPdfArtifactStoragePath({
      generationId: row.generation_id,
      theme: "scientific",
    })).toBe("report-generations/11111111-1111-4111-8111-111111111111/chromium-official-report-pdf-v1/scientific.pdf");
  });

  it("reads owner-scoped and exact-variant artifacts, including an absent row", async () => {
    const chain = configureClient({
      insertResult: { data: null, error: null },
      maybeSingleResults: [{ data: row, error: null }, { data: null, error: null }, { data: null, error: new Error("variant read failed") }],
    });

    await expect(getReportPdfArtifactForOwner({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).resolves.toMatchObject({ id: row.id, createdByClerkId: row.created_by_clerk_id });
    expect(chain.eq).toHaveBeenCalledWith("created_by_clerk_id", row.created_by_clerk_id);

    await expect(getReportPdfArtifactById({
      artifactId: row.id,
      generationId: row.generation_id,
      theme: "scientific",
      rendererVersion: "renderer-v2",
    })).resolves.toBeNull();
    expect(chain.eq).toHaveBeenCalledWith("id", row.id);
    expect(chain.eq).toHaveBeenCalledWith("renderer_version", "renderer-v2");
    await expect(getReportPdfArtifactById({
      artifactId: row.id,
      generationId: row.generation_id,
      theme: "impact",
      rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION,
    })).rejects.toThrow("variant read failed");
  });

  it("propagates artifact reads and Storage downloads instead of inventing bytes", async () => {
    const readError = new Error("artifact read failed");
    configureClient({
      insertResult: { data: null, error: null },
      maybeSingleResults: [{ data: null, error: readError }],
    });
    await expect(getReportPdfArtifactForOwner({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).rejects.toThrow("artifact read failed");

    const download = vi.fn().mockResolvedValue({ data: new Blob(["pdf"]), error: null });
    const from = vi.fn().mockReturnValue({ download });
    getSupabaseAdminClientMock.mockReturnValue({ storage: { from } });
    await expect(downloadReportPdfArtifact(row.storage_path)).resolves.toMatchObject({ error: null });
    expect(from).toHaveBeenCalledWith("reports");
    expect(download).toHaveBeenCalledWith(row.storage_path);
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

  it.each([
    ["database failure", { code: "23514" }, "database"],
    ["missing conflicting row", { code: "23505" }, "uncertain"],
  ])("does not claim a PDF after a %s", async (_label, insertError, expectedKind) => {
    configureClient({
      insertResult: { data: null, error: insertError },
      maybeSingleResults: _label === "missing conflicting row" ? [{ data: null, error: null }] : [],
    });

    const assertion = claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    });
    if (expectedKind === "database") await expect(assertion).rejects.toMatchObject({ code: "23514" });
    else await expect(assertion).rejects.toThrow("La réservation du rendu PDF est devenue incertaine.");
  });

  it("retries a failed artifact and keeps an active rendering row owned by its current lease", async () => {
    const failed = { ...row, status: "failed", updated_at: new Date().toISOString() };
    const retried = { ...failed, status: "rendering" };
    const chain = configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: failed, error: null }],
      updateResult: { data: retried, error: null },
    });

    await expect(claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).resolves.toMatchObject({ kind: "owner", artifact: { status: "rendering" } });
    expect(chain.update).toHaveBeenCalledWith({ status: "rendering", byte_size: null, last_error_code: null, updated_at: expect.any(String) });
  });

  it("does not hide a failed retry or an expired-lease recovery error", async () => {
    const failedRetryError = new Error("failed retry");
    configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: { ...row, status: "failed" }, error: null }, { data: null, error: failedRetryError }],
    });
    await expect(claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).rejects.toThrow("failed retry");

    const recoveryError = new Error("lease recovery failed");
    configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: { ...row, updated_at: new Date(Date.now() - REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS - 1).toISOString() }, error: null }],
      updateResult: { data: null, error: recoveryError },
    });
    await expect(claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).rejects.toThrow("lease recovery failed");
  });

  it("returns uncertainty when an expired lease disappears before recovery", async () => {
    configureClient({
      insertResult: { data: null, error: { code: "23505" } },
      maybeSingleResults: [{ data: { ...row, updated_at: new Date(Date.now() - REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS - 1).toISOString() }, error: null }, { data: null, error: null }],
      updateResult: { data: null, error: null },
    });
    await expect(claimReportPdfArtifact({
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).rejects.toThrow("La réservation du rendu PDF est devenue incertaine.");
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

  it("falls back to the normal claim when a ready artifact was concurrently changed", async () => {
    const chain = configureClient({
      insertResult: { data: row, error: null },
      updateResult: { data: null, error: null },
    });

    await expect(reclaimMissingReportPdfArtifact({
      artifactId: row.id,
      generationId: row.generation_id,
      createdByClerkId: row.created_by_clerk_id,
      theme: "impact",
    })).resolves.toMatchObject({ kind: "owner" });
    expect(chain.insert).toHaveBeenCalledTimes(1);
  });

  it("waits only for the requested variant and exposes absent artifacts as null", async () => {
    const chain = configureClient({
      insertResult: { data: null, error: null },
      maybeSingleResults: [{ data: null, error: null }],
    });

    await expect(waitForReportPdfArtifact({
      generationId: row.generation_id,
      theme: "scientific",
      rendererVersion: "renderer-v2",
      timeoutMs: 0,
    })).resolves.toBeNull();
    expect(chain.eq).toHaveBeenCalledWith("theme", "scientific");
    expect(chain.eq).toHaveBeenCalledWith("renderer_version", "renderer-v2");
  });

  it("returns a ready artifact immediately while waiting for a non-rendering state", async () => {
    const chain = configureClient({
      insertResult: { data: null, error: null },
      maybeSingleResults: [{ data: { ...row, status: "ready", byte_size: 12 }, error: null }],
    });
    await expect(waitForReportPdfArtifact({
      generationId: row.generation_id,
      theme: "impact",
      timeoutMs: 100,
    })).resolves.toMatchObject({ status: "ready", byteSize: 12 });
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("marks rendering artifacts failed and rejects uncertain ready transitions", async () => {
    const failedError = new Error("failed transition");
    const failedEq = vi.fn();
    failedEq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: failedError }) });
    const failedUpdate = vi.fn().mockReturnValue({ eq: failedEq });
    const failedChain = { update: failedUpdate };
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(failedChain) });
    await expect(markReportPdfArtifactFailed({ artifactId: row.id, errorCode: "renderer_failed" })).rejects.toThrow("failed transition");
    expect(failedUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", last_error_code: "renderer_failed" }));

    const missingReadyChain = configureClient({
      insertResult: { data: null, error: null },
      updateResult: { data: null, error: null },
    });
    await expect(markReportPdfArtifactReady({ artifactId: row.id, byteSize: 0 })).rejects.toThrow("statut du rendu PDF est incertain");
    expect(missingReadyChain.eq).toHaveBeenCalledWith("status", "rendering");

    const successEq = vi.fn();
    successEq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const successUpdate = vi.fn().mockReturnValue({ eq: successEq });
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn().mockReturnValue({ update: successUpdate }) });
    await expect(markReportPdfArtifactFailed({ artifactId: row.id, errorCode: "renderer_failed" })).resolves.toBeUndefined();
  });
});
