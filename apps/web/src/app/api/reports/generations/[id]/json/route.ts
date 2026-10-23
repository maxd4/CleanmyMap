import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { buildReportScientificExport } from "@/lib/reports/report-scientific-export";
import { buildReportScientificExportFilename } from "@/lib/reports/report-scientific-csv";
import { executeReportGenerationRoute } from "../route-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

  const { id } = await params;
  return executeReportGenerationRoute(id, access.userId, (generation) => {
    const exportData = buildReportScientificExport(generation);
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildReportScientificExportFilename(generation.filename, "json")}"`,
        // Cache justification: this export contains private owner-scoped report data.
        "Cache-Control": "private, no-store",
      },
    });
  });
}
