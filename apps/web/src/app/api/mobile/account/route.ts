import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  extractLocationPreferencesFromMetadata,
  type TerritoryLocationSelection,
} from "@/lib/user-location-preference";
import { getSwitchableProfiles } from "@/lib/profiles";
import { loadUserParticipationHistory } from "@/lib/actions/participation/group-participation";
import { getActionTitle } from "@/lib/actions/participation/group-participation.helpers";
import { loadUserProgressionStats } from "@/lib/gamification/progression-user-stats";
import { ACCOUNT_SETUP_SCHEMA_VERSION } from "@/lib/auth/account-setup-config";
import { loadNotificationPreferences } from "@/lib/notifications/notification-preferences-server";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { buildClerkMetadataPatch } from "@/lib/auth/clerk-metadata-patch";

export const runtime = "nodejs";
// Justification Vercel: the authenticated mobile account projection is private,
// mutable and must always reflect the current Clerk/Supabase state.
export const dynamic = "force-dynamic";

const accountPatchSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  residenceLabel: z.string().trim().max(160).nullable().optional(),
  workLabel: z.string().trim().max(160).nullable().optional(),
  completeOnboarding: z.boolean().optional(),
}).strict();

type LocationPayload = {
  residence: TerritoryLocationSelection | null;
  work: TerritoryLocationSelection | null;
};

type MissionRow = {
  id: string;
  label: string;
  status: string;
  action_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  distance_m: number | null;
  duration_s: number | null;
};

function selectionFromLabel(label: string | null): TerritoryLocationSelection | null {
  const normalized = label?.trim() ?? "";
  if (!normalized) return null;
  return {
    country: "France",
    level: "commune",
    label: normalized,
    subtitle: null,
    arrondissement: null,
    arrondissementCity: null,
  };
}

function locationPayloadFromMetadata(metadata: Record<string, unknown> | null | undefined): LocationPayload {
  const preferences = extractLocationPreferencesFromMetadata(metadata);
  return { residence: preferences.residence, work: preferences.work };
}

async function loadAccountMissions(userId: string): Promise<MissionRow[]> {
  const result = await getSupabaseServerClient(true)
    .from("missions")
    .select("id, label, status, action_id, created_at, started_at, ended_at, distance_m, duration_s")
    .eq("volunteer_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (result.error) throw result.error;
  return (result.data ?? []) as MissionRow[];
}

async function loadCreatedActions(userId: string) {
  const result = await getSupabaseServerClient(true)
    .from("actions")
    .select("id, action_date, location_label, status, action_phase, published_at, created_at, preparation_data")
    .eq("created_by_clerk_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    id: row.id,
    title: getActionTitle({ preparation_data: row.preparation_data }),
    actionDate: row.action_date,
    locationLabel: row.location_label,
    status: row.status,
    actionPhase: row.action_phase,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  }));
}

async function loadAccountProjection(userId: string) {
  const supabase = getSupabaseServerClient(true);
  const identity = await getCurrentUserIdentity({ userId });
  if (!identity) return null;
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const unsafeMetadata = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

  const [history, invitations, missions, createdActions, progression, notifications] = await Promise.all([
    loadUserParticipationHistory(supabase, { userId, limit: 100 }),
    supabase.rpc("list_pending_action_invitations_for_recipient", { p_recipient_id: userId })
      .then((result) => {
        if (result.error) throw result.error;
        return result.data ?? [];
      }),
    loadAccountMissions(userId),
    loadCreatedActions(userId),
    loadUserProgressionStats(supabase, userId),
    loadNotificationPreferences(userId),
  ]);

  return {
    identity: {
      userId: identity.userId,
      displayName: identity.displayName,
      displayNameMode: identity.displayNameMode ?? "full_name",
      handle: identity.handle,
      firstName: identity.firstName,
      lastName: user.lastName ?? null,
      username: identity.username,
      email: identity.email,
      grantedRole: identity.role,
      activeRole: identity.activeRole,
      availableActiveRoles: getSwitchableProfiles(identity.role),
      currentLevel: identity.currentLevel,
    },
    onboarding: {
      completed: unsafeMetadata.profileSetupCompleted === true,
      version: typeof unsafeMetadata.profileSetupVersion === "number"
        ? unsafeMetadata.profileSetupVersion
        : null,
      currentVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
    },
    locationPreferences: locationPayloadFromMetadata(unsafeMetadata),
    activityStatus: unsafeMetadata.activity_status === "inactive" ? "inactive" : "active",
    notifications,
    history,
    invitations,
    missions,
    createdActions,
    progression,
    counts: {
      registrations: history.length,
      confirmedParticipations: history.filter((item) => item.participationStatus === "confirmed").length,
      missions: missions.length,
      createdActions: createdActions.length,
    },
  };
}

export async function GET(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 30, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const projection = await loadAccountProjection(access.userId);
    if (!projection) return unauthorizedJsonResponse();
    // Justification Vercel: private account data must never be served from a shared cache.
    return NextResponse.json({ status: "ok", ...projection }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/mobile/account");
  }
}

export async function PATCH(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 12, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;
  const parsed = accountPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Aucune modification demandée." }, { status: 400 });
  }

  try {
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(access.userId);
    const currentUnsafeMetadata = (currentUser.unsafeMetadata ?? {}) as Record<string, unknown>;
    let updatedUser = currentUser;
    const identityUpdate: {
      firstName?: string;
      lastName?: string;
    } = {};
    if (parsed.data.firstName !== undefined) identityUpdate.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) identityUpdate.lastName = parsed.data.lastName;
    if (Object.keys(identityUpdate).length > 0) {
      updatedUser = await clerk.users.updateUser(access.userId, identityUpdate);
    }

    if (parsed.data.residenceLabel !== undefined || parsed.data.workLabel !== undefined || parsed.data.completeOnboarding) {
      const currentLocations = locationPayloadFromMetadata(currentUnsafeMetadata);
      const locations = {
        residence: parsed.data.residenceLabel === undefined
          ? currentLocations.residence
          : selectionFromLabel(parsed.data.residenceLabel),
        work: parsed.data.workLabel === undefined
          ? currentLocations.work
          : selectionFromLabel(parsed.data.workLabel),
      } satisfies LocationPayload;
      const nextMetadata = { ...currentUnsafeMetadata };
      delete nextMetadata.profileSetupDeferred;
      delete nextMetadata.profileSetupDeferredVersion;
      delete nextMetadata.profileSetupDeferredAt;
      nextMetadata.territoryPreferences = locations;
      if (parsed.data.completeOnboarding) {
        nextMetadata.profileSetupCompleted = true;
        nextMetadata.profileSetupVersion = ACCOUNT_SETUP_SCHEMA_VERSION;
        nextMetadata.profileSetupSchemaVersion = ACCOUNT_SETUP_SCHEMA_VERSION;
      }
      const metadataPatch = buildClerkMetadataPatch(currentUnsafeMetadata, nextMetadata);
      if (Object.keys(metadataPatch).length > 0) {
        updatedUser = await clerk.users.updateUserMetadata(access.userId, {
          unsafeMetadata: metadataPatch,
        });
      }
    }

    const { syncClerkUserToSupabase } = await import("@/lib/auth/sync");
    let syncedProfile: Awaited<ReturnType<typeof syncClerkUserToSupabase>> = null;
    try {
      syncedProfile = await syncClerkUserToSupabase(updatedUser);
    } catch {
      syncedProfile = null;
    }
    if (!syncedProfile) {
      return NextResponse.json(
        {
          error: "Le compte Clerk a été mis à jour, mais sa projection Supabase n'est pas confirmée.",
          status: "clerk_updated_supabase_sync_pending",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: "updated", account: await loadAccountProjection(access.userId) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/mobile/account");
  }
}
