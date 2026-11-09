import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  eventId: z.string().uuid(),
  changeId: z.string().uuid(),
});

function errorResponse(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : null;
  if (code === "42501") return forbiddenJsonResponse();
  if (code === "P0002") return NextResponse.json({ error: "Changement introuvable.", kind: "not_found" }, { status: 404 });
  return handleApiError(error, "spogomi.event-change-acknowledgement");
}

export async function POST(_request: Request, context: { params: Promise<{ eventId: string; changeId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return validationErrorResponse({ params: ["Édition ou changement invalide."] });

  try {
    const { data, error } = await getSupabaseServerClient(true).rpc("acknowledge_spogomi_event_change", {
      p_event_id: params.data.eventId,
      p_change_id: params.data.changeId,
      p_clerk_id: access.userId,
    });
    if (error) throw error;
    return NextResponse.json({ status: "ok", acknowledgement: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
