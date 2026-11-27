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
  const [trackedUserId, setTrackedUserId] = useState<string | null>(resolvedUserId);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  if (trackedUserId !== resolvedUserId) {
    setTrackedUserId(resolvedUserId);
    setSessionEpoch((epoch) => epoch + 1);
    setIsUpdatingProfile(false);
    setProfileError(null);
  }
  const latestEpochRef = useRef(sessionEpoch);

  useEffect(() => {
    latestEpochRef.current = sessionEpoch;
  }, [sessionEpoch]);

  const handleActiveRoleMutation = async (targetRole: AppProfile | null) => {
    if (!targetRole || isUpdatingProfile) {
      return;
    }
    const requestUserId = resolvedUserId;
    const requestEpoch = sessionEpoch;
    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      const response = await fetch("/api/account/active-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeRole: targetRole }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ActiveRoleMutationResponse
        | null;

      if (latestEpochRef.current !== requestEpoch) {
        return;
      }

      if (!response.ok) {
        if (payload?.status === "clerk_updated_supabase_sync_pending") {
          // Clerk already persisted the selection; reload and re-read the server identity without claiming convergence.
          await user?.reload().catch(() => undefined);
          if (latestEpochRef.current === requestEpoch) {
            router.refresh();
          }
        }
        throw new Error(payload?.error ?? "Mutation de profil refusée.");
      }

      if (user) {
        await user.reload();
      }
      if (latestEpochRef.current !== requestEpoch) {
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

      if (latestEpochRef.current !== requestEpoch) {
        return;
      }

      const profilePath = payload?.profilePath ?? getProfileEntryPath(targetRole);
      const targetPath = getRoleSwitchTargetPath(pathname, profilePath);
      if (targetPath) {
        router.replace(targetPath);
      }
      router.refresh();
    } catch (error) {
      if (latestEpochRef.current === requestEpoch) {
        setProfileError(
          error instanceof Error ? error.message : "Mutation de rôle refusée.",
        );
      }
    } finally {
      if (latestEpochRef.current === requestEpoch) {
        setIsUpdatingProfile(false);
      }
    }
  };

  return { handleActiveRoleMutation, isUpdatingProfile, profileError };
}
