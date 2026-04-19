import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  extractUserLocationPreferenceFromMetadata,
  type UserLocationPreference,
} from "@/lib/user-location-preference";

export async function getCurrentUserLocationPreference(): Promise<UserLocationPreference | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (
      extractUserLocationPreferenceFromMetadata(user.unsafeMetadata) ??
      extractUserLocationPreferenceFromMetadata(user.publicMetadata) ??
      extractUserLocationPreferenceFromMetadata(user.privateMetadata)
    );
  } catch (error) {
    console.error("Current user location preference resolution failed", error);
    return null;
  }
}
