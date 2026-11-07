import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { divisionRegulationInputSchema, updateSpogomiDivisionRegulation } from "@/lib/spogomi/division-regulation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; divisionId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { eventId, divisionId } = await context.params;
    const parsed = await parseJsonBodyWithValidation(request, divisionRegulationInputSchema);
    if (!parsed.ok) return parsed.response;
    const result = await updateSpogomiDivisionRegulation({
      supabase: getSupabaseServerClient(true),
      eventId,
      divisionId,
      userId: access.userId,
      input: parsed.data,
    });
    return NextResponse.json({ division: result });
  } catch (error) {
    return handleApiError(error, "spogomi.division-regulation.update");
  }
}
