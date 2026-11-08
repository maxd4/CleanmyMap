import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getServerLocale: vi.fn(),
  getTranslation: vi.fn(),
  listPublishedSpogomiEvents: vi.fn(),
  loadSpogomiOrientationProgressForCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({ getSafeAuthSession: mocks.getSafeAuthSession }));
vi.mock("@/lib/server-preferences", () => ({ getServerLocale: mocks.getServerLocale }));
vi.mock("@/lib/i18n/server-translation", () => ({ getTranslation: mocks.getTranslation }));
vi.mock("@/lib/spogomi/public-service", () => ({ listPublishedSpogomiEvents: mocks.listPublishedSpogomiEvents }));
vi.mock("@/lib/spogomi/orientation-progress-service", () => ({ loadSpogomiOrientationProgressForCurrentUser: mocks.loadSpogomiOrientationProgressForCurrentUser }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "agir" }) }));
vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) =>
    React.createElement("header", null, React.createElement("h1", null, title), React.createElement("p", null, subtitle), action),
}));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children) }));
vi.mock("@/components/ui/cmm-feedback", () => ({
  CmmFeedback: ({ title, children, tone }: { title?: React.ReactNode; children: React.ReactNode; tone?: string }) =>
    React.createElement("div", { role: tone === "error" ? "alert" : "status", "data-feedback-tone": tone }, title, children),
}));
vi.mock("@/components/spogomi/spogomi-orientation-tabs", () => ({
  SpogomiOrientationTabs: ({ isAuthenticated }: { isAuthenticated: boolean }) =>
    React.createElement(
      "div",
      { "data-testid": "orientation-tabs" },
      React.createElement("a", { href: isAuthenticated ? "/spogomi/mes-evenements?parcours=organizers" : "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dorganizers" }, "Ouvrir mes événements"),
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
    mocks.loadSpogomiOrientationProgressForCurrentUser.mockResolvedValue([]);
  });

  it("keeps the public index free of organizer navigation for visitors", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: true });
    const markup = renderToStaticMarkup(await SpogomiIndexPage());
    const headerMarkup = markup.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
    expect(headerMarkup).toContain("SPOGOMI");
    expect(headerMarkup).toContain("Trouvez votre rôle et rejoignez une compétition publiée.");
    expect(headerMarkup).not.toContain("Voir les compétitions");
    expect(headerMarkup).not.toContain("Ouvrir le salon SPOGOMI");
    expect(markup).not.toContain("Mes événements SPOGOMI");
    expect(markup).toContain("Aucune compétition SPOGOMI publiée");
    expect(markup).toContain('id="spogomi-registration"');
    expect(markup).toContain('id="spogomi-attestations"');
    expect(markup).not.toContain("Accéder aux actions bénévoles");
    expect(markup).toContain("understanding.title");
    expect(markup).toContain("international.casualTitle");
    expect(markup).toContain("understanding.rulesTitle");
    expect(markup).toContain("understanding.rulesSanctions");
    expect(markup).toContain("understanding.rulesHistoricalExamplesTitle");
    expect(markup).toContain("understanding.rulesPrivacyNote");
    expect(markup).not.toContain("<main");
    expect(markup.indexOf("spogomi-events")).toBeLessThan(markup.indexOf("understanding.title"));
    expect(markup.indexOf("understanding.title")).toBeLessThan(markup.indexOf("international"));
    expect(markup).toContain('href="/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dorganizers"');
    expect(mocks.listPublishedSpogomiEvents).toHaveBeenCalledTimes(1);
  });

  it("adds the organizer entry only after authentication", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });
    const markup = renderToStaticMarkup(await SpogomiIndexPage());
    expect(markup).toContain("orientation-tabs");
    expect(markup).toContain('href="/spogomi/mes-evenements?parcours=organizers"');
  });

  it("keeps a loading failure distinct from an empty published-events state", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: true });
    mocks.listPublishedSpogomiEvents.mockRejectedValue(new Error("persistence unavailable"));

    const markup = renderToStaticMarkup(await SpogomiIndexPage());

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Compétitions indisponibles");
    expect(markup).toContain("ne peuvent pas être chargées");
    expect(markup).not.toContain("Aucune compétition SPOGOMI publiée");
  });
});
