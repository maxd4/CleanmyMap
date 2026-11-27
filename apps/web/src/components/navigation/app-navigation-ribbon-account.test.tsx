import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { UserIdentity } from "@/lib/authz";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => React.createElement("button", { "aria-label": "Compte Clerk" }),
  useUser: () => ({ user: null }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/actions/history",
  useSearchParams: () => new URLSearchParams("tab=history&filter=water"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) => {
    const anchorProps = { ...props };
    delete anchorProps.prefetch;
    return React.createElement("a", { href, ...anchorProps }, children);
  },
}));
vi.mock("@/components/account/account-identity-chip", () => {
  const IdentityChip = () => React.createElement("div", { "data-testid": "identity-chip" });
  const MobileMenu = ({ accountHeader }: { accountHeader?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "mobile-account-menu" }, accountHeader);
  return {
    AccountIdentityChip: IdentityChip,
    AccountIdentityChipView: IdentityChip,
    MobileAccountMenu: MobileMenu,
    MobileAccountMenuView: MobileMenu,
    useAccountIdentityController: () => ({
      locale: "fr",
      handleActiveRoleMutation: vi.fn(),
      isUpdatingProfile: false,
      profileError: null,
      hasPendingPromotionRequest: false,
      gamificationBadges: [],
      profileMenuGroups: { openProfiles: ["benevole"], obtainedProfiles: [] },
      profileOptions: ["benevole"],
      isRoleMenuOpen: false,
      setIsRoleMenuOpen: vi.fn(),
      isBadgeMenuOpen: false,
      setIsBadgeMenuOpen: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    }),
  };
});
vi.mock("@/components/navigation/notification-bell", () => ({
  NotificationBell: () => React.createElement("button", { "aria-label": "Notifications (0 à traiter)" }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { AccountUserBubble, RibbonAccountActions, RibbonAccountActionsFallback } from "./app-navigation-ribbon-account";

describe("AccountUserBubble", () => {
  it("contains the compact controls and exposes the full identity as a named group", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AccountUserBubble, {
        user: {
          username: "short_handle",
          firstName: "Alexandrine",
          lastName: "De La Très Longue Vallée",
        } as never,
        identity: {
          username: "short_handle",
          handle: "short_handle",
          displayName: "Alexandrine De La Très Longue Vallée",
          currentLevel: 42,
        } as UserIdentity,
        activityStatus: "active",
        isUpdatingActivityStatus: false,
        activityStatusError: null,
        onActivityStatusChange: () => undefined,
      }),
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('data-navigation-account-identity="true"');
    expect(markup).toContain('aria-label="short_handle · Niv. 42, Alexandrine De La Très Longue Vallée"');
    expect(markup).toContain('data-navigation-account-full-name="true"');
    expect(markup).toContain("min-w-[4.125rem]");
    expect(markup).toContain("xl:min-w-[3.625rem]");
    expect(markup).not.toContain("max-w-12");
    expect(markup).toContain("Alexandrine De La Très Longue Vallée");
    expect(markup).toContain("Statut : actif");
  });

  it("shows the application handle when Clerk username is absent", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AccountUserBubble, {
        user: {
          username: null,
          firstName: null,
          lastName: null,
        } as never,
        identity: {
          username: null,
          handle: "user_public",
          displayName: "Membre",
          currentLevel: 1,
        } as UserIdentity,
        activityStatus: "active",
        isUpdatingActivityStatus: false,
        activityStatusError: null,
        onActivityStatusChange: () => undefined,
      }),
    );

    expect(markup).toContain("user_public");
    expect(markup).not.toContain("private@example.org");
  });

  it("keeps an inactive updating status and its error accessible", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AccountUserBubble, {
        user: {
          username: "inactive_handle",
          firstName: "Sam",
          lastName: "User",
        } as never,
        identity: {
          username: "inactive_handle",
          handle: "inactive_handle",
          displayName: "Sam User",
          currentLevel: 2,
        } as UserIdentity,
        activityStatus: "inactive",
        isUpdatingActivityStatus: true,
        activityStatusError: "Impossible de mettre à jour le statut.",
        onActivityStatusChange: () => undefined,
      }),
    );

    expect(markup).toContain('aria-label="Statut : inactif"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("disabled");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Impossible de mettre à jour le statut.");
  });

  it("preserves the current query in the global authentication actions", () => {
    const markup = renderToStaticMarkup(
      <RibbonAccountActions
        locale="fr"
        isAuthenticated={false}
        onTrackNavigation={() => undefined}
        ribbonChrome={{} as never}
        effectiveIdentity={null}
        identityForBubble={null}
        user={null}
        activity={{
          activityStatus: "active",
          isUpdatingActivityStatus: false,
          activityStatusError: null,
          handleActivityStatusToggle: async () => undefined,
        }}
      />,
    );

    expect(markup).toContain("redirect_url=%2Factions%2Fhistory%3Ftab%3Dhistory%26filter%3Dwater");
  });

  it("tracks both unauthenticated actions when clicked", () => {
    const onTrackNavigation = vi.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <RibbonAccountActions
          locale="fr"
          isAuthenticated={false}
          onTrackNavigation={onTrackNavigation}
          ribbonChrome={{} as never}
          effectiveIdentity={null}
          identityForBubble={null}
          user={null}
          activity={{
            activityStatus: "active",
            isUpdatingActivityStatus: false,
            activityStatusError: null,
            handleActivityStatusToggle: async () => undefined,
          }}
        />,
      );
    });

    act(() => {
      tree.root.findByProps({ "aria-label": "Se connecter à CleanMyMap" }).props.onClick({ preventDefault: () => undefined });
      tree.root.findByProps({ "aria-label": "Créer un compte CleanMyMap" }).props.onClick({ preventDefault: () => undefined });
    });

    expect(onTrackNavigation).toHaveBeenCalledTimes(2);
    expect(onTrackNavigation.mock.calls.map(([href, label]) => ({ href, label }))).toEqual([
      { href: "/sign-in?redirect_url=%2Factions%2Fhistory%3Ftab%3Dhistory%26filter%3Dwater", label: "Se connecter" },
      { href: "/sign-up?redirect_url=%2Factions%2Fhistory%3Ftab%3Dhistory%26filter%3Dwater", label: "S'inscrire" },
    ]);
  });

  it("keeps the authenticated notification, identity and activity controls mounted", () => {
    const markup = renderToStaticMarkup(
      <RibbonAccountActions
        locale="fr"
        isAuthenticated
        onTrackNavigation={() => undefined}
        ribbonChrome={{} as never}
        effectiveIdentity={{
          username: "active_handle",
          handle: "active_handle",
          displayName: "Sam User",
          currentLevel: 3,
          badges: [],
          role: "benevole",
          activeRole: "benevole",
        } as unknown as UserIdentity}
        identityForBubble={{
          username: "active_handle",
          handle: "active_handle",
          displayName: "Sam User",
          currentLevel: 3,
          badges: [],
          role: "benevole",
          activeRole: "benevole",
        } as unknown as UserIdentity}
        user={{
          username: "active_handle",
          firstName: "Sam",
          lastName: "User",
        } as never}
        activity={{
          activityStatus: "active",
          isUpdatingActivityStatus: false,
          activityStatusError: null,
          handleActivityStatusToggle: async () => undefined,
        }}
      />
    );

    expect(markup).toContain('aria-label="Notifications (0 à traiter)"');
    expect(markup).toContain('data-navigation-account-identity="true"');
    expect(markup).toContain('aria-label="Statut : actif"');
  });

  it("tracks the authenticated activity toggle and supports the English auth-page labels", async () => {
    const handleActivityStatusToggle = vi.fn().mockResolvedValue(undefined);
    const onTrackNavigation = vi.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <RibbonAccountActions
          locale="en"
          isAuthenticated
          onTrackNavigation={onTrackNavigation}
          ribbonChrome={{} as never}
          effectiveIdentity={null}
          identityForBubble={null}
          user={null}
          activity={{
            activityStatus: "inactive",
            isUpdatingActivityStatus: false,
            activityStatusError: null,
            handleActivityStatusToggle,
          }}
        />,
      );
    });

    expect(tree.root.findByProps({ "aria-label": "Notifications (0 à traiter)" })).toBeDefined();
    expect(tree.root.findAllByProps({ "aria-label": "Menu du profil actif" })).toHaveLength(0);

    let authPageTree!: ReactTestRenderer;
    act(() => {
      authPageTree = create(
        <RibbonAccountActionsFallback
          pathname="/sign-in"
          locale="en"
          isAuthenticated={false}
          onTrackNavigation={onTrackNavigation}
          ribbonChrome={{} as never}
          effectiveIdentity={null}
          identityForBubble={null}
          user={null}
          activity={{
            activityStatus: "active",
            isUpdatingActivityStatus: false,
            activityStatusError: null,
            handleActivityStatusToggle: async () => undefined,
          }}
        />,
      );
    });

    act(() => {
      authPageTree.root.findByProps({ "aria-label": "Sign in to CleanMyMap" }).props.onClick({ preventDefault: () => undefined });
      authPageTree.root.findByProps({ "aria-label": "Sign up for CleanMyMap" }).props.onClick({ preventDefault: () => undefined });
    });

    expect(onTrackNavigation).toHaveBeenCalledWith("/sign-in", "Sign in", null);
    expect(onTrackNavigation).toHaveBeenCalledWith("/sign-up", "Sign up", null);

    let authenticatedTree!: ReactTestRenderer;
    act(() => {
      authenticatedTree = create(
        <RibbonAccountActions
          locale="fr"
          isAuthenticated
          onTrackNavigation={onTrackNavigation}
          ribbonChrome={{} as never}
          effectiveIdentity={null}
          identityForBubble={{
            username: "active_handle",
            handle: "active_handle",
            displayName: "Sam User",
            currentLevel: 3,
          } as unknown as UserIdentity}
          user={{ username: "active_handle", firstName: "Sam", lastName: "User" } as never}
          activity={{
            activityStatus: "inactive",
            isUpdatingActivityStatus: false,
            activityStatusError: null,
            handleActivityStatusToggle,
          }}
        />,
      );
    });

    const statusButtons = authenticatedTree.root.findAllByProps({ "aria-label": "Statut : inactif" });
    expect(statusButtons).toHaveLength(2);
    expect(String(statusButtons[0].props.className)).toContain("min-h-11 min-w-11");
    await act(async () => {
      statusButtons[0].props.onClick();
    });
    expect(handleActivityStatusToggle).toHaveBeenCalledTimes(1);
  });

  it("keeps the mobile role/account menu accessible while Clerk user is still loading", () => {
    const markup = renderToStaticMarkup(
      <RibbonAccountActions
        locale="fr"
        isAuthenticated
        onTrackNavigation={() => undefined}
        ribbonChrome={{} as never}
        effectiveIdentity={{
          handle: "loading_handle",
          displayName: "Membre en cours",
          currentLevel: 4,
          role: "benevole",
          activeRole: "benevole",
          activeProfile: "benevole",
          badges: [],
        } as unknown as UserIdentity}
        identityForBubble={null}
        user={null}
        activity={{
          activityStatus: "active",
          isUpdatingActivityStatus: false,
          activityStatusError: null,
          handleActivityStatusToggle: async () => undefined,
        }}
      />,
    );

    expect(markup).toContain('data-testid="mobile-account-menu"');
    expect(markup).toContain("loading_handle");
    expect(markup).toContain("Statut : chargement...");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("min-h-11 min-w-11");
  });

  it("keeps the fallback authentication actions on the current route", () => {
    const markup = renderToStaticMarkup(
      <RibbonAccountActionsFallback
        pathname="/methodologie"
        locale="fr"
        isAuthenticated={false}
        onTrackNavigation={() => undefined}
        ribbonChrome={{} as never}
        effectiveIdentity={null}
        identityForBubble={null}
        user={null}
        activity={{
          activityStatus: "active",
          isUpdatingActivityStatus: false,
          activityStatusError: null,
          handleActivityStatusToggle: async () => undefined,
        }}
      />
    );

    expect(markup).toContain("redirect_url=%2Fmethodologie");
  });
});
