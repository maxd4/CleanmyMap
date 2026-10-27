import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserAccountSetupRequirement: vi.fn(),
  getCurrentUserLocationPreferences: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  getCurrentUserRoleLabel: vi.fn(),
  getUserOptionalConsentEligibility: vi.fn(),
  getSafeAuthSession: vi.fn(),
}));

vi.mock("@/lib/auth/account-setup", () => ({
  getCurrentUserAccountSetupRequirement: mocks.getCurrentUserAccountSetupRequirement,
}));
vi.mock("@/lib/auth/user-location", () => ({
  getCurrentUserLocationPreferences: mocks.getCurrentUserLocationPreferences,
}));
vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
  getCurrentUserRoleLabel: mocks.getCurrentUserRoleLabel,
}));
vi.mock("@/lib/minor-consent-server", () => ({
  getUserOptionalConsentEligibility: mocks.getUserOptionalConsentEligibility,
}));
vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

import { loadAccountCompletionGateState } from "./account-completion-gate";

const requirement = {
  requiresSetup: true,
  setupCompleted: false,
  createdAt: 1,
  setupVersion: 2,
  reason: "initial_setup" as const,
};

const residence = {
  country: "France" as const,
  level: "arrondissement" as const,
  label: "Paris 1er",
  subtitle: null,
  arrondissement: 1 as const,
  arrondissementCity: "Paris" as const,
};

describe("loadAccountCompletionGateState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserAccountSetupRequirement.mockResolvedValue(requirement);
    mocks.getCurrentUserLocationPreferences.mockResolvedValue({ residence, work: null });
    mocks.getCurrentUserIdentity.mockResolvedValue({
      userId: "user-1",
      role: "admin",
      activeRole: "elu",
      handle: "ada",
      displayNameMode: "pseudo",
    });
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");
    mocks.getUserOptionalConsentEligibility.mockResolvedValue({ ageBand: "adult" });
  });

  it("returns null without a session and performs no privileged reads", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: true });
    await expect(loadAccountCompletionGateState()).resolves.toBeNull();
    expect(mocks.getCurrentUserIdentity).not.toHaveBeenCalled();
    expect(mocks.getCurrentUserAccountSetupRequirement).not.toHaveBeenCalled();
  });

  it("returns a safe degraded projection when Clerk is unavailable", async () => {
    await expect(loadAccountCompletionGateState({ userId: "user-1", clerkReachable: false })).resolves.toEqual({
      requirement: {
        requiresSetup: false,
        setupCompleted: true,
        createdAt: null,
        setupVersion: null,
        reason: null,
      },
      role: "anonymous",
      currentProfile: "benevole",
      clerkReachable: false,
      initialArrondissement: null,
      initialLocationType: null,
      initialResidence: null,
      initialWork: null,
    });
    expect(mocks.getCurrentUserIdentity).not.toHaveBeenCalled();
    expect(mocks.getUserOptionalConsentEligibility).not.toHaveBeenCalled();
  });

  it("projects the active role, location and consent state for a reachable account", async () => {
    await expect(loadAccountCompletionGateState({ userId: "user-1", clerkReachable: true })).resolves.toEqual({
      requirement,
      role: "admin",
      currentProfile: "elu",
      clerkReachable: true,
      initialHandle: "ada",
      initialDisplayNameMode: "pseudo",
      initialAgeBand: "adult",
      initialArrondissement: 1,
      initialLocationType: "residence",
      initialResidence: residence,
      initialWork: null,
    });
  });

  it("uses the role fallback and tolerates setup/location failures", async () => {
    mocks.getCurrentUserIdentity.mockRejectedValue(new Error("identity unavailable"));
    mocks.getCurrentUserRoleLabel.mockRejectedValue(new Error("role unavailable"));
    mocks.getCurrentUserAccountSetupRequirement.mockRejectedValue(new Error("setup unavailable"));
    mocks.getCurrentUserLocationPreferences.mockRejectedValue(new Error("location unavailable"));
    mocks.getUserOptionalConsentEligibility.mockResolvedValue({ ageBand: null });

    await expect(loadAccountCompletionGateState({ userId: "user-1", clerkReachable: true })).resolves.toMatchObject({
      role: "anonymous",
      currentProfile: "benevole",
      clerkReachable: true,
      initialAgeBand: null,
      initialArrondissement: null,
      initialLocationType: null,
    });
  });
});
