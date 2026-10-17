import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ReportPdfArtifactTheme } from "./report-generation-pdf-artifact-store";

export const REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS = 60 * 60;
export const REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

type ReportPdfShareRow = {
  id: string;
  generation_id: string;
  artifact_id: string;
  created_by_clerk_id: string;
  theme: ReportPdfArtifactTheme;
  renderer_version: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type ReportPdfShare = {
  id: string;
  generationId: string;
  artifactId: string;
  createdByClerkId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

const SELECT = "id, generation_id, artifact_id, created_by_clerk_id, theme, renderer_version, expires_at, revoked_at, created_at";

function toShare(row: ReportPdfShareRow): ReportPdfShare {
  return {
    id: row.id,
    generationId: row.generation_id,
    artifactId: row.artifact_id,
    createdByClerkId: row.created_by_clerk_id,
    theme: row.theme,
    rendererVersion: row.renderer_version,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export function createReportPdfShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashReportPdfShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isReportPdfShareExpiryValid(expiresInSeconds: number): boolean {
  return Number.isInteger(expiresInSeconds) &&
    expiresInSeconds >= REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS &&
    expiresInSeconds <= REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS;
}

export async function listReportPdfSharesForOwner(params: {
  generationId: string;
  createdByClerkId: string;
}): Promise<ReportPdfShare[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_shares")
    .select(SELECT)
    .eq("generation_id", params.generationId)
    .eq("created_by_clerk_id", params.createdByClerkId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ReportPdfShareRow[]).map(toShare);
}

export async function createReportPdfShare(params: {
  generationId: string;
  artifactId: string;
  createdByClerkId: string;
  theme: ReportPdfArtifactTheme;
  rendererVersion: string;
  expiresAt: string;
  token: string;
}): Promise<ReportPdfShare> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_shares")
    .insert({
      generation_id: params.generationId,
      artifact_id: params.artifactId,
      created_by_clerk_id: params.createdByClerkId,
      theme: params.theme,
      renderer_version: params.rendererVersion,
      token_hash: hashReportPdfShareToken(params.token),
      expires_at: params.expiresAt,
    })
    .select(SELECT)
    .single();
  if (error || !data) throw error ?? new Error("Le lien de partage n'a pas pu être enregistré.");
  return toShare(data as ReportPdfShareRow);
}

export async function findActiveReportPdfShareByTokenHash(params: {
  tokenHash: string;
  now?: string;
}): Promise<ReportPdfShare | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_shares")
    .select(SELECT)
    .eq("token_hash", params.tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", params.now ?? new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data ? toShare(data as ReportPdfShareRow) : null;
}

export async function revokeReportPdfShare(params: {
  shareId: string;
  generationId: string;
  createdByClerkId: string;
  revokedAt?: string;
}): Promise<ReportPdfShare | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_pdf_shares")
    .update({ revoked_at: params.revokedAt ?? new Date().toISOString() })
    .eq("id", params.shareId)
    .eq("generation_id", params.generationId)
    .eq("created_by_clerk_id", params.createdByClerkId)
    .is("revoked_at", null)
    .select(SELECT)
    .maybeSingle();
  if (error) throw error;
  return data ? toShare(data as ReportPdfShareRow) : null;
}
