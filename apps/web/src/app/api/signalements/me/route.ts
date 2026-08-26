import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { listMyObservations, clampMyObservationsLimit } from "@/lib/actions/my-observations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(request: Request): number {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw || raw.trim() === "") return clampMyObservationsLimit(undefined);
  const parsed = Number(raw);
  return clampMyObservationsLimit(Number.isFinite(parsed) ? parsed : undefined);
}

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  try {
    const items = await listMyObservations(getSupabaseServerClient(), {
      userId: access.userId,
      limit: parseLimit(request),
    });

    return NextResponse.json(
      { status: "ok", items },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/signalements/me");
  }
}
