import { clerkClient } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { getRoleBadge, getProfileBadge } from "@/lib/authz";
import { resolveClerkRole } from "@/lib/auth/role-resolution";
import type { AppProfile } from "@/lib/profiles";

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

type ClerkMetadata = Record<string, unknown> | null | undefined;

function resolveClerkServiceRole(params: {
  id: string;
  user: {
    publicMetadata: ClerkMetadata;
    privateMetadata: ClerkMetadata;
    primaryEmailAddress?: { emailAddress?: string | null } | null;
  };
}): AppProfile {
  return resolveClerkRole({
    user: { ...params.user, id: params.id },
    ownerUserId: env.CLERK_IMU_OWNER_USER_ID,
    ownerEmail: env.CLERK_IMU_OWNER_EMAIL,
  });
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
            const profile = resolveClerkServiceRole({
              id,
              user,
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
    },
    async resolveEmail(userId: string | null): Promise<string | null> {
      if (!userId?.trim()) return null;
      try {
        const user = await client.users.getUser(userId);
        return user.primaryEmailAddress?.emailAddress?.trim() || null;
      } catch {
        return null;
      }
    },
  };
}
