import { NextResponse } from "next/server";
import { getCurrentUserTerritoryLocationPreference } from "@/lib/auth/user-territory";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { resolveMapViewportFallback } from "@/lib/geo/map-viewport-fallback";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const MAP_VIEWPORT_FALLBACK_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const preference = await getCurrentUserTerritoryLocationPreference();
    const viewport = await resolveMapViewportFallback(preference);

    return NextResponse.json(
      {
        status: "ok",
        viewport,
      },
      {
        headers: MAP_VIEWPORT_FALLBACK_CACHE_HEADERS,
      },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/users/map-viewport-fallback");
  }
}
