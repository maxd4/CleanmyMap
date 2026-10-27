import { buildReportScientificCsv } from "@/lib/reports/report-scientific-csv";
import { createReportGenerationExportHandler } from "../route-helpers";

export const runtime = "nodejs";

export const GET = createReportGenerationExportHandler("csv", buildReportScientificCsv);
