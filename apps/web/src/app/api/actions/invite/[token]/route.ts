import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadActionById } from "@/lib/actions/store";
import { hashInvitationToken, isInvitationTokenFormat } from "@/lib/actions/private-invitation";

type Context = { params: Promise<{ token: string }> };

async function resolveInvite(ctx: Context) {
  const token = (await ctx.params).token.trim();
  if (!isInvitationTokenFormat(token)) return null;
  const supabase = getSupabaseServerClient(true);
  const link = await supabase
    .from("action_invitation_links")
    .select("action_id, revoked_at")
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle();
  if (link.error || !link.data || link.data.revoked_at) return null;
  const action = await loadActionById(supabase, link.data.action_id);
  if (!action || action.access_mode !== "invite_link" || action.status === "cancelled" || action.status === "rejected") return null;
  return { action, actionId: link.data.action_id, supabase };
}

function minimalProjection(action: Awaited<ReturnType<typeof loadActionById>>) {
  if (!action) return null;
  const preparation = action.preparation_data ?? {};
  return {
    title: preparation.actionTitle ?? action.location_label,
    shortDescription: preparation.shortDescription ?? null,
    actionDate: action.action_date,
    meetingTime: preparation.meetingTime ?? action.event_start_time ?? null,
    pointDeRendezVous: preparation.pointDeRendezVous ?? action.location_label,
    zoneCiblePrevue: preparation.zoneCiblePrevue ?? null,
    organizerLabel: action.organizer_name ?? null,
    actionPhase: action.action_phase,
    registrationOpen: action.action_phase === "pre_action",
  };
}

export async function GET(_request: Request, ctx: Context) {
  try {
    const resolved = await resolveInvite(ctx);
    if (!resolved) return NextResponse.json({ error: "Lien d’invitation invalide ou révoqué." }, { status: 404 });
    return NextResponse.json({ status: "ok", action: minimalProjection(resolved.action) });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/invite/:token");
  }
}

export async function POST(request: Request, ctx: Context) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const resolved = await resolveInvite(ctx);
    if (!resolved || resolved.action.action_phase !== "pre_action") {
      return NextResponse.json({ error: "Lien d’invitation invalide, révoqué ou fermé." }, { status: 404 });
    }
    const result = await resolved.supabase.rpc("request_private_action_registration", {
      p_action_id: resolved.actionId,
      p_user_id: access.userId,
      p_token_hash: hashInvitationToken((await ctx.params).token.trim()),
    });
    if (result.error) throw result.error;
    return NextResponse.json({ status: "ok", registrationStatus: "pending", actionId: resolved.actionId }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/invite/:token");
  }
}
