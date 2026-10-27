import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccountPatchBody } from "@/lib/auth/account-request";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import {
  createLocationPreferencesMetadata,
  extractLocationPreferencesFromMetadata,
  type TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import type { ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import {
  ACCOUNT_PRIVATE_RESPONSE_HEADERS,
  buildClerkSyncPendingPayload,
} from "@/lib/auth/account-mutation";
import { buildClerkMetadataPatch } from "@/lib/auth/clerk-metadata-patch";
import { syncClerkUserToSupabase, trySyncClerkUserToSupabase } from "@/lib/auth/sync";
import { handleApiError } from "@/lib/http/api-errors";
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
  const access = await requireAccountPatchBody(
    request,
    locationsSchema,
    (guardRequest) => requireActionRequestAccess(guardRequest),
    (rateLimitRequest, userId, options) => enforceServerRateLimitForAuthenticatedUser(rateLimitRequest, userId, options),
  );
  if (access instanceof Response) return access;

  try {
    const client = await clerkClient();
    const currentUser = await client.users.getUser(access.userId);
    const currentUnsafeMetadata = (currentUser.unsafeMetadata ?? {}) as Record<string, unknown>;
    const currentLocations = extractLocationPreferencesFromMetadata(currentUnsafeMetadata);
    const nextLocations = {
      residence: access.data.residence === undefined ? currentLocations.residence : access.data.residence,
      work: access.data.work === undefined ? currentLocations.work : access.data.work,
    };
    const nextUnsafeMetadata = {
      ...currentUnsafeMetadata,
      ...createLocationPreferencesMetadata(nextLocations),
    };
    const metadataPatch = buildClerkMetadataPatch(currentUnsafeMetadata, nextUnsafeMetadata);
    const updatedUser = Object.keys(metadataPatch).length > 0
      ? await client.users.updateUserMetadata(access.userId, { unsafeMetadata: metadataPatch })
      : currentUser;

    const syncedProfile = await trySyncClerkUserToSupabase(updatedUser, (user) => syncClerkUserToSupabase(user));
    if (!syncedProfile) {
      return NextResponse.json(
        buildClerkSyncPendingPayload(
          "La localisation Clerk est enregistrée, mais sa projection Supabase n’est pas confirmée.",
        ),
        { status: 503, headers: ACCOUNT_PRIVATE_RESPONSE_HEADERS },
      );
    }

    return NextResponse.json({
      status: "updated",
      locationPreferences: nextLocations,
    }, {
      // Données personnelles de localisation issues de Clerk : ne pas les stocker dans un cache partagé ou réutilisable.
      headers: ACCOUNT_PRIVATE_RESPONSE_HEADERS,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/account/locations");
  }
}
