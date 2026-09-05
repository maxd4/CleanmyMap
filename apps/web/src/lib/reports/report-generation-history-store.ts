import { buildPdfReportFilename } from "@/lib/pdf-export/simple-pdf";
import {
  REPORT_GENERATION_HISTORY_LIMIT,
  toReportGenerationHistoryRow,
  type ReportGenerationHistoryInput,
  type ReportGenerationHistoryMetadata,
  type ReportGenerationHistoryRow,
} from "./report-generation-history-contract";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  InvalidReportGenerationSnapshotError,
  parseReportGenerationPayload,
} from "./report-generation-payload";

const REPORT_GENERATION_HISTORY_METADATA_SELECT =
  "id, generated_at, title, period_id, scope_label, detail_level";
const REPORT_GENERATION_SNAPSHOT_SELECT =
  "id, filename, generated_at, snapshot, scope_label, detail_level";

export type ReportGenerationSnapshotRecord = {
  id: string;
  filename: string;
  generatedAt: string;
  scopeLabel: string;
  detailLevel: ReportGenerationHistoryInput["detailLevel"];
  snapshot: ReportGenerationHistoryInput["payload"];
};

export class InvalidReportGenerationIdError extends Error {
  constructor() {
    super("Report generation id must be a valid UUID.");
    this.name = "InvalidReportGenerationIdError";
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type ReportGenerationDbMetadataRow = {
  id: string;
  generated_at: string;
  title: string;
  period_id: ReportGenerationHistoryMetadata["periodId"];
  scope_label: string;
  detail_level: ReportGenerationHistoryInput["detailLevel"];
};

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return REPORT_GENERATION_HISTORY_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), REPORT_GENERATION_HISTORY_LIMIT);
}

function toHistoryMetadata(
  row: ReportGenerationDbMetadataRow,
): ReportGenerationHistoryMetadata {
  return {
    id: row.id,
    title: row.title,
    periodId: row.period_id,
    scopeLabel: row.scope_label,
    detailLevel: row.detail_level,
    generatedAt: row.generated_at,
  };
}

function toHistoryRow(
  row: ReportGenerationDbMetadataRow,
): ReportGenerationHistoryRow | null {
  return toReportGenerationHistoryRow(toHistoryMetadata(row));
}

export async function listReportGenerationHistory(
  createdByClerkId: string,
  limit = REPORT_GENERATION_HISTORY_LIMIT,
): Promise<ReportGenerationHistoryRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("report_generations")
    .select(REPORT_GENERATION_HISTORY_METADATA_SELECT)
    .eq("created_by_clerk_id", createdByClerkId)
    .order("generated_at", { ascending: false })
    .limit(normalizeLimit(limit));

  if (error) {
    throw error;
  }

  return ((data ?? []) as ReportGenerationDbMetadataRow[])
    .map(toHistoryRow)
    .filter((row): row is ReportGenerationHistoryRow => Boolean(row));
}

export async function getReportGenerationSnapshotById(
  id: string,
  createdByClerkId: string,
): Promise<ReportGenerationSnapshotRecord | null> {
  if (!isUuid(id)) {
    throw new InvalidReportGenerationIdError();
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("report_generations")
    .select(REPORT_GENERATION_SNAPSHOT_SELECT)
    .eq("id", id)
    .eq("created_by_clerk_id", createdByClerkId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  let snapshot;
  try {
    snapshot = parseReportGenerationPayload(data.snapshot);
  } catch (error) {
    if (error instanceof InvalidReportGenerationSnapshotError) {
      throw error;
    }
    throw new InvalidReportGenerationSnapshotError();
  }

  if (snapshot.data.generatedAt !== data.generated_at) {
    throw new InvalidReportGenerationSnapshotError();
  }

  return {
    id: data.id,
    filename: data.filename,
    generatedAt: data.generated_at,
    scopeLabel: data.scope_label,
    detailLevel: data.detail_level as ReportGenerationSnapshotRecord["detailLevel"],
    snapshot,
  };
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
    .select(REPORT_GENERATION_HISTORY_METADATA_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error("Report generation history row was not returned.");
  }

  const historyRow = toHistoryRow(data as ReportGenerationDbMetadataRow);
  if (!historyRow) {
    throw new Error("Report generation history row has an invalid generated_at.");
  }
  return historyRow;
}
