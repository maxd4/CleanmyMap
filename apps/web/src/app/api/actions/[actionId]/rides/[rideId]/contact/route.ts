import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveActionRideContact } from "@/lib/actions/action-rides-service";
import {
  PRIVATE_RIDE_HEADERS,
  resolveRideAuth,
  resolveRouteId,
  rideErrorResponse,
  type RideRouteContext,
} from "../../route.shared";

export const runtime = "nodejs";
// Justification Vercel: accepted ride contacts are private, actor-scoped and never cacheable across users.
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const ids = await context.params;
    const actionId = resolveRouteId(ids.actionId, "actionId");
    const rideId = resolveRouteId(ids.rideId, "rideId");
    if (actionId instanceof Response) return actionId;
    if (rideId instanceof Response) return rideId;
    const result = await resolveActionRideContact(getSupabaseAdminClient(), {
      actionId,
      rideId,
      userId: auth.userId,
      requestId: new URL(request.url).searchParams.get("requestId") ?? undefined,
    });
    return NextResponse.json(result, { headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "GET /api/actions/[actionId]/rides/[rideId]/contact");
  }
}
