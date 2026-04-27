import { buildDateFloor, resolveReportQuery } from"@/lib/reports/csv";
import { buildDeliverableFilename } from"@/lib/reports/deliverable-name";
import { filterActionContractsByScope } from"@/lib/reports/scope";
import { requireAdminAccess } from"@/lib/authz";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import {
 fetchUnifiedActionContracts,
 parseEntityTypesParam,
} from"@/lib/actions/unified-source";

export const runtime ="nodejs";

export async function GET(request: Request) {
 const access = await requireAdminAccess();
 if (!access.ok) {
 return adminAccessErrorJsonResponse(access);
 }

 const url = new URL(request.url);
 const query = resolveReportQuery(url);
 const floorDate = buildDateFloor(query.days);
 const types = parseEntityTypesParam(url.searchParams.get("types"));

 try {
 const supabase = getSupabaseServerClient();
 const { items: contracts, isTruncated, sourceHealth } =
 await fetchUnifiedActionContracts(
 supabase,
 {
 limit: Math.max(query.limit * 4, query.limit),
 status: query.status,
 floorDate,
 requireCoordinates: false,
 types,
 },
 );
 const filteredContracts = filterActionContractsByScope(contracts, {
 kind: query.scopeKind,
 value:
 query.scopeKind ==="association"
 ? query.scopeValue ?? query.association
 : query.scopeValue,
 });
 const enrichedItems = filteredContracts.map((contract) => ({
 id: contract.id,
 created_at: contract.dates.createdAt,
 action_date: contract.dates.observedAt,
 actor_name: contract.metadata.actorName,
 association_name: contract.metadata.associationName,
 location_label: contract.location.label,
 latitude: contract.location.latitude,
 longitude: contract.location.longitude,
 waste_kg: contract.metadata.wasteKg,
 cigarette_butts: contract.metadata.cigaretteButts,
 volunteers_count: contract.metadata.volunteersCount,
 duration_minutes: contract.metadata.durationMinutes,
 status: contract.status,
 notes: contract.metadata.notes,
 notes_plain: contract.metadata.notesPlain,
 geometry_kind: contract.geometry.kind,
 geometry_geojson: contract.geometry.geojson,
 geometry_confidence: contract.geometry.confidence,
 contract,
 manual_drawing: contract.metadata.manualDrawing,
 manual_drawing_coordinates_json: contract.metadata.manualDrawing
 ? JSON.stringify(contract.metadata.manualDrawing)
 : null,
 manual_drawing_geojson: contract.metadata.manualDrawing
 ? JSON.stringify(
 contract.metadata.manualDrawing.kind ==="polyline"
 ? {
 type:"LineString",
 coordinates: contract.metadata.manualDrawing.coordinates.map(
 ([lat, lng]) => [lng, lat],
 ),
 }
 : {
 type:"Polygon",
 coordinates: [
 contract.metadata.manualDrawing.coordinates.map(
 ([lat, lng]) => [lng, lat],
 ),
 ],
 },
 )
 : null,
 }));

 const payload = {
 exportedAt: new Date().toISOString(),
 query,
 count: enrichedItems.length,
 isTruncated,
 sourceHealth,
 items: enrichedItems,
 };
 const filename = buildDeliverableFilename({
 rubrique:"export_actions",
 extension:"json",
 date: new Date(),
 });

 return new Response(JSON.stringify(payload, null, 2), {
 status: 200,
 headers: {
"Content-Type":"application/json; charset=utf-8",
"Content-Disposition": `attachment; filename=\"${filename}\"`,
"Cache-Control":"no-store",
 },
 });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";
 return new Response(`Export error: ${message}`, { status: 500 });
 }
}
