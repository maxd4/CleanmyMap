import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

describe("GET /api/notifications", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ userId: null });
  });

  it("blocks the endpoint without a session", async () => {
    const { GET } = await import("./route");
    const response = await GET();

    const body = (await response.json()) as { error?: string };
    expect(response.status).toBe(401);
    expect(body.error).toBe("Vous devez vous reconnecter pour continuer.");
  });
});
