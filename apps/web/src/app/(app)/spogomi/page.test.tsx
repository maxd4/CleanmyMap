import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerLocale: vi.fn(),
  getTranslation: vi.fn(),
  listPublishedSpogomiEvents: vi.fn(),
}));

vi.mock("@/lib/server-preferences", () => ({ getServerLocale: mocks.getServerLocale }));
vi.mock("@/lib/i18n/server-translation", () => ({ getTranslation: mocks.getTranslation }));
vi.mock("@/lib/spogomi/public-service", () => ({ listPublishedSpogomiEvents: mocks.listPublishedSpogomiEvents }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => ({ id: "agir" }) }));
vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) => React.createElement("header", null, React.createElement("h1", null, title), React.createElement("p", null, subtitle)),
}));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children) }));
vi.mock("@/components/ui/cmm-feedback", () => ({
  CmmFeedback: ({ title, children, tone }: { title?: React.ReactNode; children: React.ReactNode; tone?: string }) => React.createElement("div", { role: tone === "error" ? "alert" : "status", "data-feedback-tone": tone }, title, children),
}));

import SpogomiIndexPage from "./page";

describe("/spogomi pedagogical index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getTranslation.mockReturnValue({ t: (key: string) => key });
    mocks.listPublishedSpogomiEvents.mockResolvedValue([]);
  });

  it("renders the four sections in order without a global parcours chooser", async () => {
    const markup = renderToStaticMarkup(await SpogomiIndexPage());
    const howItWorks = markup.indexOf("spogomi-how-it-works");
    const formats = markup.indexOf("spogomi-formats-rules");
    const events = markup.indexOf("spogomi-events");
    const world = markup.indexOf("spogomi-world");

    expect(howItWorks).toBeGreaterThan(-1);
    expect(formats).toBeGreaterThan(howItWorks);
    expect(events).toBeGreaterThan(formats);
    expect(world).toBeGreaterThan(events);
    expect(markup).not.toContain("Choisir mon parcours");
    expect(markup).not.toContain('role="tablist"');
    expect(markup).toContain("03");
    expect(markup).toContain("04");
    expect(markup).toContain("Aucune compétition SPOGOMI publiée");
    expect(markup).toContain('id="spogomi-registration"');
    expect(markup).toContain('id="spogomi-attestations"');
    expect(mocks.listPublishedSpogomiEvents).toHaveBeenCalledTimes(1);
  });

  it("keeps the same public composition regardless of an authenticated session", async () => {
    const markup = renderToStaticMarkup(await SpogomiIndexPage());
    expect(markup).not.toContain("Mes événements SPOGOMI");
    expect(markup).not.toContain("Accéder aux actions bénévoles");
    expect(markup).not.toContain("/spogomi/mes-evenements");
  });

  it("keeps a loading failure distinct from an empty published-events state", async () => {
    mocks.listPublishedSpogomiEvents.mockRejectedValue(new Error("persistence unavailable"));

    const markup = renderToStaticMarkup(await SpogomiIndexPage());

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Compétitions indisponibles");
    expect(markup).toContain("ne peuvent pas être chargées");
    expect(markup).not.toContain("Aucune compétition SPOGOMI publiée");
  });
});
