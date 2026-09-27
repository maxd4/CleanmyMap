import type { User } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { AppProfile } from "@/lib/profiles";
import { resolveSyncRoleContext } from "./sync-role-context";

type ActiveRoleProjectionRow = {
  active_role_label: AppProfile | null;
};

function describeProjectionError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Projects Clerk ACTIVE_ROLE for RLS without making GRANTED_ROLE a fallback. */
export async function syncActiveRoleProjectionToSupabase(
  user: User | null,
): Promise<AppProfile | null> {
  if (!user) return null;

  try {
    const supabase = getSupabaseAdminClient();
    const { activeRole } = resolveSyncRoleContext(user);
    const { data, error } = await supabase
      .from("profiles")
      .select("active_role_label")
      .eq("id", user.id)
      .maybeSingle<ActiveRoleProjectionRow>();

    if (error) {
      console.warn(
        "[User Sync] ACTIVE_ROLE projection read skipped for " +
          user.id +
          ": " +
          describeProjectionError(error),
      );
      return null;
    }
    if (!data || data.active_role_label === activeRole) {
      return data ? activeRole : null;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ active_role_label: activeRole })
      .eq("id", user.id);

    if (updateError) {
      console.warn(
        "[User Sync] ACTIVE_ROLE projection skipped for " +
          user.id +
          ": " +
          describeProjectionError(updateError),
      );
      return null;
    }

    return activeRole;
  } catch (error) {
    console.warn(
      "[User Sync] ACTIVE_ROLE projection unavailable for " +
        user.id +
        ": " +
        describeProjectionError(error),
    );
    return null;
  }
}
