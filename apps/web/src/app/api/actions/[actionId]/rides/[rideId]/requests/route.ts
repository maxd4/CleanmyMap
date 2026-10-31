import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createActionRideRequest } from "@/lib/actions/action-rides-service";
import {
  PRIVATE_RIDE_HEADERS,
  resolveRideAuth,
  resolveRouteId,
  rideErrorResponse,
  type RideRouteContext,
} from "../../route.shared";

export const runtime = "nodejs";
// Justification Vercel: private ride requests are actor-scoped and cannot be shared across sessions.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const ids = await context.params;
    const actionId = resolveRouteId(ids.actionId, "actionId");
    const rideId = resolveRouteId(ids.rideId, "rideId");
    if (actionId instanceof Response) return actionId;
    if (rideId instanceof Response) return rideId;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400, headers: PRIVATE_RIDE_HEADERS });
    }
    const result = await createActionRideRequest(getSupabaseAdminClient(), {
      actionId,
      rideId,
      userId: auth.userId,
      input: body,
    });
    return NextResponse.json({ status: "ok", requestId: result.request.id }, { status: 201, headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "POST /api/actions/[actionId]/rides/[rideId]/requests");
  }
}
