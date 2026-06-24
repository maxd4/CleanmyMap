import { clerkClient } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { isAdminRole, isMaxRole, getRoleBadge, getProfileBadge } from "@/lib/authz";
import { resolveProfile, type AppProfile } from "@/lib/profiles";
import { isCreatorInboxEmail } from "@/lib/auth/privileged-identities";

export type ClerkUserIdentity = {
  userId: string | null;
  displayName: string;
  roleBadge: {
    id: string;
    label: string;
    icon: string;
  };
  profileBadge: {
    id: string;
    label: string;
    icon: string;
  };
};

function parseAdminUserIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw.split(",").map(id => id.trim()).filter(id => id.length > 0)
  );
}

function parseMaxUserIds(
  raw: string | undefined,
  fallbackRaw?: string | undefined,
): Set<string> {
  const parsed = parseAdminUserIds(raw);
  if (parsed.size > 0) {
    return parsed;
  }
  return parseAdminUserIds(fallbackRaw);
}

type ClerkMetadata = Record<string, unknown> | null | undefined;

function extractRole(metadata: ClerkMetadata): string | null {
  if (!metadata) return null;
  const role = metadata["role"];
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

function resolveClerkRole(params: {
  id: string;
  user: {
    publicMetadata: ClerkMetadata;
    privateMetadata: ClerkMetadata;
    primaryEmailAddress?: { emailAddress?: string | null } | null;
  };
  adminUserIds: Set<string>;
  maxUserIds: Set<string>;
}): AppProfile {
  const isAdmin =
    params.adminUserIds.has(params.id) ||
    isAdminRole({
      publicMetadata: params.user.publicMetadata,
      privateMetadata: params.user.privateMetadata,
    });
  const isMax =
    params.maxUserIds.has(params.id) ||
    isCreatorInboxEmail(params.user.primaryEmailAddress?.emailAddress) ||
    isMaxRole({
      publicMetadata: params.user.publicMetadata,
      privateMetadata: params.user.privateMetadata,
    });
  const metadataRole =
    extractRole(params.user.publicMetadata as ClerkMetadata) ??
    extractRole(params.user.privateMetadata as ClerkMetadata);

  return resolveProfile({ metadataRole, isAdmin, isMax });
}

function buildClerkDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string {
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  return `${firstName} ${lastName}`.trim() || user.username?.trim() || "Membre";
}

/**
 * High-level Clerk Service to avoid SDK spread in API routes.
 */
export async function getClerkService() {
  const client = await clerkClient();
  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);
  const maxUserIds = parseMaxUserIds(
    env.CLERK_MAX_USER_IDS,
    env.CLERK_ADMIN_USER_IDS,
  );

  return {
    /**
     * Resolve multiple user IDs into a Map of identities.
     */
    async resolveUsers(userIds: string[]): Promise<Map<string, ClerkUserIdentity>> {
      const output = new Map<string, ClerkUserIdentity>();
      if (userIds.length === 0) return output;

      await Promise.all(
        userIds.map(async (id) => {
          try {
            const user = await client.users.getUser(id);
            const profile = resolveClerkRole({
              id,
              user,
              adminUserIds,
              maxUserIds,
            });
            const displayName = buildClerkDisplayName(user);

            output.set(id, {
              userId: id,
              displayName,
              roleBadge: getRoleBadge(profile),
              profileBadge: getProfileBadge(profile),
            });
          } catch {
            // Fallback for deleted or invisible users
            output.set(id, {
              userId: id,
              displayName: "Membre",
              roleBadge: getRoleBadge("benevole"),
              profileBadge: getProfileBadge("benevole"),
            });
          }
        })
      );

      return output;
    }
  };
}
