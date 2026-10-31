import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  createActionRide,
  listActionRides,
} from "@/lib/actions/action-rides-service";
import {
  PRIVATE_RIDE_HEADERS,
  resolveRideAuth,
  resolveRouteId,
  rideErrorResponse,
  type RideRouteContext,
} from "./route.shared";

export const runtime = "nodejs";
// Justification Vercel: ride availability and private requests vary by authenticated action member.
export const dynamic = "force-dynamic";

async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400, headers: PRIVATE_RIDE_HEADERS });
  }
}

export async function GET(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const actionId = resolveRouteId((await context.params).actionId, "actionId");
    if (actionId instanceof Response) return actionId;
    const result = await listActionRides(getRideServiceClient(), { actionId, userId: auth.userId });
    return NextResponse.json(result, { headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "GET /api/actions/[actionId]/rides");
  }
}

export async function POST(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const actionId = resolveRouteId((await context.params).actionId, "actionId");
    if (actionId instanceof Response) return actionId;
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const result = await createActionRide(getRideServiceClient(), { actionId, userId: auth.userId, input: body });
    return NextResponse.json({ status: "ok", rideId: result.ride.id }, { status: 201, headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "POST /api/actions/[actionId]/rides");
  }
}

function getRideServiceClient() {
  return getSupabaseAdminClient();
}
