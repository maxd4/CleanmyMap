import { NextResponse } from "next/server";
import {
  formatLandingOverviewErrorMessage,
  loadRecentCommunityActivity,
  type HomeCommunityActivityResponse,
} from "@/lib/accueil/data";

export const runtime = "nodejs";
export const revalidate = 600;

const HOMEPAGE_ACTIVITY_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=60",
};

export async function GET() {
  try {
    const payload = await loadRecentCommunityActivity();
    return NextResponse.json(payload, {
      headers: HOMEPAGE_ACTIVITY_CACHE_HEADERS,
    });
  } catch (error) {
    const payload: HomeCommunityActivityResponse = {
      activity: {
        visibleActions: 0,
        distinctLocations: 0,
        items: [],
      },
      errorMessage: formatLandingOverviewErrorMessage(error),
    };

    return NextResponse.json(payload, {
      status: 503,
      headers: HOMEPAGE_ACTIVITY_CACHE_HEADERS,
    });
  }
}
