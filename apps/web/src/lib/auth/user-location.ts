import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  extractLocationPreferencesFromMetadata,
  TERRITORY_PREFERENCES_METADATA_KEY,
  type UserLocationPreferences,
  type UserLocationPreference,
} from "@/lib/user-location-preference";

export async function getCurrentUserLocationPreferences(): Promise<UserLocationPreferences> {
  const { userId } = await auth();
  if (!userId) {
    return { residence: null, work: null };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    for (const metadata of [
      user.unsafeMetadata,
      user.publicMetadata,
      user.privateMetadata,
    ]) {
      const preferences = extractLocationPreferencesFromMetadata(metadata);
      if (
        preferences.residence ||
        preferences.work ||
        Object.prototype.hasOwnProperty.call(metadata ?? {}, TERRITORY_PREFERENCES_METADATA_KEY)
      ) {
        return preferences;
      }
    }
    return { residence: null, work: null };
  } catch (error) {
    console.error("Current user location preference resolution failed", error);
    return { residence: null, work: null };
  }
}

export async function getCurrentUserLocationPreference(): Promise<UserLocationPreference | null> {
  const preferences = await getCurrentUserLocationPreferences();
  return (
    (preferences.residence?.arrondissement
      ? {
          arrondissement: preferences.residence.arrondissement,
          locationType: "residence" as const,
        }
      : null) ??
    (preferences.work?.arrondissement
      ? {
          arrondissement: preferences.work.arrondissement,
          locationType: "work" as const,
        }
      : null)
  );
}
