// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserIdentity } from "@/lib/authz";

const mocks = vi.hoisted(() => ({
  locale: "fr" as "fr" | "en",
  mutation: {
    handleActiveRoleMutation: vi.fn(),
    isUpdatingProfile: false,
    profileError: null as string | null,
  },
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: mocks.locale }),
}));

vi.mock("./use-active-role-mutation", () => ({
  useActiveRoleMutation: () => mocks.mutation,
}));

vi.mock("@/components/ui/cmm-dropdown", () => ({
  CmmDropdown: (props: {
    id: string;
    ariaLabel: string;
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    renderTrigger: (props: Record<string, unknown>) => React.ReactNode;
  }) => {
    const triggerProps = {
      ref: undefined,
      type: "button" as const,
      "aria-expanded": Boolean(props.open),
      "aria-controls": props.id,
      "aria-haspopup": "menu" as const,
      onMouseDown: () => undefined,
      onMouseEnter: () => undefined,
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Escape") {
          props.onOpenChange?.(false);
        }
      },
      onClick: () => props.onOpenChange?.(!props.open),
    };

    return (
      <div data-testid={props.id}>
        {props.renderTrigger(triggerProps)}
        {props.open ? (
          <div id={props.id} role="menu" aria-label={props.ariaLabel}>
            {props.children}
          </div>
        ) : null}
      </div>
    );
  },
}));

vi.mock("@/components/gamification/badge-icon", () => ({
  BadgePictogram: ({ name }: { name: string }) => <span data-badge-icon={name} />,
  getAccountBadgeIconName: (name: string) => name,
}));

vi.mock("@/components/gamification/badge-surface", () => ({
  BadgeSurface: ({ label }: { label: string }) => <span data-badge-label={label} />,
}));

vi.mock("./account-evolution-status-link", () => ({
  AccountEvolutionStatusLink: ({
    label,
    pendingLabel,
    pendingInitially,
    onClick,
  }: {
    label: string;
    pendingLabel: string;
    pendingInitially: boolean;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {pendingInitially ? pendingLabel : label}
    </button>
  ),
}));

import {
  AccountIdentityChip,
  MobileAccountMenu,
  useAccountIdentityController,
} from "./account-identity-chip";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeIdentity(
  overrides: Partial<UserIdentity> = {},
): UserIdentity {
  return {
    userId: "user-1",
    displayName: "Alex User",
    handle: "alex",
    firstName: "Alex",
    username: "alex",
    email: "alex@example.com",
    currentLevel: 12,
    actorNameOptions: ["Alex", "alex"],
    role: "max",
    activeRole: "benevole",
    activeProfile: "benevole",
    badges: [
      { id: "admin", label: "Admin", icon: "shield" },
      { id: "role_max", label: "Role", icon: "crown" },
      { id: "profile_max", label: "Profile", icon: "shield" },
      { id: "mentor", label: "Mentor", icon: "award" },
    ],
    ...overrides,
  };
}

function jsonResponse(items: Array<{ status?: unknown }>, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue({ items }),
  };
}

describe("AccountIdentityChip behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.locale = "fr";
    mocks.mutation.handleActiveRoleMutation.mockReset();
    mocks.mutation.isUpdatingProfile = false;
    mocks.mutation.profileError = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render(identity: UserIdentity) {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<AccountIdentityChip identity={identity} />);
    });
  }

  async function open(label: string) {
    await act(async () => {
      host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)?.click();
    });
  }

  it("renders accessible French role and badge controls, filters non-gamification badges, and keeps menus exclusive", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([{ status: "pending_owner_review" }])));
    render(makeIdentity());

    expect(host.querySelector('button[aria-label="Menu du profil actif"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Menu des badges"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Mentor");

    await open("Menu du profil actif");
    expect(host.textContent).toContain("UTILISER LE SITE COMME");
    expect(host.textContent).toContain("NIVEAU DE COMPTE");
    expect(host.textContent).toContain("Évolution du compte · En attente");
    expect(host.querySelectorAll('[role="menuitemradio"]')).toHaveLength(7);
    expect(host.querySelector('[role="menuitemradio"][aria-checked="true"]')).not.toBeNull();

    act(() => {
      host.querySelector<HTMLButtonElement>('button[aria-label="Menu du profil actif"]')?.click();
    });
    expect(host.querySelector("#account-role-menu-panel")).toBeNull();

    await open("Menu des badges");
    expect(host.querySelector("#account-role-menu-panel")).toBeNull();
    expect(host.querySelector("#account-badges-menu-panel")).not.toBeNull();
    expect(host.textContent).toContain("Badges d'engagement");
    expect(host.textContent).toContain("Mentor");

    act(() => {
      host.querySelector<HTMLButtonElement>('button[aria-label="Menu des badges"]')?.click();
    });
    expect(host.querySelector("#account-badges-menu-panel")).toBeNull();
  });

  it("switches to an allowed inactive role and closes on the active role", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
    mocks.mutation.handleActiveRoleMutation.mockResolvedValue(undefined);
    render(makeIdentity({ activeRole: "coordinateur", activeProfile: "coordinateur" }));

    await open("Menu du profil actif");
    const activeButton = host.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')!;

    act(() => activeButton.click());
    expect(host.querySelector("#account-role-menu-panel")).toBeNull();

    await open("Menu du profil actif");
    const reopenedInactiveButton = Array.from(
      host.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    ).find((button) => button.getAttribute("aria-checked") === "false")!;
    act(() => reopenedInactiveButton.click());
    expect(mocks.mutation.handleActiveRoleMutation).toHaveBeenCalledWith(
      expect.any(String),
    );
  });

  it("supports English labels, pending-free evolution, disabled roles, and mutation errors", async () => {
    mocks.locale = "en";
    mocks.mutation.isUpdatingProfile = true;
    mocks.mutation.profileError = "Role change refused.";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([{ status: "approved" }])));
    render(
      makeIdentity({
        role: "benevole",
        activeRole: "benevole",
        activeProfile: "benevole",
        badges: [],
      }),
    );

    expect(host.querySelector('button[aria-label="Active profile menu"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Badges menu"]')).toBeNull();
    expect(host.textContent).toContain("Role change refused.");

    await open("Active profile menu");
    expect(host.textContent).toContain("USE THE SITE AS");
    expect(host.textContent).toContain("ACCOUNT LEVEL");
    expect(host.textContent).toContain("Account evolution");
    expect(host.querySelectorAll<HTMLButtonElement>("button[disabled]").length).toBeGreaterThan(0);
  });

  it("renders the English engagement badge panel", async () => {
    mocks.locale = "en";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));
    render(
      makeIdentity({
        role: "benevole",
        activeRole: "benevole",
        activeProfile: "benevole",
        badges: [{ id: "mentor", label: "Mentor", icon: "award" }],
      }),
    );

    await open("Badges menu");
    expect(host.querySelector('[role="menu"][aria-label="Engagement badges"]')).not.toBeNull();
    expect(host.textContent).toContain("Badges d'engagement");
    expect(host.textContent).toContain("Mentor");
  });

  it("handles a failed promotion request without exposing a stale pending state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([], false)));
    render(makeIdentity({ role: "benevole", activeRole: "benevole", activeProfile: "benevole" }));

    await open("Menu du profil actif");
    expect(host.textContent).toContain("Évolution du compte");
    expect(host.textContent).not.toContain("En attente");
  });

  it("silently ignores an unavailable promotion request endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(makeIdentity({ role: "benevole", activeRole: "benevole", activeProfile: "benevole" }));

    await act(async () => {
      await Promise.resolve();
    });

    await open("Menu du profil actif");
    expect(host.textContent).toContain("Évolution du compte");
    expect(host.textContent).not.toContain("En attente");
  });
});

describe("MobileAccountMenu and shared controller behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.locale = "fr";
    mocks.mutation.handleActiveRoleMutation.mockReset();
    mocks.mutation.isUpdatingProfile = false;
    mocks.mutation.profileError = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function SharedAccountHarness({ identity }: { identity: UserIdentity }) {
    const controller = useAccountIdentityController(identity);
    return (
      <div>
        <MobileAccountMenu
          identity={identity}
          activityStatus="active"
          controller={controller}
          accountHeader={<div data-testid="mobile-header">En-tête compte</div>}
        />
        <AccountIdentityChip identity={identity} controller={controller} />
      </div>
    );
  }

  it("shares a single promotion-requests fetch across mobile and desktop menus", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ status: "pending_owner_review" }]));
    vi.stubGlobal("fetch", fetchMock);

    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<SharedAccountHarness identity={makeIdentity()} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const mobileTrigger = host.querySelector<HTMLButtonElement>('button[aria-label="Menu du compte"]');
    expect(mobileTrigger).not.toBeNull();
    await act(async () => {
      mobileTrigger!.click();
    });

    const panel = host.querySelector('[role="menu"][aria-label="Menu du compte et du rôle"]');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("En-tête compte");
    expect(panel!.textContent).toContain("UTILISER LE SITE COMME");
    expect(panel!.textContent).toContain("En attente");
    expect(panel!.textContent).toContain("BADGES");

    const roleButton = Array.from(panel!.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]'))
      .find((btn) => btn.textContent?.includes("Coordinateur"));
    expect(roleButton).toBeDefined();
    await act(async () => {
      roleButton!.click();
    });
    expect(mocks.mutation.handleActiveRoleMutation).toHaveBeenCalledWith("coordinateur");
  });

  it("closes open mobile and desktop dropdowns when crossing the 768px breakpoint", async () => {
    let mediaChangeListener: (() => void) | null = null;
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 768px)",
      addEventListener: (_event: string, listener: () => void) => {
        mediaChangeListener = listener;
      },
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<SharedAccountHarness identity={makeIdentity()} />);
    });

    const mobileTrigger = host.querySelector<HTMLButtonElement>('button[aria-label="Menu du compte"]')!;
    await act(async () => {
      mobileTrigger.click();
    });
    expect(host.querySelector("#mobile-account-menu-panel")).not.toBeNull();

    expect(mediaChangeListener).not.toBeNull();
    await act(async () => {
      mediaChangeListener!();
    });
    expect(host.querySelector("#mobile-account-menu-panel")).toBeNull();

    const desktopRoleTrigger = host.querySelector<HTMLButtonElement>('button[aria-label="Menu du profil actif"]')!;
    await act(async () => {
      desktopRoleTrigger.click();
    });
    expect(host.querySelector("#account-role-menu-panel")).not.toBeNull();

    await act(async () => {
      mediaChangeListener!();
    });
    expect(host.querySelector("#account-role-menu-panel")).toBeNull();
  });

  it("surfaces role mutation error inside MobileAccountMenu", async () => {
    mocks.mutation.profileError = "Erreur de bascule";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(
        <MobileAccountMenu
          identity={makeIdentity({ badges: [] })}
          activityStatus="inactive"
          accountHeader={<div>Header</div>}
        />,
      );
    });

    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[aria-label="Menu du compte"]')!.click();
    });
    expect(host.textContent).toContain("Erreur de bascule");
    expect(host.textContent).not.toContain("BADGES");
  });
});
