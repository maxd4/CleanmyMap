import { z } from "zod";
import type {
  PdfReportChapter,
  PdfReportColumn,
  PdfReportData,
  PdfReportPayload,
  PdfReportStat,
} from "@/lib/pdf-export/simple-pdf";

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
}).passthrough();

export const reportGenerationPayloadSchema = z.object({
  title: z.string().trim().min(1).max(240),
  rubrique: z.literal("reporting"),
  periode: z.enum(["six_months", "current_year", "full_history"]),
  organizationType: z.string().trim().min(1).max(180),
  organizationName: z.string().trim().max(180).optional(),
  data: pdfReportDataSchema,
}).passthrough();

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

export type { PdfReportChapter, PdfReportColumn, PdfReportData, PdfReportPayload, PdfReportStat };
