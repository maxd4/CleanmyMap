import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import {
  canModerateActionConversation,
  isActionDiscussionAvailable,
} from "@/lib/chat/action-conversations";
import { loadActionById } from "@/lib/actions/store";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Justification Vercel: moderation reads/writes depend on the authenticated Clerk session and live action state.
export const dynamic = "force-dynamic";

const actionIdSchema = z.string().trim().min(1).max(120);
const exclusionSchema = z.object({
  actionId: actionIdSchema,
  userId: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(500).nullable().optional(),
});

function validationResponse(error: z.ZodError) {
  return validationErrorResponse(error.flatten().fieldErrors as Record<string, string[]>);
}

async function getModerationContext(actionId: string) {
  const identity = await getCurrentUserIdentity();
  if (!identity) return { identity: null, action: null, supabase: null };

    const supabase = getSupabaseServerClient(true);
  const action = await loadActionById(supabase, actionId);
  if (!action || !isActionDiscussionAvailable(action)) {
    return { identity, action: null, supabase };
  }

  const canModerate = await canModerateActionConversation(supabase, identity, actionId);
  return { identity: canModerate ? identity : null, action, supabase };
}

async function resolveConversationId(supabase: ReturnType<typeof getSupabaseServerClient>, actionId: string) {
  const result = await supabase
    .from("action_conversations")
    .select("id")
    .eq("action_id", actionId)
    .maybeSingle();
  if (result.error) throw result.error;
  return typeof result.data?.id === "string" ? result.data.id : null;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  const actionIdResult = actionIdSchema.safeParse(new URL(request.url).searchParams.get("actionId"));
  if (!actionIdResult.success) return validationResponse(actionIdResult.error);

  try {
    const context = await getModerationContext(actionIdResult.data);
    if (!context.identity || !context.action || !context.supabase) {
      return NextResponse.json({ error: "Modération indisponible." }, { status: 403 });
    }
    const conversationId = await resolveConversationId(context.supabase, actionIdResult.data);
    if (!conversationId) return NextResponse.json({ error: "Discussion introuvable." }, { status: 404 });

    const result = await context.supabase
      .from("action_conversation_exclusions")
      .select("user_id, excluded_by_user_id, excluded_at, reason, active, reinstated_at, reinstated_by_user_id")
      .eq("conversation_id", conversationId)
      .order("excluded_at", { ascending: false });
    if (result.error) throw result.error;
    return NextResponse.json({ canModerate: true, exclusions: result.data ?? [] });
  } catch (error) {
    return handleApiError(error, "GET /api/chat/action-exclusions");
  }
}

export async function POST(request: Request) {
  return mutateExclusion(request, true);
}

export async function PATCH(request: Request) {
  return mutateExclusion(request, false);
}

async function mutateExclusion(request: Request, exclude: boolean) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const parsed = exclusionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationResponse(parsed.error);

  try {
    const context = await getModerationContext(parsed.data.actionId);
    if (!context.identity || !context.action || !context.supabase) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à modérer cette discussion." }, { status: 403 });
    }
    if (exclude && parsed.data.userId === context.action.created_by_clerk_id && context.identity.activeRole !== "admin" && context.identity.activeRole !== "max") {
      return NextResponse.json({ error: "Le créateur principal ne peut pas être exclu par un organisateur secondaire." }, { status: 403 });
    }

    const conversationId = await resolveConversationId(context.supabase, parsed.data.actionId);
    if (!conversationId) return NextResponse.json({ error: "Discussion introuvable." }, { status: 404 });

    if (exclude) {
      const excludedAt = new Date().toISOString();
      const result = await context.supabase.from("action_conversation_exclusions").upsert({
        conversation_id: conversationId,
        user_id: parsed.data.userId,
        excluded_by_user_id: userId,
        excluded_at: excludedAt,
        reason: parsed.data.reason ?? null,
        active: true,
        reinstated_at: null,
        reinstated_by_user_id: null,
      }, { onConflict: "conversation_id,user_id" }).select().single();
      if (result.error) throw result.error;
      await appendActionModerationAudit({
        operationId: `action-conversation-exclude:${conversationId}:${parsed.data.userId}:${excludedAt}`,
        actorUserId: userId,
        targetActionId: parsed.data.actionId,
        operation: "exclude_action_conversation_user",
        outcome: "success",
        reason: parsed.data.reason ?? null,
        newValue: { active: true },
        targetUserId: parsed.data.userId,
        details: { conversationId },
      });
      return NextResponse.json({ exclusion: result.data }, { status: 201 });
    }

    const reinstatedAt = new Date().toISOString();
    const result = await context.supabase.from("action_conversation_exclusions").update({
      active: false,
      reinstated_at: reinstatedAt,
      reinstated_by_user_id: userId,
    }).eq("conversation_id", conversationId).eq("user_id", parsed.data.userId).select().maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "Exclusion introuvable." }, { status: 404 });
    await appendActionModerationAudit({
      operationId: `action-conversation-reinstate:${conversationId}:${parsed.data.userId}:${reinstatedAt}`,
      actorUserId: userId,
      targetActionId: parsed.data.actionId,
      operation: "reinstate_action_conversation_user",
      outcome: "success",
      reason: parsed.data.reason ?? null,
      previousValue: { active: true },
      newValue: { active: false, reinstatedAt },
      targetUserId: parsed.data.userId,
      details: { conversationId },
    });
    return NextResponse.json({ exclusion: result.data });
  } catch (error) {
    return handleApiError(error, `${exclude ? "POST" : "PATCH"} /api/chat/action-exclusions`);
  }
}
