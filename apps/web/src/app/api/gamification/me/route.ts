import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserProgression } from "@/lib/gamification/progression";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const supabase = getSupabaseServerClient();
    const progression = await getUserProgression(supabase, userId);
    return NextResponse.json({
      status: "ok",
      progression,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
