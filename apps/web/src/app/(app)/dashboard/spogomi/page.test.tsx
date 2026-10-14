import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));

import SpogomiOrganizerDashboardPage from "./page";

describe("/dashboard/spogomi access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not query organizer events when authentication is refused", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiOrganizerDashboardPage()).rejects.toMatchObject({ digest: expect.stringContaining("/sign-in") });
  });

  it("redirects authenticated visitors to the canonical organizer list", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    await expect(SpogomiOrganizerDashboardPage()).rejects.toMatchObject({ digest: expect.stringContaining("/spogomi/mes-evenements") });
  });
});
