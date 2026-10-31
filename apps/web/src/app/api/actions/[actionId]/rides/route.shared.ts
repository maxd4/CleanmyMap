import { NextResponse } from "next/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { ActionRideServiceError } from "@/lib/actions/action-rides-service";

export const PRIVATE_RIDE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export type RideRouteContext = {
  params: Promise<{ actionId: string; rideId?: string; requestId?: string }>;
};

export async function resolveRideAuth(request: Request) {
  const access = await requireActionRequestAccess(request);
  return access.ok ? access : { response: unauthorizedJsonResponse() } as const;
}

export function resolveRouteId(value: string | undefined, label: string): string | Response {
  const normalized = value?.trim() ?? "";
  return normalized || validationErrorResponse({ [label]: ["Identifiant requis."] });
}

export function rideErrorResponse(error: unknown, context: string): Response {
  if (error instanceof ActionRideServiceError) {
    return NextResponse.json(
      { error: error.message, status: "error" },
      { status: error.status, headers: PRIVATE_RIDE_HEADERS },
    );
  }
  return handleApiError(error, context);
}
