import { NextResponse } from "next/server";
import {
  buildReportScientificCsv,
  buildReportScientificExportFilename,
} from "@/lib/reports/report-scientific-csv";
import { executeReportGenerationRoute, requireReportGenerationAccess } from "../route-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const access = await requireReportGenerationAccess();
  if (access instanceof Response) return access;

  const { id } = await params;
  return executeReportGenerationRoute(id, access.userId, (generation) => new NextResponse(
    buildReportScientificCsv(generation),
    {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildReportScientificExportFilename(generation.filename, "csv")}"`,
        // Cache justification: this export contains the authenticated owner's
        // private historical report data and must not be shared or retained.
        "Cache-Control": "private, no-store",
      },
    },
  ));
}
