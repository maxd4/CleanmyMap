import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  DISPLAY_MODES,
  type DisplayMode,
} from "@/lib/ui/preferences";

type ClerkMetadata = Record<string, unknown> | null | undefined;

function extractDisplayModePreferenceFromMetadata(
  metadata: ClerkMetadata,
): DisplayMode | null {
  if (!metadata) {
    return null;
  }

  const rawDisplayMode = metadata.displayMode;
  if (typeof rawDisplayMode !== "string") {
    return null;
  }

  return DISPLAY_MODES.includes(rawDisplayMode as DisplayMode)
    ? (rawDisplayMode as DisplayMode)
    : null;
}

export async function getCurrentUserDisplayModePreference(): Promise<DisplayMode | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (
      extractDisplayModePreferenceFromMetadata(user.unsafeMetadata) ??
      extractDisplayModePreferenceFromMetadata(user.publicMetadata) ??
      extractDisplayModePreferenceFromMetadata(user.privateMetadata)
    );
  } catch (error) {
    console.error("Current user display mode resolution failed", error);
    return null;
  }
}

