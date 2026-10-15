import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getCurrentUserActiveRole: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  resolveSpogomiEventAccessBySlug: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess, getCurrentUserActiveRole: mocks.getCurrentUserActiveRole }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/spogomi/authorization", () => ({
  hasSpogomiCapability: (access: { capabilities: Set<string> }, capability: string) => access.capabilities.has(capability),
  resolveSpogomiEventAccessBySlug: mocks.resolveSpogomiEventAccessBySlug,
}));
vi.mock("@/components/spogomi/spogomi-preparation-workspace", () => ({
  SpogomiPreparationWorkspace: ({ eventId }: { eventId: string }) => React.createElement("div", { "data-event-id": eventId }),
}));
vi.mock("@/components/spogomi/spogomi-event-cockpit", () => ({
  SpogomiEventCockpit: ({ event }: { event: { id: string } }) => React.createElement("div", { "data-event-id": event.id }),
}));

import SpogomiEventSpacePage from "./page";

describe("/spogomi/[eventSlug]/espace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserActiveRole.mockResolvedValue("benevole");
    mocks.getSupabaseServerClient.mockReturnValue({ server: true });
  });

  it("requires authentication before reading organizer ownership", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });
    await expect(SpogomiEventSpacePage({ params: Promise.resolve({ eventSlug: "paris-2026" }) })).rejects.toMatchObject({
      digest: expect.stringContaining(encodeURIComponent("/spogomi/paris-2026/espace")),
    });
    expect(mocks.resolveSpogomiEventAccessBySlug).not.toHaveBeenCalled();
  });

  it("rechecks ownership and renders the reusable preparation workspace", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.resolveSpogomiEventAccessBySlug.mockResolvedValue({
      event: { id: "event-1", name: "Paris", event_slug: "paris-2026", mode: "casual", state: "draft", starts_at: "2026-01-01", ends_at: null, public_visibility: "private" },
      role: "organizer",
      capabilities: new Set(["manage", "observe"]),
    });
    const markup = renderToStaticMarkup(await SpogomiEventSpacePage({ params: Promise.resolve({ eventSlug: "paris-2026" }) }));
    expect(markup).toContain('data-event-id="event-1"');
    expect(markup).toContain('href="/spogomi/mes-evenements"');
    expect(mocks.resolveSpogomiEventAccessBySlug).toHaveBeenCalledWith({ supabase: { server: true }, eventSlug: "paris-2026", userId: "user-1" });
  });

  it("allows an active observer without exposing organizer reads", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "observer-1" });
    mocks.resolveSpogomiEventAccessBySlug.mockResolvedValue({
      event: { id: "event-1", name: "Paris", event_slug: "paris-2026", mode: "casual", state: "draft", starts_at: "2026-01-01", ends_at: null, public_visibility: "private" },
      role: "observer",
      capabilities: new Set(["observe"]),
    });
    const markup = renderToStaticMarkup(await SpogomiEventSpacePage({ params: Promise.resolve({ eventSlug: "paris-2026" }) }));
    expect(markup).toContain('data-event-id="event-1"');
    expect(mocks.resolveSpogomiEventAccessBySlug).toHaveBeenCalled();
  });
});
