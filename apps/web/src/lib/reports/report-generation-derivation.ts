import {
  REPORT_GENERATION_FILTERS_VERSION,
} from "./generation-period";
import {
  InvalidReportGenerationSnapshotError,
  parseCurrentReportGenerationPayload,
} from "./report-generation-payload";
import {
  REPORT_RENDERER_VERSION,
  REPORT_TEMPLATE_VERSION,
} from "./report-generation-snapshot";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";

export class ReportGenerationDerivationUnavailableError extends Error {
  constructor() {
    super("This report snapshot is not compatible with a new version.");
    this.name = "ReportGenerationDerivationUnavailableError";
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function assertReportGenerationCanBeDerived(payload: PdfReportPayload): void {
  let current: ReturnType<typeof parseCurrentReportGenerationPayload>;
  try {
    current = parseCurrentReportGenerationPayload(payload);
  } catch (error) {
    if (error instanceof InvalidReportGenerationSnapshotError) {
      throw new ReportGenerationDerivationUnavailableError();
    }
    throw error;
  }

  const metadata = current.snapshotMetadata;
  if (!isUuid(metadata.generationId) ||
    metadata.sourceGenerationId !== null && !isUuid(metadata.sourceGenerationId) ||
    metadata.templateVersion !== REPORT_TEMPLATE_VERSION ||
    metadata.rendererVersion !== REPORT_RENDERER_VERSION ||
    metadata.filtersVersion !== REPORT_GENERATION_FILTERS_VERSION) {
    throw new ReportGenerationDerivationUnavailableError();
  }
}

export function buildDerivedReportGenerationPayload(params: {
  source: PdfReportPayload;
  generationId: string;
  sourceGenerationId: string;
  generatedAt: string;
}): PdfReportPayload {
  assertReportGenerationCanBeDerived(params.source);
  if (!isUuid(params.generationId) || !isUuid(params.sourceGenerationId) ||
    params.generationId === params.sourceGenerationId) {
    throw new ReportGenerationDerivationUnavailableError();
  }

  const sourceMetadata = params.source.snapshotMetadata!;
  return {
    ...params.source,
    snapshotMetadata: {
      ...sourceMetadata,
      generationId: params.generationId,
      sourceGenerationId: params.sourceGenerationId,
      generatedAt: params.generatedAt,
    },
    data: {
      ...params.source.data,
      generatedAt: params.generatedAt,
    },
  };
}
