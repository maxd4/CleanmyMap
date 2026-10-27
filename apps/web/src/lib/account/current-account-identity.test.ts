import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("fetchCurrentAccountIdentity", () => {
  it("normalizes a valid projection and fails closed on untrusted fields", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "user_ABC123",
        displayName: " Ada Lovelace ",
        username: " ada ",
        firstName: " Ada ",
        lastName: " Lovelace ",
        currentLevel: 2.9,
        role: "unknown-role",
        activeProfile: "admin",
        actorNameOptions: ["Ada", "Lovelace"],
        badges: [
          { id: "verified", label: "Verified", icon: "check" },
          { id: "invalid", label: "Invalid" },
        ],
        locationPreference: { arrondissement: 1, locationType: "residence" },
      }),
    });

    const { fetchCurrentAccountIdentity } = await import("./current-account-identity");
    await expect(fetchCurrentAccountIdentity()).resolves.toEqual({
      userId: "user_ABC123",
      displayName: " Ada Lovelace ",
      displayNameMode: "full_name",
      handle: "user_abc123",
      username: "ada",
      firstName: "Ada",
      email: null,
      currentLevel: 2,
      actorNameOptions: ["Ada", "Lovelace"],
      role: "benevole",
      activeRole: "benevole",
      activeProfile: "benevole",
      badges: [{ id: "verified", label: "Verified", icon: "check" }],
      locationPreference: { arrondissement: 1, locationType: "residence" },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/users/profile/display-name-mode", {
      headers: { Accept: "application/json" },
    });
  });

  it("uses a fallback handle and preserves a valid privileged active profile", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "user_ABC123",
        displayName: "Ada",
        displayNameMode: "pseudo",
        activeProfile: "admin",
        role: "admin",
        currentLevel: -2.8,
        actorNameOptions: "not-an-array",
        badges: null,
      }),
    });

    const { fetchCurrentAccountIdentity } = await import("./current-account-identity");
    await expect(fetchCurrentAccountIdentity()).resolves.toMatchObject({
      handle: "user_abc123",
      displayNameMode: "pseudo",
      currentLevel: 1,
      actorNameOptions: ["user_abc123"],
      role: "admin",
      activeRole: "admin",
      activeProfile: "admin",
      badges: [],
      username: null,
    });
  });

  it.each([
    ["http error", async () => ({ ok: false, json: async () => ({}) })],
    ["malformed payload", async () => ({ ok: true, json: async () => ({ userId: "user-1" }) })],
    ["invalid json", async () => ({ ok: true, json: async () => { throw new Error("invalid json"); } })],
    ["network error", async () => { throw new Error("network error"); }],
  ])("returns null for %s", async (_label, responseFactory) => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(responseFactory);

    const { fetchCurrentAccountIdentity } = await import("./current-account-identity");
    await expect(fetchCurrentAccountIdentity()).resolves.toBeNull();
  });
});
