"use client";

import { useMemo, useState } from "react";
import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { BadgePictogram, getAccountBadgeIconName } from "@/components/gamification/badge-icon";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { useRouter } from "next/navigation";
import {
  getProfileEntryPath,
  getProfileLabel,
  getProfileSubtitle,
  isSelfServiceProfile,
  SELF_SERVICE_PROFILE_ORDER,
  type AppProfile,
} from "@/lib/profiles";

type AccountIdentityChipProps = {
  identity: UserIdentity;
};

export function AccountIdentityChip({ identity }: AccountIdentityChipProps) {
  const { locale } = useSitePreferences();
  const router = useRouter();
  const roleBadge = identity.badges.find((badge) =>
    badge.id.startsWith("role_"),
  );
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const gamificationBadges = identity.badges.filter(
    (badge) =>
      badge.id !== "admin" &&
      !badge.id.startsWith("role_") &&
      !badge.id.startsWith("profile_"),
  );
  const roleOptions = useMemo(() => {
    if (!isSelfServiceProfile(identity.role)) {
      return [] as AppProfile[];
    }
    return [...SELF_SERVICE_PROFILE_ORDER];
  }, [identity.role]);

  const handleRoleMutation = async (targetProfile: AppProfile | null) => {
    if (!targetProfile || isUpdatingRole) {
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
        body: JSON.stringify({ profile: targetProfile }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { role?: string; profilePath?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Mutation de rôle refusée.");
      }

      const profilePath =
        payload?.profilePath ?? getProfileEntryPath(targetProfile);
      setIsRoleMenuOpen(false);
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
        roleOptions.length > 0 ? (
          <details
            className="relative"
            open={isRoleMenuOpen}
            onToggle={(event) => setIsRoleMenuOpen(event.currentTarget.open)}
          >
            <summary className="list-none rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <IdentityBadge
                icon={roleBadge.icon}
                label={roleBadge.label}
                tone="role"
                className={`cursor-pointer ${isUpdatingRole ? "opacity-60" : ""}`}
              />
            </summary>
            <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-2 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800/95">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {locale === "fr" ? "Changer de rôle" : "Switch role"}
              </p>
              <div className="space-y-1">
                {roleOptions.map((profile) => {
                  const isActive = profile === identity.role;
                  return (
                    <button
                      key={profile}
                      type="button"
                      disabled={isUpdatingRole || isActive}
                      onClick={() => {
                        void handleRoleMutation(profile);
                      }}
                      className={[
                        "flex w-full items-start justify-between gap-3 rounded-xl border px-2.5 py-2 text-left transition",
                        isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">
                          {getProfileLabel(profile, locale)}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-[11px] text-slate-500 dark:text-slate-300">
                          {getProfileSubtitle(profile, locale)}
                        </span>
                      </span>
                      {isActive ? (
                        <span className="mt-0.5 text-xs font-black">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
        ) : (
          <IdentityBadge
            icon={roleBadge.icon}
            label={roleBadge.label}
            tone="role"
          />
        )
      ) : null}

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
