import { NextResponse } from "next/server";
import {
  removeActionBuddyAvailability,
  setActionBuddyAvailability,
} from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Vercel contract: authenticated buddy availability requires a dynamic private response.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };
// Vercel contract: authenticated buddy availability is private and never shared through a cache.
const privateHeaders = { "Cache-Control": "private, no-store" };

async function resolveActionId(context: Context) {
  const actionId = normalizeActionId((await context.params).actionId);
  return actionId ?? validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
}

export async function PUT(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (typeof actionId !== "string") return actionId;
    const availability = await setActionBuddyAvailability(getSupabaseServerClient(true), {
      actionId,
      mentorUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", availability }, { headers: privateHeaders });
  } catch (error) {
    return handleApiError(error, "PUT /api/actions/[actionId]/buddy/availability");
  }
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const actionId = await resolveActionId(context);
    if (typeof actionId !== "string") return actionId;
    const result = await removeActionBuddyAvailability(getSupabaseServerClient(true), {
      actionId,
      mentorUserId: access.userId,
    });
    return NextResponse.json({ status: "ok", ...result }, { headers: privateHeaders });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/[actionId]/buddy/availability");
  }
}
