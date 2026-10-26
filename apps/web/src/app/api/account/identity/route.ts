import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccountPatchBody } from "@/lib/auth/account-request";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { syncClerkUserToSupabase, trySyncClerkUserToSupabase } from "@/lib/auth/sync";
import { handleApiError } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";

const identitySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
}).strict();

export async function PATCH(request: Request) {
  const access = await requireAccountPatchBody(
    request,
    identitySchema,
    (guardRequest) => requireActionRequestAccess(guardRequest),
    (rateLimitRequest, userId, options) => enforceServerRateLimitForAuthenticatedUser(rateLimitRequest, userId, options),
  );
  if (access instanceof Response) return access;

  try {
    const client = await clerkClient();
    const updatedUser = await client.users.updateUser(access.userId, {
      firstName: access.data.firstName,
      lastName: access.data.lastName,
    });

    const syncedProfile = await trySyncClerkUserToSupabase(updatedUser, (user) => syncClerkUserToSupabase(user));
    if (!syncedProfile) {
      return NextResponse.json(
        {
          error: "L’identité Clerk est enregistrée, mais sa projection Supabase n’est pas confirmée.",
          status: "clerk_updated_supabase_sync_pending",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "updated",
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
    }, {
      // Données personnelles issues de Clerk : ne pas les stocker dans un cache partagé ou réutilisable.
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/account/identity");
  }
}
