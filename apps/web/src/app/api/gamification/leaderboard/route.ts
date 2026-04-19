import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getGamificationLeaderboard } from "@/lib/gamification/progression";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const scopeSchema = z.enum(["individual", "collective"]);

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const url = new URL(request.url);
  const parsed = scopeSchema.safeParse(url.searchParams.get("scope") ?? "individual");
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid scope. Use individual|collective." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const leaderboard = await getGamificationLeaderboard(supabase, parsed.data);
    return NextResponse.json({
      status: "ok",
      ...leaderboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
