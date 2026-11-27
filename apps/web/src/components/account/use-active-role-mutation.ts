"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { getRoleSwitchTargetPath } from "@/lib/account/role-switch-navigation";
import { getProfileEntryPath, type AppProfile } from "@/lib/profiles";

type ActiveRoleMutationResponse = {
  profilePath?: string;
  status?: string;
  error?: string;
};

/** Shared by the header and page-level role selectors. */
export function useActiveRoleMutation(identityUserId?: string | null) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const resolvedUserId = user?.id ?? identityUserId ?? null;
  const latestUserIdRef = useRef<string | null>(resolvedUserId);
  const [updatingState, setUpdatingState] = useState<{
    userId: string | null;
    busy: boolean;
  }>({ userId: resolvedUserId, busy: false });
  const [profileErrorState, setProfileErrorState] = useState<{
    userId: string | null;
    message: string | null;
  }>({ userId: resolvedUserId, message: null });

  const isUpdatingProfile =
    updatingState.userId === resolvedUserId ? updatingState.busy : false;
  const profileError =
    profileErrorState.userId === resolvedUserId ? profileErrorState.message : null;

  useEffect(() => {
    latestUserIdRef.current = resolvedUserId;
  }, [resolvedUserId]);

  const handleActiveRoleMutation = async (targetRole: AppProfile | null) => {
    if (!targetRole || isUpdatingProfile) {
      return;
    }
    const requestUserId = resolvedUserId;
    setUpdatingState({ userId: requestUserId, busy: true });
    setProfileErrorState({ userId: requestUserId, message: null });

    try {
      const response = await fetch("/api/account/active-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeRole: targetRole }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ActiveRoleMutationResponse
        | null;

      if (latestUserIdRef.current !== requestUserId) {
        return;
      }

      if (!response.ok) {
        if (payload?.status === "clerk_updated_supabase_sync_pending") {
          // Clerk already persisted the selection; reload and re-read the server identity without claiming convergence.
          await user?.reload().catch(() => undefined);
          if (latestUserIdRef.current === requestUserId) {
            router.refresh();
          }
        }
        throw new Error(payload?.error ?? "Mutation de profil refusée.");
      }

      if (user) {
        await user.reload();
      }
      if (latestUserIdRef.current !== requestUserId) {
        return;
      }

      if (requestUserId) {
        await mutate(
          (key) =>
            Array.isArray(key) &&
            key[0] === "current-account-identity" &&
            key[1] === requestUserId,
          (current: { activeRole?: AppProfile; activeProfile?: AppProfile } | null | undefined) =>
            current ? { ...current, activeRole: targetRole, activeProfile: targetRole } : current,
          { revalidate: true },
        );
      }

      if (latestUserIdRef.current !== requestUserId) {
        return;
      }

      const profilePath = payload?.profilePath ?? getProfileEntryPath(targetRole);
      const targetPath = getRoleSwitchTargetPath(pathname, profilePath);
      if (targetPath) {
        router.replace(targetPath);
      }
      router.refresh();
    } catch (error) {
      if (latestUserIdRef.current === requestUserId) {
        setProfileErrorState({
          userId: requestUserId,
          message:
            error instanceof Error ? error.message : "Mutation de rôle refusée.",
        });
      }
    } finally {
      if (latestUserIdRef.current === requestUserId) {
        setUpdatingState({ userId: requestUserId, busy: false });
      }
    }
  };

  return { handleActiveRoleMutation, isUpdatingProfile, profileError };
}
