import type { AppProfile } from "@/lib/profiles";

export type AccountSetupUserUpdate = {
  firstName?: string;
  lastName?: string;
  unsafeMetadata?: Record<string, unknown>;
};

export type AccountSetupPersistenceStep =
  | "identity"
  | "activeProfile"
  | "metadata"
  | "displayMode";

export const ACCOUNT_SETUP_DEFERRED_METADATA_KEYS = [
  "profileSetupDeferred",
  "profileSetupDeferredVersion",
  "profileSetupDeferredAt",
] as const;

export function clearAccountSetupDeferralMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned = { ...metadata };
  for (const key of ACCOUNT_SETUP_DEFERRED_METADATA_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}

export function createAccountSetupDeferralMetadata(
  metadata: Record<string, unknown>,
  version: number,
  deferredAt: string,
): Record<string, unknown> {
  return {
    ...metadata,
    profileSetupDeferred: true,
    profileSetupDeferredVersion: version,
    profileSetupDeferredAt: deferredAt,
  };
}

export function buildAccountSetupIdentityUpdate({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}): AccountSetupUserUpdate {
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  };
}

export async function persistAccountSetupChanges({
  firstName,
  lastName,
  metadata,
  initialProfile,
  selectedProfile,
  updateUser,
  updateActiveProfile,
  saveDisplayMode,
  completedSteps = new Set<AccountSetupPersistenceStep>(),
}: {
  firstName: string;
  lastName: string;
  metadata: Record<string, unknown>;
  initialProfile: AppProfile;
  selectedProfile: AppProfile;
  updateUser: (update: AccountSetupUserUpdate) => Promise<unknown>;
  updateActiveProfile: (profile: AppProfile) => Promise<void>;
  saveDisplayMode: () => void | Promise<void>;
  /**
   * Progress owned by the caller and reused for a retry after a partial
   * success. Clerk, active-profile persistence, browser preferences and
   * completion metadata are separate external systems: there is no cross-system
   * transaction, so these writes intentionally remain sequential. Completion
   * metadata is the final persistence boundary.
   */
  completedSteps?: Set<AccountSetupPersistenceStep>;
}): Promise<void> {
  const identityUpdate = buildAccountSetupIdentityUpdate({ firstName, lastName });

  if (!completedSteps.has("identity")) {
    if (Object.keys(identityUpdate).length > 0) {
      await updateUser(identityUpdate);
    }
    completedSteps.add("identity");
  }

  if (!completedSteps.has("activeProfile")) {
    if (selectedProfile !== initialProfile) {
      await updateActiveProfile(selectedProfile);
    }
    completedSteps.add("activeProfile");
  }

  if (!completedSteps.has("displayMode")) {
    await saveDisplayMode();
    completedSteps.add("displayMode");
  }

  if (!completedSteps.has("metadata")) {
    await updateUser({ unsafeMetadata: metadata });
    completedSteps.add("metadata");
  }
}
