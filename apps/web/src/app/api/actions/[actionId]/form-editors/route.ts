import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageActionFormEditors } from "@/lib/actions/permissions";
import { loadActionById } from "@/lib/actions/store";
import { loadActionOrganizerRowsForAction } from "@/lib/actions/participation/organizers";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionFormEditorIds } from "@/lib/actions/action-form-editors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };
const mutationSchema = z.object({
  requestId: z.string().uuid(),
  operation: z.enum(["grant", "revoke"]),
  clerkUserId: z.string().trim().min(1).max(255),
}).strict();

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function loadAuthorizedContext(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [action, identity, organizers] = await Promise.all([
    loadActionById(supabase, actionId),
    getCurrentUserIdentity({ userId }),
    loadActionOrganizerRowsForAction(supabase, actionId),
  ]);
  if (!action) return { ok: false as const, status: 404 as const };
  const allowed = canManageActionFormEditors(
    { userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
    { createdByClerkId: action.created_by_clerk_id },
    organizers.find((row) => row.is_primary)?.organizer_clerk_id,
  );
  return allowed
    ? { ok: true as const, supabase, action, identity }
    : { ok: false as const, status: 403 as const };
}

export async function GET(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  try {
    const { actionId } = await context.params;
    const access = await loadAuthorizedContext(actionId.trim(), auth.userId);
    if (!access.ok) return privateJson({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, access.status);
    const editorIds = await loadActionFormEditorIds(access.supabase, access.action.id);
    return privateJson({ actionId: access.action.id, editorIds, actionPhase: access.action.action_phase });
  } catch {
    return privateJson({ error: "Les privilèges de formulaire sont indisponibles." }, 500);
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: "Paramètres invalides.", details: parsed.error.flatten().fieldErrors }, 400);

  try {
    const { actionId } = await context.params;
    const access = await loadAuthorizedContext(actionId.trim(), auth.userId);
    if (!access.ok) return privateJson({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, access.status);
    const targetId = parsed.data.clerkUserId;
    if (parsed.data.operation === "grant") {
      if (!targetId.startsWith("user_")) return privateJson({ error: "Le compte Clerk est invalide." }, 400);
      try {
        await (await clerkClient()).users.getUser(targetId);
      } catch {
        return privateJson({ error: "Le compte Clerk n’existe pas." }, 400);
      }
    }
    const { data, error } = await access.supabase.rpc("mutate_action_form_editor", {
      p_action_id: access.action.id,
      p_actor_clerk_id: auth.userId,
      p_active_role: access.identity?.activeRole ?? null,
      p_target_clerk_id: targetId,
      p_request_id: parsed.data.requestId,
      p_operation: parsed.data.operation,
    });
    if (error) {
      if (error.code === "42501") return privateJson({ error: "Accès refusé." }, 403);
      if (error.code === "P0002") return privateJson({ error: "Action introuvable." }, 404);
      if (error.code === "22023") return privateJson({ error: "Cette demande est invalide ou son identifiant a déjà été utilisé." }, 409);
      throw error;
    }
    return privateJson({ result: data });
  } catch {
    return privateJson({ error: "La modification du privilège n’a pas abouti." }, 500);
  }
}
