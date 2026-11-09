import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(),
  createSpogomiEvent: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAdminAccess: mocks.requireAdminAccess }));
vi.mock("@/lib/spogomi/preparation-service", () => ({ createSpogomiEvent: mocks.createSpogomiEvent }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/spogomi/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  idempotencyKey: "spogomi-route-test",
  name: "Edition test",
  locationLabel: "Paris",
  mode: "mixed",
  startsAt: "2099-01-01T10:00:00.000Z",
  endsAt: null,
};

describe("POST /api/spogomi/events authorization and validation boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({});
    mocks.createSpogomiEvent.mockResolvedValue({ eventId: "event-1", eventSlug: "edition-test", actionId: "action-1" });
  });

  it("returns 401 without a session", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await POST(request(validBody));
    expect(response.status).toBe(401);
    expect(mocks.createSpogomiEvent).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated identity with an insufficient active role", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(mocks.createSpogomiEvent).not.toHaveBeenCalled();
  });

  it("keeps Zod field details instead of collapsing validation to a generic body error", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    const response = await POST(request({ ...validBody, name: "", mode: "unknown" }));
    const payload = await response.json();
    expect(response.status).toBe(422);
    expect(payload.details.name).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(payload.details.mode).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it.each(["admin", "max"])("passes an authorized %s request to the service", async (activeRole) => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: `${activeRole}-1` });
    const response = await POST(request(validBody));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ eventId: "event-1", eventSlug: "edition-test" });
    expect(mocks.createSpogomiEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: `${activeRole}-1`, input: expect.objectContaining({ mode: "mixed" }) }));
  });
});
