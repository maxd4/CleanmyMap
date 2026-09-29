import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { requireSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";

const updateSchema = z.object({
  leaderboardPublicOptIn: z.boolean(),
});

export const runtime = "nodejs";

async function currentUserId(): Promise<string | null> {
  return (await auth()).userId;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const supabase = await requireSupabaseClerkRlsClient();
    const result = await supabase
      .from("profiles")
      .select("leaderboard_public_opt_in")
      .eq("id", userId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);

    return NextResponse.json({
      leaderboardPublicOptIn: Boolean(
        (result.data as { leaderboard_public_opt_in?: boolean | null } | null)
          ?.leaderboard_public_opt_in,
      ),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/users/profile/leaderboard-opt-in");
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return unauthorizedJsonResponse();

  const payload = await request.json().catch(() => undefined);
  if (payload === undefined) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const supabase = await requireSupabaseClerkRlsClient();
    const result = await supabase
      .from("profiles")
      .update({
        leaderboard_public_opt_in: parsed.data.leaderboardPublicOptIn,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("leaderboard_public_opt_in")
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      status: "updated",
      leaderboardPublicOptIn: Boolean(
        (result.data as { leaderboard_public_opt_in?: boolean | null })
          .leaderboard_public_opt_in,
      ),
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/leaderboard-opt-in");
  }
}
