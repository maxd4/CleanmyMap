import { clerkClient } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { isAdminRole, getRoleBadge, getProfileBadge } from "@/lib/authz";
import { resolveProfile } from "@/lib/profiles";

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

function extractRole(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const role = metadata["role"];
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

/**
 * High-level Clerk Service to avoid SDK spread in API routes.
 */
export async function getClerkService() {
  const client = await clerkClient();
  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);

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
            const isAdmin = adminUserIds.has(id) || isAdminRole({
              publicMetadata: user.publicMetadata,
              privateMetadata: user.privateMetadata,
            });
            const metadataRole = 
              extractRole(user.publicMetadata as any) ?? 
              extractRole(user.privateMetadata as any);
            
            const profile = resolveProfile({ metadataRole, isAdmin });
            const firstName = user.firstName?.trim() ?? "";
            const lastName = user.lastName?.trim() ?? "";
            const displayName = `${firstName} ${lastName}`.trim() || user.username?.trim() || "Membre";

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
