import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let mockPathname = "/sections/rejoindre-une-action";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

vi.mock("@/lib/ui/page-families", () => ({
  resolvePageFamily: () => ({
    hero: {
      icon: "text-emerald-600",
      iconWrap: "rounded-full",
      sectionGradient: "from-emerald-100 to-transparent",
    },
  }),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle }: { title?: React.ReactNode; subtitle?: React.ReactNode }) => (
    <header className="cmm-page-header">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  ),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href}>{children}</a>
  ),
  CmmButtonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  Sparkles: () => <span aria-hidden="true" />,
}));

import { SectionShell } from "./shared";

describe("SectionShell page composition", () => {
  it("uses the canonical page shell and section rhythm while preserving shell metadata", () => {
    const markup = renderToStaticMarkup(
      <SectionShell
        id="rejoindre-une-action"
        title="Communauté"
        subtitle="Le réseau local"
        summary={<p>Résumé métier</p>}
        traceNote={<p>Source vérifiable</p>}
        links={[{ href: "/explorer", label: { fr: "Explorer", en: "Explore" } }]}
      >
        <article>Contenu métier</article>
      </SectionShell>,
    );

    expect(markup).toContain('class="cmm-page-layout"');
    expect(markup).toContain('class="cmm-section-group"');
    expect(markup).toContain("Résumé métier");
    expect(markup).toContain("Source vérifiable");
    expect(markup).toContain('href="/explorer"');
    expect(markup).toContain("Contenu métier");
  });

  it("keeps hideHeader available for consumers that own their page header", () => {
    mockPathname = "/sections/rejoindre-une-action";
    const markup = renderToStaticMarkup(
      <SectionShell id="rejoindre-une-action" hideHeader>
        <header>Header enfant</header>
      </SectionShell>,
    );

    expect(markup).toContain('class="cmm-page-layout"');
    expect(markup).toContain("Header enfant");
    expect(markup).not.toContain("cmm-page-header");
    expect(markup).not.toContain("bg-gradient-to-b");
  });

  it("suppresses SectionShell top gradient on white-canvas routes while keeping it on standalone routes", () => {
    mockPathname = "/sections/rejoindre-une-action";
    const whiteCanvasMarkup = renderToStaticMarkup(
      <SectionShell id="rejoindre-une-action" summary={<p>Résumé</p>}>
        <article>Contenu</article>
      </SectionShell>,
    );
    expect(whiteCanvasMarkup).not.toContain("bg-gradient-to-b");
    expect(whiteCanvasMarkup).toContain("cmm-surface cmm-panel");

    mockPathname = "/explorer";
    const standaloneMarkup = renderToStaticMarkup(
      <SectionShell id="explorer">
        <article>Sommaire</article>
      </SectionShell>,
    );
    expect(standaloneMarkup).toContain("bg-gradient-to-b");
  });
});
