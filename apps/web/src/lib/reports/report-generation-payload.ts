import { z } from "zod";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import {
  REPORT_SNAPSHOT_SCHEMA_VERSION,
  REPORT_RENDERER_VERSION,
  REPORT_TEMPLATE_VERSION,
} from "./report-generation-snapshot";

export { REPORT_SNAPSHOT_SCHEMA_VERSION } from "./report-generation-snapshot";

const pdfReportColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
}).passthrough();

const pdfReportStatSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.number().finite()]),
  detail: z.string().optional(),
}).passthrough();

const pdfReportChapterSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  lines: z.array(z.string()).optional(),
  stats: z.array(pdfReportStatSchema).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).optional(),
  columns: z.array(pdfReportColumnSchema).optional(),
  locked: z.boolean().optional(),
  requiredDetailLevelLabel: z.string().optional(),
}).passthrough();

const pdfReportDataSchema = z.object({
  title: z.string().optional(),
  summary: z.array(z.string()).optional(),
  stats: z.array(pdfReportStatSchema).optional(),
  chapters: z.array(pdfReportChapterSchema).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).optional(),
  columns: z.array(pdfReportColumnSchema).optional(),
  generatedAt: z.string().datetime(),
  periodRange: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeZone: z.literal("UTC"),
  }).strict().optional(),
}).passthrough();

const moduleStateSchema = z.object({
  dataAndCartography: z.boolean(),
  transparencyAndMethods: z.boolean(),
  rawData: z.boolean(),
  detailedFiles: z.boolean(),
}).strict();

const snapshotMetadataSchema = z.object({
  snapshotSchemaVersion: z.literal(REPORT_SNAPSHOT_SCHEMA_VERSION),
  templateVersion: z.literal(REPORT_TEMPLATE_VERSION),
  rendererVersion: z.literal(REPORT_RENDERER_VERSION),
  generatedAt: z.string().datetime(),
  period: z.object({
    id: z.enum([
      "thirty_days",
      "three_months",
      "six_months",
      "twelve_months",
      "current_year",
      "full_history",
      "custom_range",
    ]),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeZone: z.literal("UTC"),
  }).strict(),
  scope: z.object({
    kind: z.enum(["global", "account", "association", "arrondissement", "single_action"]),
    value: z.string(),
    label: z.string().min(1),
  }).strict(),
  detailLevel: z.enum(["concis", "default", "exhaustif"]),
  modules: moduleStateSchema,
  provenance: z.union([
    z.object({
      type: z.literal("single_action"),
      actionId: z.string().uuid(),
      source: z.literal("public.actions"),
      resolvedAt: z.string().datetime(),
    }).strict(),
    z.object({
      type: z.literal("multi_action"),
      source: z.literal("public.actions"),
      resolvedAt: z.string().datetime(),
      actionCount: z.number().int().positive(),
    }).strict(),
  ]),
  methodology: z.object({
    proxyVersion: z.string().min(1),
    qualityRulesVersion: z.string().min(1),
  }).strict(),
  dataAvailability: z.object({
    truncated: z.boolean(),
    availableSources: z.array(z.string()),
    failedSources: z.array(z.string()),
    communityEvents: z.enum(["available", "partial", "unavailable"]),
  }).strict(),
}).strict();

export const reportGenerationPayloadSchema = z.object({
  title: z.string().trim().min(1).max(240),
  rubrique: z.literal("reporting"),
  periode: z.enum([
    "thirty_days",
    "three_months",
    "six_months",
    "twelve_months",
    "current_year",
    "full_history",
    "custom_range",
  ]),
  organizationType: z.string().trim().min(1).max(180),
  organizationName: z.string().trim().max(180).optional(),
  snapshotSchemaVersion: z.union([z.literal(1), z.literal(REPORT_SNAPSHOT_SCHEMA_VERSION)]).optional(),
  snapshotMetadata: snapshotMetadataSchema.optional(),
  provenance: z.object({
    type: z.literal("single_action"),
    actionId: z.string().uuid(),
    source: z.literal("public.actions"),
    resolvedAt: z.string().datetime(),
  }).strict().optional(),
  data: pdfReportDataSchema,
}).passthrough().superRefine((value, context) => {
  if (value.snapshotSchemaVersion === REPORT_SNAPSHOT_SCHEMA_VERSION) {
    if (!value.snapshotMetadata) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Current snapshots require complete metadata." });
      return;
    }
    if (value.snapshotMetadata.generatedAt !== value.data.generatedAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Snapshot metadata generatedAt must match the report data." });
    }
  } else if (value.snapshotMetadata) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Snapshot metadata requires the current snapshot schema version." });
  }
});

export class InvalidReportGenerationSnapshotError extends Error {
  constructor() {
    super("Report generation snapshot is invalid or incompatible.");
    this.name = "InvalidReportGenerationSnapshotError";
  }
}

export function parseReportGenerationPayload(value: unknown): PdfReportPayload {
  const parsed = reportGenerationPayloadSchema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidReportGenerationSnapshotError();
  }

  return parsed.data as PdfReportPayload;
}

export function isReportGenerationPayload(value: unknown): value is PdfReportPayload {
  return reportGenerationPayloadSchema.safeParse(value).success;
}

export function parseCurrentReportGenerationPayload(value: unknown): PdfReportPayload & {
  snapshotSchemaVersion: typeof REPORT_SNAPSHOT_SCHEMA_VERSION;
  snapshotMetadata: NonNullable<PdfReportPayload["snapshotMetadata"]>;
} {
  const parsed = parseReportGenerationPayload(value);
  if (parsed.snapshotSchemaVersion !== REPORT_SNAPSHOT_SCHEMA_VERSION || !parsed.snapshotMetadata) {
    throw new InvalidReportGenerationSnapshotError();
  }
  return parsed as PdfReportPayload & {
    snapshotSchemaVersion: typeof REPORT_SNAPSHOT_SCHEMA_VERSION;
    snapshotMetadata: NonNullable<PdfReportPayload["snapshotMetadata"]>;
  };
}
