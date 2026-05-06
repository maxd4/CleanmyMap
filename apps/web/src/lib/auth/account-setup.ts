import { auth, clerkClient } from "@clerk/nextjs/server";

const ACCOUNT_SETUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type ClerkMetadata = Record<string, unknown> | null | undefined;

function extractSetupCompletionFlag(metadata: ClerkMetadata): boolean {
  if (!metadata) {
    return false;
  }

  return metadata["profileSetupCompleted"] === true;
}

function toCreatedAtTimestamp(createdAt: Date | string | number | null | undefined): number | null {
  if (!createdAt) {
    return null;
  }

  const date =
    createdAt instanceof Date ? createdAt : new Date(createdAt);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function shouldRequireAccountSetup(
  createdAt: Date | string | number | null | undefined,
  setupCompleted: boolean,
): boolean {
  if (setupCompleted) {
    return false;
  }

  const createdAtTimestamp = toCreatedAtTimestamp(createdAt);
  if (!createdAtTimestamp) {
    return false;
  }

  return Date.now() - createdAtTimestamp < ACCOUNT_SETUP_WINDOW_MS;
}

export async function getCurrentUserAccountSetupRequirement(): Promise<{
  requiresSetup: boolean;
  setupCompleted: boolean;
  createdAt: number | null;
}> {
  const { userId } = await auth();
  if (!userId) {
    return {
      requiresSetup: false,
      setupCompleted: true,
      createdAt: null,
    };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const setupCompleted =
      extractSetupCompletionFlag(user.publicMetadata) ||
      extractSetupCompletionFlag(user.privateMetadata) ||
      extractSetupCompletionFlag(user.unsafeMetadata);

    return {
      requiresSetup: shouldRequireAccountSetup(user.createdAt, setupCompleted),
      setupCompleted,
      createdAt: toCreatedAtTimestamp(user.createdAt),
    };
  } catch (error) {
    console.error("Current user setup requirement resolution failed", error);
    return {
      requiresSetup: false,
      setupCompleted: true,
      createdAt: null,
    };
  }
}
