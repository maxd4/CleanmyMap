import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const getSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const requireSupabaseClerkRlsClientMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getDevAuthBypassSessionMock = vi.hoisted(() => vi.fn());
const revalidateTagMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());
const updateUserMetadataMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  requireAuthenticatedAccess: vi.fn().mockResolvedValue({ ok: true, userId: "user-1" }),
}));

vi.mock("@/lib/authz-identity", () => ({
  getDevAuthBypassSession: getDevAuthBypassSessionMock,
}));

vi.mock("@/lib/supabase/clerk-rls", () => ({
  getSupabaseClerkRlsClient: getSupabaseClerkRlsClientMock,
  requireSupabaseClerkRlsClient: requireSupabaseClerkRlsClientMock,
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}));

describe("PATCH /api/users/profile/display-name-mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getDevAuthBypassSessionMock.mockResolvedValue(null);
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-1",
      displayName: "Ada Admin",
      displayNameMode: "full_name",
      handle: "ada_admin",
      username: "ada_admin",
      firstName: "Ada",
      email: "ada@example.com",
    });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: "Ada",
          lastName: "Admin",
          username: "ada_admin",
        }),
        updateUserMetadata: updateUserMetadataMock,
      },
    });

    upsertMock.mockResolvedValue({ error: null });
    const supabaseMock = {
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    };
    getSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock);
    requireSupabaseClerkRlsClientMock.mockResolvedValue(supabaseMock);
    updateUserMetadataMock.mockResolvedValue({
      id: "user-1",
      firstName: "Ada",
      lastName: "Admin",
      unsafeMetadata: { display_name_mode: "full_name" },
    });
  });

  it("returns the current identity payload for the active user", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const body = (await response.json()) as {
      userId?: string;
      displayName?: string;
      displayNameMode?: string;
      handle?: string;
    };

    expect(response.status).toBe(200);
    expect(body.userId).toBe("user-1");
    expect(body.displayName).toBe("Ada Admin");
    expect(body.displayNameMode).toBe("full_name");
    expect(body.handle).toBe("ada_admin");
    expect(getCurrentUserIdentityMock).toHaveBeenCalledWith({ userId: "user-1" });
  }, 15000);

  it("updates the display name mode and derived display name", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "pseudo" }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      displayNameMode?: string;
      displayName?: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("updated");
    expect(body.displayNameMode).toBe("pseudo");
    expect(body.displayName).toBe("ada_admin");
    expect(updateUserMetadataMock).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: { display_name_mode: "pseudo" },
    });
  });

  it("uses both Clerk name fields for full_name", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "full_name" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.displayName).toBe("Ada Admin");
  });

  it("does not report success when Clerk metadata persistence fails", async () => {
    updateUserMetadataMock.mockRejectedValueOnce(new Error("Clerk unavailable"));
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "pseudo" }),
      }),
    );
    expect(response.status).toBe(500);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns an explicit recoverable state when Supabase projection fails", async () => {
    upsertMock.mockResolvedValueOnce({ error: new Error("Supabase unavailable") });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "pseudo" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe("clerk_updated_supabase_sync_pending");
  });

  it("returns the same recoverable state on a Supabase network exception", async () => {
    upsertMock.mockRejectedValueOnce(new Error("network failure"));
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "pseudo" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe("clerk_updated_supabase_sync_pending");
  });

  it("fails closed when the Clerk JWT accessToken is unavailable for the RLS flow", async () => {
    requireSupabaseClerkRlsClientMock.mockRejectedValue(
      new Error("Clerk/Supabase JWT accessToken unavailable for a required RLS flow."),
    );

    const { PATCH } = await import("./route");

    const response = await PATCH(
      new Request("http://localhost/api/users/profile/display-name-mode", {
        method: "PATCH",
        body: JSON.stringify({ displayNameMode: "pseudo" }),
      }),
    );

    const body = (await response.json()) as {
      error?: string;
      hint?: string;
    };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Connexion sécurisée indisponible");
    expect(body.hint).toContain("JWT Clerk valide");
  });
});
