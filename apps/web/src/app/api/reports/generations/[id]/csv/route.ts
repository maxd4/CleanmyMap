import { NextResponse } from "next/server";
import {
  buildReportScientificCsv,
} from "@/lib/reports/report-scientific-csv";
import {
  buildReportGenerationExportHeaders,
  executeReportGenerationRoute,
  requireReportGenerationAccess,
} from "../route-helpers";

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
      headers: buildReportGenerationExportHeaders(generation, "csv"),
    },
  ));
}
