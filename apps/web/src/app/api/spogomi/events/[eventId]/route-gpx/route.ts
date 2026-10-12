import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { attachOfficialGpx, loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: the official route reference can be replaced and must be resolved dynamically.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier GPX requis." }, { status: 422 });
    return NextResponse.json(await attachOfficialGpx({ supabase, event, userId: access.userId, file }), { status: 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.route.attach");
  }
}
