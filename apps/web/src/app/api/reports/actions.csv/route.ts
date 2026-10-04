import {
  buildActionsCsv,
  buildActionsCsvRows,
  buildActionsCsvFilename,
} from "@/lib/reports/csv";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import * as actionsExportRoute from "@/lib/reports/actions-export-route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return adminAccessErrorJsonResponse(access);

  const exportContext = actionsExportRoute.prepareActionsExportContext(request);

  const csvFilename = buildActionsCsvFilename(exportContext.exportDate);
  const cachedCsvPath = actionsExportRoute.buildActionsExportCachePath({
    format: "csv",
    cacheDay: exportContext.cacheDay,
    query: exportContext.query,
    types: exportContext.types,
  });
  try {
    const cachedRedirect = await actionsExportRoute.createActionsExportRedirect({
      supabase: exportContext.supabase,
      path: cachedCsvPath,
      filename: csvFilename,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });

    if (cachedRedirect) {
      return cachedRedirect;
    }

    const { contracts: filteredContracts, isTruncated, sourceHealth } =
      await actionsExportRoute.loadActionsExportContractsForContext(exportContext);

    const rows = buildActionsCsvRows(filteredContracts, actionsExportRoute.manualDrawingToGeoJson);

    const csv = buildActionsCsv(rows);
    const withBom = `\uFEFF${csv}`;
    const uploadResult = await exportContext.supabase.storage
      .from(actionsExportRoute.ACTIONS_EXPORT_BUCKET)
      .upload(cachedCsvPath, new Blob([withBom], { type: "text/csv;charset=utf-8" }), {
        upsert: true,
        cacheControl: "3600",
      });

    if (!uploadResult.error) {
      const signedRedirect = await actionsExportRoute.createActionsExportRedirect({
        supabase: exportContext.supabase,
        path: cachedCsvPath,
        filename: csvFilename,
        cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
      });

      if (signedRedirect) {
        return signedRedirect;
      }
    }

    const { headers: responseHeaders } = actionsExportRoute.buildDeliverableHeaders({
      rubrique: "export_actions",
      extension: "csv",
      contentType: "text/csv; charset=utf-8",
      date: exportContext.exportDate,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });
    const headers = actionsExportRoute.buildActionsExportWarningHeaders(
      responseHeaders,
      isTruncated,
      sourceHealth,
    );

    return new Response(withBom, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
}
