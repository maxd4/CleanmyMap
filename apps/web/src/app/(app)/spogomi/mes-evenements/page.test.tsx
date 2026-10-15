import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  listSpogomiEventsForCurrentOrganizer: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/spogomi/organizer-service", () => ({ listSpogomiEventsForCurrentOrganizer: mocks.listSpogomiEventsForCurrentOrganizer }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("h1", null, title) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "agir" }) }));
vi.mock("@/components/spogomi/spogomi-organizer-dashboard", () => ({
  SpogomiOrganizerDashboard: ({ initialEvents, view }: { initialEvents: Array<{ id: string }>; view: string }) => React.createElement("div", { "data-event-count": initialEvents.length, "data-view": view }),
}));

import SpogomiOrganizerEventsPage from "./page";

describe("/spogomi/mes-evenements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSpogomiEventsForCurrentOrganizer.mockResolvedValue([{ id: "event-1" }]);
  });

  it("requires authentication before loading the organizer catalog", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiOrganizerEventsPage()).rejects.toMatchObject({ digest: expect.stringContaining(encodeURIComponent("/spogomi/mes-evenements")) });
    expect(mocks.listSpogomiEventsForCurrentOrganizer).not.toHaveBeenCalled();
  });

  it("passes the server-filtered catalog to the reusable events view", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    const markup = renderToStaticMarkup(await SpogomiOrganizerEventsPage());
    expect(markup).toContain('data-event-count="1"');
    expect(markup).toContain('data-view="events"');
    expect(mocks.listSpogomiEventsForCurrentOrganizer).toHaveBeenCalledWith("user-1");
  });
});
