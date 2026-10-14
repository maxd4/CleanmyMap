import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("h1", null, title) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "agir" }) }));
vi.mock("@/components/spogomi/spogomi-organizer-dashboard", () => ({
  SpogomiOrganizerDashboard: ({ initialEvents, view }: { initialEvents: unknown[]; view: string }) =>
    React.createElement("div", { "data-event-count": initialEvents.length, "data-view": view }),
}));

import NewSpogomiEventPage from "./page";

describe("/spogomi/nouveau", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication before rendering the private creation form", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(NewSpogomiEventPage()).rejects.toMatchObject({
      digest: expect.stringContaining(encodeURIComponent("/spogomi/nouveau")),
    });
  });

  it("renders the reusable creation view without loading a private catalog", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    const markup = renderToStaticMarkup(await NewSpogomiEventPage());
    expect(markup).toContain("Nouvelle compétition SPOGOMI");
    expect(markup).toContain('data-event-count="0"');
    expect(markup).toContain('data-view="create"');
  });
});
