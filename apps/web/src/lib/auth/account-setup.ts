import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  ACCOUNT_SETUP_SCHEMA_VERSION,
  ACCOUNT_SETUP_WINDOW_MS,
} from "@/lib/auth/account-setup-config";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type AccountSetupRequirement = {
  requiresSetup: boolean;
  setupCompleted: boolean;
  createdAt: number | null;
  setupVersion: number | null;
  reason: "initial_setup" | "schema_update" | null;
};

function extractSetupCompletionFlag(metadata: ClerkMetadata): boolean {
  if (!metadata) {
    return false;
  }

  return metadata["profileSetupCompleted"] === true;
}

function extractSetupVersion(metadata: ClerkMetadata): number | null {
  if (!metadata) {
    return null;
  }

  const rawValue =
    metadata["profileSetupVersion"] ??
    metadata["profile_setup_version"] ??
    metadata["profileSetupSchemaVersion"];

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return Math.max(0, Math.trunc(rawValue));
  }

  if (typeof rawValue === "string" && rawValue.trim().length > 0) {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }

  return null;
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

export function shouldRequireAccountSetupRefresh(
  setupVersion: number | null | undefined,
  requiredVersion: number = ACCOUNT_SETUP_SCHEMA_VERSION,
): boolean {
  if (setupVersion == null) {
    return true;
  }

  return setupVersion < requiredVersion;
}

export async function getCurrentUserAccountSetupRequirement(): Promise<AccountSetupRequirement> {
  const { userId } = await auth();
  if (!userId) {
    return {
      requiresSetup: false,
      setupCompleted: true,
      createdAt: null,
      setupVersion: null,
      reason: null,
    };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const setupCompleted =
      extractSetupCompletionFlag(user.publicMetadata) ||
      extractSetupCompletionFlag(user.privateMetadata) ||
      extractSetupCompletionFlag(user.unsafeMetadata);
    const setupVersion =
      extractSetupVersion(user.publicMetadata) ??
      extractSetupVersion(user.privateMetadata) ??
      extractSetupVersion(user.unsafeMetadata);
    const needsInitialSetup = shouldRequireAccountSetup(user.createdAt, setupCompleted);
    const needsSchemaUpdate = shouldRequireAccountSetupRefresh(setupVersion);

    return {
      requiresSetup: needsInitialSetup || needsSchemaUpdate,
      setupCompleted,
      createdAt: toCreatedAtTimestamp(user.createdAt),
      setupVersion,
      reason: needsSchemaUpdate ? "schema_update" : needsInitialSetup ? "initial_setup" : null,
    };
  } catch (error) {
    console.error("Current user setup requirement resolution failed", error);
    return {
      requiresSetup: false,
      setupCompleted: true,
      createdAt: null,
      setupVersion: null,
      reason: null,
    };
  }
}
