import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, clerkClient: mocks.clerkClient }));

import { getCurrentUserTerritoryLocationPreference } from "./user-territory";

describe("getCurrentUserTerritoryLocationPreference", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null without a session", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(getCurrentUserTerritoryLocationPreference()).resolves.toBeNull();
  });

  it("uses the first valid metadata layer", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          unsafeMetadata: { territoryLabel: "", territoryLocationType: "residence" },
          publicMetadata: {
            territoryLabel: "Paris 3e",
            territoryLocationType: "residence",
            parisArrondissement: 3,
          },
          privateMetadata: { territoryLabel: "Paris 4e", territoryLocationType: "work", parisArrondissement: 4 },
        }),
      },
    });

    await expect(getCurrentUserTerritoryLocationPreference()).resolves.toMatchObject({
      label: "Paris 3e",
      arrondissement: 3,
      locationType: "residence",
    });
  });

  it("fails closed when the provider cannot be read", async () => {
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.clerkClient.mockRejectedValue(new Error("provider unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getCurrentUserTerritoryLocationPreference()).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
