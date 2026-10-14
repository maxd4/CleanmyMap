import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  loadSpogomiEventBySlugForOrganizer: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/spogomi/preparation-service", () => ({ loadSpogomiEventBySlugForOrganizer: mocks.loadSpogomiEventBySlugForOrganizer }));
vi.mock("@/components/spogomi/spogomi-preparation-workspace", () => ({
  SpogomiPreparationWorkspace: ({ eventId }: { eventId: string }) => React.createElement("div", { "data-event-id": eventId }),
}));

import SpogomiEventSpacePage from "./page";

describe("/spogomi/[eventSlug]/espace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({ server: true });
  });

  it("requires authentication before reading organizer ownership", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiEventSpacePage({ params: Promise.resolve({ eventSlug: "paris-2026" }) })).rejects.toMatchObject({
      digest: expect.stringContaining(encodeURIComponent("/spogomi/paris-2026/espace")),
    });
    expect(mocks.loadSpogomiEventBySlugForOrganizer).not.toHaveBeenCalled();
  });

  it("rechecks ownership and renders the reusable preparation workspace", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.loadSpogomiEventBySlugForOrganizer.mockResolvedValue({ id: "event-1", event_slug: "paris-2026" });
    const markup = renderToStaticMarkup(await SpogomiEventSpacePage({ params: Promise.resolve({ eventSlug: "paris-2026" }) }));
    expect(markup).toContain('data-event-id="event-1"');
    expect(markup).toContain('href="/spogomi/mes-evenements"');
    expect(mocks.loadSpogomiEventBySlugForOrganizer).toHaveBeenCalledWith({ server: true }, "paris-2026", "user-1");
  });
});
