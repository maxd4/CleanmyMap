import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { isE2EClerkAccount, type E2EClerkAccountLike } from "./e2e-account";

export const MAX_CLERK_ACCOUNT_VERIFICATION_IDS = 100;

export type VerifiedNonE2EClerkUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  publicMetadata?: Record<string, unknown> | null;
  emailAddresses?: Array<{ emailAddress?: string | null }> | null;
};

/** Return only IDs verified as existing, non-E2E Clerk users. Missing users fail closed. */
export async function getVerifiedNonE2EClerkUsers(
  inputIds: readonly string[],
): Promise<Map<string, VerifiedNonE2EClerkUser>> {
  const ids = [...new Set(inputIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length > MAX_CLERK_ACCOUNT_VERIFICATION_IDS) {
    throw new Error("Clerk account verification batch exceeds the safe bound.");
  }
  if (ids.length === 0) return new Map();

  const client = await clerkClient();
  const result = await client.users.getUserList({ userId: ids, limit: ids.length });
  const requested = new Set(ids);
  const verified = new Map<string, VerifiedNonE2EClerkUser>();
  for (const user of result.data) {
    if (!requested.has(user.id) || isE2EClerkAccount(user as E2EClerkAccountLike)) continue;
    verified.set(user.id, user as VerifiedNonE2EClerkUser);
  }
  return verified;
}

export async function getVerifiedNonE2EClerkUserIds(
  inputIds: readonly string[],
): Promise<Set<string>> {
  return new Set((await getVerifiedNonE2EClerkUsers(inputIds)).keys());
}

export async function isVerifiedNonE2EClerkUserId(userId: string): Promise<boolean> {
  return (await getVerifiedNonE2EClerkUsers([userId])).has(userId.trim());
}
