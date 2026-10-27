import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, clerkClient: mocks.clerkClient }));

import {
  getCurrentUserLocationPreference,
  getCurrentUserLocationPreferences,
} from "./user-location";

const residence = {
  country: "France",
  level: "arrondissement",
  label: "Paris 1er",
  subtitle: null,
  arrondissement: 1,
  arrondissementCity: "Paris",
};

describe("current user location preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty preferences for an anonymous request", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(getCurrentUserLocationPreferences()).resolves.toEqual({ residence: null, work: null });
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("reads canonical metadata and projects the residence preference", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          unsafeMetadata: { territoryPreferences: { residence, work: null } },
          publicMetadata: {},
          privateMetadata: {},
        }),
      },
    });

    await expect(getCurrentUserLocationPreferences()).resolves.toEqual({ residence, work: null });
    await expect(getCurrentUserLocationPreference()).resolves.toEqual({
      arrondissement: 1,
      locationType: "residence",
    });
  });

  it("continues through metadata layers and falls back to work", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          unsafeMetadata: {},
          publicMetadata: { territoryPreferences: { residence: null, work: { ...residence, label: "Paris 2e", arrondissement: 2 } } },
          privateMetadata: {},
        }),
      },
    });

    await expect(getCurrentUserLocationPreference()).resolves.toEqual({
      arrondissement: 2,
      locationType: "work",
    });
  });

  it("fails closed when Clerk is unavailable", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockRejectedValue(new Error("Clerk unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getCurrentUserLocationPreferences()).resolves.toEqual({ residence: null, work: null });
    await expect(getCurrentUserLocationPreference()).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
