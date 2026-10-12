import { NextResponse } from "next/server";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { consumeSpogomiTeamAccessToken, SPOGOMI_TEAM_SESSION_COOKIE } from "@/lib/spogomi/team-access";

export const runtime = "nodejs";
// Justification Vercel: team access is a short-lived private session and must be evaluated dynamically.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 10, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const eventSlug = url.searchParams.get("eventSlug");
  if (!token || !eventSlug) return NextResponse.json({ error: "Lien d’équipe invalide." }, { status: 404 });
  try {
    const session = await consumeSpogomiTeamAccessToken({ supabase: getSupabaseServerClient(true), token, eventSlug });
    const redirectUrl = new URL(`/spogomi/${encodeURIComponent(session.eventSlug)}/equipe`, request.url);
    const response = NextResponse.redirect(redirectUrl, 303);
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(SPOGOMI_TEAM_SESSION_COOKIE, session.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return response;
  } catch (error) {
    return handleApiError(error, "spogomi.team-access.consume");
  }
}
