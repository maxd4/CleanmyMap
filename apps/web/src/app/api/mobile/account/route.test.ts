import { beforeEach, describe, expect, it, vi } from "vitest";

const mobileAccessMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const serverClientMock = vi.hoisted(() => vi.fn());
const historyMock = vi.hoisted(() => vi.fn());
const progressionMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mobileAccessMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverClientMock }));
vi.mock("@/lib/actions/participation/group-participation", () => ({ loadUserParticipationHistory: historyMock }));
vi.mock("@/lib/actions/participation/group-participation.helpers", () => ({ getActionTitle: vi.fn(() => null) }));
vi.mock("@/lib/gamification/progression-user-stats", () => ({ loadUserProgressionStats: progressionMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock }));

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
    serverClientMock.mockReturnValue(makeSupabase());
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user-1",
          firstName: "Ada",
          lastName: "Curie",
          unsafeMetadata: { profileSetupCompleted: false },
        }),
        updateUser: vi.fn().mockResolvedValue({
          id: "user-1",
          firstName: "Ada",
          lastName: "Curie",
          unsafeMetadata: { profileSetupCompleted: true },
        }),
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
    const payload = await response.json();
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
    expect(clerk.users.updateUser).toHaveBeenCalledWith("user-1", expect.objectContaining({
      firstName: "Ada",
      lastName: "Lovelace",
      unsafeMetadata: expect.objectContaining({
        profileSetupCompleted: true,
        territoryPreferences: expect.objectContaining({
          residence: expect.objectContaining({ label: "Paris", country: "France" }),
          work: null,
        }),
      }),
    }));
    expect(syncMock).toHaveBeenCalledTimes(1);
  });
});
