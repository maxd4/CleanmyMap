import * as actionsExportRoute from "@/lib/reports/actions-export-route";

export const runtime = "nodejs";

export const GET = actionsExportRoute.withActionsExportRequest(async ({
  query,
  types,
  exportDate,
  cacheDay,
  supabase,
}) => {
  const { filename: jsonFilename, headers: responseHeaders } =
    actionsExportRoute.buildDeliverableHeaders({
      rubrique: "export_actions",
      extension: "json",
      contentType: "application/json; charset=utf-8",
      date: exportDate,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });
  const cachedJsonPath = actionsExportRoute.buildActionsExportCachePath({
    format: "json",
    cacheDay,
    query,
    types,
  });
  try {
    const cachedRedirect = await actionsExportRoute.createActionsExportRedirect({
      supabase,
      path: cachedJsonPath,
      filename: jsonFilename,
      cacheControl: actionsExportRoute.ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL,
    });

    if (cachedRedirect) {
      return cachedRedirect;
    }

    const { contracts: filteredContracts, isTruncated, sourceHealth } =
      await actionsExportRoute.loadActionsExportContracts(supabase, query, types);

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
      exportedAt: exportDate.toISOString(),
      query,
      count: enrichedItems.length,
      isTruncated,
      sourceHealth,
      items: enrichedItems,
    };
    const json = `${JSON.stringify(payload, null, 2)}\n`;
    const uploadResult = await supabase.storage
      .from(actionsExportRoute.ACTIONS_EXPORT_BUCKET)
      .upload(cachedJsonPath, new Blob([json], { type: "application/json;charset=utf-8" }), {
        upsert: true,
        cacheControl: "3600",
      });

    if (!uploadResult.error) {
      const signedRedirect = await actionsExportRoute.createActionsExportRedirect({
        supabase,
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
});
