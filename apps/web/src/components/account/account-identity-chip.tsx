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
  PROFILE_ORDER,
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
    // Les administrateurs peuvent basculer vers n'importe quel rôle pour tester
    if (identity.role === "admin") {
      return [...PROFILE_ORDER];
    }
    // Les autres profils "self-service" peuvent basculer entre eux
    if (isSelfServiceProfile(identity.role)) {
      return [...SELF_SERVICE_PROFILE_ORDER];
    }
    return [] as AppProfile[];
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
      <div className="text-right hidden sm:block">
        <p className="cmm-text-small font-semibold cmm-text-primary">
          {identity.displayName}
        </p>
        <p className="cmm-text-caption cmm-text-muted">
          @{identity.username} · Niv. {identity.currentLevel}
        </p>
      </div>

      {roleBadge ? (
        roleOptions.length > 0 ? (
          <details
            className="relative"
            open={isRoleMenuOpen}
            onToggle={(event) => setIsRoleMenuOpen(event.currentTarget.open)}
          >
            <summary className="list-none rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-transform active:scale-95 [&::-webkit-details-marker]:hidden">
              <div className="group relative flex items-center gap-1">
                <IdentityBadge
                  icon={roleBadge.icon}
                  label={roleBadge.label}
                  tone="role"
                  className={`${isUpdatingRole ? "opacity-60" : ""}`}
                />
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-sm transition group-hover:bg-emerald-100 group-hover:text-emerald-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${isRoleMenuOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </summary>
            <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
              <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                <p className="cmm-text-caption font-bold uppercase tracking-[0.14em] cmm-text-muted">
                  {locale === "fr" ? "Changer de rôle" : "Switch role"}
                </p>
              </div>
              <div className="space-y-1">
                {roleOptions.map((profile) => {
                  const isActive = profile === identity.role;
                  return (
                    <button
                      key={profile}
                      type="button"
                      disabled={isUpdatingRole}
                      onClick={() => {
                        if (isActive) {
                          setIsRoleMenuOpen(false);
                          return;
                        }
                        void handleRoleMutation(profile);
                      }}
                      className={[
                        "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                        isActive
                          ? "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-800"
                          : "hover:bg-slate-50 cmm-text-secondary hover:text-emerald-800 disabled:opacity-40 dark:hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate cmm-text-small font-bold">
                          {getProfileLabel(profile, locale)}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-[10px] uppercase tracking-wide opacity-60">
                          {getProfileSubtitle(profile, locale)}
                        </span>
                      </span>
                      {isActive ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
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
          <summary className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white cmm-text-caption font-bold cmm-text-secondary transition hover:bg-slate-100">
            <BadgePictogram name="award" size={14} className="cmm-text-secondary" />
          </summary>
          <div className="absolute right-0 top-9 z-40 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
              Badges d&apos;engagement
            </p>
            <ul className="mt-2 space-y-1">
              {gamificationBadges.map((badge) => (
                <li
                  key={badge.id}
                  className="flex items-center gap-2 cmm-text-small cmm-text-secondary"
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
        <span className="max-w-32 cmm-text-caption leading-tight text-rose-600" aria-live="polite">
          {roleError}
        </span>
      ) : null}
    </div>
  );
}
