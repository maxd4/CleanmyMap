import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  extractResidenceLocationPreferenceFromMetadata,
  type TerritoryLocationPreference,
} from "@/lib/user-location-preference";

export async function getCurrentUserTerritoryLocationPreference(): Promise<TerritoryLocationPreference | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const preference =
      extractResidenceLocationPreferenceFromMetadata(user.unsafeMetadata) ??
      extractResidenceLocationPreferenceFromMetadata(user.publicMetadata) ??
      extractResidenceLocationPreferenceFromMetadata(user.privateMetadata);

    return preference;
  } catch (error) {
    console.error("Current user territory preference resolution failed", error);
    return null;
  }
}
