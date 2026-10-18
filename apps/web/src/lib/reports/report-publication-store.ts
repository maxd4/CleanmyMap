import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ReportGenerationHistoryTheme } from "./report-generation-history-contract";
import type {
  ReportPublicLibraryFilters,
  ReportPublicLibraryPage,
  ReportPublicationRecord,
  ReportPublicLibraryPeriod,
} from "./report-publication-contract";
import { projectReportPublicationRow } from "./report-publication-contract";

const SELECT = "id, generation_id, artifact_id, created_by_clerk_id, title, period_id, scope_label, theme, published_at, revoked_at, public_author_label";

function toRecord(row: Record<string, unknown>): ReportPublicationRecord {
  return {
    id: String(row.id),
    generationId: String(row.generation_id),
    artifactId: String(row.artifact_id),
    createdByClerkId: String(row.created_by_clerk_id),
    title: String(row.title),
    periodId: row.period_id as ReportPublicLibraryPeriod,
    scopeLabel: String(row.scope_label),
    theme: row.theme as ReportGenerationHistoryTheme,
    publishedAt: String(row.published_at),
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    publicAuthorLabel: row.public_author_label ? String(row.public_author_label) : null,
  };
}

function normalizePage(value?: number): number { return Number.isFinite(value) ? Math.max(Math.trunc(value as number), 1) : 1; }
function normalizePageSize(value?: number): number { return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value as number), 1), 50) : 12; }

export async function listPublicReportLibraryPage(filters: ReportPublicLibraryFilters = {}): Promise<ReportPublicLibraryPage> {
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);
  let query = getSupabaseAdminClient().from("report_generation_publications").select(SELECT, { count: "exact" }).is("revoked_at", null);
  const search = filters.search?.trim().slice(0, 120);
  if (search) query = query.ilike("title", `%${search}%`);
  if (filters.periodId) query = query.eq("period_id", filters.periodId);
  if (filters.theme) query = query.eq("theme", filters.theme);
  const { data, error, count } = await query.order("published_at", { ascending: filters.sort === "asc" }).order("id", { ascending: filters.sort === "asc" }).range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  const rows = ((data ?? []) as Record<string, unknown>[]).map(toRecord).map(projectReportPublicationRow);
  const total = count ?? rows.length;
  return { rows, page, pageSize, total, hasNextPage: page * pageSize < total, hasPreviousPage: page > 1 };
}

export async function getActiveReportPublicationById(id: string): Promise<ReportPublicationRecord | null> {
  const { data, error } = await getSupabaseAdminClient().from("report_generation_publications").select(SELECT).eq("id", id).is("revoked_at", null).maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as Record<string, unknown>) : null;
}

export async function getReportPublicationForOwner(params: { generationId: string; createdByClerkId: string }): Promise<ReportPublicationRecord | null> {
  const { data, error } = await getSupabaseAdminClient().from("report_generation_publications").select(SELECT).eq("generation_id", params.generationId).eq("created_by_clerk_id", params.createdByClerkId).maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as Record<string, unknown>) : null;
}

export async function createReportPublication(params: Omit<ReportPublicationRecord, "id" | "publishedAt" | "revokedAt">): Promise<ReportPublicationRecord> {
  const { data, error } = await getSupabaseAdminClient().from("report_generation_publications").upsert({
    generation_id: params.generationId,
    artifact_id: params.artifactId,
    created_by_clerk_id: params.createdByClerkId,
    title: params.title,
    period_id: params.periodId,
    scope_label: params.scopeLabel,
    theme: params.theme,
    revoked_at: null,
    public_author_label: params.publicAuthorLabel,
  }, { onConflict: "generation_id" }).select(SELECT).single();
  if (error) throw error;
  return toRecord(data as Record<string, unknown>);
}

export async function revokeReportPublication(params: { generationId: string; createdByClerkId: string }): Promise<ReportPublicationRecord | null> {
  const { data, error } = await getSupabaseAdminClient().from("report_generation_publications").update({ revoked_at: new Date().toISOString() }).eq("generation_id", params.generationId).eq("created_by_clerk_id", params.createdByClerkId).is("revoked_at", null).select(SELECT).maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as Record<string, unknown>) : null;
}

export async function getReportPublicationStatuses(generationIds: string[]): Promise<Map<string, { status: "private" | "published"; publishedAt: string | null }>> {
  const result = new Map<string, { status: "private" | "published"; publishedAt: string | null }>();
  if (generationIds.length === 0) return result;
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generation_publications")
    .select("generation_id, published_at, revoked_at")
    .in("generation_id", generationIds);
  if (error) throw error;
  for (const row of (data ?? []) as Array<{ generation_id: string; published_at: string; revoked_at: string | null }>) {
    result.set(row.generation_id, {
      status: row.revoked_at ? "private" : "published",
      publishedAt: row.revoked_at ? null : row.published_at,
    });
  }
  return result;
}
