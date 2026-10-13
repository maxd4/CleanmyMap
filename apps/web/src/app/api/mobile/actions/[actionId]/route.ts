import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { appendParticipationClaimAudit } from "@/lib/actions/participation/claim-audit";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";
import {
  cancelActionParticipation,
  loadJoinableActions,
  loadUserParticipationHistory,
} from "@/lib/actions/participation/group-participation";
import { claimFinishedActionParticipation } from "@/lib/actions/participation/post-action-claims";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { toPublicActionListItem } from "@/lib/actions/data-contract";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";

export const runtime = "nodejs";
// Justification Vercel: this authenticated mobile action projection changes with workflow state.
export const dynamic = "force-dynamic";

type ActionRouteContext = { params: Promise<{ actionId: string }> };

const mutationSchema = z.object({ intent: z.enum(["claim"]) });

async function resolveAction(supabase: ReturnType<typeof getSupabaseServerClient>, actionId: string, userId: string) {
  const [future, history, publicActions] = await Promise.all([
    loadJoinableActions(supabase, { limit: 1, userId, actionId }),
    loadUserParticipationHistory(supabase, { userId, limit: 200 }),
    fetchUnifiedActionContracts(supabase, {
      actionId,
      limit: 1,
      status: "approved",
      includeFuturePublicActions: true,
      futureOnly: false,
      floorDate: null,
      requireCoordinates: false,
      types: ["action"],
    }),
  ]);
  const futureItem = future.find((item) => item.id === actionId) ?? null;
  const publicItem = publicActions.items[0]
    ? toPublicActionListItem(publicActions.items[0])
    : null;
  const historyItem = history.find((item) => item.id === actionId) ?? null;
  const pastItem = publicItem &&
    publicItem.contract?.metadata.actionPhase === "post_action_complete" &&
    !isActionStartInFuture({
      action_date: publicItem.action_date,
      event_start_time: publicItem.contract.dates.eventStartTime ?? null,
    })
    ? publicItem
    : null;

  return {
    action: futureItem ?? pastItem ?? historyItem,
    participation: historyItem,
    canJoin: Boolean(futureItem && !futureItem.joined && !futureItem.awaitingApproval),
    canClaim: Boolean(pastItem && !historyItem),
  };
}

export async function GET(request: Request, ctx: ActionRouteContext) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const { actionId } = await ctx.params;
  if (!actionId.trim()) return validationErrorResponse({ actionId: ["Identifiant manquant."] });

  try {
    const result = await resolveAction(getSupabaseServerClient(true), actionId, access.userId);
    if (!result.action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    // Justification Vercel: the private action projection must not be served from a shared cache.
    return NextResponse.json({ status: "ok", ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/mobile/actions/:actionId");
  }
}

export async function POST(request: Request, ctx: ActionRouteContext) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const { actionId } = await ctx.params;
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const claim = await claimFinishedActionParticipation(getSupabaseServerClient(true), {
      actionId,
      userId: access.userId,
    });
    await appendParticipationClaimAudit({ actionId, userId: access.userId, operationIdPrefix: "mobile-action-post-claim", claim });
    return NextResponse.json({ status: "ok", intent: parsed.data.intent, ...claim });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: "Action introuvable ou non éligible." }, { status: 404 });
    }
    return handleApiError(error, "POST /api/mobile/actions/:actionId");
  }
}

export async function DELETE(request: Request, ctx: ActionRouteContext) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const { actionId } = await ctx.params;

  try {
    const supabase = getSupabaseServerClient(true);
    const result = await cancelActionParticipation(supabase, {
      actionId,
      userId: access.userId,
    });
    await refreshProgressionProfile(supabase, access.userId).catch(() => null);
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }
    return handleApiError(error, "DELETE /api/mobile/actions/:actionId");
  }
}
