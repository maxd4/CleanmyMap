import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { z } from "zod";

type ClerkUserMock = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  unsafeMetadata: Record<string, unknown>;
};
type ClerkMethod<Args extends unknown[], Result> = Mock<(...args: Args) => Promise<Result>>;

type ClerkClientMock = {
  users: {
    getUser: ClerkMethod<[userId: string], ClerkUserMock>;
    updateUser: ClerkMethod<[userId: string, input: { firstName?: string; lastName?: string }], ClerkUserMock>;
    updateUserMetadata: ClerkMethod<[userId: string, input: { unsafeMetadata: Record<string, unknown> }], ClerkUserMock>;
  };
};

const accountResponseSchema = z.object({
  identity: z.object({ grantedRole: z.string(), activeRole: z.string(), currentLevel: z.number() }).passthrough(),
  onboarding: z.object({ completed: z.boolean() }).passthrough(),
  counts: z.object({
    registrations: z.number(),
    confirmedParticipations: z.number(),
    missions: z.number(),
    createdActions: z.number(),
  }),
}).passthrough();

const syncPendingResponseSchema = z.object({ status: z.literal("clerk_updated_supabase_sync_pending") }).passthrough();

const mobileAccessMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn<() => Promise<ClerkClientMock>>());
const serverClientMock = vi.hoisted(() => vi.fn());
const historyMock = vi.hoisted(() => vi.fn());
const progressionMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());
const enforceServerRateLimitForAuthenticatedUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mobileAccessMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverClientMock }));
vi.mock("@/lib/actions/participation/group-participation", () => ({ loadUserParticipationHistory: historyMock }));
vi.mock("@/lib/actions/participation/group-participation.helpers", () => ({ getActionTitle: vi.fn(() => null) }));
vi.mock("@/lib/gamification/progression-user-stats", () => ({ loadUserProgressionStats: progressionMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock }));
vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimitForAuthenticatedUser: enforceServerRateLimitForAuthenticatedUserMock,
}));

function makeSupabase() {
  const from = vi.fn((table: string) => {
    const terminal = table === "notification_preferences"
      ? { data: null, error: null }
      : table === "notification_information_mutes"
        ? { data: [], error: null }
        : { data: [], error: null };
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve(terminal)),
      maybeSingle: vi.fn(() => Promise.resolve(terminal)),
    };
    if (table === "notification_information_mutes") {
      chain.eq = vi.fn(() => Promise.resolve(terminal)) as unknown as typeof chain.eq;
    }
    return chain;
  });
  return {
    from,
    rpc: vi.fn(async () => ({ data: [], error: null })),
  };
}

describe("/api/mobile/account", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mobileAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    identityMock.mockResolvedValue({
      userId: "user-1",
      displayName: "Ada Curie",
      displayNameMode: "full_name",
      handle: "ada",
      firstName: "Ada",
      username: "ada",
      email: "ada@example.com",
      role: "benevole",
      activeRole: "benevole",
      currentLevel: 2,
    });
    historyMock.mockResolvedValue([]);
    progressionMock.mockResolvedValue({ totalActions: 0, validatedActions: 0, verifiedContributions: 0, totalKg: 0 });
    syncMock.mockResolvedValue({ id: "user-1", role_label: "benevole" });
    enforceServerRateLimitForAuthenticatedUserMock.mockResolvedValue(null);
    serverClientMock.mockReturnValue(makeSupabase());
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn<ClerkClientMock["users"]["getUser"]>().mockResolvedValue({
          id: "user-1",
          firstName: "Ada",
          lastName: "Curie",
          unsafeMetadata: { profileSetupCompleted: false },
        }),
        updateUser: vi.fn<ClerkClientMock["users"]["updateUser"]>().mockResolvedValue({
          id: "user-1",
          firstName: "Ada",
          lastName: "Curie",
          unsafeMetadata: { profileSetupCompleted: true },
        }),
        updateUserMetadata: vi.fn<ClerkClientMock["users"]["updateUserMetadata"]>().mockImplementation(async (_id, patch) => ({
          id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
          unsafeMetadata: {
            profileSetupCompleted: false,
            ...patch.unsafeMetadata,
          },
        })),
      },
    });
  });

  it("refuses a missing native bearer before reading account data", async () => {
    mobileAccessMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/mobile/account"));
    expect(response.status).toBe(401);
    expect(serverClientMock).not.toHaveBeenCalled();
  });

  it("projects the canonical identity and server-owned account data", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/mobile/account", { headers: { Authorization: "Bearer clerk" } }));
    const payload = accountResponseSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(payload.identity).toMatchObject({ grantedRole: "benevole", activeRole: "benevole", currentLevel: 2 });
    expect(payload.onboarding.completed).toBe(false);
    expect(payload.counts).toEqual({ registrations: 0, confirmedParticipations: 0, missions: 0, createdActions: 0 });
  });

  it("updates profile metadata through Clerk and synchronizes the canonical profile", async () => {
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/mobile/account", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", residenceLabel: "Paris", workLabel: null, completeOnboarding: true }),
    }));
    expect(response.status).toBe(200);
    expect(clerk.users.updateUser).toHaveBeenCalledWith("user-1", {
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const metadataCall = clerk.users.updateUserMetadata.mock.calls.at(-1);
    expect(metadataCall?.[0]).toBe("user-1");
    expect(metadataCall?.[1].unsafeMetadata).toMatchObject({
      profileSetupCompleted: true,
      territoryPreferences: {
        residence: { label: "Paris", country: "France" },
        work: null,
      },
    });
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it("rejects arbitrary role metadata fields before a Clerk mutation", async () => {
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/mobile/account", {
      method: "PATCH",
      headers: { Authorization: "Bearer clerk" },
      body: JSON.stringify({ role: "admin", publicMetadata: { role: "admin" } }),
    }));

    expect(response.status).toBe(422);
    expect(clerk.users.updateUser).not.toHaveBeenCalled();
    expect(clerk.users.updateUserMetadata).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("returns a recoverable partial state when Supabase projection is not confirmed", async () => {
    syncMock.mockResolvedValueOnce(null);
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/mobile/account", {
      method: "PATCH",
      headers: { Authorization: "Bearer clerk" },
      body: JSON.stringify({ firstName: "Ada" }),
    }));
    const body = syncPendingResponseSchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(body.status).toBe("clerk_updated_supabase_sync_pending");
    expect(clerk.users.updateUser).toHaveBeenCalledWith("user-1", { firstName: "Ada" });
  });

  it("fails closed when the distributed abuse protection is unavailable", async () => {
    enforceServerRateLimitForAuthenticatedUserMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "RATE_LIMIT_UNAVAILABLE" }), { status: 503 }),
    );
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/mobile/account", {
      method: "PATCH",
      headers: { Authorization: "Bearer clerk" },
      body: JSON.stringify({ firstName: "Ada" }),
    }));

    expect(response.status).toBe(503);
    expect(clerk.users.updateUser).not.toHaveBeenCalled();
  });
});
