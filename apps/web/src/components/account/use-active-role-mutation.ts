"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getRoleSwitchTargetPath } from "@/lib/account/role-switch-navigation";
import { getProfileEntryPath, type AppProfile } from "@/lib/profiles";

type ActiveRoleMutationResponse = {
  profilePath?: string;
  error?: string;
};

/** Shared by the header and page-level role selectors. */
export function useActiveRoleMutation() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleActiveRoleMutation = async (targetRole: AppProfile | null) => {
    if (!targetRole || isUpdatingProfile) {
      return;
    }
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

      if (!response.ok) {
        throw new Error(payload?.error ?? "Mutation de profil refusée.");
      }

      if (user) {
        await user.reload();
      }

      const profilePath = payload?.profilePath ?? getProfileEntryPath(targetRole);
      const targetPath = getRoleSwitchTargetPath(pathname, profilePath);
      if (targetPath) {
        router.replace(targetPath);
      }
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Mutation de rôle refusée.",
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return { handleActiveRoleMutation, isUpdatingProfile, profileError };
}
