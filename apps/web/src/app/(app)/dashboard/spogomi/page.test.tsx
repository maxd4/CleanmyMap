import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  listSpogomiEventsForOrganizer: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/spogomi/organizer-service", () => ({ listSpogomiEventsForOrganizer: mocks.listSpogomiEventsForOrganizer }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("h1", null, title) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "accueil-pilotage" }) }));
vi.mock("@/components/spogomi/spogomi-organizer-dashboard", () => ({
  SpogomiOrganizerDashboard: ({ initialEvents }: { initialEvents: Array<{ id: string }> }) => React.createElement("div", { "data-event-count": initialEvents.length }),
}));

import SpogomiOrganizerDashboardPage from "./page";

describe("/dashboard/spogomi access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({ server: true });
    mocks.listSpogomiEventsForOrganizer.mockResolvedValue([{ id: "authorized-event" }]);
  });

  it("does not query organizer events when authentication is refused", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiOrganizerDashboardPage()).rejects.toMatchObject({ digest: expect.stringContaining("/sign-in") });
    expect(mocks.listSpogomiEventsForOrganizer).not.toHaveBeenCalled();
  });

  it("passes only the server-filtered organizer projection to the private cockpit", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    const markup = renderToStaticMarkup(await SpogomiOrganizerDashboardPage());
    expect(markup).toContain('data-event-count="1"');
    expect(mocks.listSpogomiEventsForOrganizer).toHaveBeenCalledWith({ server: true }, "user-1");
  });
});
