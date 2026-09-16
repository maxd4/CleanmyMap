import type { AccountSetupRequirement } from "@/lib/auth/account-setup";
import { getCurrentUserAccountSetupRequirement } from "@/lib/auth/account-setup";
import { getCurrentUserLocationPreferences } from "@/lib/auth/user-location";
import type { UserLocationPreferences } from "@/lib/user-location-preference";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import type { AppProfile, AppRoleLabel, DisplayNameMode } from "@/lib/profiles";
import { toProfile } from "@/lib/profiles";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

export type AccountCompletionGateState = {
  requirement: AccountSetupRequirement;
  role: AppRoleLabel;
  currentProfile: AppProfile;
  clerkReachable: boolean;
  initialDisplayNameMode?: DisplayNameMode;
  initialArrondissement: number | null;
  initialLocationType: "residence" | "work" | null;
  initialResidence?: UserLocationPreferences["residence"];
  initialWork?: UserLocationPreferences["work"];
};

const NO_SETUP_REQUIRED: AccountSetupRequirement = {
  requiresSetup: false,
  setupCompleted: true,
  createdAt: null,
  setupVersion: null,
  reason: null,
};

export async function loadAccountCompletionGateState(
  session?: Pick<
    Awaited<ReturnType<typeof getSafeAuthSession>>,
    "userId" | "clerkReachable"
  >,
): Promise<AccountCompletionGateState | null> {
  const resolvedSession = session ?? (await getSafeAuthSession());
  if (!resolvedSession.userId) {
    return null;
  }

  const identity = resolvedSession.clerkReachable
    ? await getCurrentUserIdentity({ userId: resolvedSession.userId }).catch(() => null)
    : null;
  const role = identity?.role ?? (resolvedSession.clerkReachable
    ? await getCurrentUserRoleLabel().catch(() => ("anonymous" as const))
    : ("anonymous" as const));
  const currentProfile = identity?.activeRole ?? toProfile(role);

  if (!resolvedSession.clerkReachable) {
    return {
      requirement: NO_SETUP_REQUIRED,
      role,
       currentProfile,
      clerkReachable: resolvedSession.clerkReachable,
      initialDisplayNameMode: identity?.displayNameMode,
      initialArrondissement: null,
      initialLocationType: null,
      initialResidence: null,
      initialWork: null,
    };
  }

  const [requirement, locationPreferences] = await Promise.all([
    getCurrentUserAccountSetupRequirement().catch(() => NO_SETUP_REQUIRED),
    getCurrentUserLocationPreferences().catch(() => ({ residence: null, work: null })),
  ]);
  const existingPreference = locationPreferences.residence ?? locationPreferences.work;

  return {
    requirement,
    role,
    currentProfile,
    clerkReachable: resolvedSession.clerkReachable,
    initialDisplayNameMode: identity?.displayNameMode,
    initialArrondissement: existingPreference?.arrondissement ?? null,
    initialLocationType: locationPreferences.residence
      ? "residence"
      : locationPreferences.work
        ? "work"
        : null,
    initialResidence: locationPreferences.residence,
    initialWork: locationPreferences.work,
  };
}
