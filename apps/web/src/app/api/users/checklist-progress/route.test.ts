import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getChecklistProgressMock = vi.hoisted(() => vi.fn());
const upsertChecklistProgressMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/sections/checklist-progress-store", () => ({
  getChecklistProgress: getChecklistProgressMock,
  upsertChecklistProgress: upsertChecklistProgressMock,
}));

describe("GET /api/users/checklist-progress", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getChecklistProgressMock.mockResolvedValue(null);
  });

  it("returns a nullable entry when the authenticated user has no progression", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request(
      "http://localhost/api/users/checklist-progress?checklistId=action-preparation",
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", entry: null });
    expect(getChecklistProgressMock).toHaveBeenCalledWith("user-1", "action-preparation");
  });
});
