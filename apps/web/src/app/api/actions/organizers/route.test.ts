import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const adminAccessErrorJsonResponseMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: adminAccessErrorJsonResponseMock,
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("GET /api/actions/organizers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    adminAccessErrorJsonResponseMock.mockImplementation((access: { status: number }) => new Response("access denied", { status: access.status }));
    unauthorizedJsonResponseMock.mockReturnValue(new Response("unauthorized", { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: selectMock.mockImplementation((projection: string) => {
          expect(projection).toBe("id, name, normalized_name, organizer_type");
          expect(projection).not.toContain("created_by_clerk_id");
          return {
            eq() { return this; },
            order() { return this; },
            limit: async () => ({
              data: [{
                id: "persisted-1",
                name: "Collectif Rivière",
                normalized_name: "collectif riviere",
                organizer_type: "collective",
                created_by_clerk_id: "must-not-leak",
              }],
                error: null,
              }),
          };
        }),
      }),
    });
  });

  it("returns only the public organizer projection", async () => {
    const response = await GET(new Request("http://localhost/api/actions/organizers?type=collective&q=rivière"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      items: [{
        id: "persisted-1",
        name: "Collectif Rivière",
        organizerType: "collective",
        source: "user_created",
        locationLabel: null,
      }],
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
  });
});

describe("POST /api/actions/organizers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    adminAccessErrorJsonResponseMock.mockImplementation((access: { status: number }) => new Response("access denied", { status: access.status }));
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn() });
  });

  it("creates a canonical organizer independently of action publication", async () => {
    const insertMock = vi.fn();
    const created = {
      id: "created-association",
      name: "Collectif Rivière",
      normalized_name: "collectif riviere",
      organizer_type: "association",
    };
    const selectChain = {
      eq() { return this; },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const insertChain = {
      select() { return this; },
      single: async () => ({ data: created, error: null }),
    };
    insertMock.mockImplementation((value: unknown) => {
      expect(value).toMatchObject({
        name: "Collectif Rivière",
        normalized_name: "collectif riviere",
        organizer_type: "association",
        created_by_clerk_id: "admin-1",
      });
      return insertChain;
    });
    getSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        expect(table).toBe("organizer_directory_entries");
        return {
          select() { return selectChain; },
          insert: insertMock,
        };
      },
    });

    const response = await POST(new Request("http://localhost/api/actions/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Collectif Rivière", organizerType: "association" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      organizer: { id: "created-association", name: "Collectif Rivière", organizerType: "association" },
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing static catalog entry instead of inserting a duplicate", async () => {
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => { throw new Error("static catalog reuse must not query the database"); }),
    });

    const response = await POST(new Request("http://localhost/api/actions/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "World Cleanup Day France", organizerType: "association" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.organizer).toMatchObject({
      id: expect.any(String),
      name: "World Cleanup Day France",
      organizerType: "association",
    });
  });

  it("inserts an unknown name only through the explicit command", async () => {
    const insertMock = vi.fn();
    insertMock.mockReturnValue({
      select() { return this; },
      single: async () => ({
        data: {
          id: "created-unknown",
          name: "Structure inconnue",
          normalized_name: "structure inconnue",
          organizer_type: "association",
        },
        error: null,
      }),
    });
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        insert: insertMock,
      }),
    });

    const response = await POST(new Request("http://localhost/api/actions/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Structure inconnue", organizerType: "association" }),
    }));

    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid types and names before persistence", async () => {
    const fromMock = vi.fn();
    getSupabaseServerClientMock.mockReturnValue({ from: fromMock });

    const invalidType = await POST(new Request("http://localhost/api/actions/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Une structure", organizerType: "spontaneous" }),
    }));
    const invalidName = await POST(new Request("http://localhost/api/actions/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "•••", organizerType: "association" }),
    }));

    expect(invalidType.status).toBe(422);
    expect(invalidName.status).toBe(422);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("refuses unauthenticated and non-admin active roles", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const unauthorized = await POST(new Request("http://localhost/api/actions/organizers", { method: "POST" }));
    expect(unauthorized.status).toBe(401);

    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    const forbidden = await POST(new Request("http://localhost/api/actions/organizers", { method: "POST" }));
    expect(forbidden.status).toBe(403);
    expect(adminAccessErrorJsonResponseMock).toHaveBeenCalledTimes(2);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
