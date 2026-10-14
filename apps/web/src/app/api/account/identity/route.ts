import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";

const identitySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
}).strict();

export async function PATCH(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 12, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = identitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const client = await clerkClient();
    const updatedUser = await client.users.updateUser(access.userId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });

    let syncedProfile: Awaited<ReturnType<typeof syncClerkUserToSupabase>> = null;
    try {
      syncedProfile = await syncClerkUserToSupabase(updatedUser);
    } catch {
      syncedProfile = null;
    }
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
