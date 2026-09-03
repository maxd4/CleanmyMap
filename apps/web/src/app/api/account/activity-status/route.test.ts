import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: authzMock,
}));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));

function setupClerk(initialUnsafeMetadata: Record<string, unknown>) {
  const getUser = vi.fn().mockResolvedValue({
    id: "user-1",
    unsafeMetadata: initialUnsafeMetadata,
  });
  const updateUser = vi.fn().mockImplementation(async (_id, patch) => ({
    id: "user-1",
    unsafeMetadata: patch.unsafeMetadata,
  }));
  clerkClientMock.mockResolvedValue({ users: { getUser, updateUser } });
  return { getUser, updateUser };
}

describe("PATCH /api/account/activity-status", () => {
  beforeEach(() => {
    authzMock.mockResolvedValue({ ok: true, userId: "user-1" });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("requires authentication", async () => {
    authzMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Authentification requise.",
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/account/activity-status", {
        method: "PATCH",
        body: JSON.stringify({ activityStatus: "inactive" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid or extra-field payload before touching Clerk", async () => {
    setupClerk({ keep: "value" });
    const { PATCH } = await import("./route");

    const invalidResponse = await PATCH(
      new Request("http://localhost/api/account/activity-status", {
        method: "PATCH",
        body: JSON.stringify({ activityStatus: "away" }),
      }),
    );
    const extraFieldResponse = await PATCH(
      new Request("http://localhost/api/account/activity-status", {
        method: "PATCH",
        body: JSON.stringify({ activityStatus: "active", role: "admin" }),
      }),
    );

    expect(invalidResponse.status).toBe(400);
    expect(extraFieldResponse.status).toBe(400);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it.each(["active", "inactive"] as const)(
    "persists %s while preserving every other unsafe metadata field",
    async (activityStatus) => {
      const initialUnsafeMetadata = {
        activity_status: activityStatus === "active" ? "inactive" : "active",
        keep: "value",
        nested: { preserved: true },
      };
      const { getUser, updateUser } = setupClerk(initialUnsafeMetadata);

      const { PATCH } = await import("./route");
      const response = await PATCH(
        new Request("http://localhost/api/account/activity-status", {
          method: "PATCH",
          body: JSON.stringify({ activityStatus }),
        }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ activityStatus });
      expect(getUser).toHaveBeenCalledWith("user-1");
      expect(updateUser).toHaveBeenCalledWith("user-1", {
        unsafeMetadata: {
          ...initialUnsafeMetadata,
          activity_status: activityStatus,
        },
      });
    },
  );
});
