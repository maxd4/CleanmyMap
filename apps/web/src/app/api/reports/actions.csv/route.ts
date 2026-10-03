import {
  buildActionsCsv,
  buildActionsCsvRows,
  buildActionsCsvFilename,
} from "@/lib/reports/csv";
import * as actionsExportRoute from "@/lib/reports/actions-export-route";

export const runtime = "nodejs";

export const GET = actionsExportRoute.withActionsExportRequest(async ({
  query,
  types,
  exportDate,
  cacheDay,
  supabase,
}) => {
  const csvFilename = buildActionsCsvFilename(exportDate);
  const cachedCsvPath = actionsExportRoute.buildActionsExportCachePath({
    format: "csv",
    cacheDay,
    query,
    types,
  });
  try {
    const cachedRedirect = await actionsExportRoute.createActionsExportRedirect({
      supabase,
      path: cachedCsvPath,
      filename: csvFilename,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });

    if (cachedRedirect) {
      return cachedRedirect;
    }

    const { contracts: filteredContracts, isTruncated, sourceHealth } =
      await actionsExportRoute.loadActionsExportContracts(supabase, query, types);

    const rows = buildActionsCsvRows(filteredContracts, actionsExportRoute.manualDrawingToGeoJson);

    const csv = buildActionsCsv(rows);
    const withBom = `\uFEFF${csv}`;
    const uploadResult = await supabase.storage
      .from(actionsExportRoute.ACTIONS_EXPORT_BUCKET)
      .upload(cachedCsvPath, new Blob([withBom], { type: "text/csv;charset=utf-8" }), {
        upsert: true,
        cacheControl: "3600",
      });

    if (!uploadResult.error) {
      const signedRedirect = await actionsExportRoute.createActionsExportRedirect({
        supabase,
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
      date: exportDate,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });
    const headers: Record<string, string> = { ...responseHeaders };
    if (isTruncated) {
      headers["X-Export-Warning"] = "Dataset truncated to limit";
    }
    if (sourceHealth.partial) {
      headers["X-Data-Warning"] = sourceHealth.warnings.join(" |");
    }

    return new Response(withBom, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
});
