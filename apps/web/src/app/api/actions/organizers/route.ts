import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { isOrganizerType } from "@/lib/actions/organizer-type";
import { searchOrganizerDirectory } from "@/lib/actions/organizer-directory-registry";

export const runtime = "nodejs";
// force-dynamic: authenticated directory suggestions must not be cached across users.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const query = url.searchParams.get("q") ?? "";
  if (!isOrganizerType(type) || type === "spontaneous") {
    return validationErrorResponse({ type: ["Type d'organisateur invalide."] });
  }
  if (query.length > 120) {
    return validationErrorResponse({ q: ["La recherche est trop longue."] });
  }

  try {
    const items = await searchOrganizerDirectory({
      supabase: getSupabaseServerClient(true),
      organizerType: type,
      query,
    });
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/organizers");
  }
}
