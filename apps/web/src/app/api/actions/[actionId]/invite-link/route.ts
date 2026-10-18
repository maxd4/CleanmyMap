import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { normalizeActionId } from "@/lib/actions/action-id";
import { loadActionById } from "@/lib/actions/store";
import { canManageAction } from "@/lib/actions/permissions";
import { getCurrentUserIdentity } from "@/lib/authz";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { buildInvitationUrl, createInvitationToken, hashInvitationToken } from "@/lib/actions/private-invitation";

type Context = { params: Promise<{ actionId: string }> };

async function resolveManagedAction(request: Request, ctx: Context) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const actionId = normalizeActionId((await ctx.params).actionId);
  if (!actionId) return { response: validationErrorResponse({ actionId: ["Identifiant d'action manquant."] }) } as const;
  const supabase = getSupabaseServerClient(true);
  const action = await loadActionById(supabase, actionId);
  if (!action) return { response: NextResponse.json({ error: "Action introuvable." }, { status: 404 }) } as const;
  const identity = await getCurrentUserIdentity({ userId: access.userId });
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  const permissionIdentity = identity ? { userId: access.userId, role: identity.role, activeRole: identity.activeRole } : null;
  if (!canManageAction(permissionIdentity, { createdByClerkId: action.created_by_clerk_id }, organizerIds)) {
    return { response: NextResponse.json({ error: "Vous n'êtes pas autorisé à gérer ce lien." }, { status: 403 }) } as const;
  }
  return { access, actionId, action, supabase } as const;
}

export async function GET(request: Request, ctx: Context) {
  try {
    const resolved = await resolveManagedAction(request, ctx);
    if ("response" in resolved) return resolved.response;
    const result = await resolved.supabase
      .from("action_invitation_links")
      .select("created_at, revoked_at")
      .eq("action_id", resolved.actionId)
      .maybeSingle();
    if (result.error) throw result.error;
    return NextResponse.json({
      status: "ok",
      active: Boolean(result.data && !result.data.revoked_at),
      createdAt: result.data?.created_at ?? null,
      revokedAt: result.data?.revoked_at ?? null,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId/invite-link");
  }
}

export async function POST(request: Request, ctx: Context) {
  try {
    const resolved = await resolveManagedAction(request, ctx);
    if ("response" in resolved) return resolved.response;
    if (resolved.action.access_mode !== "invite_link" || resolved.action.action_phase !== "pre_action") {
      return NextResponse.json({ error: "Le lien est réservé aux pré-actions privées." }, { status: 409 });
    }
    const token = createInvitationToken();
    const result = await resolved.supabase.rpc("create_action_invitation_link", {
      p_action_id: resolved.actionId,
      p_token_hash: hashInvitationToken(token),
      p_actor_id: resolved.access.userId,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ status: "ok", active: true, url: buildInvitationUrl(request, token) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/invite-link");
  }
}

export async function DELETE(request: Request, ctx: Context) {
  try {
    const resolved = await resolveManagedAction(request, ctx);
    if ("response" in resolved) return resolved.response;
    const result = await resolved.supabase.rpc("revoke_action_invitation_link", {
      p_action_id: resolved.actionId,
      p_actor_id: resolved.access.userId,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ status: "ok", active: false });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/:actionId/invite-link");
  }
}
