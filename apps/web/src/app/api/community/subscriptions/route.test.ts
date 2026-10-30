import { beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authzMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

import { GET, POST } from "./route";
import { DELETE, PATCH } from "./[subscriptionId]/route";

const userId = "user-1";
const subscriptionId = "11111111-1111-4111-8111-111111111111";
const row = {
  id: subscriptionId,
  user_id: userId,
  kind: "territory" as const,
  territory_zone_name: "1er arrondissement",
  topic_id: null,
  cadence: "weekly" as const,
  enabled: true,
  created_at: "2026-10-30T08:00:00.000Z",
  updated_at: "2026-10-30T08:00:00.000Z",
};

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function configureClient(...queries: ReturnType<typeof query>[]) {
  const from = vi.fn();
  queries.forEach((candidate) => from.mockReturnValueOnce(candidate));
  getSupabaseServerClientMock.mockReturnValue({ from });
  return { from };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/community/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("community subscriptions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzMock.mockResolvedValue({ ok: true, userId });
  });

  it("requires an authenticated owner session", async () => {
    authzMock.mockResolvedValue({ ok: false });

    expect((await GET()).status).toBe(401);
    expect((await POST(jsonRequest({ kind: "topic", topicId: "needs", cadence: "weekly" }))).status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("lists only the current member's subscriptions", async () => {
    const subscriptions = query({ data: [row], error: null });
    const { from } = configureClient(subscriptions);

    const response = await GET();

    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual([row]);
    expect(from).toHaveBeenCalledWith("community_subscriptions");
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(subscriptions.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("rejects an invalid target before privileged persistence", async () => {
    const response = await POST(jsonRequest({
      kind: "territory",
      territoryZoneName: "territoire imaginaire",
      topicId: "needs",
      cadence: "weekly",
    }));

    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("normalizes a territory and creates an explicit subscription", async () => {
    const find = query({ data: null, error: null });
    const insert = query({ data: row, error: null });
    configureClient(find, insert);

    const response = await POST(jsonRequest({
      kind: "territory",
      territoryZoneName: " Paris 1ER ",
      topicId: null,
      cadence: "weekly",
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("created");
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: userId,
      kind: "territory",
      territory_zone_name: "1er arrondissement",
      topic_id: null,
      enabled: true,
    }));
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
  });

  it("converges a concurrent duplicate insert to the unique existing row", async () => {
    const find = query({ data: null, error: null });
    const insert = query({ data: null, error: { code: "23505", message: "duplicate key" } });
    const concurrentFind = query({ data: row, error: null });
    const update = query({ data: { ...row, cadence: "daily" }, error: null });
    configureClient(find, insert, concurrentFind, update);

    const response = await POST(jsonRequest({
      kind: "territory",
      territoryZoneName: "1er arrondissement",
      topicId: null,
      cadence: "daily",
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("updated");
    expect(update.update).toHaveBeenCalledWith({ cadence: "daily", enabled: true });
  });

  it("keeps PATCH and DELETE owner-scoped for IDOR protection", async () => {
    const patchQuery = query({ data: { ...row, enabled: false }, error: null });
    const deleteQuery = query({ data: { id: subscriptionId }, error: null });
    configureClient(patchQuery, deleteQuery);

    const patchResponse = await PATCH(
      new Request("http://localhost/api/community/subscriptions/" + subscriptionId, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }),
      { params: Promise.resolve({ subscriptionId }) },
    );
    const deleteResponse = await DELETE(
      new Request("http://localhost/api/community/subscriptions/" + subscriptionId, { method: "DELETE" }),
      { params: Promise.resolve({ subscriptionId }) },
    );

    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(getSupabaseServerClientMock).toHaveBeenNthCalledWith(1, true);
    expect(getSupabaseServerClientMock).toHaveBeenNthCalledWith(2, true);
    expect(patchQuery.eq).toHaveBeenCalledWith("user_id", userId);
    expect(deleteQuery.eq).toHaveBeenCalledWith("user_id", userId);
  });
});
