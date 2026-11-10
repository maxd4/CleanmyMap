import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { upsertPlannedRoute } from "@/lib/spogomi/preparation/preparation-route-service";
import { loadSpogomiRouteByDivision } from "@/lib/spogomi/preparation/route-read-service";

export const runtime = "nodejs";
// Justification Vercel: route reference media is authenticated mutable event state.
export const dynamic = "force-dynamic";

const schema = z.object({
  divisionId: z.string().uuid().nullable(),
  expectedRevision: z.number().int().nonnegative(),
  mediaId: z.string().uuid(),
  correctionReason: z.string().trim().min(3).max(500).nullable().optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La référence média du parcours est invalide."] });
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    if (Number(authorized.event.composition_revision ?? 0) !== parsed.data.expectedRevision) {
      return NextResponse.json({ error: "Le parcours a été modifié entre-temps. Rechargez l’édition avant de réessayer." }, { status: 409 });
    }
    const route = await loadSpogomiRouteByDivision({ supabase, eventId: authorized.event.id, divisionId: parsed.data.divisionId });
    if (!route) return NextResponse.json({ error: "Créez d’abord un parcours avant d’ajouter une image de référence." }, { status: 422 });
    const media = await supabase
      .from("action_media")
      .select("id, upload_state")
      .eq("id", parsed.data.mediaId)
      .eq("action_id", authorized.event.action_id)
      .maybeSingle();
    if (media.error) throw media.error;
    if (!media.data || media.data.upload_state !== "ready") return NextResponse.json({ error: "Cette image n’est pas prête ou n’appartient pas à l’édition." }, { status: 422 });
    const targetDivisionId = route.division_id;
    const result = await upsertPlannedRoute({
      supabase,
      event: authorized.event,
      userId: access.userId,
      expectedRevision: parsed.data.expectedRevision,
      input: {
        divisionId: targetDivisionId,
        source: route.source,
        fileName: route.file_name,
        drawing: {
          kind: "polyline" as const,
          coordinates: route.geometry_geojson.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
        },
        referenceDistanceKm: Number(route.reference_distance_km),
        inferredTopology: route.inferred_topology,
        correctionReason: parsed.data.correctionReason,
        referenceMediaId: parsed.data.mediaId,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.route.reference-media");
  }
}
