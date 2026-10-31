import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { decideActionRideRequest } from "@/lib/actions/action-rides-service";
import {
  PRIVATE_RIDE_HEADERS,
  resolveRideAuth,
  resolveRouteId,
  rideErrorResponse,
  type RideRouteContext,
} from "../../../route.shared";

export const runtime = "nodejs";
// Justification Vercel: request decisions recheck current ownership and capacity on every mutation.
export const dynamic = "force-dynamic";

const DECISIONS = new Set(["accept", "decline", "withdraw"]);

export async function PATCH(request: Request, context: RideRouteContext) {
  const auth = await resolveRideAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const ids = await context.params;
    const actionId = resolveRouteId(ids.actionId, "actionId");
    const rideId = resolveRouteId(ids.rideId, "rideId");
    const requestId = resolveRouteId(ids.requestId, "requestId");
    if (actionId instanceof Response) return actionId;
    if (rideId instanceof Response) return rideId;
    if (requestId instanceof Response) return requestId;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400, headers: PRIVATE_RIDE_HEADERS });
    }
    const decision = body && typeof body === "object" ? (body as Record<string, unknown>).decision : null;
    if (typeof decision !== "string" || !DECISIONS.has(decision)) {
      return NextResponse.json({ error: "Décision invalide." }, { status: 422, headers: PRIVATE_RIDE_HEADERS });
    }
    const result = await decideActionRideRequest(getSupabaseAdminClient(), {
      actionId,
      rideId,
      requestId,
      userId: auth.userId,
      decision: decision as "accept" | "decline" | "withdraw",
    });
    return NextResponse.json({ status: "ok", request: result }, { headers: PRIVATE_RIDE_HEADERS });
  } catch (error) {
    return rideErrorResponse(error, "PATCH /api/actions/[actionId]/rides/[rideId]/requests/[requestId]");
  }
}
