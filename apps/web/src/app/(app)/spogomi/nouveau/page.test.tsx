import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("@/lib/authz", () => ({ requireAdminAccess: mocks.requireAdminAccess }));
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), notFound: mocks.notFound }));
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
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(NewSpogomiEventPage()).rejects.toMatchObject({
      digest: expect.stringContaining(encodeURIComponent("/spogomi/nouveau")),
    });
  });

  it("renders the reusable creation view without loading a private catalog", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    const markup = renderToStaticMarkup(await NewSpogomiEventPage());
    expect(markup).toContain("Nouvelle compétition SPOGOMI");
    expect(markup).toContain('data-event-count="0"');
    expect(markup).toContain('data-view="create"');
  });

  it("keeps insufficient authenticated roles behind a not-found response", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 403 });
    await expect(NewSpogomiEventPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
