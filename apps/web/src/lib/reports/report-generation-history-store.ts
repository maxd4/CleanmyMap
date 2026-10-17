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
  parseCurrentReportGenerationPayload,
  parseReportGenerationPayload,
} from "./report-generation-payload";
import type { ModuleState } from "./report-pdf-data";
import {
  buildDerivedReportGenerationPayload,
} from "./report-generation-derivation";

const REPORT_GENERATION_HISTORY_METADATA_SELECT =
  "id, generated_at, title, period_id, scope_label, detail_level";
const REPORT_GENERATION_SNAPSHOT_SELECT =
  "id, filename, generated_at, snapshot, period_id, scope_kind, scope_value, scope_label, detail_level, modules";

export type ReportGenerationSnapshotRecord = {
  id: string;
  filename: string;
  generatedAt: string;
  scopeKind: ReportGenerationHistoryInput["scopeKind"];
  scopeValue: string;
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

function hasSameModules(left: ModuleState, right: unknown): boolean {
  if (!right || typeof right !== "object") return false;
  const candidate = right as Record<string, unknown>;
  return left.dataAndCartography === candidate.dataAndCartography &&
    left.transparencyAndMethods === candidate.transparencyAndMethods &&
    left.rawData === candidate.rawData &&
    left.detailedFiles === candidate.detailedFiles;
}

const REPORT_GENERATION_INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/;

type ReportGenerationInstant = {
  epochMilliseconds: number;
  subMillisecondNanoseconds: number;
};

function parseReportGenerationInstant(value: unknown): ReportGenerationInstant | null {
  if (typeof value !== "string") return null;
  const match = REPORT_GENERATION_INSTANT_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetSign = match[9];
  const offsetHour = Number(match[10] ?? 0);
  const offsetMinute = Number(match[11] ?? 0);
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) {
    return null;
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  if (date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second) {
    return null;
  }

  const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 60 * 1000;
  const signedOffsetMilliseconds = offsetSign === "-" ? -offsetMilliseconds : offsetMilliseconds;
  const fraction = match[7] ?? "";
  const fractionNanoseconds = Number(fraction.padEnd(9, "0"));
  return {
    epochMilliseconds: date.getTime() - signedOffsetMilliseconds + Math.trunc(fractionNanoseconds / 1_000_000),
    subMillisecondNanoseconds: fractionNanoseconds % 1_000_000,
  };
}

function haveSameReportGenerationInstant(left: unknown, right: unknown): boolean {
  const leftInstant = parseReportGenerationInstant(left);
  const rightInstant = parseReportGenerationInstant(right);
  return leftInstant !== null && rightInstant !== null &&
    leftInstant.epochMilliseconds === rightInstant.epochMilliseconds &&
    leftInstant.subMillisecondNanoseconds === rightInstant.subMillisecondNanoseconds;
}

function assertSnapshotMatchesHistoryRow(
  snapshot: ReturnType<typeof parseReportGenerationPayload>,
  row: {
    id: string;
    generated_at: string;
    period_id: string;
    scope_kind: string;
    scope_value: string;
    scope_label: string;
    detail_level: string;
    modules: unknown;
  },
): void {
  if (!haveSameReportGenerationInstant(snapshot.data.generatedAt, row.generated_at)) {
    throw new InvalidReportGenerationSnapshotError();
  }

  if (snapshot.snapshotSchemaVersion === 2) {
    const metadata = snapshot.snapshotMetadata;
    if (!metadata ||
      !haveSameReportGenerationInstant(metadata.generatedAt, row.generated_at) ||
      metadata.period.id !== row.period_id ||
      metadata.scope.kind !== row.scope_kind ||
      metadata.scope.value !== row.scope_value ||
      metadata.scope.label !== row.scope_label ||
      metadata.detailLevel !== row.detail_level ||
      !hasSameModules(metadata.modules, row.modules)) {
      throw new InvalidReportGenerationSnapshotError();
    }
    if (metadata.generationId && metadata.generationId !== row.id) {
      throw new InvalidReportGenerationSnapshotError();
    }
  }
}

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

  assertSnapshotMatchesHistoryRow(snapshot, data);

  return {
    id: data.id,
    filename: data.filename,
    generatedAt: data.generated_at,
    scopeKind: data.scope_kind as ReportGenerationSnapshotRecord["scopeKind"],
    scopeValue: data.scope_value,
    scopeLabel: data.scope_label,
    detailLevel: data.detail_level as ReportGenerationSnapshotRecord["detailLevel"],
    snapshot,
  };
}

export type ReportGenerationPersistenceResolution =
  | { kind: "not_persisted" }
  | { kind: "persisted"; item: ReportGenerationHistoryRow }
  | { kind: "uncertain" };

export type DerivedReportGenerationPersistenceResolution = ReportGenerationPersistenceResolution;

async function resolveReportGenerationPersistence(params: {
  createdByClerkId: string;
  generationId: string;
  expectedSourceGenerationId: string | null;
}): Promise<ReportGenerationPersistenceResolution> {
  try {
    const generation = await getReportGenerationSnapshotById(
      params.generationId,
      params.createdByClerkId,
    );
    if (!generation) {
      return { kind: "not_persisted" };
    }

    const metadata = generation.snapshot.snapshotMetadata;
    if (
      metadata?.generationId !== generation.id ||
      metadata.sourceGenerationId !== params.expectedSourceGenerationId
    ) {
      return { kind: "uncertain" };
    }

    const item = toReportGenerationHistoryRow({
      id: generation.id,
      title: generation.snapshot.title,
      periodId: generation.snapshot.periode as ReportGenerationHistoryMetadata["periodId"],
      scopeLabel: generation.scopeLabel,
      detailLevel: generation.detailLevel,
      generatedAt: generation.generatedAt,
    });
    return item ? { kind: "persisted", item } : { kind: "uncertain" };
  } catch {
    return { kind: "uncertain" };
  }
}

export function resolveDirectReportGenerationPersistence(params: {
  createdByClerkId: string;
  generationId: string;
}): Promise<ReportGenerationPersistenceResolution> {
  return resolveReportGenerationPersistence({
    ...params,
    expectedSourceGenerationId: null,
  });
}

export function resolveDerivedReportGenerationPersistence(params: {
  createdByClerkId: string;
  generationId: string;
  sourceGenerationId: string;
}): Promise<DerivedReportGenerationPersistenceResolution> {
  return resolveReportGenerationPersistence({
    createdByClerkId: params.createdByClerkId,
    generationId: params.generationId,
    expectedSourceGenerationId: params.sourceGenerationId,
  });
}

export async function persistReportGeneration(params: {
  createdByClerkId: string;
  input: ReportGenerationHistoryInput;
}): Promise<ReportGenerationHistoryRow> {
  let payload;
  try {
    payload = parseCurrentReportGenerationPayload(params.input.payload);
  } catch (error) {
    if (error instanceof InvalidReportGenerationSnapshotError) {
      throw error;
    }
    throw new InvalidReportGenerationSnapshotError();
  }
  const metadata = payload.snapshotMetadata;
  const generatedAt = payload.data.generatedAt;
  const expectedPeriodRange = payload.periode === "custom_range"
    ? payload.data.periodRange
    : undefined;
  if (metadata.period.id !== payload.periode ||
    metadata.scope.kind !== params.input.scopeKind ||
    metadata.scope.value !== params.input.scopeValue ||
    metadata.scope.label !== params.input.scopeLabel ||
    metadata.detailLevel !== params.input.detailLevel ||
    !hasSameModules(metadata.modules, params.input.modules) ||
    (payload.periode === "custom_range" &&
      (!expectedPeriodRange ||
        metadata.period.from !== expectedPeriodRange.from ||
        metadata.period.to !== expectedPeriodRange.to ||
        expectedPeriodRange.timeZone !== "UTC"))) {
    throw new InvalidReportGenerationSnapshotError();
  }

  const filename = buildPdfReportFilename({
    rubrique: params.input.payload.rubrique,
    periode: params.input.payload.periode,
  });
  const row = {
    id: metadata.generationId,
    created_by_clerk_id: params.createdByClerkId,
    generated_at: generatedAt,
    title: payload.title,
    filename,
    period_id: payload.periode,
    scope_kind: params.input.scopeKind,
    scope_value: params.input.scopeValue,
    scope_label: params.input.scopeLabel,
    detail_level: params.input.detailLevel,
    modules: params.input.modules,
    snapshot: payload,
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

export async function persistDerivedReportGeneration(params: {
  createdByClerkId: string;
  source: ReportGenerationSnapshotRecord;
  generationId: string;
  generatedAt: string;
}): Promise<ReportGenerationHistoryRow> {
  const payload = buildDerivedReportGenerationPayload({
    source: params.source.snapshot,
    generationId: params.generationId,
    sourceGenerationId: params.source.id,
    generatedAt: params.generatedAt,
  });
  const current = parseCurrentReportGenerationPayload(payload);
  const metadata = current.snapshotMetadata;
  const filename = buildPdfReportFilename({
    rubrique: current.rubrique,
    periode: current.periode,
  });
  const row = {
    id: metadata.generationId,
    created_by_clerk_id: params.createdByClerkId,
    generated_at: params.generatedAt,
    title: current.title,
    filename,
    period_id: current.periode,
    scope_kind: metadata.scope.kind,
    scope_value: metadata.scope.value,
    scope_label: metadata.scope.label,
    detail_level: metadata.detailLevel,
    modules: metadata.modules,
    snapshot: current,
  };

  const { data, error } = await getSupabaseAdminClient()
    .from("report_generations")
    .insert(row)
    .select(REPORT_GENERATION_HISTORY_METADATA_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error("Derived report generation row was not returned.");
  }

  const historyRow = toHistoryRow(data as ReportGenerationDbMetadataRow);
  if (!historyRow) {
    throw new Error("Derived report generation row has an invalid generated_at.");
  }
  return historyRow;
}
