import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clerk: { isLoaded: true, user: null as unknown },
  preferences: { locale: "fr" as const, displayMode: "standard" as const, setDisplayMode: vi.fn() },
  router: { replace: vi.fn(), refresh: vi.fn() },
}));

vi.mock("@clerk/nextjs", () => ({ useUser: () => mocks.clerk }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => mocks.preferences,
}));

import { useAccountSetupController, type AccountSetupFormProps } from "./use-account-setup-controller";
import type { TerritoryLocationSelection } from "@/lib/user-location-preference";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type HookProps = AccountSetupFormProps;
type HookResult = ReturnType<typeof useAccountSetupController>;

function location(label: string, level: TerritoryLocationSelection["level"] = "commune"): TerritoryLocationSelection {
  return {
    country: "France",
    level,
    label,
    subtitle: null,
    arrondissement: level === "arrondissement" ? 10 : null,
    arrondissementCity: level === "arrondissement" ? "Paris" : null,
  };
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
    externalAccounts: [],
    unsafeMetadata: {},
    update: vi.fn().mockResolvedValue(undefined),
    updateMetadata: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function props(overrides: Partial<HookProps> = {}): HookProps {
  return {
    initialProfile: "benevole",
    initialRole: "admin",
    clerkReachable: true,
    ...overrides,
  };
}

function renderHook(initialProps: HookProps) {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;
  function Harness(nextProps: HookProps) {
    result = useAccountSetupController(nextProps);
    return null;
  }
  act(() => {
    renderer = create(React.createElement(Harness, initialProps));
  });
  return {
    get result() { return result; },
    update(nextProps: HookProps) {
      act(() => renderer.update(React.createElement(Harness, nextProps)));
    },
    unmount() { act(() => renderer.unmount()); },
  };
}

describe("useAccountSetupController", () => {
  beforeEach(() => {
    mocks.clerk.isLoaded = true;
    mocks.clerk.user = user();
    mocks.preferences.displayMode = "standard";
    mocks.preferences.setDisplayMode.mockReset();
    mocks.router.replace.mockReset();
    mocks.router.refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  it("expose l'état Clerk en chargement ou sans utilisateur et ne persiste pas avant connexion", async () => {
    mocks.clerk.isLoaded = false;
    mocks.clerk.user = null;
    const hook = renderHook(props());
    expect(hook.result.isLoaded).toBe(false);
    expect(hook.result.user).toBeNull();
    await act(async () => { await hook.result.handleSubmit(); });
    expect(hook.result.error?.message).toContain("Compte introuvable");
    expect(mocks.router.replace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("hydrate les noms Google, les métadonnées historiques et les deux localisations", async () => {
    mocks.clerk.user = user({
      firstName: null,
      lastName: null,
      externalAccounts: [{ provider: "oauth_google", firstName: "Grace", lastName: "Hopper" }],
      unsafeMetadata: { displayNameMode: "pseudo" },
    });
    const hook = renderHook(props({
      initialDisplayNameMode: null,
      initialResidence: location("Paris"),
      initialWork: location("Lyon"),
    }));
    await act(async () => { await Promise.resolve(); });
    expect(hook.result.firstName).toBe("Grace");
    expect(hook.result.lastName).toBe("Hopper");
    expect(hook.result.displayNameMode).toBe("pseudo");
    expect(hook.result.residence?.label).toBe("Paris");
    expect(hook.result.work?.label).toBe("Lyon");
    expect(hook.result.selectedDisplayMode).toBe("standard");
    hook.unmount();
  });

  it("rejette un profil initial non disponible et affiche les erreurs après interaction", () => {
    const hook = renderHook(props({ initialProfile: "max", initialRole: "benevole" }));
    expect(hook.result.selectedProfile).toBe("benevole");
    act(() => {
      hook.result.handleFirstNameChange("");
      hook.result.handleLastNameChange("");
    });
    act(() => { hook.result.handleNext(); });
    expect(hook.result.currentStep).toBe("identity");
    expect(hook.result.firstNameError).toBe("Renseignez votre prénom.");
    expect(hook.result.shouldShowFieldError("firstName")).toBe(true);
    hook.unmount();
  });

  it("n'avance pas pendant une sauvegarde et navigue selon les modes navigate/refresh", async () => {
    const hook = renderHook(props({ initialResidence: location("Paris") }));
    act(() => { hook.result.handleNext(); });
    act(() => { hook.result.handleNext(); });
    expect(hook.result.currentStep).toBe("location");
    const currentUser = mocks.clerk.user as ReturnType<typeof user>;
    await act(async () => { await hook.result.handleSubmit(); });
    expect(currentUser.update).toHaveBeenCalledWith({ firstName: "Ada", lastName: "Lovelace" });
    expect(mocks.router.replace).toHaveBeenCalledWith("/profil");
    hook.unmount();

    mocks.router.replace.mockReset();
    const refreshHook = renderHook(props({ submitMode: "refresh" }));
    act(() => { refreshHook.result.handleNext(); });
    act(() => { refreshHook.result.handleNext(); });
    await act(async () => { await refreshHook.result.handleSubmit(); });
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.router.refresh).toHaveBeenCalled();
    refreshHook.unmount();
  });

  it("reprend une persistance partielle sans répéter les étapes déjà confirmées", async () => {
    const currentUser = mocks.clerk.user as ReturnType<typeof user>;
    currentUser.updateMetadata
      .mockRejectedValueOnce(new Error("metadata indisponible"))
      .mockResolvedValue(undefined);
    const hook = renderHook(props({ initialResidence: location("Paris") }));
    act(() => { hook.result.handleNext(); });
    act(() => { hook.result.handleNext(); });
    await act(async () => { await hook.result.handleSubmit(); });
    expect(hook.result.error).not.toBeNull();
    await act(async () => { await hook.result.handleSubmit(); });
    expect(currentUser.update).toHaveBeenCalledOnce();
    expect(currentUser.updateMetadata).toHaveBeenCalledTimes(2);
    expect(hook.result.error).toBeNull();
    expect(mocks.router.replace).toHaveBeenCalledOnce();
    hook.unmount();
  });
});
