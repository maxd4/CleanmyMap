import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiObserverProjection } from "@/lib/spogomi/observer-projection";

export const runtime = "nodejs";
// Justification force-dynamic: scoped operational access and current event state are mutable.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const projection = await loadSpogomiObserverProjection({
      supabase: getSupabaseServerClient(true),
      eventId: (await context.params).eventId,
      userId: access.userId,
    });
    if (projection === false) return forbiddenJsonResponse();
    if (!projection) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    return NextResponse.json({ projection }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.observer.read");
  }
}
