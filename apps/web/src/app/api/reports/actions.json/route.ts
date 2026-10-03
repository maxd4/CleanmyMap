import * as actionsExportRoute from "@/lib/reports/actions-export-route";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return adminAccessErrorJsonResponse(access);

  const exportContext = actionsExportRoute.prepareActionsExportContext(request);

  const { filename: jsonFilename, headers: responseHeaders } =
    actionsExportRoute.buildDeliverableHeaders({
      rubrique: "export_actions",
      extension: "json",
      contentType: "application/json; charset=utf-8",
      date: exportContext.exportDate,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });
  const cachedJsonPath = actionsExportRoute.buildActionsExportCachePath({
    format: "json",
    cacheDay: exportContext.cacheDay,
    query: exportContext.query,
    types: exportContext.types,
  });
  try {
    const cachedRedirect = await actionsExportRoute.createActionsExportRedirect({
      supabase: exportContext.supabase,
      path: cachedJsonPath,
      filename: jsonFilename,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });

    if (cachedRedirect) {
      return cachedRedirect;
    }

    const { contracts: filteredContracts, isTruncated, sourceHealth } =
      await actionsExportRoute.loadActionsExportContractsForContext(exportContext);

    const enrichedItems = filteredContracts.map((contract) => ({
      ...actionsExportRoute.buildActionsExportBaseFields(contract),
      contract,
      manual_drawing: contract.metadata.manualDrawing,
      manual_drawing_coordinates_json: contract.metadata.manualDrawing
        ? JSON.stringify(contract.metadata.manualDrawing)
        : null,
      manual_drawing_geojson: actionsExportRoute.manualDrawingToGeoJson(contract.metadata.manualDrawing),
    }));

    const payload = {
      exportedAt: exportContext.exportDate.toISOString(),
      query: exportContext.query,
      count: enrichedItems.length,
      isTruncated,
      sourceHealth,
      items: enrichedItems,
    };
    const json = `${JSON.stringify(payload, null, 2)}\n`;
    const uploadResult = await exportContext.supabase.storage
      .from(actionsExportRoute.ACTIONS_EXPORT_BUCKET)
      .upload(cachedJsonPath, new Blob([json], { type: "application/json;charset=utf-8" }), {
        upsert: true,
        cacheControl: "3600",
      });

    if (!uploadResult.error) {
      const signedRedirect = await actionsExportRoute.createActionsExportRedirect({
        supabase: exportContext.supabase,
        path: cachedJsonPath,
        filename: jsonFilename,
        cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
      });

      if (signedRedirect) {
        return signedRedirect;
      }
    }

    const headers: Record<string, string> = { ...responseHeaders };
    if (isTruncated) {
      headers["X-Export-Warning"] = "Dataset truncated to limit";
    }
    if (sourceHealth.partial) {
      headers["X-Data-Warning"] = sourceHealth.warnings.join(" |");
    }

    return new Response(json, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
}
