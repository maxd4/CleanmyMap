import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  listSpogomiEventsForCurrentUser: vi.fn(),
  listSpogomiEventChangesForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/spogomi/personal-events-service", () => ({ listSpogomiEventsForCurrentUser: mocks.listSpogomiEventsForCurrentUser, listSpogomiEventChangesForCurrentUser: mocks.listSpogomiEventChangesForCurrentUser }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("h1", null, title) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "agir" }) }));
vi.mock("@/components/spogomi/spogomi-personal-events-list", () => ({
  SpogomiPersonalEventsList: ({ events }: { events: Array<{ id: string }> }) => React.createElement("div", { "data-event-count": events.length, "data-testid": "personal-events" }),
}));

import SpogomiPersonalEventsPage from "./page";

describe("/spogomi/mes-evenements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSpogomiEventsForCurrentUser.mockResolvedValue([{ id: "event-1" }]);
    mocks.listSpogomiEventChangesForCurrentUser.mockResolvedValue([]);
  });

  it("requires authentication before loading the personal catalog", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiPersonalEventsPage()).rejects.toMatchObject({ digest: expect.stringContaining(encodeURIComponent("/spogomi/mes-evenements")) });
    expect(mocks.listSpogomiEventsForCurrentUser).not.toHaveBeenCalled();
    expect(mocks.listSpogomiEventChangesForCurrentUser).not.toHaveBeenCalled();
  });

  it("passes the server-filtered catalog to the reusable events view", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    const markup = renderToStaticMarkup(await SpogomiPersonalEventsPage());
    expect(markup).toContain('data-event-count="1"');
    expect(markup).toContain('data-testid="personal-events"');
    expect(mocks.listSpogomiEventsForCurrentUser).toHaveBeenCalledWith("user-1");
    expect(mocks.listSpogomiEventChangesForCurrentUser).toHaveBeenCalledWith("user-1");
  });
});
