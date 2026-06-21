import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isAdminLikeProfile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  joinActionParticipation,
  loadJoinableActions,
  loadUserParticipationHistory,
} from "@/lib/actions/group-participation";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";

export const runtime = "nodejs";
// Justification Vercel: l'adhesion a un groupe depend de la requete courante et du contexte Clerk.
export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
  historyLimit: z.coerce.number().int().min(1).max(12).default(8),
  actionId: z.string().trim().min(1).optional(),
});

const joinSchema = z.object({
  actionId: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const { userId } = await auth();
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
    actionId: url.searchParams.get("actionId") ?? undefined,
  });

  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient();
    const items = await loadJoinableActions(supabase, {
      limit: parsed.data.limit,
      userId: userId ?? null,
      actionId: parsed.data.actionId ?? null,
    });
    const history = userId
      ? await loadUserParticipationHistory(supabase, {
          userId,
          limit: parsed.data.historyLimit,
        })
      : [];

    return NextResponse.json({
      status: "ok",
      authenticated: Boolean(userId),
      count: items.length,
      items,
      history,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/group-join");
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = joinSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient();
    const identity = await getCurrentUserIdentity();
    const isAdminLikeSubmission = Boolean(
      identity && isAdminLikeProfile(identity.role),
    );
    const joined = await joinActionParticipation(supabase, {
      actionId: parsed.data.actionId,
      userId,
      isAdminLike: isAdminLikeSubmission,
    });

    if (joined.participationStatus === "confirmed") {
      await refreshProgressionProfile(supabase, userId).catch(() => null);
    }

    return NextResponse.json({
      status: "ok",
      actionId: parsed.data.actionId,
      alreadyJoined: joined.alreadyJoined,
      joinedAt: joined.joinedAt,
      participationStatus: joined.participationStatus,
      participationSource: joined.participationSource,
      participationUpdatedAt: joined.participationUpdatedAt,
      participantsCount: joined.participantsCount,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        return NextResponse.json(
          { error: "Action introuvable." },
          { status: 404 },
        );
      }

      if (error.name === "ValidationError") {
        return validationErrorResponse({
          actionId: [error.message],
        });
      }
    }

    return handleApiError(error, "POST /api/actions/group-join");
  }
}
