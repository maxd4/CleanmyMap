import type { User } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import {
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
} from "@/lib/auth/role-resolution";
import { resolveActiveRole, type AppProfile } from "@/lib/profiles";

type MetadataSource = Record<string, unknown> | null | undefined;

export type SyncRoleContext = {
  role: ReturnType<typeof resolveClerkRole>;
  activeRole: AppProfile;
};

function readMetadataString(metadata: MetadataSource, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

export function resolveSyncRoleContext(user: User): SyncRoleContext {
  const role = resolveClerkRole({
    user,
    adminUserIds: parseAdminUserIds(env.CLERK_ADMIN_USER_IDS),
    maxUserIds: parseMaxUserIds(env.CLERK_MAX_USER_IDS),
  });
  const publicMetadata = user.publicMetadata as MetadataSource;
  const privateMetadata = user.privateMetadata as MetadataSource;
  const metadataActiveRole =
    readMetadataString(publicMetadata, "activeRole") ??
    readMetadataString(publicMetadata, "activeProfile") ??
    readMetadataString(privateMetadata, "activeRole") ??
    readMetadataString(privateMetadata, "activeProfile");

  return {
    role,
    activeRole: resolveActiveRole({ metadataActiveRole, grantedRole: role }),
  };
}
