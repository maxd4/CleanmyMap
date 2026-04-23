"use client";

import { useState } from "react";
import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { BadgePictogram, getAccountBadgeIconName } from "@/components/gamification/badge-icon";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { useRouter } from "next/navigation";
import { getProfileEntryPath } from "@/lib/profiles";
import { isSelfServiceProfile } from "@/lib/profiles";
import { cycleDisplayMode, cycleRoleForSelfService } from "./account-identity-chip.helpers";

const DISPLAY_MODE_BADGES = {
  exhaustif: { id: "mode_exhaustif", label: "Mode exhaustif", icon: "sparkles" },
  sobre: { id: "mode_sobre", label: "Mode sobre", icon: "leaf" },
  simplifie: { id: "mode_simplifie", label: "Mode simplifie", icon: "sliders-horizontal" },
} as const;

type AccountIdentityChipProps = {
  identity: UserIdentity;
};

export function AccountIdentityChip({ identity }: AccountIdentityChipProps) {
  const { displayMode, setDisplayMode } = useSitePreferences();
  const router = useRouter();
  const roleBadge = identity.badges.find((badge) =>
    badge.id.startsWith("role_"),
  );
  const modeBadge = DISPLAY_MODE_BADGES[displayMode];
  const nextDisplayMode = cycleDisplayMode(displayMode);
  const nextProfile = isSelfServiceProfile(identity.role)
    ? cycleRoleForSelfService(identity.role)
    : null;
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const gamificationBadges = identity.badges.filter(
    (badge) =>
      badge.id !== "admin" &&
      !badge.id.startsWith("role_") &&
      !badge.id.startsWith("profile_"),
  );

  const handleRoleMutation = async () => {
    if (!nextProfile || isUpdatingRole) {
      return;
    }

    setIsUpdatingRole(true);
    setRoleError(null);

    try {
      const response = await fetch("/api/account/profile-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: nextProfile }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { role?: string; profilePath?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Mutation de rôle refusée.");
      }

      const profilePath =
        payload?.profilePath ?? getProfileEntryPath(nextProfile);
      router.push(profilePath);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Mutation de rôle refusée.";
      setRoleError(message);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">
          {identity.displayName}
        </p>
        <p className="text-xs text-slate-500">
          @{identity.username} · Niveau {identity.currentLevel}
        </p>
      </div>

      {roleBadge ? (
        nextProfile ? (
          <button
            type="button"
            onClick={handleRoleMutation}
            disabled={isUpdatingRole}
            title={`Cliquer pour changer vers ${nextProfile}`}
            aria-label={`Changer le rôle vers ${nextProfile}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          >
            <IdentityBadge
              icon={roleBadge.icon}
              label={roleBadge.label}
              tone="role"
              className={`cursor-pointer ${isUpdatingRole ? "opacity-60" : ""}`}
            />
          </button>
        ) : (
          <IdentityBadge
            icon={roleBadge.icon}
            label={roleBadge.label}
            tone="role"
          />
        )
      ) : null}

      <button
        type="button"
        onClick={() => setDisplayMode(nextDisplayMode)}
        aria-label={`Changer le mode d'affichage vers ${nextDisplayMode}`}
        title={`Cliquer pour passer à ${nextDisplayMode}`}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <IdentityBadge
          icon={modeBadge.icon}
          label={modeBadge.label}
          tone="mode"
          className="cursor-pointer"
        />
      </button>

      {gamificationBadges.length > 0 ? (
        <details className="group relative">
          <summary className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 transition hover:bg-slate-100">
            <BadgePictogram name="award" size={14} className="text-slate-600" />
          </summary>
          <div className="absolute right-0 top-9 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Badges d&apos;engagement
              </p>
            <ul className="mt-2 space-y-1">
              {gamificationBadges.map((badge) => (
                <li
                  key={badge.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <BadgeSurface
                    icon={getAccountBadgeIconName(badge.icon)}
                    label={badge.label}
                    tone="gamification"
                    variant="orb"
                    className="h-7 w-7"
                  />
                  <span className="sr-only">{badge.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      {roleError ? (
        <span className="max-w-32 text-[11px] leading-tight text-rose-600" aria-live="polite">
          {roleError}
        </span>
      ) : null}
    </div>
  );
}
