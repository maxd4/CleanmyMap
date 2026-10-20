import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const REPORT_PDF_ARTIFACT_BUCKET = "reports" as const;
export const REPORT_PDF_ARTIFACT_RENDERER_VERSION = "chromium-official-report-pdf-v1" as const;
export const REPORT_PDF_ARTIFACT_WAIT_MS = 5_000;
export const REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS = 90_000;

export type ReportPdfArtifactTheme = "impact" | "scientific";
export type ReportPdfArtifactStatus = "rendering" | "ready" | "failed";

export type ReportPdfArtifact = {
  id: string;
  generationId: string;
  createdByClerkId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion: string;
  storagePath: string;
  status: ReportPdfArtifactStatus;
  byteSize: number | null;
  updatedAt: string;
};

type ReportPdfArtifactRow = {
  id: string;
  generation_id: string;
  created_by_clerk_id: string;
  theme: ReportPdfArtifactTheme;
  renderer_version: string;
  storage_path: string;
  status: ReportPdfArtifactStatus;
  byte_size: number | null;
  updated_at: string;
};

const SELECT = "id, generation_id, created_by_clerk_id, theme, renderer_version, storage_path, status, byte_size, updated_at";

export function isConfirmedReportPdfArtifactStorageAbsence(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  return candidate.status === 404 || candidate.status === "404" ||
    candidate.statusCode === 404 || candidate.statusCode === "404" ||
    candidate.code === "404" || candidate.code === "not_found";
}

function toArtifact(row: ReportPdfArtifactRow): ReportPdfArtifact {
  return {
    id: row.id,
    generationId: row.generation_id,
    createdByClerkId: row.created_by_clerk_id,
    theme: row.theme,
    rendererVersion: row.renderer_version,
    storagePath: row.storage_path,
    status: row.status,
    byteSize: row.byte_size,
    updatedAt: row.updated_at,
  };
}

export function buildReportPdfArtifactStoragePath(params: {
  generationId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion?: string;
}): string {
  const rendererVersion = params.rendererVersion ?? REPORT_PDF_ARTIFACT_RENDERER_VERSION;
  return `report-generations/${params.generationId}/${rendererVersion}/${params.theme}.pdf`;
}

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

async function findArtifact(params: {
  generationId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion: string;
  createdByClerkId?: string;
}): Promise<ReportPdfArtifact | null> {
  let query = getSupabaseAdminClient()
    .from("report_generation_pdf_artifacts")
    .select(SELECT)
    .eq("generation_id", params.generationId)
    .eq("theme", params.theme)
    .eq("renderer_version", params.rendererVersion);
  if (params.createdByClerkId) {
    query = query.eq("created_by_clerk_id", params.createdByClerkId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? toArtifact(data as ReportPdfArtifactRow) : null;
}

export function getReportPdfArtifactForOwner(params: {
  generationId: string;
  createdByClerkId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion?: string;
}): Promise<ReportPdfArtifact | null> {
  return findArtifact({
    generationId: params.generationId,
    createdByClerkId: params.createdByClerkId,
    theme: params.theme,
    rendererVersion: params.rendererVersion ?? REPORT_PDF_ARTIFACT_RENDERER_VERSION,
  });
}

export async function getReportPdfArtifactById(params: {
  artifactId: string;
  generationId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion: string;
}): Promise<ReportPdfArtifact | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_artifacts")
    .select(SELECT)
    .eq("id", params.artifactId)
    .eq("generation_id", params.generationId)
    .eq("theme", params.theme)
    .eq("renderer_version", params.rendererVersion)
    .maybeSingle();
  if (error) throw error;
  return data ? toArtifact(data as ReportPdfArtifactRow) : null;
}

export function downloadReportPdfArtifact(storagePath: string) {
  return getSupabaseAdminClient().storage.from(REPORT_PDF_ARTIFACT_BUCKET).download(storagePath);
}

export type ReportPdfArtifactClaim =
  | { kind: "owner"; artifact: ReportPdfArtifact }
  | { kind: "ready"; artifact: ReportPdfArtifact }
  | { kind: "rendering"; artifact: ReportPdfArtifact };

function isRenderingLeaseExpired(updatedAt: string, now = Date.now()): boolean {
  const updatedAtMilliseconds = Date.parse(updatedAt);
  return Number.isFinite(updatedAtMilliseconds) &&
    updatedAtMilliseconds <= now - REPORT_PDF_ARTIFACT_RENDERING_LEASE_MS;
}

export async function claimReportPdfArtifact(params: {
  generationId: string;
  createdByClerkId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion?: string;
}): Promise<ReportPdfArtifactClaim> {
  const rendererVersion = params.rendererVersion ?? REPORT_PDF_ARTIFACT_RENDERER_VERSION;
  const storagePath = buildReportPdfArtifactStoragePath({
    generationId: params.generationId,
    theme: params.theme,
    rendererVersion,
  });
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("report_generation_pdf_artifacts")
    .insert({
      generation_id: params.generationId,
      created_by_clerk_id: params.createdByClerkId,
      theme: params.theme,
      renderer_version: rendererVersion,
      storage_path: storagePath,
      status: "rendering",
    })
    .select(SELECT)
    .single();

  if (!error && data) {
    return { kind: "owner", artifact: toArtifact(data as ReportPdfArtifactRow) };
  }
  if (!isUniqueViolation(error)) {
    throw error ?? new Error("Impossible de réserver le rendu PDF.");
  }

  const existing = await findArtifact({
    generationId: params.generationId,
    theme: params.theme,
    rendererVersion,
  });
  if (!existing) {
    throw new Error("La réservation du rendu PDF est devenue incertaine.");
  }
  if (existing.status === "ready") return { kind: "ready", artifact: existing };

  if (existing.status === "failed") {
    const retry = await client
      .from("report_generation_pdf_artifacts")
      .update({ status: "rendering", byte_size: null, last_error_code: null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select(SELECT)
      .maybeSingle();
    if (retry.error) throw retry.error;
    if (retry.data) return { kind: "owner", artifact: toArtifact(retry.data as ReportPdfArtifactRow) };
  }

  if (existing.status === "rendering" && isRenderingLeaseExpired(existing.updatedAt)) {
    const recovered = await client
      .from("report_generation_pdf_artifacts")
      .update({
        status: "rendering",
        byte_size: null,
        last_error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("generation_id", params.generationId)
      .eq("created_by_clerk_id", params.createdByClerkId)
      .eq("status", "rendering")
      .lt("updated_at", existing.updatedAt)
      .select(SELECT)
      .maybeSingle();
    if (recovered.error) throw recovered.error;
    if (recovered.data) return { kind: "owner", artifact: toArtifact(recovered.data as ReportPdfArtifactRow) };
  }

  const current = await findArtifact({
    generationId: params.generationId,
    theme: params.theme,
    rendererVersion,
  });
  if (!current) throw new Error("La réservation du rendu PDF est devenue incertaine.");
  return current.status === "ready"
    ? { kind: "ready", artifact: current }
    : { kind: "rendering", artifact: current };
}

export async function reclaimMissingReportPdfArtifact(params: {
  artifactId: string;
  generationId: string;
  createdByClerkId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion?: string;
}): Promise<ReportPdfArtifactClaim> {
  const rendererVersion = params.rendererVersion ?? REPORT_PDF_ARTIFACT_RENDERER_VERSION;
  const client = getSupabaseAdminClient();
  const repaired = await client
    .from("report_generation_pdf_artifacts")
    .update({
      status: "rendering",
      byte_size: null,
      last_error_code: "storage_object_missing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.artifactId)
    .eq("generation_id", params.generationId)
    .eq("created_by_clerk_id", params.createdByClerkId)
    .eq("status", "ready")
    .select(SELECT)
    .maybeSingle();
  if (repaired.error) throw repaired.error;
  if (repaired.data) return { kind: "owner", artifact: toArtifact(repaired.data as ReportPdfArtifactRow) };

  return claimReportPdfArtifact({
    generationId: params.generationId,
    createdByClerkId: params.createdByClerkId,
    theme: params.theme,
    rendererVersion,
  });
}

export async function waitForReportPdfArtifact(params: {
  generationId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion?: string;
  timeoutMs?: number;
}): Promise<ReportPdfArtifact | null> {
  const rendererVersion = params.rendererVersion ?? REPORT_PDF_ARTIFACT_RENDERER_VERSION;
  const deadline = Date.now() + (params.timeoutMs ?? REPORT_PDF_ARTIFACT_WAIT_MS);
  while (Date.now() < deadline) {
    const artifact = await findArtifact({ generationId: params.generationId, theme: params.theme, rendererVersion });
    if (!artifact || artifact.status !== "rendering") return artifact;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return findArtifact({ generationId: params.generationId, theme: params.theme, rendererVersion });
}

export async function markReportPdfArtifactReady(params: {
  artifactId: string;
  byteSize: number;
}): Promise<ReportPdfArtifact> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_artifacts")
    .update({ status: "ready", byte_size: params.byteSize, updated_at: new Date().toISOString(), last_error_code: null })
    .eq("id", params.artifactId)
    .eq("status", "rendering")
    .select(SELECT)
    .single();
  if (error || !data) throw error ?? new Error("Le statut du rendu PDF est incertain.");
  return toArtifact(data as ReportPdfArtifactRow);
}

export async function markReportPdfArtifactFailed(params: {
  artifactId: string;
  errorCode: string;
}): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_artifacts")
    .update({ status: "failed", updated_at: new Date().toISOString(), last_error_code: params.errorCode })
    .eq("id", params.artifactId)
    .eq("status", "rendering");
  if (error) throw error;
}
