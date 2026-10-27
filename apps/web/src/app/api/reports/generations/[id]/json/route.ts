import { buildReportScientificExport } from "@/lib/reports/report-scientific-export";
import { createReportGenerationExportHandler } from "../route-helpers";

export const runtime = "nodejs";

export const GET = createReportGenerationExportHandler(
  "json",
  (generation) => JSON.stringify(buildReportScientificExport(generation), null, 2),
);
