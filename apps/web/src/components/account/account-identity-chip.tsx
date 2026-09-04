"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import {
  getRoleSwitchTargetPath,
} from "@/lib/account/role-switch-navigation";
import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { BadgePictogram, getAccountBadgeIconName } from "@/components/gamification/badge-icon";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { usePathname, useRouter } from "next/navigation";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import {
  getProfileEntryPath,
  getProfileLabel,
  getSwitchableProfiles,
  type AppProfile,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

type AccountIdentityChipProps = {
  identity: UserIdentity;
};

export function AccountIdentityChip({ identity }: AccountIdentityChipProps) {
  const { locale } = useSitePreferences();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
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

  const profileOptions = useMemo(() => {
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

      if (user) {
        await user.reload();
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
      {profileOptions.length > 0 ? (
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
            className="cmm-dropdown-trigger inline-flex min-h-11 max-w-[13rem] cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-left text-white transition-colors hover:border-white/25 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 active:scale-[0.99] [&::-webkit-details-marker]:hidden"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-200">
              <BadgePictogram
                name={getAccountBadgeIconName(`role_${identity.role}`)}
                size={16}
              />
            </span>
            <span className="hidden truncate text-sm font-bold sm:inline">
              {getProfileLabel(identity.role, locale)}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150",
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
            role="menu"
            aria-label={locale === "fr" ? "Profils accessibles" : "Accessible profiles"}
            onMouseEnter={openRoleMenu}
            onMouseLeave={closeRoleMenuAfterHover}
            className={cn(
              "absolute z-40 w-[min(19rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900/98 p-3 text-white shadow-[0_24px_52px_-28px_rgba(2,6,23,0.95)]",
              roleMenuPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
              roleMenuPlacement.alignRight ? "right-0" : "left-0",
            )}
          >
            <p className="px-2 pb-2 text-sm font-semibold text-slate-200">
              {locale === "fr" ? "Je représente un/une :" : "I represent:"}
            </p>
            <ul className="space-y-1" role="none">
              {profileOptions.map((profile) => {
                const isActive = profile === identity.role;
                return (
                  <li key={profile} role="none">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      disabled={isUpdatingRole}
                      onClick={() => {
                        if (isActive) {
                          setIsRoleMenuOpen(false);
                          return;
                        }
                        void handleRoleMutation(profile);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 disabled:cursor-wait disabled:opacity-50",
                        isActive
                          ? "bg-emerald-400/12 text-white ring-1 ring-emerald-300/30"
                          : "text-slate-100 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                        <BadgePictogram
                          name={getAccountBadgeIconName(`role_${profile}`)}
                          size={17}
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {getProfileLabel(profile, locale)}
                      </span>
                      {isActive ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/80 text-slate-950" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
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
            className="cmm-dropdown-trigger flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-cyan-100/12 bg-white/8 px-3 cmm-text-caption font-bold text-white transition hover:border-cyan-200/32 hover:bg-white/14 hover:text-white active:scale-95 [&::-webkit-details-marker]:hidden"
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
