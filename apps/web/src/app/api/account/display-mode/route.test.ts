import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}));

describe("POST /api/account/display-mode", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ userId: "user-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists the display mode in Clerk metadata", async () => {
    const getUser = vi.fn().mockResolvedValue({
      id: "user-1",
      unsafeMetadata: { displayMode: "exhaustif" },
      publicMetadata: {},
      privateMetadata: {},
    });
    const updateUser = vi.fn().mockResolvedValue({
      id: "user-1",
      unsafeMetadata: { displayMode: "simplifie" },
      publicMetadata: {},
      privateMetadata: {},
    });
    clerkClientMock.mockResolvedValue({
      users: { getUser, updateUser },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/display-mode", {
        method: "POST",
        body: JSON.stringify({ displayMode: "simplifie" }),
      }),
    );

    const body = (await response.json()) as {
      displayMode?: string;
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body.displayMode).toBe("simplifie");
    expect(updateUser).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: { displayMode: "simplifie" },
    });
  });

  it("rejects invalid display modes", async () => {
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn(),
        updateUser: vi.fn(),
      },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/display-mode", {
        method: "POST",
        body: JSON.stringify({ displayMode: "admin" }),
      }),
    );

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(400);
    expect(body.error).toBe("Mode d'affichage invalide.");
  });

  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue({ userId: null });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn(),
        updateUser: vi.fn(),
      },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/account/display-mode", {
        method: "POST",
        body: JSON.stringify({ displayMode: "sobre" }),
      }),
    );

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});

