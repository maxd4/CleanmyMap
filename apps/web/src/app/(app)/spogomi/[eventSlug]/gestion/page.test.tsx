import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  loadSpogomiEventBySlugForOrganizer: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/spogomi/preparation-service", () => ({ loadSpogomiEventBySlugForOrganizer: mocks.loadSpogomiEventBySlugForOrganizer }));

import SpogomiManagementPage from "./page";

describe("legacy SPOGOMI management route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({ server: true });
  });

  it("keeps the authentication redirect pointed at the canonical space", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiManagementPage({ params: Promise.resolve({ eventSlug: "paris-2026" }) })).rejects.toMatchObject({
      digest: expect.stringContaining(encodeURIComponent("/spogomi/paris-2026/espace")),
    });
    expect(mocks.loadSpogomiEventBySlugForOrganizer).not.toHaveBeenCalled();
  });

  it("rechecks organizer ownership before redirecting a legacy deep link", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.loadSpogomiEventBySlugForOrganizer.mockResolvedValue({ id: "event-1", event_slug: "paris-2026" });
    await expect(SpogomiManagementPage({ params: Promise.resolve({ eventSlug: "paris-2026" }) })).rejects.toMatchObject({
      digest: expect.stringContaining("/spogomi/paris-2026/espace"),
    });
    expect(mocks.loadSpogomiEventBySlugForOrganizer).toHaveBeenCalledWith({ server: true }, "paris-2026", "user-1");
  });
});
