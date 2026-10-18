import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import { escapeCsvCell } from "./csv";
import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";

export const REPORT_SCIENTIFIC_EXPORT_SCHEMA_VERSION =
  "reports-scientific-export-v1" as const;

export const REPORT_SCIENTIFIC_DATA_STATUSES = [
  "OBSERVED",
  "DERIVED",
  "DECLARED",
  "ASSUMPTION",
  "PROXY",
  "NA",
] as const;

export type ReportScientificDataStatus =
  (typeof REPORT_SCIENTIFIC_DATA_STATUSES)[number];

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ReportScientificReference = {
  title: string;
  generatedAt: string;
  generationId: string;
  period: {
    id: string;
    from: string | null;
    to: string | null;
    timeZone: string | null;
  };
  scope: {
    kind: string;
    value: string;
    label: string;
  };
  sourceGenerationId: string | null;
  lineageAvailability: "available" | "unavailable";
  provenance: unknown;
  versions: {
    snapshotSchemaVersion: number | null;
    templateVersion: string | null;
    rendererVersion: string | null;
    filtersVersion: string | null;
    advancedFiltersVersion: string | null;
    proxyVersion: string | null;
    qualityRulesVersion: string | null;
  };
  availableVersionKeys: string[];
  citationText: string;
};

export type ReportScientificTableColumn = {
  id: string;
  label: string;
  unit: string | null;
};

export type ReportScientificCell = {
  value: JsonValue;
  status: ReportScientificDataStatus | null;
};

export type ReportScientificTable = {
  id: string;
  title: string;
  source: string;
  columns: ReportScientificTableColumn[];
  rows: Array<{
    index: number;
    values: Record<string, ReportScientificCell>;
  }>;
};

export type ReportScientificExport = {
  schemaVersion: typeof REPORT_SCIENTIFIC_EXPORT_SCHEMA_VERSION;
  exportType: "json";
  reference: ReportScientificReference;
  snapshot: PdfReportPayload;
  tables: ReportScientificTable[];
  limitations: string[];
};

const UNIT_BY_FIELD_ID: Record<string, string> = {
  Masse_Kg: "kg",
  Masse_Kg_Declaree: "kg",
  Masse_Kg_Impact: "kg",
  Megots: "count",
  Bénévoles: "count",
  CO2e_Proxy_Kg: "kg CO2e",
  Eau_Proxy_L: "L",
  Economie_Voirie_Proxy_Masse_EUR: "EUR",
  Economie_Voirie_Proxy_Temps_EUR: "EUR",
  Economie_Voirie_Proxy_Min_EUR: "EUR",
  Economie_Voirie_Proxy_Max_EUR: "EUR",
  Economie_Voirie_Proxy_EUR: "EUR",
  Durée_Min: "min",
  Charge_Terrain_Min: "min",
};

const PROXY_FIELD_IDS = new Set([
  "Masse_Kg_Impact",
  "CO2e_Proxy_Kg",
  "Eau_Proxy_L",
  "Economie_Voirie_Proxy_Masse_EUR",
  "Economie_Voirie_Proxy_Temps_EUR",
  "Economie_Voirie_Proxy_Min_EUR",
  "Economie_Voirie_Proxy_Max_EUR",
  "Economie_Voirie_Proxy_EUR",
]);

const DECLARED_FIELD_IDS = new Set(["Masse_Kg", "Masse_Kg_Declaree"]);

const ABSENCE_SENTINELS = new Set([
  "NA",
  "N/A",
  "UNAVAILABLE",
  "INDISPONIBLE",
]);

const REPORT_STAT_COLUMNS = [
  { key: "stat_id", label: "Identifiant indicateur" },
  { key: "label", label: "Indicateur" },
  { key: "value", label: "Valeur" },
  { key: "detail", label: "Détail" },
] as const;

function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item),
      ]),
    );
  }
  return String(value);
}

function normalizeScientificCellValue(value: JsonValue): JsonValue {
  if (typeof value !== "string") return value;
  return ABSENCE_SENTINELS.has(value.trim().toUpperCase()) ? null : value;
}

function resolveCellStatus(
  fieldId: string,
  value: JsonValue,
): ReportScientificDataStatus | null {
  if (value === null) return "NA";
  if (PROXY_FIELD_IDS.has(fieldId)) return "PROXY";
  if (DECLARED_FIELD_IDS.has(fieldId)) return "DECLARED";
  if (fieldId === "Origine_Masse" && value === "declared") return "DECLARED";
  return null;
}

function resolvePeriod(generation: ReportGenerationSnapshotRecord) {
  const metadata = generation.snapshot.snapshotMetadata;
  const periodRange = generation.snapshot.data.periodRange;
  return {
    id: metadata?.period.id ?? generation.snapshot.periode,
    from: metadata?.period.from ?? periodRange?.from ?? null,
    to: metadata?.period.to ?? periodRange?.to ?? null,
    timeZone: metadata?.period.timeZone ?? periodRange?.timeZone ?? null,
  };
}

function resolveScope(generation: ReportGenerationSnapshotRecord) {
  const metadata = generation.snapshot.snapshotMetadata;
  return {
    kind: metadata?.scope.kind ?? generation.scopeKind,
    value: metadata?.scope.value ?? generation.scopeValue,
    label: metadata?.scope.label ?? generation.scopeLabel,
  };
}

function resolveVersions(generation: ReportGenerationSnapshotRecord) {
  const metadata = generation.snapshot.snapshotMetadata;
  return {
    snapshotSchemaVersion: generation.snapshot.snapshotSchemaVersion ?? null,
    templateVersion: metadata?.templateVersion ?? null,
    rendererVersion: metadata?.rendererVersion ?? null,
    filtersVersion: metadata?.filtersVersion ?? null,
    advancedFiltersVersion: metadata?.advancedFiltersVersion ?? null,
    proxyVersion: metadata?.methodology.proxyVersion ?? null,
    qualityRulesVersion: metadata?.methodology.qualityRulesVersion ?? null,
  };
}

function buildCitationText(reference: Omit<ReportScientificReference, "citationText">): string {
  const period = reference.period.from && reference.period.to
    ? `${reference.period.from} → ${reference.period.to} (${reference.period.timeZone ?? "fuseau indisponible"})`
    : `${reference.period.id} (bornes indisponibles)`;
  const versionText = reference.availableVersionKeys.length > 0
    ? reference.availableVersionKeys
      .map((key) => `${key}=${String(reference.versions[key as keyof typeof reference.versions])}`)
      .join(", ")
    : "aucune version structurée persistée";

  return [
    `CleanMyMap. (${reference.generatedAt.slice(0, 10)}). ${reference.title}.`,
    `Génération ${reference.generationId}; période ${period}; périmètre ${reference.scope.label} (${reference.scope.kind}).`,
    `Versions disponibles : ${versionText}.`,
  ].join("\n");
}

export function buildReportScientificReference(
  generation: ReportGenerationSnapshotRecord,
): ReportScientificReference {
  const metadata = generation.snapshot.snapshotMetadata;
  const versions = resolveVersions(generation);
  const availableVersionKeys = Object.entries(versions)
    .filter(([, value]) => value !== null)
    .map(([key]) => key);
  const referenceWithoutCitation = {
    title: generation.snapshot.title,
    generatedAt: generation.generatedAt,
    generationId: generation.id,
    period: resolvePeriod(generation),
    scope: resolveScope(generation),
    sourceGenerationId: metadata?.sourceGenerationId ?? null,
    lineageAvailability: metadata && Object.hasOwn(metadata, "sourceGenerationId")
      ? "available" as const
      : "unavailable" as const,
    provenance: metadata?.provenance ?? generation.snapshot.provenance ?? null,
    versions,
    availableVersionKeys,
  };

  return {
    ...referenceWithoutCitation,
    citationText: buildCitationText(referenceWithoutCitation),
  };
}

function buildTable(params: {
  id: string;
  title: string;
  source: string;
  rows: Record<string, unknown>[];
  columns?: Array<{ key: string; label: string }>;
}): ReportScientificTable {
  const columnEntries = params.columns ?? Object.keys(params.rows[0] ?? {}).map((key) => ({ key, label: key }));
  const columns = columnEntries.map((column) => ({
    id: column.key,
    label: column.label,
    unit: UNIT_BY_FIELD_ID[column.key] ?? null,
  }));

  return {
    id: params.id,
    title: params.title,
    source: params.source,
    columns,
    rows: params.rows.map((row, index) => ({
      index,
      values: Object.fromEntries(columns.map((column) => {
        const value = normalizeScientificCellValue(toJsonValue(row[column.id]));
        return [column.id, { value, status: resolveCellStatus(column.id, value) }];
      })),
    })),
  };
}

function normalizeIdentifier(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "indicateur";
}

function buildStableStatIds(stats: PdfReportPayload["data"]["stats"]): string[] {
  const used = new Map<string, number>();
  return (stats ?? []).map((stat) => {
    const record = stat as unknown as Record<string, unknown>;
    const historizedId = typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : `stat-${normalizeIdentifier(stat.label)}`;
    const occurrence = (used.get(historizedId) ?? 0) + 1;
    used.set(historizedId, occurrence);
    return occurrence === 1 ? historizedId : `${historizedId}-${occurrence}`;
  });
}

function resolveExplicitStatus(value: unknown): ReportScientificDataStatus | null {
  return typeof value === "string" &&
    (REPORT_SCIENTIFIC_DATA_STATUSES as readonly string[]).includes(value)
    ? value as ReportScientificDataStatus
    : null;
}

function buildStatsTable(params: {
  id: string;
  title: string;
  source: string;
  stats: NonNullable<PdfReportPayload["data"]["stats"]>;
}): ReportScientificTable {
  const statIds = buildStableStatIds(params.stats);
  const columns = REPORT_STAT_COLUMNS.map((column) => ({
    id: column.key,
    label: column.label,
    unit: null,
  }));

  return {
    id: params.id,
    title: params.title,
    source: params.source,
    columns,
    rows: params.stats.map((stat, index) => {
      const record = stat as unknown as Record<string, unknown>;
      const statId = statIds[index];
      const value = normalizeScientificCellValue(toJsonValue(stat.value));
      const explicitStatus = resolveExplicitStatus(record.status);
      return {
        index,
        values: {
          stat_id: { value: statId, status: null },
          label: { value: stat.label, status: null },
          value: {
            value,
            status: explicitStatus ?? resolveCellStatus(statId, value),
          },
          detail: { value: toJsonValue(stat.detail), status: null },
        },
      };
    }),
  };
}

function buildTables(payload: PdfReportPayload): ReportScientificTable[] {
  const tables: ReportScientificTable[] = [];
  const indicatorTables: ReportScientificTable[] = [];
  if (payload.data.rows?.length) {
    tables.push(buildTable({
      id: "report-data",
      title: "Données visibles",
      source: "snapshot.data.rows",
      rows: payload.data.rows,
      columns: payload.data.columns,
    }));
  }
  for (const [index, chapter] of (payload.data.chapters ?? []).entries()) {
    const chapterTableId = chapter.id ?? `chapter-${index + 1}`;
    if (chapter.rows?.length) {
      tables.push(buildTable({
        id: chapterTableId,
        title: chapter.title,
        source: `snapshot.data.chapters[${index}].rows`,
        rows: chapter.rows,
        columns: chapter.columns,
      }));
    }
    if (chapter.stats?.length) {
      indicatorTables.push(buildStatsTable({
        id: `${chapterTableId}-stats`,
        title: `${chapter.title} — indicateurs`,
        source: `snapshot.data.chapters[${index}].stats`,
        stats: chapter.stats,
      }));
    }
  }
  if (payload.data.stats?.length) {
    indicatorTables.unshift(buildStatsTable({
      id: "report-stats",
      title: "Indicateurs",
      source: "snapshot.data.stats",
      stats: payload.data.stats,
    }));
  }
  return [...tables, ...indicatorTables];
}

function buildLimitations(
  generation: ReportGenerationSnapshotRecord,
  tables: ReportScientificTable[],
): string[] {
  const metadata = generation.snapshot.snapshotMetadata;
  const limitations: string[] = [];
  if (!metadata) {
    limitations.push("Ce snapshot historique ne contient pas de métadonnées structurées complètes de version, méthode et provenance.");
  }
  if (!metadata?.sourceGenerationId && metadata && !Object.hasOwn(metadata, "sourceGenerationId")) {
    limitations.push("La filiation de génération n'est pas enregistrée dans ce snapshot.");
  }
  if (metadata?.dataAvailability.truncated) {
    limitations.push("La fenêtre source était explicitement tronquée ; les tables exportées ne représentent pas une couverture exhaustive.");
  }
  if (tables.length === 0) {
    limitations.push("Aucune donnée tabulaire ni indicateur n'est enregistré dans ce snapshot ; une absence n'est jamais convertie en zéro.");
  }
  if (tables.some((table) => table.rows.some((row) => Object.values(row.values).some((cell) => cell.status === null)))) {
    limitations.push("Les statuts non persistés par le snapshot restent inconnus ; OBSERVED, DERIVED et ASSUMPTION ne sont pas inférés à partir d'une valeur seule.");
  }
  return limitations;
}

export function buildReportScientificExport(
  generation: ReportGenerationSnapshotRecord,
): ReportScientificExport {
  const tables = buildTables(generation.snapshot);
  return {
    schemaVersion: REPORT_SCIENTIFIC_EXPORT_SCHEMA_VERSION,
    exportType: "json",
    reference: buildReportScientificReference(generation),
    snapshot: generation.snapshot,
    tables,
    limitations: buildLimitations(generation, tables),
  };
}

function csvValue(value: JsonValue): string {
  if (value === null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function buildReportScientificCsv(
  generation: ReportGenerationSnapshotRecord,
): string {
  const exportData = buildReportScientificExport(generation);
  const reference = exportData.reference;
  const headers = [
    "generation_id",
    "report_title",
    "generated_at",
    "period_id",
    "period_from",
    "period_to",
    "period_timezone",
    "scope_kind",
    "scope_value",
    "scope_label",
    "table_id",
    "table_title",
    "row_index",
    "field_id",
    "field_label",
    "unit",
    "value",
    "status",
  ];
  const lines = [headers.map((header) => escapeCsvCell(header)).join(",")];
  for (const table of exportData.tables) {
    for (const row of table.rows) {
      for (const column of table.columns) {
        const cell = row.values[column.id];
        lines.push([
          reference.generationId,
          reference.title,
          reference.generatedAt,
          reference.period.id,
          reference.period.from,
          reference.period.to,
          reference.period.timeZone,
          reference.scope.kind,
          reference.scope.value,
          reference.scope.label,
          table.id,
          table.title,
          row.index,
          column.id,
          column.label,
          column.unit,
          csvValue(cell.value),
          cell.status,
        ].map((value) => escapeCsvCell(value)).join(","));
      }
    }
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function buildReportScientificExportFilename(
  filename: string,
  extension: "json" | "csv",
): string {
  return filename.replace(/\.pdf$/i, `.${extension}`);
}
