import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, updateSpogomiEvent } from "@/lib/spogomi/preparation-service";
import { loadSpogomiManagementProjection } from "@/lib/spogomi/management-projection";

export const runtime = "nodejs";
// Justification Vercel: event metadata and permissions are mutable and must be resolved dynamically.
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const event = await loadSpogomiEventForOrganizer(getSupabaseServerClient(true), (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const projection = await loadSpogomiManagementProjection({
      supabase: getSupabaseServerClient(true),
      event,
      divisionId: new URL(request.url).searchParams.get("divisionId"),
    });
    return NextResponse.json(projection);
  } catch (error) {
    return handleApiError(error, "spogomi.event.read");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await updateSpogomiEvent({
      supabase,
      event,
      actorClerkId: access.userId,
      input: {
        name: typeof body.name === "string" ? body.name : undefined,
        locationLabel: typeof body.locationLabel === "string" ? body.locationLabel : undefined,
        startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
        endsAt: body.endsAt === null || typeof body.endsAt === "string" ? body.endsAt : undefined,
        mode: body.mode === "casual" || body.mode === "world_cup" || body.mode === "mixed" ? body.mode : undefined,
        casualTeamSize: body.casualTeamSize === null || typeof body.casualTeamSize === "number" ? body.casualTeamSize : undefined,
        publicVisibility: body.publicVisibility === "private" || body.publicVisibility === "published" ? body.publicVisibility : undefined,
        publicResultsVisibility: body.publicResultsVisibility === "hidden" || body.publicResultsVisibility === "provisional" || body.publicResultsVisibility === "certified" ? body.publicResultsVisibility : undefined,
      },
    });
    return NextResponse.json({ event: updated });
  } catch (error) {
    return handleApiError(error, "spogomi.event.update");
  }
}
