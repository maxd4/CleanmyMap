"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

import type { UserIdentity } from "@/lib/authz";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";
import { NotificationBell } from "@/components/navigation/notification-bell";
import type { ActivityStatus } from "@/lib/account/activity-status";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

import type { RibbonChrome } from "./app-navigation-ribbon-theme";
import type { RibbonActivityState } from "./app-navigation-ribbon-activity";

import type { AppProfile } from "@/lib/profiles";

export type AppNavigationRibbonProps = {
  currentProfile?: AppProfile;
  profileLabel?: string;
  identity?: UserIdentity | null;
};

export type RibbonNavigationTracker = (
  href: string,
  label: string,
  spaceId: string | null,
) => void;

export type ClerkUserLike = NonNullable<ReturnType<typeof useUser>["user"]>;

export function AccountUserBubble({
  user,
  identity,
  activityStatus,
  isUpdatingActivityStatus,
  activityStatusError,
  onActivityStatusChange,
}: {
  user: ClerkUserLike;
  identity: UserIdentity;
  activityStatus: ActivityStatus;
  isUpdatingActivityStatus: boolean;
  activityStatusError: string | null;
  onActivityStatusChange: () => void;
}) {
  const username = user.username?.trim() || identity.username;
  const fullName = [user.firstName?.trim(), user.lastName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(" ") || identity.displayName;
  const activityStatusLabel =
    activityStatus === "active" ? "Statut : actif" : "Statut : inactif";

  return (
    <div className="relative flex min-w-0 max-w-[18rem] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-2 py-1.5 text-white shadow-[0_16px_32px_-26px_rgba(2,6,23,0.9)]">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700/80">
        <UserButton
          appearance={{
            elements: {
              userButtonTrigger: "h-10 w-10 rounded-full",
              userButtonAvatarBox: "h-10 w-10 rounded-full ring-1 ring-white/20",
            },
          }}
        />
        <button
          type="button"
          title={activityStatusLabel}
          aria-label={activityStatusLabel}
          aria-pressed={activityStatus === "active"}
          disabled={isUpdatingActivityStatus}
          onClick={onActivityStatusChange}
          className={cn(
            "absolute bottom-0 right-0 z-10 h-4 w-4 rounded-full border-2 border-slate-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900",
            activityStatus === "active" ? "bg-emerald-400" : "bg-rose-400",
            isUpdatingActivityStatus && "cursor-wait opacity-70",
          )}
        />
      </div>
      <div className="hidden min-w-0 flex-1 leading-tight sm:block">
        <p className="truncate text-sm font-bold text-white">
          {username} · Niv. {identity.currentLevel}
        </p>
        <p className="truncate text-xs font-medium text-slate-300">{fullName}</p>
      </div>
      {activityStatusError ? (
        <span
          role="alert"
          aria-live="assertive"
          className="absolute right-2 top-[calc(100%+0.35rem)] z-20 max-w-64 rounded-md border border-rose-300/40 bg-slate-950 px-2 py-1 text-[0.7rem] font-medium text-rose-100 shadow-lg"
        >
          {activityStatusError}
        </span>
      ) : null}
    </div>
  );
}

export function RibbonAccountActions({
  locale,
  isAuthenticated,
  onTrackNavigation,
  ribbonChrome,
  effectiveIdentity,
  identityForBubble,
  user,
  activity: {
    activityStatus,
    isUpdatingActivityStatus,
    activityStatusError,
    handleActivityStatusToggle,
  },
}: {
  locale: Locale;
  isAuthenticated: boolean;
  onTrackNavigation: RibbonNavigationTracker;
  ribbonChrome: RibbonChrome;
  effectiveIdentity: UserIdentity | null;
  identityForBubble: UserIdentity | null;
  user: ClerkUserLike | null;
  activity: RibbonActivityState;
}) {
  return (
    <div className="flex items-center gap-2 lg:gap-3">
            {!isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/sign-in"
                  prefetch={false}
                  aria-label={locale === "fr" ? "Se connecter à CleanMyMap" : "Sign in to CleanMyMap"}
                  onClick={() => onTrackNavigation("/sign-in", locale === "fr" ? "Se connecter" : "Sign in", null)}
                  className="inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-full px-0 cmm-text-caption font-bold text-white transition hover:text-white sm:h-auto sm:w-auto sm:px-3"
                >
                  <LogIn className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {locale === "fr" ? "Se connecter" : "Sign in"}
                  </span>
                </Link>
                <Link
                  href="/sign-up"
                  prefetch={false}
                  aria-label={locale === "fr" ? "Créer un compte CleanMyMap" : "Sign up for CleanMyMap"}
                  onClick={() => onTrackNavigation("/sign-up", locale === "fr" ? "S'inscrire" : "Sign up", null)}
                  className="inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#27C3D9] to-[#18B68F] px-0 cmm-text-caption font-bold text-[#16313b] shadow-lg shadow-cyan-900/15 transition hover:from-[#2F80C3] hover:to-[#27C3D9] active:scale-95 sm:h-auto sm:w-auto sm:px-4"
                >
                  <UserPlus className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {locale === "fr" ? "S'inscrire" : "Sign up"}
                  </span>
                </Link>
              </div>
            ) : null}

            {isAuthenticated ? (
              <div className="flex items-center gap-2 lg:gap-3">
                <NotificationBell ribbonChrome={ribbonChrome} />
                {effectiveIdentity ? (
                  <AccountIdentityChip identity={effectiveIdentity} />
                ) : null}
                {user && identityForBubble ? (
                  <AccountUserBubble
                    user={user}
                    identity={identityForBubble}
                    activityStatus={activityStatus}
                    isUpdatingActivityStatus={isUpdatingActivityStatus}
                    activityStatusError={activityStatusError}
                    onActivityStatusChange={handleActivityStatusToggle}
                  />
                ) : null}
              </div>
            ) : null}
    </div>
  );
}
