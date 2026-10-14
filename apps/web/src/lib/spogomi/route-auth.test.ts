import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/spogomi/preparation-service", () => ({ loadSpogomiEventForOrganizer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn(() => ({ id: "supabase" })) }));
vi.mock("@/lib/http/auth-responses", () => ({
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));

import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "./route-auth";

describe("SPOGOMI route authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves authorized, forbidden and not-found outcomes", async () => {
    vi.mocked(loadSpogomiEventForOrganizer).mockResolvedValueOnce({ id: "event-1", name: "Paris" } as never);
    await expect(loadAuthorizedSpogomiEvent("event-1", "organizer-1")).resolves.toMatchObject({
      authorized: { event: { id: "event-1" } },
    });

    vi.mocked(loadSpogomiEventForOrganizer).mockResolvedValueOnce(false);
    const forbidden = await loadAuthorizedSpogomiEvent("event-1", "other-user");
    expect("response" in forbidden.authorized && forbidden.authorized.response.status).toBe(403);

    vi.mocked(loadSpogomiEventForOrganizer).mockResolvedValueOnce(null);
    const missing = await loadAuthorizedSpogomiEvent("event-1", "other-user", "Missing event");
    expect("response" in missing.authorized && missing.authorized.response.status).toBe(404);
    await expect("response" in missing.authorized ? missing.authorized.response.json() : null).resolves.toEqual({ error: "Missing event" });
  });
});
