import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { joinActionParticipation, loadJoinableActions } from "@/lib/actions/group-participation";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
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

    return NextResponse.json({
      status: "ok",
      authenticated: Boolean(userId),
      count: items.length,
      items,
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
    const joined = await joinActionParticipation(supabase, {
      actionId: parsed.data.actionId,
      userId,
    });

    await refreshProgressionProfile(supabase, userId).catch(() => null);

    return NextResponse.json({
      status: "ok",
      actionId: parsed.data.actionId,
      alreadyJoined: joined.alreadyJoined,
      joinedAt: joined.joinedAt,
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
