import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { getUserOptionalConsentEligibility } from "@/lib/minor-consent-server";
import {
  AGE_BAND_COOKIE_NAME,
  CLERK_AGE_BAND_METADATA_KEY,
  CLERK_PARENTAL_CONSENT_METADATA_KEY,
  parseAgeBand,
} from "@/lib/minor-consent";
import { isOptionalConsentTreatmentAllowed } from "@/lib/minor-consent";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

const ageBandSchema = z.object({
  ageBand: z.enum(["under_15", "15_or_over", "unknown"]),
}).strict();

export const runtime = "nodejs";

function responseWithAgeBand(
  ageBand: ReturnType<typeof parseAgeBand>,
  parentalConsentVerified: boolean,
) {
  // Cache/no-store justification: age-band and parental-consent state is private,
  // user-specific metadata; no-store prevents shared-cache disclosure.
  const response = NextResponse.json({
    ageBand,
    parentalConsentVerified,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
  response.cookies.set(AGE_BAND_COOKIE_NAME, ageBand, {
    path: "/",
    sameSite: "lax",
    maxAge: 6 * 30 * 24 * 60 * 60,
  });
  return response;
}

export async function GET(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const client = await clerkClient();
    const currentUser = await client.users.getUser(access.userId);
    const privateMetadata = (currentUser.privateMetadata ?? {}) as Record<string, unknown>;
    return responseWithAgeBand(
      parseAgeBand(privateMetadata[CLERK_AGE_BAND_METADATA_KEY]),
      privateMetadata[CLERK_PARENTAL_CONSENT_METADATA_KEY] === true,
    );
  } catch {
    return responseWithAgeBand("unknown", false);
  }
}

export async function PATCH(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const parsed = ageBandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const client = await clerkClient();
    const currentUser = await client.users.getUser(access.userId);
    const currentPrivateMetadata = (currentUser.privateMetadata ?? {}) as Record<string, unknown>;
    const nextAgeBand = parseAgeBand(parsed.data.ageBand);
    const currentEligibility = await getUserOptionalConsentEligibility(access.userId);
    if (
      !isOptionalConsentTreatmentAllowed({
        ageBand: nextAgeBand,
        parentalConsentVerified: currentEligibility.parentalConsentVerified,
      })
    ) {
      const supabase = getSupabaseServerClient(true);
      const revocation = await supabase
        .from("profiles")
        .update({
          leaderboard_public_opt_in: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", access.userId);
      if (revocation.error) throw revocation.error;
    }
    const updatedUser = await client.users.updateUserMetadata(access.userId, {
      privateMetadata: {
        ...currentPrivateMetadata,
        [CLERK_AGE_BAND_METADATA_KEY]: nextAgeBand,
      },
    });
    const eligibility = await getUserOptionalConsentEligibility(access.userId);
    return responseWithAgeBand(
      parseAgeBand(
        (updatedUser.privateMetadata as Record<string, unknown> | null | undefined)?.[
          CLERK_AGE_BAND_METADATA_KEY
        ] ?? eligibility.ageBand,
      ),
      eligibility.parentalConsentVerified,
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/account/age-band");
  }
}
