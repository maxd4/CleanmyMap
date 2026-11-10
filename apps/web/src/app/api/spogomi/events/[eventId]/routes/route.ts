import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { buildManualRouteInput, upsertPlannedRoute } from "@/lib/spogomi/preparation/preparation-route-service";

export const runtime = "nodejs";
// Justification Vercel: planned route edits are authenticated mutable event state.
export const dynamic = "force-dynamic";

const coordinateSchema = z.number().finite();
const routeSchema = z.object({
  divisionId: z.string().uuid().nullable(),
  expectedRevision: z.number().int().nonnegative(),
  correctionReason: z.string().trim().min(3).max(500).nullable().optional(),
  referenceMediaId: z.string().uuid().nullable().optional(),
  coordinates: z.array(z.tuple([coordinateSchema, coordinateSchema])).min(2).max(400).superRefine((coordinates, context) => {
    coordinates.forEach(([latitude, longitude], index) => {
      if (latitude < -90 || latitude > 90) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 0], message: "Latitude hors limites." });
      if (longitude < -180 || longitude > 180) context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 1], message: "Longitude hors limites." });
    });
  }),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = routeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["Le parcours dessiné est invalide ou incomplet."] });
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    if (Number(authorized.event.composition_revision ?? 0) !== parsed.data.expectedRevision) {
      return NextResponse.json({ error: "Le parcours a été modifié entre-temps. Rechargez l’édition avant de réessayer." }, { status: 409 });
    }
    const { coordinates, ...input } = parsed.data;
    const result = await upsertPlannedRoute({
      supabase,
      event: authorized.event,
      userId: access.userId,
      expectedRevision: parsed.data.expectedRevision,
      input: buildManualRouteInput({
        divisionId: input.divisionId,
        correctionReason: input.correctionReason,
        referenceMediaId: input.referenceMediaId,
        drawing: { kind: "polyline", coordinates },
      }),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.route.manual");
  }
}
