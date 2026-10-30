import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { COMMUNITY_SUBSCRIPTION_CADENCES, type CommunitySubscriptionRow } from "@/lib/community/subscriptions";

export const runtime = "nodejs";

const selectFields = "id, user_id, kind, territory_zone_name, topic_id, cadence, enabled, created_at, updated_at";
const updateSchema = z.object({
  cadence: z.enum(COMMUNITY_SUBSCRIPTION_CADENCES).optional(),
  enabled: z.boolean().optional(),
}).refine((value) => value.cadence !== undefined || value.enabled !== undefined, {
  message: "Aucune modification fournie.",
});

function parseId(subscriptionId: string) {
  return z.string().uuid().safeParse(subscriptionId).success;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subscriptionId } = await context.params;
  if (!parseId(subscriptionId)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const parsed = await parseJsonBodyWithValidation(request, updateSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await getSupabaseServerClient(true)
      .from("community_subscriptions")
      .update(parsed.data)
      .eq("id", subscriptionId)
      .eq("user_id", access.userId)
      .select(selectFields)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
    return NextResponse.json({ status: "updated", item: result.data as CommunitySubscriptionRow });
  } catch (error) {
    return handleApiError(error, "PATCH /api/community/subscriptions/[subscriptionId]");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subscriptionId } = await context.params;
  if (!parseId(subscriptionId)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  try {
    const result = await getSupabaseServerClient(true)
      .from("community_subscriptions")
      .delete()
      .eq("id", subscriptionId)
      .eq("user_id", access.userId)
      .select("id")
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
    return NextResponse.json({ status: "deleted", id: subscriptionId });
  } catch (error) {
    return handleApiError(error, "DELETE /api/community/subscriptions/[subscriptionId]");
  }
}
