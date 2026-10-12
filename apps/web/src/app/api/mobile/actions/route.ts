import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";
import {
  loadJoinableActions,
  loadUserParticipationHistory,
  joinActionParticipation,
} from "@/lib/actions/participation/group-participation";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { toPublicActionListItem } from "@/lib/actions/data-contract";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";
import { rebuildUserGamificationBadges } from "@/lib/gamification/badges/rebuild";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Justification Vercel: mobile action data is authenticated, private and mutable during participation workflows.
export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(12),
  historyLimit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().trim().max(120).default(""),
  view: z.enum(["all", "future", "past"]).default("all"),
});

const mutationSchema = z.object({
  actionId: z.string().trim().min(1),
  intent: z.literal("join"),
});

function matchesSearch(item: { id: string; location_label: string; actionTitle?: string | null }, query: string) {
  if (!query) return true;
  const haystack = `${item.id} ${item.location_label} ${item.actionTitle ?? ""}`.toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

async function loadPastActions(supabase: ReturnType<typeof getSupabaseServerClient>, limit: number) {
  const result = await fetchUnifiedActionContracts(supabase, {
    limit: Math.min(200, Math.max(limit * 4, limit)),
    status: "approved",
    includeFuturePublicActions: true,
    futureOnly: false,
    floorDate: null,
    requireCoordinates: false,
    types: ["action"],
  });

  return result.items
    .filter((contract) =>
      contract.type === "action" &&
      contract.metadata.actionPhase === "post_action_complete" &&
      !isActionStartInFuture({
        action_date: contract.dates.observedAt,
        event_start_time: contract.dates.eventStartTime ?? null,
      }),
    )
    .map((contract) => toPublicActionListItem(contract))
    .slice(0, limit);
}

export async function GET(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    historyLimit: url.searchParams.get("historyLimit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    view: url.searchParams.get("view") ?? undefined,
  });
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const supabase = getSupabaseServerClient(true);
    const [future, past, history, invitations] = await Promise.all([
      parsed.data.view === "past"
        ? Promise.resolve([])
        : loadJoinableActions(supabase, {
            limit: parsed.data.limit,
            userId: access.userId,
          }),
      parsed.data.view === "future"
        ? Promise.resolve([])
        : loadPastActions(supabase, parsed.data.limit),
      loadUserParticipationHistory(supabase, {
        userId: access.userId,
        limit: parsed.data.historyLimit,
      }),
      supabase.rpc("list_pending_action_invitations_for_recipient", {
        p_recipient_id: access.userId,
      }),
    ]);

    if (invitations.error) throw invitations.error;
    // Justification Vercel: private mobile action data must not be served from a shared cache.
    return NextResponse.json({
      status: "ok",
      future: future.filter((item) => matchesSearch(item, parsed.data.q)),
      past: past.filter((item) => matchesSearch(item, parsed.data.q)),
      history,
      invitations: invitations.data ?? [],
    }, {
      // Justification Vercel: this private projection must not be served from a shared cache.
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/mobile/actions");
  }
}

export async function POST(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const supabase = getSupabaseServerClient(true);
    const joined = await joinActionParticipation(supabase, {
      actionId: parsed.data.actionId,
      userId: access.userId,
      isAdminLike: false,
    });
    if (joined.participationStatus === "confirmed") {
      await rebuildUserGamificationBadges(supabase, access.userId).catch(() => null);
      await refreshProgressionProfile(supabase, access.userId).catch(() => null);
    }
    return NextResponse.json({ status: "ok", intent: "join", ...joined });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json({ error: "Action introuvable ou non éligible." }, { status: 404 });
    }
    if (error instanceof Error && error.name === "ValidationError") {
      return validationErrorResponse({ actionId: [error.message] });
    }
    return handleApiError(error, "POST /api/mobile/actions");
  }
}
