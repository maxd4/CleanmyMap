import type { AppProfile } from "@/lib/profiles";

export type AccountSetupUserUpdate = {
  firstName?: string;
  lastName?: string;
};

export type AccountSetupPersistenceStep =
  | "identity"
  | "activeProfile"
  | "metadata"
  | "displayMode";

const ACCOUNT_SETUP_DEFERRED_METADATA_KEYS = [
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
  selectedProfile,
  updateUser,
  updateMetadata,
  updateActiveProfile,
  saveDisplayMode,
  completedSteps = new Set<AccountSetupPersistenceStep>(),
}: {
  firstName: string;
  lastName: string;
  metadata: Record<string, unknown>;
  selectedProfile: AppProfile;
  updateUser: (update: AccountSetupUserUpdate) => Promise<unknown>;
  updateMetadata: (metadataPatch: Record<string, unknown>) => Promise<unknown>;
  updateActiveProfile: (profile: AppProfile) => Promise<void>;
  saveDisplayMode: () => void | Promise<void>;
  /**
   * Progress owned by the caller and reused for a retry after a partial
   * success. Clerk, active-profile persistence, browser preferences and
   * completion metadata are separate external systems: there is no cross-system
   * transaction, so these writes intentionally remain sequential. The terminal
   * active-profile request is also the final Clerk-to-Supabase
   * projection boundary, including when the selected profile did not change.
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

  if (!completedSteps.has("displayMode")) {
    await saveDisplayMode();
    completedSteps.add("displayMode");
  }

  if (!completedSteps.has("metadata")) {
    if (Object.keys(metadata).length > 0) {
      await updateMetadata(metadata);
    }
    completedSteps.add("metadata");
  }

  if (!completedSteps.has("activeProfile")) {
    await updateActiveProfile(selectedProfile);
    completedSteps.add("activeProfile");
  }
}
