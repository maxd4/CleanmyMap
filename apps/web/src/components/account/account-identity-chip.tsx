"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { BadgePictogram, getAccountBadgeIconName } from "@/components/gamification/badge-icon";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import {
  getProfileEntryPath,
  getProfileLabel,
  getProfileSubtitle,
  getSwitchableProfiles,
  type AppProfile,
} from "@/lib/profiles";
import { getRoleSwitchTargetPath } from "@/lib/account/role-switch-navigation";
import { cn } from "@/lib/utils";

type AccountIdentityChipProps = {
  identity: UserIdentity;
};

export function AccountIdentityChip({ identity }: AccountIdentityChipProps) {
  const { locale } = useSitePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const roleBadge = identity.badges.find((badge) =>
    badge.id.startsWith("role_"),
  );
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isBadgeMenuOpen, setIsBadgeMenuOpen] = useState(false);
  const gamificationBadges = identity.badges.filter(
    (badge) =>
      badge.id !== "admin" &&
      !badge.id.startsWith("role_") &&
      !badge.id.startsWith("profile_"),
  );

  const roleOptions = useMemo(() => {
    return getSwitchableProfiles(identity.role);
  }, [identity.role]);
  const roleMenuRef = useRef<HTMLDetailsElement | null>(null);
  const roleCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleMenuPlacement = useDropdownPlacement({
    isOpen: isRoleMenuOpen,
    triggerRef: roleMenuRef,
    minPanelWidth: 288,
  });
  const badgeMenuRef = useRef<HTMLDetailsElement | null>(null);
  const badgeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeMenuPlacement = useDropdownPlacement({
    isOpen: isBadgeMenuOpen,
    triggerRef: badgeMenuRef,
    minPanelWidth: 272,
  });

  const openRoleMenu = () => {
    if (roleCloseTimerRef.current) {
      clearTimeout(roleCloseTimerRef.current);
      roleCloseTimerRef.current = null;
    }
    setIsRoleMenuOpen(true);
  };

  const closeRoleMenuAfterHover = () => {
    if (roleCloseTimerRef.current) {
      clearTimeout(roleCloseTimerRef.current);
    }
    roleCloseTimerRef.current = setTimeout(() => {
      setIsRoleMenuOpen(false);
      roleCloseTimerRef.current = null;
    }, 160);
  };

  const openBadgeMenu = () => {
    if (badgeCloseTimerRef.current) {
      clearTimeout(badgeCloseTimerRef.current);
      badgeCloseTimerRef.current = null;
    }
    setIsBadgeMenuOpen(true);
  };

  const closeBadgeMenuAfterHover = () => {
    if (badgeCloseTimerRef.current) {
      clearTimeout(badgeCloseTimerRef.current);
    }
    badgeCloseTimerRef.current = setTimeout(() => {
      setIsBadgeMenuOpen(false);
      badgeCloseTimerRef.current = null;
    }, 160);
  };

  useEffect(() => {
    return () => {
      if (roleCloseTimerRef.current) {
        clearTimeout(roleCloseTimerRef.current);
      }
      if (badgeCloseTimerRef.current) {
        clearTimeout(badgeCloseTimerRef.current);
      }
    };
  }, []);

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
      const targetPath = getRoleSwitchTargetPath(pathname, profilePath);
      if (targetPath) {
        router.replace(targetPath);
      }
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
            ref={roleMenuRef}
            open={isRoleMenuOpen}
            onToggle={(event) => setIsRoleMenuOpen(event.currentTarget.open)}
            onMouseEnter={openRoleMenu}
            onMouseLeave={closeRoleMenuAfterHover}
            className="relative"
          >
            <summary
              aria-haspopup="menu"
              aria-expanded={isRoleMenuOpen}
              aria-controls="account-role-menu-panel"
            className="cmm-dropdown-trigger flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-cyan-100/12 bg-white/8 px-3 cmm-text-caption font-bold text-white/88 transition hover:border-cyan-200/32 hover:bg-white/14 active:scale-95 [&::-webkit-details-marker]:hidden"
          >
            <IdentityBadge
              icon={roleBadge.icon}
              label={roleBadge.label}
              tone="role"
              className={`${isUpdatingRole ? "opacity-60" : ""}`}
            />
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-150",
                  isRoleMenuOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </summary>
            <div
              className={cn(
                "absolute z-40 h-3 w-full",
                roleMenuPlacement.openUp ? "bottom-full" : "top-full",
              )}
              onMouseEnter={openRoleMenu}
              aria-hidden="true"
            />
            <div
              id="account-role-menu-panel"
              onMouseEnter={openRoleMenu}
              onMouseLeave={closeRoleMenuAfterHover}
              className={cn(
                "absolute z-40 w-72 overflow-hidden rounded-[1.15rem] border border-emerald-300/22 p-3 shadow-xl",
                roleMenuPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                roleMenuPlacement.alignRight ? "right-0" : "left-0",
              )}
              style={{
                backgroundImage: "linear-gradient(135deg, rgba(5,46,22,0.98) 0%, rgba(6,78,37,0.97) 54%, rgba(4,55,28,0.97) 100%)",
                backgroundColor: "rgba(5,46,22,0.98)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white">
                {locale === "fr" ? "Changer de rôle" : "Switch role"}
              </p>
              <ul className="mt-2 space-y-1">
                {roleOptions.map((profile) => {
                  const isActive = profile === identity.role;
                  return (
                    <li key={profile}>
                      <button
                        type="button"
                        disabled={isUpdatingRole}
                        onClick={() => {
                          if (isActive) {
                            setIsRoleMenuOpen(false);
                            return;
                          }
                          void handleRoleMutation(profile);
                        }}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                          isActive
                            ? "bg-emerald-400/20 text-white shadow-sm ring-1 ring-emerald-300/40"
                            : "text-white hover:bg-white/10 hover:text-white disabled:opacity-40",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-bold text-white">
                            {getProfileLabel(profile, locale)}
                          </span>
                          <span className="mt-0.5 block line-clamp-1 text-[10px] uppercase tracking-wide text-white/70">
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
                    </li>
                  );
                })}
              </ul>
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
        <details
          ref={badgeMenuRef}
          open={isBadgeMenuOpen}
          onToggle={(event) => setIsBadgeMenuOpen(event.currentTarget.open)}
          onMouseEnter={openBadgeMenu}
          onMouseLeave={closeBadgeMenuAfterHover}
          className="group relative"
        >
          <summary
            aria-expanded={isBadgeMenuOpen}
            aria-controls="account-badges-menu-panel"
            className="cmm-dropdown-trigger flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-cyan-100/12 bg-white/8 px-3 cmm-text-caption font-bold text-white/82 transition hover:border-cyan-200/32 hover:bg-white/14 hover:text-white active:scale-95 [&::-webkit-details-marker]:hidden"
          >
            <BadgePictogram name="award" size={14} className="cmm-text-secondary" />
            <span className="hidden sm:inline">
              {locale === "fr" ? "Badges" : "Badges"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-150",
                isBadgeMenuOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </summary>
          <div
            className={cn(
              "absolute z-40 h-3 w-full",
              badgeMenuPlacement.openUp ? "bottom-full" : "top-full",
            )}
            onMouseEnter={openBadgeMenu}
            aria-hidden="true"
          />
          <div
            id="account-badges-menu-panel"
            onMouseEnter={openBadgeMenu}
            onMouseLeave={closeBadgeMenuAfterHover}
            className={cn(
              "absolute z-40 w-64 overflow-hidden rounded-[1.15rem] border border-emerald-300/22 p-3 shadow-xl",
              badgeMenuPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
              badgeMenuPlacement.alignRight ? "right-0" : "left-0",
            )}
            style={{
              backgroundImage: "linear-gradient(135deg, rgba(5,46,22,0.98) 0%, rgba(6,78,37,0.97) 54%, rgba(4,55,28,0.97) 100%)",
              backgroundColor: "rgba(5,46,22,0.98)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white">
              Badges d&apos;engagement
            </p>
            <ul className="mt-2 space-y-1">
              {gamificationBadges.map((badge) => (
                <li
                  key={badge.id}
                  className="flex items-center gap-2 text-[13px] text-white"
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
