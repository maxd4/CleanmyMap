import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserOptionalConsentEligibility,
} from "@/lib/minor-consent-server";
import { isOptionalConsentTreatmentAllowed } from "@/lib/minor-consent";

const updateSchema = z.object({
  leaderboardPublicOptIn: z.boolean(),
});

export const runtime = "nodejs";

export async function GET() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const userId = access.userId;
  const eligibility = await getUserOptionalConsentEligibility(userId);

  try {
    // Clerk authentication and the owner predicate authorize this private read.
    const supabase = getSupabaseServerClient(true);
    const result = await supabase
      .from("profiles")
      .select("leaderboard_public_opt_in")
      .eq("id", userId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);

    const storedOptIn = Boolean(
        (result.data as { leaderboard_public_opt_in?: boolean | null } | null)
          ?.leaderboard_public_opt_in,
      );
    return NextResponse.json({
      leaderboardPublicOptIn:
        storedOptIn && isOptionalConsentTreatmentAllowed(eligibility),
      ageBand: eligibility.ageBand,
      optionalTreatmentAllowed: isOptionalConsentTreatmentAllowed(eligibility),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/users/profile/leaderboard-opt-in");
  }
}

export async function PATCH(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const userId = access.userId;

  const payload = await request.json().catch(() => undefined);
  if (payload === undefined) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const eligibility = await getUserOptionalConsentEligibility(userId);
  if (
    parsed.data.leaderboardPublicOptIn &&
    !isOptionalConsentTreatmentAllowed(eligibility)
  ) {
    return NextResponse.json(
      {
        error:
          "Le classement public reste désactivé tant qu’une tranche d’âge autorisée n’est pas déclarée.",
        ageBand: eligibility.ageBand,
      },
      { status: 403 },
    );
  }

  try {
    // Clerk authentication and the owner predicate authorize this private write.
    const supabase = getSupabaseServerClient(true);
    const result = await supabase
      .from("profiles")
      .update({
        leaderboard_public_opt_in: parsed.data.leaderboardPublicOptIn,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("leaderboard_public_opt_in")
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      status: "updated",
      leaderboardPublicOptIn: Boolean(
        (result.data as { leaderboard_public_opt_in?: boolean | null })
          .leaderboard_public_opt_in,
      ),
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/leaderboard-opt-in");
  }
}
