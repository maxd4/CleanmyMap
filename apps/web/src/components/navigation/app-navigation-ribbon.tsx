"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  ChevronDown,
  Lightbulb,
  List,
  LogIn,
  MessageSquare,
  Settings2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserIdentity } from "@/lib/authz";
import { isProtectedRoutePath } from "@/lib/auth/protected-routes";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { AccountIdentityChip } from "@/components/account/account-identity-chip";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getActiveSpaceForPath,
  getNavigationSpacesForProfile,
} from "@/lib/navigation";
import {
  resolveActiveProfile,
  type AppProfile,
} from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";
import { trackNavigationClick } from "@/lib/analytics/navigation-client";
import { cn } from "@/lib/utils";
import {
  EXPLORER_ROUTE,
  PROFIL_ROUTE,
  buildOnboardingLocalisationHref,
} from "@/lib/accueil-pilotage-routes";
import { GlobalSearch } from "./global-search";
import { useAdaptiveRibbonChrome } from "./app-navigation-ribbon-theme";
import { AppNavigationTreeMenu } from "./app-navigation-tree-menu";
import { AppNavigationBlockDropdown } from "./app-navigation-block-dropdown";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";
import {
  readActivityStatus,
  toggleActivityStatus,
  type ActivityStatus,
} from "@/lib/account/activity-status";
import {
  getProfileLabel,
  normalizeProfileRole,
} from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";

type AppNavigationRibbonProps = {
  currentProfile?: AppProfile;
  profileLabel?: string;
  identity?: UserIdentity | null;
};

type ClerkUserLike = NonNullable<ReturnType<typeof useUser>["user"]>;

type AppNavigationRibbonShellProps = AppNavigationRibbonProps & {
  pathname: string;
  user: ClerkUserLike | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  showAccountActions: boolean;
};

function readProfileRole(metadata: unknown): Role | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const metadataRecord = metadata as Record<string, unknown>;
  const roleValue = metadataRecord["role"];
  const profileValue = metadataRecord["profile"];
  const rawValue =
    typeof roleValue === "string"
      ? roleValue
      : typeof profileValue === "string"
        ? profileValue
        : null;

  return rawValue ? normalizeProfileRole(rawValue) : null;
}

function readActiveProfile(metadata: unknown, role: Role): AppProfile {
  if (!metadata || typeof metadata !== "object") {
    return role;
  }

  const value = (metadata as Record<string, unknown>)["activeProfile"];
  return resolveActiveProfile({
    metadataActiveProfile: typeof value === "string" ? value : null,
    role,
  });
}

function readProfileBadges(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const badges = (metadata as Record<string, unknown>)["badges"];
  if (!Array.isArray(badges)) {
    return [];
  }

  return badges.filter((badge): badge is string => typeof badge === "string");
}

function buildRoleBadge(profile: AppProfile, locale: Locale) {
  const profileLabel = getProfileLabel(profile, locale);
  return {
    id: `role_${profile}`,
    label: locale === "fr" ? `Rôle ${profileLabel}` : `${profileLabel} role`,
    icon: "shield",
  };
}

function buildProfileBadge(profile: AppProfile, locale: Locale) {
  const profileLabel = getProfileLabel(profile, locale);
  return {
    id: `profile_${profile}`,
    label: locale === "fr" ? `Profil ${profileLabel}` : `${profileLabel} profile`,
    icon: "badge-check",
  };
}

function buildIdentityFromUser(
  user: ClerkUserLike,
  role: Role,
  activeProfile: AppProfile,
  locale: Locale,
): UserIdentity {
  const firstName = user.firstName?.trim() ?? null;
  const lastName = user.lastName?.trim() ?? "";
  const username =
    user.username?.trim() ||
    user.primaryEmailAddress?.emailAddress?.trim() ||
    user.id;
  const displayName = `${firstName ?? ""} ${lastName}`.trim() || username;
  const roleBadge = buildRoleBadge(role, locale);
  const profileBadge = buildProfileBadge(activeProfile, locale);
  const publicBadges = readProfileBadges(user.publicMetadata);
  const mergedBadges = Array.from(
    new Set([...publicBadges, roleBadge.id, profileBadge.id]),
  );

  return {
    userId: user.id,
    displayName,
    handle: username,
    firstName,
    username,
    email: user.primaryEmailAddress?.emailAddress?.trim() ?? null,
    currentLevel: 1,
    actorNameOptions: [displayName, username, user.id],
    role,
    activeProfile,
    badges: mergedBadges.map((badgeId) =>
      badgeId === roleBadge.id
        ? roleBadge
        : badgeId === profileBadge.id
          ? profileBadge
          : { id: badgeId, label: badgeId.replace(/_/g, " "), icon: "award" },
    ),
  };
}

function AccountUserBubble({
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

function AppNavigationRibbonShell({
  currentProfile,
  profileLabel,
  identity,
  pathname,
  user,
  isLoaded,
  isSignedIn,
  showAccountActions,
}: AppNavigationRibbonShellProps) {
  const { locale, displayMode } = useSitePreferences();
  const ribbonRef = useRef<HTMLElement | null>(null);
  const preferencesTriggerRef = useRef<HTMLElement | null>(null);
  const feedbackTriggerRef = useRef<HTMLElement | null>(null);
  const preferencesCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [preferencesOwnerPath, setPreferencesOwnerPath] = useState(pathname);
  const preferencesOpen = isPreferencesOpen && preferencesOwnerPath === pathname;
  const [feedbackOwnerPath, setFeedbackOwnerPath] = useState(pathname);
  const feedbackOpen = isFeedbackOpen && feedbackOwnerPath === pathname;
  const persistedActivityStatus = readActivityStatus(user?.unsafeMetadata);
  const [activityStatus, setActivityStatus] =
    useState<ActivityStatus>(persistedActivityStatus);
  const [isUpdatingActivityStatus, setIsUpdatingActivityStatus] = useState(false);
  const [activityStatusError, setActivityStatusError] = useState<string | null>(null);
  const fallbackProfile = currentProfile ?? "benevole";
  const userRole = readProfileRole(user?.publicMetadata);
  const effectiveProfile = identity?.activeProfile ?? (userRole ? readActiveProfile(user?.publicMetadata, userRole) : fallbackProfile);
  const effectiveProfileLabel =
    profileLabel ?? getProfileLabel(effectiveProfile, locale);
  const effectiveIdentity: UserIdentity | null = identity
    ? identity
    : showAccountActions && isLoaded && isSignedIn && user
      ? buildIdentityFromUser(
          user,
          userRole ?? fallbackProfile,
          effectiveProfile,
          locale,
        )
      : null;

  const ribbonChrome = useAdaptiveRibbonChrome(
    ribbonRef,
    `${pathname}:${displayMode}:${locale}:${effectiveProfile}`,
  );

  const spaces = useMemo(() => {
    const rawSpaces = getNavigationSpacesForProfile(effectiveProfile, displayMode, locale);
    return rawSpaces;
  }, [displayMode, effectiveProfile, locale]);

  const activeSpaceId = getActiveSpaceForPath(effectiveProfile, pathname, displayMode);
  const isAuthenticated =
    showAccountActions && (Boolean(effectiveIdentity) || (isLoaded && isSignedIn));
  const identityForBubble =
    effectiveIdentity ??
    (user
      ? buildIdentityFromUser(
          user,
          userRole ?? fallbackProfile,
          effectiveProfile,
          locale,
        )
      : null);

  useEffect(() => {
    setActivityStatus(persistedActivityStatus);
    setActivityStatusError(null);
  }, [persistedActivityStatus, user?.id]);
  const preferencesPlacement = useDropdownPlacement({
    isOpen: preferencesOpen,
    triggerRef: preferencesTriggerRef,
    minPanelWidth: 576,
  });

  const feedbackPlacement = useDropdownPlacement({
    isOpen: feedbackOpen,
    triggerRef: feedbackTriggerRef,
    minPanelWidth: 544,
  });

  function onTrackNavigation(href: string, label: string, spaceId: string | null) {
    trackNavigationClick({
      profile: effectiveProfile,
      spaceId,
      href,
      label,
    });
  }

  async function handleActivityStatusToggle() {
    if (!user || isUpdatingActivityStatus) {
      return;
    }

    const previousStatus = activityStatus;
    const nextStatus = toggleActivityStatus(previousStatus);
    setActivityStatus(nextStatus);
    setActivityStatusError(null);
    setIsUpdatingActivityStatus(true);

    try {
      const response = await fetch("/api/account/activity-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityStatus: nextStatus }),
      });
      const payload = (await response.json().catch(() => null)) as {
        activityStatus?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Impossible de mettre à jour le statut.",
        );
      }

      setActivityStatus(
        payload?.activityStatus === "inactive" ? "inactive" : "active",
      );
      void user.reload().catch(() => undefined);
    } catch (error) {
      setActivityStatus(previousStatus);
      setActivityStatusError(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le statut.",
      );
    } finally {
      setIsUpdatingActivityStatus(false);
    }
  }

  function closeFeedbackMenu() {
    if (feedbackCloseTimerRef.current) {
      clearTimeout(feedbackCloseTimerRef.current);
      feedbackCloseTimerRef.current = null;
    }
    setIsFeedbackOpen(false);
  }

  function openPreferencesMenu() {
    if (preferencesCloseTimerRef.current) {
      clearTimeout(preferencesCloseTimerRef.current);
      preferencesCloseTimerRef.current = null;
    }
    setPreferencesOwnerPath(pathname);
    setIsPreferencesOpen(true);
  }

  function closePreferencesMenu() {
    if (preferencesCloseTimerRef.current) {
      clearTimeout(preferencesCloseTimerRef.current);
    }
    preferencesCloseTimerRef.current = setTimeout(() => {
      setIsPreferencesOpen(false);
      preferencesCloseTimerRef.current = null;
    }, 160);
  }

  function openFeedbackMenu() {
    if (feedbackCloseTimerRef.current) {
      clearTimeout(feedbackCloseTimerRef.current);
      feedbackCloseTimerRef.current = null;
    }
    setFeedbackOwnerPath(pathname);
    setIsPreferencesOpen(false);
    setIsFeedbackOpen(true);
  }

  function closeFeedbackMenuOnHover() {
    if (feedbackCloseTimerRef.current) {
      clearTimeout(feedbackCloseTimerRef.current);
    }
    feedbackCloseTimerRef.current = setTimeout(() => {
      setIsFeedbackOpen(false);
      feedbackCloseTimerRef.current = null;
    }, 160);
  }

  const feedbackLinks = [
    {
      href: "/sections/feedback#bug",
      label: "Signaler un problème technique",
      icon: Bug,
      iconClassName: "text-rose-300",
    },
    {
      href: "/sections/feedback#improvement",
      label: "Proposer une idée ou suggestion",
      icon: Lightbulb,
      iconClassName: "text-amber-300",
    },
    {
      href: "/sections/feedback#collaboration",
      label: "Nous contacter pour travailler ensemble",
      icon: UsersRound,
      iconClassName: "text-emerald-300",
    },
  ] as const;

  useEffect(() => {
    const syncScrollState = () => {
      setIsScrolled(window.scrollY > 4);
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });
    return () => {
      window.removeEventListener("scroll", syncScrollState);
    };
  }, []);

  useEffect(() => {
    const closeMenusOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        preferencesTriggerRef.current &&
        target &&
        !preferencesTriggerRef.current.parentElement?.contains(target)
      ) {
        setIsPreferencesOpen(false);
      }
      if (
        feedbackTriggerRef.current &&
        target &&
        !feedbackTriggerRef.current.parentElement?.contains(target)
      ) {
        setIsFeedbackOpen(false);
      }
    };

    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreferencesOpen(false);
        setIsFeedbackOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenusOnOutsideClick);
    document.addEventListener("keydown", closeMenusOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenusOnOutsideClick);
      document.removeEventListener("keydown", closeMenusOnEscape);
      if (preferencesCloseTimerRef.current) {
        clearTimeout(preferencesCloseTimerRef.current);
      }
      if (feedbackCloseTimerRef.current) {
        clearTimeout(feedbackCloseTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="sticky top-[var(--app-ribbon-top-offset,0rem)] z-50 w-full">
      <nav
        ref={ribbonRef}
        aria-label={locale === "fr" ? "Barre de navigation principale" : "Main navigation bar"}
        className={cn(
          "w-full border-b border-white/8 bg-transparent backdrop-blur-2xl transition-all duration-300 supports-[backdrop-filter]:backdrop-blur-2xl",
          isScrolled
            ? "shadow-[0_14px_40px_-18px_rgba(2,6,23,0.72)]"
            : "shadow-[0_8px_24px_-12px_rgba(2,6,23,0.56)]",
        )}
        style={ribbonChrome}
      >
        <div className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 sm:px-5 lg:gap-2 xl:px-7 xl:py-3">
          <p className="sr-only">
            {locale === "fr" ? "Rôle actif" : "Active role"}: {effectiveProfileLabel}
          </p>

          <Link
            href="/"
            prefetch={false}
            onClick={() => onTrackNavigation("/", "CleanMyMap", null)}
            className="group inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[1.15rem] border border-sky-100/18 bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 px-3.5 pr-4 text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.92)] transition-transform hover:scale-[1.01] hover:border-sky-50/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
            aria-label="CleanMyMap"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/12 bg-white/12 text-[10px] font-black tracking-[0.24em]">
              CMM
            </span>
            <span className="hidden xl:inline cmm-text-caption font-black uppercase tracking-[0.18em]">
              CleanMyMap
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-1.5 xl:flex">
          <Link
            href={EXPLORER_ROUTE}
            prefetch={false}
            onClick={() => onTrackNavigation(EXPLORER_ROUTE, locale === "fr" ? "Sommaire" : "Summary", null)}
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-cyan-100/16 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-4 text-white shadow-[0_18px_36px_-22px_rgba(20,184,166,0.58)] transition-transform hover:scale-[1.01] hover:border-cyan-100/28 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
            aria-label={locale === "fr" ? "Sommaire" : "Summary"}
          >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/14">
                <List className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="cmm-text-caption font-black uppercase tracking-[0.18em]">
                {locale === "fr" ? "Sommaire" : "Summary"}
              </span>
            </Link>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <nav
                aria-label={locale === "fr" ? "Navigation par blocs" : "Block navigation"}
                className="flex shrink-0 flex-nowrap items-center gap-0.5 rounded-full border border-white/8 bg-white/[0.05] p-1 shadow-[0_18px_36px_-28px_rgba(2,6,23,0.8)]"
              >
                {spaces.map((space) => (
                  <AppNavigationBlockDropdown
                    key={space.id}
                    activeSpaceId={activeSpaceId}
                    locale={locale}
                    onTrackNavigation={onTrackNavigation}
                    pathname={pathname}
                    ribbonChrome={ribbonChrome}
                    space={space}
                  />
                ))}
              </nav>

              <div className="flex min-w-0 flex-1 justify-center">
              <div className="w-full max-w-[24rem] xl:max-w-[26rem]">
                  <GlobalSearch currentProfile={effectiveProfile} />
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-2.5">
            <div className="lg:hidden">
              <AppNavigationTreeMenu
                key={`mobile-tree-${pathname}`}
                activeSpaceId={activeSpaceId}
                idBase="mobile-navigation-tree"
                locale={locale}
                onTrackNavigation={onTrackNavigation}
                pathname={pathname}
                ribbonChrome={ribbonChrome}
                spaces={spaces}
              />
            </div>

            <details
              open={preferencesOpen}
              onToggle={(event) => {
                setPreferencesOwnerPath(pathname);
                setIsPreferencesOpen(event.currentTarget.open);
              }}
              onMouseEnter={openPreferencesMenu}
              onMouseLeave={closePreferencesMenu}
              className="relative shrink-0"
            >
              <summary
                ref={preferencesTriggerRef}
                onMouseEnter={openPreferencesMenu}
                aria-label={locale === "fr" ? "Menu des préférences d'affichage et langue" : "Display and language preferences menu"}
                aria-expanded={preferencesOpen}
                aria-controls="preferences-menu-panel"
                title={locale === "fr" ? "Réglages" : "Settings"}
                className="cmm-dropdown-trigger inline-flex h-11 min-w-11 list-none items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-cyan-200/32 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 sm:w-auto sm:px-3 [&::-webkit-details-marker]:hidden"
              >
                <Settings2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="hidden text-sm font-semibold sm:inline">
                  {locale === "fr" ? "Préférences" : "Preferences"}
                </span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 sm:inline" aria-hidden="true" />
              </summary>

              <AnimatePresence initial={false}>
                {preferencesOpen ? (
                  <>
                    <div
                      className={cn(
                        "absolute z-50 h-3 w-full",
                        preferencesPlacement.openUp ? "bottom-full" : "top-full",
                      )}
                      onMouseEnter={openPreferencesMenu}
                      aria-hidden="true"
                    />
                    <motion.div
                      key="preferences-menu-panel"
                      id="preferences-menu-panel"
                      aria-label={locale === "fr" ? "Préférences d'affichage et langue" : "Display and language preferences"}
                      onMouseEnter={openPreferencesMenu}
                      onMouseLeave={closePreferencesMenu}
                      initial={{ opacity: 0, y: preferencesPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: preferencesPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "cmm-dropdown-panel absolute z-50 w-[min(36rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-white shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)] max-sm:w-[calc(100vw-1.5rem)]",
                        preferencesPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                        preferencesPlacement.alignRight ? "right-0" : "left-0",
                        "max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2",
                      )}
                      style={{
                        backgroundImage: ribbonChrome.backgroundImage,
                        backgroundColor: ribbonChrome.backgroundColor,
                        borderColor: ribbonChrome.borderColor,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute h-4 w-4 rotate-45 border-l border-t border-white/15",
                          preferencesPlacement.openUp ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0" : "-top-2",
                          preferencesPlacement.alignRight ? "right-10" : "left-10",
                          "max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2",
                        )}
                        style={{
                          backgroundImage: ribbonChrome.backgroundImage,
                          backgroundColor: ribbonChrome.backgroundColor,
                          borderColor: ribbonChrome.borderColor,
                        }}
                      />
                      <SitePreferencesControls />
                      <div className="mt-4 border-t border-white/12 pt-4">
                        <CmmButton
                          asChild
                          tone="primary"
                          size="md"
                          className="w-full justify-center rounded-xl text-sm font-bold"
                        >
                          <Link
                            href={buildOnboardingLocalisationHref(PROFIL_ROUTE)}
                            prefetch={false}
                            onClick={() =>
                              onTrackNavigation(
                                buildOnboardingLocalisationHref(PROFIL_ROUTE),
                                locale === "fr"
                                  ? "Préférences de compte"
                                  : "Account preferences",
                                null,
                              )
                            }
                          >
                            {locale === "fr"
                              ? "Préférences de compte"
                              : "Account preferences"}
                          </Link>
                        </CmmButton>
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </details>

            <details
              open={feedbackOpen}
              onToggle={(event) => {
                setFeedbackOwnerPath(pathname);
                setIsFeedbackOpen(event.currentTarget.open);
                if (event.currentTarget.open) {
                  setIsPreferencesOpen(false);
                }
              }}
              onMouseEnter={openFeedbackMenu}
              onMouseLeave={closeFeedbackMenuOnHover}
              className="relative shrink-0 max-[380px]:hidden"
            >
              <summary
                ref={feedbackTriggerRef}
                onMouseEnter={openFeedbackMenu}
                aria-label={locale === "fr" ? "Menu Feedback" : "Feedback menu"}
                aria-expanded={feedbackOpen}
                aria-controls="feedback-menu-panel"
                title={locale === "fr" ? "Feedback" : "Feedback"}
                className="cmm-dropdown-trigger inline-flex h-11 min-w-11 list-none items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-0 text-white transition-colors hover:border-rose-200/30 hover:bg-rose-300/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40 sm:w-auto sm:px-3 [&::-webkit-details-marker]:hidden"
              >
                <MessageSquare className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span className="hidden text-sm font-semibold sm:inline">
                  Feedback
                </span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-300 sm:inline" aria-hidden="true" />
              </summary>

              <AnimatePresence initial={false}>
                {feedbackOpen ? (
                  <>
                    <div
                      className={cn(
                        "absolute z-50 h-3 w-full",
                        feedbackPlacement.openUp ? "bottom-full" : "top-full",
                      )}
                      onMouseEnter={openFeedbackMenu}
                      aria-hidden="true"
                    />
                    <motion.div
                      key="feedback-menu-panel"
                      id="feedback-menu-panel"
                      aria-label={locale === "fr" ? "Options de feedback" : "Feedback options"}
                      onMouseEnter={openFeedbackMenu}
                      onMouseLeave={closeFeedbackMenuOnHover}
                      initial={{ opacity: 0, y: feedbackPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: feedbackPlacement.openUp ? 8 : -8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "cmm-dropdown-panel absolute z-50 w-[min(34rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/15 bg-slate-950/95 p-2 text-white shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)] max-sm:w-[calc(100vw-1.5rem)]",
                        feedbackPlacement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]",
                        feedbackPlacement.alignRight ? "right-0" : "left-0",
                        feedbackPlacement.alignRight
                          ? "max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-[calc(50%+4rem)]"
                          : "max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2",
                      )}
                      style={{
                        backgroundImage: ribbonChrome.backgroundImage,
                        backgroundColor: ribbonChrome.backgroundColor,
                        borderColor: ribbonChrome.borderColor,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute h-4 w-4 rotate-45 border-l border-t border-white/15",
                          feedbackPlacement.openUp ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0" : "-top-2",
                          feedbackPlacement.alignRight ? "right-10" : "left-10",
                          feedbackPlacement.alignRight
                            ? "max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-[calc(50%+4rem)]"
                            : "max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2",
                        )}
                        style={{
                          backgroundImage: ribbonChrome.backgroundImage,
                          backgroundColor: ribbonChrome.backgroundColor,
                          borderColor: ribbonChrome.borderColor,
                        }}
                      />
                      <div className="divide-y divide-white/12">
                        {feedbackLinks.map((item) => (
                          <CmmButton
                            key={item.href}
                            asChild
                            tone="tertiary"
                            className="group w-full justify-start gap-3 rounded-xl border-0 px-3.5 py-4 text-left text-white hover:border-transparent hover:bg-white/10 hover:text-white"
                          >
                            <Link
                              href={item.href}
                              prefetch={false}
                              onClick={() => {
                                onTrackNavigation(item.href, item.label, null);
                                closeFeedbackMenu();
                              }}
                            >
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.06] ${item.iconClassName}`}>
                                <item.icon className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-white">{item.label}</span>
                              </span>
                              <span className="text-lg leading-none text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true">›</span>
                            </Link>
                          </CmmButton>
                        ))}
                      </div>
                    </motion.div>
                  </>
                ) : null}
              </AnimatePresence>
            </details>

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
                <NotificationBell />
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
        </div>
      </nav>
    </div>
  );
}

function AppNavigationRibbonPublic({
  currentProfile,
  profileLabel,
  pathname,
}: AppNavigationRibbonProps & { pathname: string }) {
  const { locale } = useSitePreferences();
  const { isLoaded, isSignedIn, user } = useUser();
  const userResource = user ?? null;
  const authLoaded = Boolean(isLoaded);
  const authSignedIn = Boolean(isSignedIn);
  const fallbackProfile = currentProfile ?? "benevole";
  const userRole = readProfileRole(userResource?.publicMetadata);
  const effectiveProfile = userRole
    ? readActiveProfile(userResource?.publicMetadata, userRole)
    : fallbackProfile;
  const effectiveIdentity =
    authLoaded && authSignedIn && userResource
      ? buildIdentityFromUser(
          userResource,
          userRole ?? fallbackProfile,
          effectiveProfile,
          locale,
        )
      : null;

  return (
    <AppNavigationRibbonShell
      currentProfile={effectiveProfile}
      profileLabel={profileLabel}
      identity={effectiveIdentity}
      pathname={pathname}
      user={userResource}
      isLoaded={authLoaded}
      isSignedIn={authSignedIn}
      showAccountActions
    />
  );
}

function AppNavigationRibbonProtected({
  currentProfile,
  profileLabel,
  identity,
  pathname,
}: AppNavigationRibbonProps & { pathname: string }) {
  const { locale } = useSitePreferences();
  const { isLoaded, isSignedIn, user } = useUser();
  const userResource = user ?? null;
  const authLoaded = Boolean(isLoaded);
  const authSignedIn = Boolean(isSignedIn);
  const fallbackProfile = currentProfile ?? "benevole";
  const userRole = readProfileRole(userResource?.publicMetadata);
  const effectiveProfile =
    identity?.activeProfile ??
    (userRole
      ? readActiveProfile(userResource?.publicMetadata, userRole)
      : fallbackProfile);
  const effectiveIdentity =
    identity ??
    (authLoaded && authSignedIn && userResource
      ? buildIdentityFromUser(
          userResource,
          userRole ?? fallbackProfile,
          effectiveProfile,
          locale,
        )
      : null);

  return (
    <AppNavigationRibbonShell
      currentProfile={effectiveProfile}
      profileLabel={profileLabel}
      identity={effectiveIdentity}
      pathname={pathname}
      user={userResource}
      isLoaded={authLoaded}
      isSignedIn={authSignedIn}
      showAccountActions
    />
  );
}

export function AppNavigationRibbon(props: AppNavigationRibbonProps) {
  const pathname = usePathname();

  if (isProtectedRoutePath(pathname)) {
    return <AppNavigationRibbonProtected {...props} pathname={pathname} />;
  }

  return <AppNavigationRibbonPublic {...props} pathname={pathname} />;
}
