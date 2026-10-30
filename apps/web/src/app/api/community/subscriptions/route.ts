import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import {
  COMMUNITY_SUBSCRIPTION_CADENCES,
  COMMUNITY_SUBSCRIPTION_KINDS,
  COMMUNITY_SUBSCRIPTION_TOPIC_IDS,
  normalizeCommunitySubscriptionTarget,
  type CommunitySubscriptionRow,
} from "@/lib/community/subscriptions";

export const runtime = "nodejs";

const selectFields = "id, user_id, kind, territory_zone_name, topic_id, cadence, enabled, created_at, updated_at";
const targetSchema = z.object({
  kind: z.enum(COMMUNITY_SUBSCRIPTION_KINDS),
  territoryZoneName: z.string().trim().max(120).nullable().optional(),
  topicId: z.enum(COMMUNITY_SUBSCRIPTION_TOPIC_IDS).nullable().optional(),
  cadence: z.enum(COMMUNITY_SUBSCRIPTION_CADENCES),
});

function invalidTargetResponse() {
  return NextResponse.json({ error: "Cible d’abonnement invalide." }, { status: 400 });
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function findExistingSubscription(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  target: ReturnType<typeof normalizeCommunitySubscriptionTarget> & { ok: true },
) {
  let query = supabase
    .from("community_subscriptions")
    .select(selectFields)
    .eq("user_id", userId)
    .eq("kind", target.kind);
  query = target.kind === "territory"
    ? query.eq("territory_zone_name", target.territoryZoneName).is("topic_id", null)
    : query.eq("topic_id", target.topicId).is("territory_zone_name", null);
  return query.maybeSingle();
}

async function updateExistingSubscription(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  subscriptionId: string,
  cadence: CommunitySubscriptionRow["cadence"],
) {
  return supabase
    .from("community_subscriptions")
    .update({ cadence, enabled: true })
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .select(selectFields)
    .single();
}

export async function GET() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await getSupabaseServerClient(true)
      .from("community_subscriptions")
      .select(selectFields)
      .eq("user_id", access.userId)
      .order("kind", { ascending: true })
      .order("created_at", { ascending: true });
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ status: "ok", items: (result.data ?? []) as CommunitySubscriptionRow[] });
  } catch (error) {
    return handleApiError(error, "GET /api/community/subscriptions");
  }
}

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJsonBodyWithValidation(request, targetSchema);
  if (!parsed.ok) return parsed.response;

  const target = normalizeCommunitySubscriptionTarget(parsed.data);
  if (!target.ok) return invalidTargetResponse();

  try {
    const supabase = getSupabaseServerClient(true);
    const existing = await findExistingSubscription(supabase, access.userId, target);
    if (existing.error) throw new Error(existing.error.message);

    const values = {
      user_id: access.userId,
      kind: target.kind,
      territory_zone_name: target.territoryZoneName,
      topic_id: target.topicId,
      cadence: parsed.data.cadence,
      enabled: true,
    };
    if (existing.data) {
      const result = await updateExistingSubscription(supabase, access.userId, existing.data.id, parsed.data.cadence);
      if (result.error) throw new Error(result.error.message);
      return NextResponse.json({ status: "updated", item: result.data as CommunitySubscriptionRow });
    }

    const inserted = await supabase
      .from("community_subscriptions")
      .insert(values)
      .select(selectFields)
      .single();
    if (!inserted.error) {
      return NextResponse.json({ status: "created", item: inserted.data as CommunitySubscriptionRow });
    }

    // The partial unique index is the concurrency authority. If another request
    // won the insert race, converge on that row and apply this request's cadence.
    if (!isUniqueViolation(inserted.error)) throw new Error(inserted.error.message);
    const concurrent = await findExistingSubscription(supabase, access.userId, target);
    if (concurrent.error) throw new Error(concurrent.error.message);
    if (!concurrent.data) throw new Error("Subscription race did not resolve to a row.");
    const result = await updateExistingSubscription(supabase, access.userId, concurrent.data.id, parsed.data.cadence);
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ status: "updated", item: result.data as CommunitySubscriptionRow });
  } catch (error) {
    return handleApiError(error, "POST /api/community/subscriptions");
  }
}
