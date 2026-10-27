import type { User } from "@clerk/nextjs/server";
import {
  syncClerkUserToSupabase,
  type SyncClerkUserOptions,
} from "./sync-orchestration";

export async function trySyncClerkUserToSupabase(
  user: User | null,
  sync: typeof syncClerkUserToSupabase = syncClerkUserToSupabase,
  options: SyncClerkUserOptions = {},
) {
  try {
    return await sync(user, options);
  } catch {
    return null;
  }
}
