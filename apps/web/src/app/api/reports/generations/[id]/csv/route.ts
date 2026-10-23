import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  buildReportScientificCsv,
  buildReportScientificExportFilename,
} from "@/lib/reports/report-scientific-csv";
import { executeReportGenerationRoute } from "../route-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

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
