import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import {
  createLocationPreferencesMetadata,
  extractLocationPreferencesFromMetadata,
  type TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import type { ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import { buildClerkMetadataPatch } from "@/lib/auth/clerk-metadata-patch";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";

const selectionSchema = z.object({
  country: z.literal("France"),
  level: z.enum(["country", "region", "department", "commune", "arrondissement"]),
  label: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(160).nullable(),
  arrondissement: z.number().int().min(1).max(20).transform((value) => value as ParisArrondissement).nullable(),
  arrondissementCity: z.enum(["Paris", "Lyon", "Marseille"]).nullable(),
}).strict() satisfies z.ZodType<TerritoryLocationSelection>;

const locationsSchema = z.object({
  residence: selectionSchema.nullable().optional(),
  work: selectionSchema.nullable().optional(),
}).strict().refine(
  (value) => value.residence !== undefined || value.work !== undefined,
  "Une localisation doit être fournie.",
);

export async function PATCH(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 12, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = locationsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const client = await clerkClient();
    const currentUser = await client.users.getUser(access.userId);
    const currentUnsafeMetadata = (currentUser.unsafeMetadata ?? {}) as Record<string, unknown>;
    const currentLocations = extractLocationPreferencesFromMetadata(currentUnsafeMetadata);
    const nextLocations = {
      residence: parsed.data.residence === undefined ? currentLocations.residence : parsed.data.residence,
      work: parsed.data.work === undefined ? currentLocations.work : parsed.data.work,
    };
    const nextUnsafeMetadata = {
      ...currentUnsafeMetadata,
      ...createLocationPreferencesMetadata(nextLocations),
    };
    const metadataPatch = buildClerkMetadataPatch(currentUnsafeMetadata, nextUnsafeMetadata);
    const updatedUser = Object.keys(metadataPatch).length > 0
      ? await client.users.updateUserMetadata(access.userId, { unsafeMetadata: metadataPatch })
      : currentUser;

    let syncedProfile: Awaited<ReturnType<typeof syncClerkUserToSupabase>> = null;
    try {
      syncedProfile = await syncClerkUserToSupabase(updatedUser);
    } catch {
      syncedProfile = null;
    }
    if (!syncedProfile) {
      return NextResponse.json(
        {
          error: "La localisation Clerk est enregistrée, mais sa projection Supabase n’est pas confirmée.",
          status: "clerk_updated_supabase_sync_pending",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "updated",
      locationPreferences: nextLocations,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "PATCH /api/account/locations");
  }
}
