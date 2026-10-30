import { beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const clientMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authzMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: clientMock }));
vi.mock("@/lib/community/helper-skills-service", () => ({
  listCommunityHelperSkills: listMock,
  replaceCommunityHelperSkills: replaceMock,
}));

import { GET, PUT } from "./route";

const userId = "helper-user";
const row = {
  user_id: userId,
  category: "materiel" as const,
  created_at: "2026-10-30T10:00:00.000Z",
  updated_at: "2026-10-30T10:00:00.000Z",
};

function request(body: unknown) {
  return new Request("http://localhost/api/community/helper-skills", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("community helper skills API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzMock.mockResolvedValue({ ok: true, userId });
    clientMock.mockReturnValue({});
    listMock.mockResolvedValue([row]);
    replaceMock.mockResolvedValue([row]);
  });

  it("requires authentication for private reads and writes", async () => {
    authzMock.mockResolvedValue({ ok: false });

    expect((await GET()).status).toBe(401);
    expect((await PUT(request({ categories: ["materiel"] }))).status).toBe(401);
    expect(clientMock).not.toHaveBeenCalled();
  });

  it("reads only the session owner's categories", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect((await response.json()).categories).toEqual(["materiel"]);
    expect(listMock).toHaveBeenCalledWith(expect.anything(), userId);
  });

  it("validates the exact taxonomy and replaces atomically through the server service", async () => {
    const response = await PUT(request({ categories: ["transport", "cartographie"] }));

    expect(response.status).toBe(200);
    expect(replaceMock).toHaveBeenCalledWith(expect.anything(), userId, ["transport", "cartographie"]);
    expect((await response.json()).status).toBe("updated");
  });

  it("rejects unknown and duplicate categories before persistence", async () => {
    expect((await PUT(request({ categories: ["autre"] }))).status).toBe(422);
    expect((await PUT(request({ categories: ["materiel", "materiel"] }))).status).toBe(422);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not accept a client-owned user identity", async () => {
    const response = await PUT(request({ userId: "other-user", categories: ["materiel"] }));

    expect(response.status).toBe(422);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
