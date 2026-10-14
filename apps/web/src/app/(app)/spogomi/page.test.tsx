import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getServerLocale: vi.fn(),
  getTranslation: vi.fn(),
  listPublishedSpogomiEvents: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({ getSafeAuthSession: mocks.getSafeAuthSession }));
vi.mock("@/lib/server-preferences", () => ({ getServerLocale: mocks.getServerLocale }));
vi.mock("@/lib/i18n/server-translation", () => ({ getTranslation: mocks.getTranslation }));
vi.mock("@/lib/spogomi/public-service", () => ({ listPublishedSpogomiEvents: mocks.listPublishedSpogomiEvents }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "agir" }) }));
vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) =>
    React.createElement("header", null, React.createElement("h1", null, title), action),
}));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children) }));
vi.mock("@/components/spogomi/spogomi-orientation-tabs", () => ({
  SpogomiOrientationTabs: ({ canAccessOrganizerDashboard }: { canAccessOrganizerDashboard: boolean }) =>
    React.createElement(
      "div",
      { "data-testid": "orientation-tabs" },
      canAccessOrganizerDashboard ? React.createElement("a", { href: "/dashboard/spogomi" }, "Ouvrir l’espace organisateur") : null,
    ),
}));
vi.mock("@/components/spogomi/spogomi-international-content", () => ({ SpogomiInternationalContent: () => React.createElement("div", { "data-testid": "international" }) }));

import SpogomiIndexPage from "./page";

describe("/spogomi public and private navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getTranslation.mockReturnValue({ t: (key: string) => key });
    mocks.listPublishedSpogomiEvents.mockResolvedValue([]);
  });

  it("keeps the public index free of organizer navigation for visitors", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: true });
    const markup = renderToStaticMarkup(await SpogomiIndexPage());
    expect(markup).not.toContain("Mes événements SPOGOMI");
    expect(markup).toContain("Aucune compétition SPOGOMI publiée");
    expect(markup).toContain('href="#spogomi-events"');
    expect(markup).toContain('href="/sections/messagerie?tab=discussions&amp;channel=community&amp;topicId=spogomi"');
    expect(markup).toContain("understanding.title");
    expect(markup).toContain("international.casualTitle");
    expect(markup).toContain("understanding.rulesTitle");
    expect(markup.indexOf("spogomi-events")).toBeLessThan(markup.indexOf("understanding.title"));
    expect(markup.indexOf("understanding.title")).toBeLessThan(markup.indexOf("international"));
    expect(markup).not.toContain('href="/dashboard/spogomi"');
    expect(mocks.listPublishedSpogomiEvents).toHaveBeenCalledTimes(1);
  });

  it("adds the organizer entry only after authentication", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });
    const markup = renderToStaticMarkup(await SpogomiIndexPage());
    expect(markup).toContain("orientation-tabs");
    expect(markup).toContain('href="/dashboard/spogomi"');
  });
});
