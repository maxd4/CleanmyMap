import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { transitionActionRide, updateActionRide } from "@/lib/actions/action-rides-service";
import {
  PRIVATE_RIDE_HEADERS,
  resolveRideAuth,
  resolveRouteId,
  rideErrorResponse,
  type RideRouteContext,
} from "../route.shared";

export const runtime = "nodejs";
// Justification Vercel: ride mutations depend on current ownership, capacity and action phase.
export const dynamic = "force-dynamic";

async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400, headers: PRIVATE_RIDE_HEADERS });
  }
}

export async function PATCH(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const ids = await context.params;
    const actionId = resolveRouteId(ids.actionId, "actionId");
    const rideId = resolveRouteId(ids.rideId, "rideId");
    if (actionId instanceof Response) return actionId;
    if (rideId instanceof Response) return rideId;
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const service = getRideServiceClient();
    if (payload.status === "cancelled" || payload.status === "closed") {
      const result = await transitionActionRide(service, { actionId, rideId, userId: auth.userId, status: payload.status });
      return NextResponse.json({ status: "ok", ride: result }, { headers: PRIVATE_RIDE_HEADERS });
    }
    const result = await updateActionRide(service, { actionId, rideId, userId: auth.userId, input: payload });
    return NextResponse.json({ status: "ok", ride: result.ride }, { headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "PATCH /api/actions/[actionId]/rides/[rideId]");
  }
}

export async function DELETE(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const ids = await context.params;
    const actionId = resolveRouteId(ids.actionId, "actionId");
    const rideId = resolveRouteId(ids.rideId, "rideId");
    if (actionId instanceof Response) return actionId;
    if (rideId instanceof Response) return rideId;
    const result = await transitionActionRide(getRideServiceClient(), { actionId, rideId, userId: auth.userId, status: "cancelled" });
    return NextResponse.json({ status: "ok", ride: result }, { headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "DELETE /api/actions/[actionId]/rides/[rideId]");
  }
}

function getRideServiceClient() {
  return getSupabaseAdminClient();
}
