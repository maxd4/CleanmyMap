"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import useSWR from "swr";
import type { UserIdentity } from "@/lib/authz";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { BadgePictogram, getAccountBadgeIconName } from "@/components/gamification/badge-icon";
import { BadgeSurface } from "@/components/gamification/badge-surface";
import { CmmDropdown } from "@/components/ui/cmm-dropdown";
import {
  getProfileLabel,
  type AppProfile,
} from "@/lib/profiles";
import {
  getAccountEvolutionLabel,
  getRoleMenuGroups,
} from "./account-identity-chip.helpers";
import { AccountEvolutionStatusLink } from "./account-evolution-status-link";
import { useActiveRoleMutation } from "./use-active-role-mutation";
import { cn } from "@/lib/utils";

type AccountIdentityChipProps = {
  identity: UserIdentity;
  controller?: AccountIdentityController;
};

export type AccountIdentityController = {
  locale: Parameters<typeof getProfileLabel>[1];
  handleActiveRoleMutation: (profile: AppProfile | null) => Promise<void>;
  isUpdatingProfile: boolean;
  profileError: string | null;
  hasPendingPromotionRequest: boolean;
  gamificationBadges: UserIdentity["badges"];
  profileMenuGroups: ReturnType<typeof getRoleMenuGroups>;
  profileOptions: AppProfile[];
  isRoleMenuOpen: boolean;
  setIsRoleMenuOpen: (open: boolean) => void;
  isBadgeMenuOpen: boolean;
  setIsBadgeMenuOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
};

async function fetchPromotionPendingStatus(): Promise<boolean> {
  try {
    const promotionResponse = await fetch("/api/account/promotion-requests", {
      headers: { Accept: "application/json" },
    });
    if (!promotionResponse.ok) {
      return false;
    }
    const promotionPayload = (await promotionResponse.json()) as {
      items?: Array<{ status?: unknown }>;
    };
    return promotionPayload.items?.[0]?.status === "pending_owner_review";
  } catch {
    return false;
  }
}

export function useAccountIdentityController(
  identity: UserIdentity | null,
): AccountIdentityController {
  const userId = identity?.userId ?? null;
  const { locale } = useSitePreferences();
  const { handleActiveRoleMutation, isUpdatingProfile, profileError } =
    useActiveRoleMutation(userId);
  const [trackedUserId, setTrackedUserId] = useState<string | null>(userId);
  const [openMenu, setOpenMenu] = useState<"role" | "badge" | "mobile" | null>(null);
  if (trackedUserId !== userId) {
    setTrackedUserId(userId);
    setOpenMenu(null);
  }

  const { data: hasPendingPromotionRequest = false } = useSWR<boolean>(
    userId ? ["account-promotion-requests", userId] : null,
    fetchPromotionPendingStatus,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 120_000,
    },
  );

  const isRoleMenuOpen = openMenu === "role";
  const isBadgeMenuOpen = openMenu === "badge";
  const isMobileMenuOpen = openMenu === "mobile";

  const setIsRoleMenuOpen = (open: boolean) =>
    setOpenMenu((current) => (open ? "role" : current === "role" ? null : current));
  const setIsBadgeMenuOpen = (open: boolean) =>
    setOpenMenu((current) => (open ? "badge" : current === "badge" ? null : current));
  const setIsMobileMenuOpen = (open: boolean) =>
    setOpenMenu((current) => (open ? "mobile" : current === "mobile" ? null : current));

  const gamificationBadges = useMemo(
    () =>
      (identity?.badges ?? []).filter(
        (badge) =>
          badge.id !== "admin" &&
          !badge.id.startsWith("role_") &&
          !badge.id.startsWith("profile_"),
      ),
    [identity?.badges],
  );

  const profileMenuGroups = useMemo(
    () => getRoleMenuGroups(identity?.role ?? "benevole"),
    [identity?.role],
  );

  const profileOptions = useMemo(
    () => [...profileMenuGroups.openProfiles, ...profileMenuGroups.obtainedProfiles],
    [profileMenuGroups],
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const closeBreakpointMenus = () => {
      setOpenMenu(null);
    };
    mediaQuery.addEventListener("change", closeBreakpointMenus);
    return () => {
      mediaQuery.removeEventListener("change", closeBreakpointMenus);
    };
  }, []);

  return {
    locale,
    handleActiveRoleMutation,
    isUpdatingProfile,
    profileError,
    hasPendingPromotionRequest,
    gamificationBadges,
    profileMenuGroups,
    profileOptions,
    isRoleMenuOpen,
    setIsRoleMenuOpen,
    isBadgeMenuOpen,
    setIsBadgeMenuOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  };
}

export function AccountIdentityChipView({
  identity,
  controller,
}: {
  identity: UserIdentity;
  controller: AccountIdentityController;
}) {
  const {
    locale,
    handleActiveRoleMutation,
    isUpdatingProfile,
    profileError,
    hasPendingPromotionRequest,
    gamificationBadges,
    profileMenuGroups,
    profileOptions,
    isRoleMenuOpen,
    setIsRoleMenuOpen,
    isBadgeMenuOpen,
    setIsBadgeMenuOpen,
  } = controller;

  return (
    <div className="flex items-center gap-2">
      <AccountRoleMenu
        identity={identity}
        locale={locale}
        profileMenuGroups={profileMenuGroups}
        profileOptions={profileOptions}
        isOpen={isRoleMenuOpen}
        isUpdatingProfile={isUpdatingProfile}
        hasPendingPromotionRequest={hasPendingPromotionRequest}
        onOpenChange={(open) => {
          setIsRoleMenuOpen(open);
          if (open) {
            setIsBadgeMenuOpen(false);
          }
        }}
        onSelectProfile={handleActiveRoleMutation}
        onClose={() => setIsRoleMenuOpen(false)}
      />

      <AccountBadgeMenu
        badges={gamificationBadges}
        locale={locale}
        isOpen={isBadgeMenuOpen}
        onOpenChange={(open) => {
          setIsBadgeMenuOpen(open);
          if (open) {
            setIsRoleMenuOpen(false);
          }
        }}
      />

      {profileError ? (
        <span className="max-w-32 cmm-text-caption leading-tight text-rose-600" aria-live="polite">
          {profileError}
        </span>
      ) : null}
    </div>
  );
}

export function AccountIdentityChip({ identity, controller }: AccountIdentityChipProps) {
  const internalController = useAccountIdentityController(controller ? null : identity);
  return <AccountIdentityChipView identity={identity} controller={controller ?? internalController} />;
}

type AccountRoleMenuProps = {
  identity: UserIdentity;
  locale: Parameters<typeof getProfileLabel>[1];
  profileMenuGroups: ReturnType<typeof getRoleMenuGroups>;
  profileOptions: AppProfile[];
  isOpen: boolean;
  isUpdatingProfile: boolean;
  hasPendingPromotionRequest: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProfile: (profile: AppProfile) => Promise<void> | void;
  onClose: () => void;
};

function AccountRoleMenu({
  identity,
  locale,
  profileMenuGroups,
  profileOptions,
  isOpen,
  isUpdatingProfile,
  hasPendingPromotionRequest,
  onOpenChange,
  onSelectProfile,
  onClose,
}: AccountRoleMenuProps) {
  if (profileOptions.length === 0) {
    return null;
  }

  const renderProfileItems = (profiles: AppProfile[]) =>
    profiles.map((profile) => (
      <AccountProfileMenuItem
        key={profile}
        profile={profile}
        activeRole={identity.activeRole}
        locale={locale}
        disabled={isUpdatingProfile}
        onSelect={onSelectProfile}
        onClose={onClose}
      />
    ));

  return (
    <CmmDropdown
      id="account-role-menu-panel"
      ariaLabel={locale === "fr" ? "Profils accessibles" : "Accessible profiles"}
      open={isOpen}
      onOpenChange={onOpenChange}
      panelClassName="w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900/98 p-3 text-white shadow-[0_24px_52px_-28px_rgba(2,6,23,0.95)]"
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          aria-label={locale === "fr" ? "Menu du profil actif" : "Active profile menu"}
          className="cmm-dropdown-trigger inline-flex h-11 min-h-11 w-11 min-w-11 max-w-[13rem] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-0 text-left text-white transition-colors hover:border-white/25 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 min-[1440px]:w-auto min-[1440px]:min-w-0 min-[1440px]:px-3 min-[1440px]:h-10 min-[1440px]:min-h-0"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-200">
            <BadgePictogram
              name={getAccountBadgeIconName(`role_${identity.activeRole}`)}
              size={16}
            />
          </span>
          <span className="cmm-ribbon-text hidden min-w-0 break-words font-bold min-[1440px]:inline">
            {getProfileLabel(identity.activeRole, locale)}
          </span>
          <ChevronDown
            className={cn(
              "hidden h-4 w-4 shrink-0 text-slate-300 transition-transform duration-150 min-[1440px]:inline",
              isOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      )}
    >
      <AccountRoleMenuContent
        identity={identity}
        locale={locale}
        profileMenuGroups={profileMenuGroups}
        hasPendingPromotionRequest={hasPendingPromotionRequest}
        renderProfileItems={renderProfileItems}
        onClose={onClose}
      />
    </CmmDropdown>
  );
}

function AccountRoleMenuContent({
  identity,
  locale,
  profileMenuGroups,
  hasPendingPromotionRequest,
  renderProfileItems,
  onClose,
}: {
  identity: UserIdentity;
  locale: Parameters<typeof getProfileLabel>[1];
  profileMenuGroups: ReturnType<typeof getRoleMenuGroups>;
  hasPendingPromotionRequest: boolean;
  renderProfileItems: (profiles: AppProfile[]) => ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <p className="px-2 pb-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-300">
        {locale === "fr" ? "UTILISER LE SITE COMME" : "USE THE SITE AS"}
      </p>
      <ul className="space-y-1" role="none">
        {renderProfileItems(profileMenuGroups.openProfiles)}
      </ul>

      <div role="separator" className="my-3 border-t border-white/12" />
      <div className="space-y-2 px-2">
        <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-300">
          {locale === "fr" ? "NIVEAU DE COMPTE" : "ACCOUNT LEVEL"}
        </p>
        <p className="text-sm font-bold text-white">
          {locale === "fr" ? "Niveau obtenu" : "Granted level"} : {getProfileLabel(identity.role, locale)}
        </p>
      </div>
      {profileMenuGroups.obtainedProfiles.length > 0 ? (
        <ul className="mt-2 space-y-1" role="none">
          {renderProfileItems(profileMenuGroups.obtainedProfiles)}
        </ul>
      ) : null}
      <div className="mt-3 border-t border-white/12 pt-3">
        <AccountEvolutionStatusLink
          label={getAccountEvolutionLabel(locale, false)}
          pendingLabel={getAccountEvolutionLabel(locale, true)}
          pendingInitially={hasPendingPromotionRequest}
          skipFetch
          onClick={onClose}
          className="w-full border-white/18 bg-white/[0.08] text-sm text-white hover:bg-white/[0.14]"
        />
      </div>
    </>
  );
}

export function MobileAccountMenuView({
  identity,
  activityStatus,
  accountHeader,
  controller,
}: {
  identity: UserIdentity;
  activityStatus: "active" | "inactive";
  accountHeader: ReactNode;
  controller: AccountIdentityController;
}) {
  const {
    locale,
    handleActiveRoleMutation,
    isUpdatingProfile,
    profileError,
    hasPendingPromotionRequest,
    gamificationBadges,
    profileMenuGroups,
    profileOptions,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = controller;

  const renderProfileItems = (profiles: AppProfile[]) =>
    profiles.map((profile) => (
      <AccountProfileMenuItem
        key={profile}
        profile={profile}
        activeRole={identity.activeRole}
        locale={locale}
        disabled={isUpdatingProfile}
        onSelect={handleActiveRoleMutation}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    ));

  return (
    <CmmDropdown
      id="mobile-account-menu-panel"
      ariaLabel={locale === "fr" ? "Menu du compte et du rôle" : "Account and role menu"}
      open={isMobileMenuOpen}
      onOpenChange={setIsMobileMenuOpen}
      wrapperClassName="shrink-0"
      panelClassName="max-h-[calc(100vh-5.5rem)] w-[min(19rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-slate-600/70 bg-slate-950/98 p-3 text-white shadow-[0_24px_52px_-28px_rgba(2,6,23,0.95)]"
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          aria-label={locale === "fr" ? "Menu du compte" : "Account menu"}
          className="cmm-dropdown-trigger relative inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-white transition-colors hover:border-white/25 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-emerald-200">
            <BadgePictogram
              name={getAccountBadgeIconName(`role_${identity.activeRole}`)}
              size={16}
            />
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-slate-900",
              activityStatus === "active" ? "bg-emerald-400" : "bg-rose-400",
            )}
          />
        </button>
      )}
    >
      <div className="mb-3 border-b border-white/12 pb-3">{accountHeader}</div>
      {profileOptions.length > 0 ? (
        <AccountRoleMenuContent
          identity={identity}
          locale={locale}
          profileMenuGroups={profileMenuGroups}
          hasPendingPromotionRequest={hasPendingPromotionRequest}
          renderProfileItems={renderProfileItems}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      ) : null}
      {profileError ? (
        <p className="mt-2 cmm-text-caption text-rose-400" aria-live="polite">
          {profileError}
        </p>
      ) : null}
      {gamificationBadges.length > 0 ? (
        <div className="mt-3 border-t border-white/12 pt-3">
          <p className="px-2 pb-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-300">
            {locale === "fr" ? "BADGES" : "BADGES"}
          </p>
          <ul className="flex flex-wrap gap-1.5 px-2">
            {gamificationBadges.map((badge) => (
              <li key={badge.id} title={badge.label}>
                <BadgeSurface
                  icon={getAccountBadgeIconName(badge.icon)}
                  label={badge.label}
                  tone="gamification"
                  variant="orb"
                  className="h-7 w-7"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CmmDropdown>
  );
}

type AccountBadgeMenuProps = {
  badges: UserIdentity["badges"];
  locale: Parameters<typeof getProfileLabel>[1];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function AccountBadgeMenu({
  badges,
  locale,
  isOpen,
  onOpenChange,
}: AccountBadgeMenuProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <CmmDropdown
      id="account-badges-menu-panel"
      ariaLabel={locale === "fr" ? "Badges d'engagement" : "Engagement badges"}
      open={isOpen}
      onOpenChange={onOpenChange}
      panelRole="region"
      panelClassName="w-64 overflow-hidden rounded-[1.15rem] border border-emerald-300/22 p-3 shadow-xl"
      panelStyle={{
        backgroundImage: "linear-gradient(135deg, rgba(5,46,22,0.98) 0%, rgba(6,78,37,0.97) 54%, rgba(4,55,28,0.97) 100%)",
        backgroundColor: "rgba(5,46,22,0.98)",
      }}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          aria-label={locale === "fr" ? "Menu des badges" : "Badges menu"}
          className="cmm-ribbon-text cmm-dropdown-trigger flex min-h-11 items-center gap-2 rounded-full border border-cyan-100/12 bg-white/8 px-3 font-bold text-white transition hover:border-cyan-200/32 hover:bg-white/14 hover:text-white"
        >
          <BadgePictogram name="award" size={14} className="cmm-text-secondary" />
          <span className="hidden sm:inline">Badges</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-150",
              isOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      )}
    >
      <p className="cmm-text-caption font-semibold uppercase tracking-wide text-white">
        Badges d&apos;engagement
      </p>
      <ul className="mt-2 space-y-1">
        {badges.map((badge) => (
          <li key={badge.id} className="flex items-center gap-2 text-[13px] text-white">
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
    </CmmDropdown>
  );
}

export function MobileAccountMenu({
  identity,
  activityStatus,
  accountHeader,
  controller,
}: {
  identity: UserIdentity;
  activityStatus: "active" | "inactive";
  accountHeader: ReactNode;
  controller?: AccountIdentityController;
}) {
  const internalController = useAccountIdentityController(controller ? null : identity);
  return (
    <MobileAccountMenuView
      identity={identity}
      activityStatus={activityStatus}
      accountHeader={accountHeader}
      controller={controller ?? internalController}
    />
  );
}

type AccountProfileMenuItemProps = {
  profile: AppProfile;
  activeRole: AppProfile;
  locale: Parameters<typeof getProfileLabel>[1];
  disabled: boolean;
  onSelect: (profile: AppProfile) => Promise<void> | void;
  onClose: () => void;
};

function AccountProfileMenuItem({
  profile,
  activeRole,
  locale,
  disabled,
  onSelect,
  onClose,
}: AccountProfileMenuItemProps) {
  const isActive = profile === activeRole;

  return (
    <li role="none">
      <button
        type="button"
        role="menuitemradio"
        aria-checked={isActive}
        disabled={disabled}
        onClick={() => {
          if (isActive) {
            onClose();
            return;
          }
          void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onSelect(profile);
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
        <span className="min-w-0 flex-1 break-words">
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
}
