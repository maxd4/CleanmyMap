"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { LogIn, UserPlus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import type { UserIdentity } from "@/lib/authz";
import {
  AccountIdentityChipView,
  MobileAccountMenuView,
  useAccountIdentityController,
} from "@/components/account/account-identity-chip";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { CmmButton } from "@/components/ui/cmm-button";
import type { ActivityStatus } from "@/lib/account/activity-status";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";
import {
  buildCurrentInternalRoute,
  buildSignInRedirectHref,
  buildSignUpRedirectHref,
  resolveSafeAuthRedirect,
} from "@/lib/auth/redirect-url";
import { useLocationHash } from "@/lib/auth/use-location-hash";

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
  showDetails = false,
}: {
  user: ClerkUserLike;
  identity: UserIdentity;
  activityStatus: ActivityStatus;
  isUpdatingActivityStatus: boolean;
  activityStatusError: string | null;
  onActivityStatusChange: () => void;
  showDetails?: boolean;
}) {
  const username = user.username?.trim() || identity.handle;
  const fullName = [user.firstName?.trim(), user.lastName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(" ") || identity.displayName;
  const activityStatusLabel =
    activityStatus === "active" ? "Statut : actif" : "Statut : inactif";

  return (
    <div
      role="group"
      aria-label={`${username} · Niv. ${identity.currentLevel}, ${fullName}`}
      data-navigation-account-identity
      className={cn(
        "relative flex w-fit min-w-[4.125rem] shrink-0 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-2 py-1.5 text-white shadow-[0_16px_32px_-26px_rgba(2,6,23,0.9)] xl:min-w-[3.625rem] xl:h-10 xl:py-0 min-[1440px]:max-w-[18rem]",
        showDetails && "w-full min-w-0",
      )}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700/80 xl:h-8 xl:w-8">
        <UserButton
          appearance={{
            elements: {
              userButtonTrigger: "h-10 w-10 rounded-full xl:h-8 xl:w-8",
              userButtonAvatarBox: "h-10 w-10 rounded-full ring-1 ring-white/20 xl:h-8 xl:w-8",
            },
          }}
        />
        {showDetails ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0 right-0 z-10 h-3.5 w-3.5 rounded-full border-2 border-slate-900",
              activityStatus === "active" ? "bg-emerald-400" : "bg-rose-400",
            )}
          />
        ) : (
          <button
            type="button"
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
        )}
      </div>
      <div className={cn("min-w-0 flex-1 overflow-hidden leading-tight", showDetails ? "block" : "hidden min-[1440px]:block")}>
        <p className="cmm-ribbon-text overflow-hidden text-ellipsis whitespace-nowrap font-bold text-white">
          {username} · Niv. {identity.currentLevel}
        </p>
        <p data-navigation-account-full-name className="cmm-ribbon-text overflow-hidden text-ellipsis whitespace-nowrap font-medium text-slate-300">{fullName}</p>
      </div>
      {activityStatusError ? (
        <span
          role="alert"
          aria-live="assertive"
          className="absolute right-2 top-[calc(100%+0.35rem)] z-20 max-w-64 rounded-md border border-rose-300/40 bg-slate-950 px-2 py-1 cmm-text-caption font-medium text-rose-100 shadow-lg"
        >
          {activityStatusError}
        </span>
      ) : null}
    </div>
  );
}

type RibbonAccountActionsProps = {
  locale: Locale;
  isAuthenticated: boolean;
  onTrackNavigation: RibbonNavigationTracker;
  ribbonChrome: RibbonChrome;
  effectiveIdentity: UserIdentity | null;
  identityForBubble: UserIdentity | null;
  user: ClerkUserLike | null;
  activity: RibbonActivityState;
};

type RibbonAccountActionsViewProps = RibbonAccountActionsProps & {
  returnRoute: string;
  referralCode?: string;
};

function MobileActivityStatusButton({
  activityStatus,
  isUpdatingActivityStatus,
  isAccountLoading = false,
  activityStatusError,
  onActivityStatusChange,
  locale,
}: {
  activityStatus: ActivityStatus;
  isUpdatingActivityStatus: boolean;
  isAccountLoading?: boolean;
  activityStatusError: string | null;
  onActivityStatusChange: () => void;
  locale: Locale;
}) {
  const isActive = activityStatus === "active";
  const label = isAccountLoading
    ? locale === "fr" ? "Statut : chargement..." : "Status: loading..."
    : isActive
      ? locale === "fr" ? "Statut : actif" : "Status: active"
      : locale === "fr" ? "Statut : inactif" : "Status: inactive";

  return (
    <div className="mt-2.5">
      <button
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        aria-disabled={isUpdatingActivityStatus || isAccountLoading || undefined}
        disabled={isUpdatingActivityStatus || isAccountLoading}
        onClick={onActivityStatusChange}
        className="flex min-h-11 min-w-11 w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              isAccountLoading ? "bg-slate-400" : isActive ? "bg-emerald-400" : "bg-rose-400",
            )}
          />
          <span>{label}</span>
        </span>
        <span className="cmm-text-caption font-medium text-slate-300">
          {isAccountLoading
            ? locale === "fr" ? "Patienter" : "Loading"
            : locale === "fr" ? "Changer" : "Toggle"}
        </span>
      </button>
      {activityStatusError ? (
        <span role="alert" aria-live="assertive" className="mt-1 block cmm-text-caption text-rose-300">
          {activityStatusError}
        </span>
      ) : null}
    </div>
  );
}

function AuthenticatedAccountActions({
  locale,
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
}: Pick<
  RibbonAccountActionsViewProps,
  "locale" | "ribbonChrome" | "effectiveIdentity" | "identityForBubble" | "user" | "activity"
>) {
  const controller = useAccountIdentityController(effectiveIdentity);
  const mobileIdentity = identityForBubble ?? effectiveIdentity;
  const triggerActivityToggle = () => {
    void /* fire-and-forget -- the account bubble owns activity update state and errors. */ handleActivityStatusToggle();
  };

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
      <NotificationBell ribbonChrome={ribbonChrome} />
      {mobileIdentity ? (
        <div className="flex items-center xl:hidden">
          <MobileAccountMenuView
            identity={mobileIdentity}
            activityStatus={activityStatus}
            controller={controller}
            accountHeader={
              <div>
                {user ? (
                  <AccountUserBubble
                    user={user}
                    identity={mobileIdentity}
                    activityStatus={activityStatus}
                    isUpdatingActivityStatus={isUpdatingActivityStatus}
                    activityStatusError={activityStatusError}
                    onActivityStatusChange={triggerActivityToggle}
                    showDetails
                  />
                ) : (
                  <div
                    role="group"
                    aria-label={`${mobileIdentity.handle} · Niv. ${mobileIdentity.currentLevel}, ${mobileIdentity.displayName}`}
                    data-navigation-account-identity
                    className="rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-2 text-white"
                  >
                    <p className="cmm-ribbon-text font-bold text-white">
                      {mobileIdentity.handle} · Niv. {mobileIdentity.currentLevel}
                    </p>
                    <p className="cmm-ribbon-text font-medium text-slate-300">
                      {mobileIdentity.displayName}
                    </p>
                  </div>
                )}
                <MobileActivityStatusButton
                  activityStatus={activityStatus}
                  isUpdatingActivityStatus={isUpdatingActivityStatus}
                  isAccountLoading={!user}
                  activityStatusError={activityStatusError}
                  onActivityStatusChange={triggerActivityToggle}
                  locale={locale}
                />
              </div>
            }
          />
        </div>
      ) : null}
      <div className="hidden xl:flex xl:items-center xl:gap-2 lg:gap-3">
        {effectiveIdentity ? (
          <AccountIdentityChipView identity={effectiveIdentity} controller={controller} />
        ) : null}
        {user && identityForBubble ? (
          <AccountUserBubble
            user={user}
            identity={identityForBubble}
            activityStatus={activityStatus}
            isUpdatingActivityStatus={isUpdatingActivityStatus}
            activityStatusError={activityStatusError}
            onActivityStatusChange={triggerActivityToggle}
          />
        ) : null}
      </div>
    </div>
  );
}

function RibbonAccountActionsView({
  locale,
  isAuthenticated,
  onTrackNavigation,
  ribbonChrome,
  effectiveIdentity,
  identityForBubble,
  user,
  returnRoute,
  referralCode,
  activity,
}: RibbonAccountActionsViewProps) {
  const signInHref = buildSignInRedirectHref(returnRoute, { referralCode });
  const signUpHref = buildSignUpRedirectHref(returnRoute, { referralCode });

  return (
    <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            {!isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CmmButton
                  href={signInHref}
                  prefetch={false}
                  ariaLabel={locale === "fr" ? "Se connecter à CleanMyMap" : "Sign in to CleanMyMap"}
                  onClick={() => onTrackNavigation(signInHref, locale === "fr" ? "Se connecter" : "Sign in", null)}
                  tone="critical"
                  variant="pill"
                  className="cmm-ribbon-text h-11 min-h-11 w-11 min-w-11 shrink-0 whitespace-nowrap px-0 font-bold sm:h-11 sm:w-auto sm:px-3.5 xl:h-10 xl:min-h-0"
                >
                  <LogIn className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {locale === "fr" ? "Se connecter" : "Sign in"}
                  </span>
                </CmmButton>
                <CmmButton
                  href={signUpHref}
                  prefetch={false}
                  ariaLabel={locale === "fr" ? "Créer un compte CleanMyMap" : "Sign up for CleanMyMap"}
                  onClick={() => onTrackNavigation(signUpHref, locale === "fr" ? "S'inscrire" : "Sign up", null)}
                  tone="primary"
                  variant="pill"
                  className="cmm-ribbon-text h-11 min-h-11 w-11 min-w-11 shrink-0 whitespace-nowrap px-0 font-bold sm:h-11 sm:w-auto sm:px-4 xl:h-10 xl:min-h-0"
                >
                  <UserPlus className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {locale === "fr" ? "S'inscrire" : "Sign up"}
                  </span>
                </CmmButton>
              </div>
            ) : null}

            {isAuthenticated ? (
              <AuthenticatedAccountActions
                locale={locale}
                ribbonChrome={ribbonChrome}
                effectiveIdentity={effectiveIdentity}
                identityForBubble={identityForBubble}
                user={user}
                activity={activity}
              />
            ) : null}
    </div>
  );
}

export function RibbonAccountActions(props: RibbonAccountActionsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = useLocationHash();
  const currentRoute = buildCurrentInternalRoute(
    pathname,
    searchParams?.toString() ?? "",
    hash,
  );
  const isAuthPage = pathname === "/sign-in" || pathname?.startsWith("/sign-in/") || pathname === "/sign-up" || pathname?.startsWith("/sign-up/");
  const authPageReturnRoute = isAuthPage
    ? resolveSafeAuthRedirect(searchParams?.get("redirect_url") ?? undefined)
    : undefined;
  const referralCode = isAuthPage ? searchParams?.get("ref") ?? undefined : undefined;

  return <RibbonAccountActionsView {...props} returnRoute={authPageReturnRoute ?? currentRoute} referralCode={referralCode} />;
}

export function RibbonAccountActionsFallback({
  pathname,
  ...props
}: RibbonAccountActionsProps & { pathname: string }) {
  return <RibbonAccountActionsView {...props} returnRoute={buildCurrentInternalRoute(pathname, "", "")} />;
}
