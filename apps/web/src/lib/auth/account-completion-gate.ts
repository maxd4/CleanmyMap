import { headers } from "next/headers";
import type { AccountSetupRequirement } from "@/lib/auth/account-setup";
import { getCurrentUserAccountSetupRequirement } from "@/lib/auth/account-setup";
import { getCurrentUserLocationPreference } from "@/lib/auth/user-location";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { isLocalhostHost } from "@/lib/auth/dev-auth";
import type { AppProfile, AppRoleLabel } from "@/lib/profiles";
import { toProfile } from "@/lib/profiles";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

export type AccountCompletionGateState = {
  requirement: AccountSetupRequirement;
  role: AppRoleLabel;
  currentProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialArrondissement: number | null;
  initialLocationType: "residence" | "work" | null;
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

  const requestHeaders = await headers();
  const isLocalHost = isLocalhostHost(requestHeaders.get("host"));

  const role = resolvedSession.clerkReachable
    ? await getCurrentUserRoleLabel().catch(() => ("anonymous" as const))
    : ("anonymous" as const);

  if (!resolvedSession.clerkReachable) {
    return {
      requirement: NO_SETUP_REQUIRED,
      role,
      currentProfile: toProfile(role),
      clerkReachable: resolvedSession.clerkReachable,
      isLocalHost,
      initialArrondissement: null,
      initialLocationType: null,
    };
  }

  const [requirement, existingPreference] = await Promise.all([
    getCurrentUserAccountSetupRequirement().catch(() => NO_SETUP_REQUIRED),
    getCurrentUserLocationPreference().catch(() => null),
  ]);

  return {
    requirement,
    role,
    currentProfile: toProfile(role),
    clerkReachable: resolvedSession.clerkReachable,
    isLocalHost,
    initialArrondissement: existingPreference?.arrondissement ?? null,
    initialLocationType: existingPreference?.locationType ?? null,
  };
}
