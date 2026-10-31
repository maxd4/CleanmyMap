import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadRetrospectiveWriteContextMock = vi.hoisted(() => vi.fn());
const loadActionRetrospectiveForActorMock = vi.hoisted(() => vi.fn());
const saveActionRetrospectiveMock = vi.hoisted(() => vi.fn());
const publishActionRetrospectiveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/actions/action-retrospectives", () => ({
  loadActionRetrospectiveForActor: loadActionRetrospectiveForActorMock,
  saveActionRetrospective: saveActionRetrospectiveMock,
  publishActionRetrospective: publishActionRetrospectiveMock,
}));
vi.mock("./route-access", () => ({
  loadRetrospectiveWriteContext: loadRetrospectiveWriteContextMock,
  retrospectiveOperationError: (error: unknown) => Response.json({ error: error instanceof Error ? error.message : "operation failed" }, { status: 500 }),
}));

const editor = {
  thanksMessage: "Merci",
  workedWell: "Le groupe était ponctuel",
  blockers: null,
  improveNextTime: null,
  publishedAt: null,
  updatedAt: "2026-10-31T10:00:00.000Z",
};

describe("/api/actions/[actionId]/retrospective", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "creator-1" });
    getSupabaseServerClientMock.mockReturnValue({ rpc: vi.fn() });
    loadRetrospectiveWriteContextMock.mockResolvedValue({ action: { id: "action-1" }, organizerIds: [] });
    loadActionRetrospectiveForActorMock.mockResolvedValue(editor);
    saveActionRetrospectiveMock.mockResolvedValue(editor);
    publishActionRetrospectiveMock.mockResolvedValue({ ...editor, publishedAt: "2026-10-31T10:01:00.000Z" });
  });

  it("fails closed for anonymous requests before loading the action", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(401);
    expect(loadRetrospectiveWriteContextMock).not.toHaveBeenCalled();
  });

  it("keeps the private editor projection behind the canonical access context", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ retrospective: editor });
    expect(loadRetrospectiveWriteContextMock).toHaveBeenCalledWith(expect.anything(), "action-1", "creator-1");
  });

  it("validates and saves a normalized draft without exposing private identity", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thanksMessage: " Merci ", workedWell: "Groupe ponctuel" }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    expect(response.status).toBe(200);
    expect(saveActionRetrospectiveMock).toHaveBeenCalledWith(
      expect.anything(),
      "action-1",
      "creator-1",
      { thanksMessage: " Merci ", workedWell: "Groupe ponctuel" },
    );
    expect(await response.json()).not.toHaveProperty("authoredByClerkId");
  });

  it("rejects an over-limit payload before the write RPC", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workedWell: "x".repeat(1001) }),
      }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    expect(response.status).toBe(422);
    expect(saveActionRetrospectiveMock).not.toHaveBeenCalled();
  });

  it("delegates publication and never accepts a client-supplied publication state", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ publishedAt: "forged" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(publishActionRetrospectiveMock).toHaveBeenCalledWith(expect.anything(), "action-1", "creator-1");
    expect(await response.json()).toEqual({ retrospective: { ...editor, publishedAt: "2026-10-31T10:01:00.000Z" } });
  });

  it("returns the access decision from the canonical context", async () => {
    loadRetrospectiveWriteContextMock.mockResolvedValue(Response.json({ error: "forbidden" }, { status: 403 }));
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
    expect(publishActionRetrospectiveMock).not.toHaveBeenCalled();
  });
});
