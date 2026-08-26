import { buildPdfReportFilename, type PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import {
  REPORT_GENERATION_HISTORY_LIMIT,
  toReportGenerationHistoryRow,
  type ReportGenerationHistoryInput,
  type ReportGenerationHistoryRecord,
  type ReportGenerationHistoryRow,
} from "./report-generation-history-contract";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type ReportGenerationDbRow = {
  id: string;
  created_at: string;
  generated_at: string;
  created_by_clerk_id: string;
  title: string;
  filename: string;
  period_id: ReportGenerationHistoryInput["payload"]["periode"];
  scope_kind: ReportGenerationHistoryInput["scopeKind"];
  scope_value: string;
  scope_label: string;
  detail_level: ReportGenerationHistoryInput["detailLevel"];
  modules: ReportGenerationHistoryInput["modules"];
  snapshot: PdfReportPayload;
};

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return REPORT_GENERATION_HISTORY_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), REPORT_GENERATION_HISTORY_LIMIT);
}

function toRecord(row: ReportGenerationDbRow): ReportGenerationHistoryRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    generatedAt: row.generated_at,
    createdByClerkId: row.created_by_clerk_id,
    filename: row.filename,
    payload: row.snapshot,
    scopeKind: row.scope_kind,
    scopeValue: row.scope_value,
    scopeLabel: row.scope_label,
    detailLevel: row.detail_level,
    modules: row.modules,
  };
}

function toHistoryRow(row: ReportGenerationDbRow): ReportGenerationHistoryRow | null {
  const record = toRecord(row);
  return toReportGenerationHistoryRow(record);
}

export async function listReportGenerationHistory(
  limit = REPORT_GENERATION_HISTORY_LIMIT,
): Promise<ReportGenerationHistoryRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generations")
    .select(
      "id, created_at, generated_at, created_by_clerk_id, title, filename, period_id, scope_kind, scope_value, scope_label, detail_level, modules, snapshot",
    )
    .order("generated_at", { ascending: false })
    .limit(normalizeLimit(limit));

  if (error) {
    throw error;
  }

  return ((data ?? []) as ReportGenerationDbRow[])
    .map(toHistoryRow)
    .filter((row): row is ReportGenerationHistoryRow => Boolean(row));
}

export async function persistReportGeneration(params: {
  createdByClerkId: string;
  input: ReportGenerationHistoryInput;
}): Promise<ReportGenerationHistoryRow> {
  const generatedAt = params.input.payload.data.generatedAt;
  if (!generatedAt) {
    throw new Error("Report generation snapshot is missing generatedAt.");
  }

  const filename = buildPdfReportFilename({
    rubrique: params.input.payload.rubrique,
    periode: params.input.payload.periode,
  });
  const row = {
    created_by_clerk_id: params.createdByClerkId,
    generated_at: generatedAt,
    title: params.input.payload.title,
    filename,
    period_id: params.input.payload.periode,
    scope_kind: params.input.scopeKind,
    scope_value: params.input.scopeValue,
    scope_label: params.input.scopeLabel,
    detail_level: params.input.detailLevel,
    modules: params.input.modules,
    snapshot: params.input.payload,
  };

  const { data, error } = await getSupabaseAdminClient()
    .from("report_generations")
    .insert(row)
    .select(
      "id, created_at, generated_at, created_by_clerk_id, title, filename, period_id, scope_kind, scope_value, scope_label, detail_level, modules, snapshot",
    )
    .single();

  if (error || !data) {
    throw error ?? new Error("Report generation history row was not returned.");
  }

  const historyRow = toHistoryRow(data as ReportGenerationDbRow);
  if (!historyRow) {
    throw new Error("Report generation history row has an invalid generated_at.");
  }
  return historyRow;
}
