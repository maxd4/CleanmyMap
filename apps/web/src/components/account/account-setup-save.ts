import type { AppProfile, DisplayNameMode } from "@/lib/profiles";

export type AccountSetupUserUpdate = {
  username?: string;
  firstName?: string;
  lastName?: string;
  unsafeMetadata?: Record<string, unknown>;
};

export function normalizeAccountSetupUsername(
  value: string | null | undefined,
): string {
  return value?.trim() ?? "";
}

export function hasAccountSetupUsernameChanged(
  currentUsername: string | null | undefined,
  nextUsername: string,
): boolean {
  return (
    normalizeAccountSetupUsername(nextUsername) !==
    normalizeAccountSetupUsername(currentUsername)
  );
}

export function buildAccountSetupIdentityUpdate({
  currentUsername,
  pseudo,
  firstName,
  lastName,
  displayNameMode,
}: {
  currentUsername: string | null | undefined;
  pseudo: string;
  firstName: string;
  lastName: string;
  displayNameMode: DisplayNameMode;
}): { update: AccountSetupUserUpdate; usernameChanged: boolean } {
  const normalizedPseudo = normalizeAccountSetupUsername(pseudo);
  const usernameChanged = hasAccountSetupUsernameChanged(
    currentUsername,
    normalizedPseudo,
  );
  const update: AccountSetupUserUpdate = {};

  if (usernameChanged) {
    update.username = normalizedPseudo;
  }

  if (displayNameMode === "full_name") {
    update.firstName = firstName.trim();
    update.lastName = lastName.trim();
  }

  return { update, usernameChanged };
}

export async function persistAccountSetupChanges({
  currentUsername,
  pseudo,
  firstName,
  lastName,
  displayNameMode,
  metadata,
  initialProfile,
  selectedProfile,
  updateUser,
  updateUserWithReverification,
  updateActiveProfile,
  saveDisplayMode,
}: {
  currentUsername: string | null | undefined;
  pseudo: string;
  firstName: string;
  lastName: string;
  displayNameMode: DisplayNameMode;
  metadata: Record<string, unknown>;
  initialProfile: AppProfile;
  selectedProfile: AppProfile;
  updateUser: (update: AccountSetupUserUpdate) => Promise<unknown>;
  updateUserWithReverification: (
    update: AccountSetupUserUpdate,
  ) => Promise<unknown>;
  updateActiveProfile: (profile: AppProfile) => Promise<void>;
  saveDisplayMode: () => void;
}): Promise<void> {
  const { update: identityUpdate, usernameChanged } =
    buildAccountSetupIdentityUpdate({
      currentUsername,
      pseudo,
      firstName,
      lastName,
      displayNameMode,
    });

  if (Object.keys(identityUpdate).length > 0) {
    if (usernameChanged) {
      await updateUserWithReverification(identityUpdate);
    } else {
      await updateUser(identityUpdate);
    }
  }

  if (selectedProfile !== initialProfile) {
    await updateActiveProfile(selectedProfile);
  }

  await updateUser({ unsafeMetadata: metadata });
  saveDisplayMode();
}
