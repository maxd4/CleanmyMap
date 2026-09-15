import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { fetchCachedUnifiedActionContracts } from "@/lib/actions/unified-source/unified-source-cache";
import { toReportsExportRow } from "@/lib/reports/page-data";
import { buildDeliverableHeaders } from "@/lib/reports/http";
import { buildTabularCsv } from "@/lib/reports/tabular-csv";
import {
  releaseReportExportSlot,
  reserveReportExportSlot,
} from "@/lib/reports/report-export-quota";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

  let reservation;
  try {
    reservation = await reserveReportExportSlot(access.userId);
  } catch {
    return new Response("Export indisponible", { status: 503 });
  }
  if (!reservation.allowed) {
    return Response.json(
      {
        error: "Un export détaillé a déjà été utilisé aujourd'hui.",
        quotaDay: reservation.quotaDay,
      },
      { status: 429 },
    );
  }

  try {
    const result = await fetchCachedUnifiedActionContracts({
      limit: null,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: null,
    });
    const csv = `\uFEFF${buildTabularCsv(result.items.map(toReportsExportRow))}`;
    const { headers } = buildDeliverableHeaders({
      rubrique: "rapport_impact",
      extension: "csv",
      contentType: "text/csv; charset=utf-8",
      // no-store: this quota-controlled export is user-scoped and must not be cached.
      cacheControl: "no-store",
    });
    return new Response(csv, { status: 200, headers });
  } catch {
    await releaseReportExportSlot({
      userId: access.userId,
      quotaDay: reservation.quotaDay,
    }).catch(() => undefined);
    return new Response("Export indisponible", { status: 503 });
  }
}
