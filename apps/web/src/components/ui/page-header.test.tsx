import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { getPageFamilyById } from "@/lib/ui/page-families";
import { PageHeader } from "./page-header";

function renderHeader(props: Partial<ComponentProps<typeof PageHeader>> = {}) {
  return renderToStaticMarkup(
    <PageHeader title="Titre principal" subtitle="Sous-titre de page" {...props} />,
  );
}

function classFor(markup: string, tag: "h1" | "p") {
  return markup.match(new RegExp(`<${tag} class="([^"]+)"`))?.[1] ?? "";
}

function withoutColor(classes: string) {
  return classes
    .split(/\s+/)
    .filter((className) => !className.startsWith("text-"))
    .join(" ");
}

describe("PageHeader", () => {
  it("renders the page title as an h1 with canonical title and subtitle classes", () => {
    const markup = renderHeader();

    expect(markup).toContain('<h1 class="cmm-page-header-title');
    expect(markup).toContain('<p class="cmm-page-header-subtitle');
    expect(markup).toContain("Titre principal");
    expect(markup).toContain("Sous-titre de page");
  });

  it("supports a secondary heading for composed pages", () => {
    const markup = renderHeader({ headingLevel: "h2" });

    expect(markup).toContain('<h2 class="cmm-page-header-title');
    expect(markup).not.toContain("<h1");
  });

  it("limits family, tone and contrast variations to color tokens", () => {
    const defaultMarkup = renderHeader({ tone: "slate" });
    const inverseMarkup = renderHeader({ tone: "slate", contrast: "inverse" });

    expect(withoutColor(classFor(defaultMarkup, "h1"))).toBe(
      withoutColor(classFor(inverseMarkup, "h1")),
    );
    expect(withoutColor(classFor(defaultMarkup, "p"))).toBe(
      withoutColor(classFor(inverseMarkup, "p")),
    );
    expect(classFor(defaultMarkup, "h1")).toContain("text-slate-950");
    expect(classFor(inverseMarkup, "h1")).toContain("text-white");
    expect(classFor(defaultMarkup, "p")).toContain("text-slate-700");
    expect(classFor(inverseMarkup, "p")).toContain("text-white");
  });

  it("defaults to centered alignment and places optional actions below the subtitle", () => {
    const defaultMarkup = renderHeader({
      action: <button type="button">Action test</button>,
    });
    const leftMarkup = renderHeader({ align: "left" });

    expect(defaultMarkup).toContain("cmm-page-header--center");
    expect(defaultMarkup).not.toContain("sm:flex-row sm:items-start sm:justify-between");
    expect(defaultMarkup.indexOf("Sous-titre de page")).toBeLessThan(
      defaultMarkup.indexOf("cmm-page-header-action"),
    );
    expect(leftMarkup).toContain("cmm-page-header--left");
    expect(classFor(leftMarkup, "h1")).toBe(classFor(defaultMarkup, "h1"));
    expect(classFor(leftMarkup, "p")).toBe(classFor(defaultMarkup, "p"));
  });

  it("does not expose page-specific typography or legacy header variants", () => {
    const source = readFileSync(new URL("./page-header.tsx", import.meta.url), "utf8");

    expect(source).not.toMatch(/titleSize|eyebrow\??:|badges\??:|badge\??:/);
    expect(source).toContain('"cmm-page-header-title"');
    expect(source).toContain('"cmm-page-header-subtitle"');
  });

  it("keeps canonical titles and subtitles readable without CSS ellipses", () => {
    const styles = readFileSync(
      new URL("../../styles/typography.css", import.meta.url),
      "utf8",
    );
    const titleBlock = styles.match(/\.cmm-page-header-title\s*\{([\s\S]*?)\n  \}/u)?.[1] ?? "";
    const subtitleBlock = styles.match(/\.cmm-page-header-subtitle\s*\{([\s\S]*?)\n  \}/u)?.[1] ?? "";

    expect(titleBlock).not.toContain("text-overflow");
    expect(titleBlock).not.toContain("white-space: nowrap");
    expect(titleBlock).toContain("text-wrap: balance");
    expect(subtitleBlock).not.toContain("text-overflow");
    expect(subtitleBlock).not.toContain("-webkit-line-clamp");
    expect(subtitleBlock).toContain("text-wrap: balance");
  });

  it("marks data-cmm-family-header only when family matches the route and contrast is default", () => {
    const matchingRouteMarkup = renderHeader({ family: getPageFamilyById("homepage") });
    const distinctFamilyMarkup = renderHeader({ family: getPageFamilyById("agir") });
    const explicitToneMarkup = renderHeader({ tone: "emerald" });
    const inverseMarkup = renderHeader({ family: getPageFamilyById("homepage"), contrast: "inverse" });

    expect(matchingRouteMarkup).toContain('data-cmm-family-header="home"');
    expect(distinctFamilyMarkup).not.toContain("data-cmm-family-header=");
    expect(explicitToneMarkup).not.toContain("data-cmm-family-header=");
    expect(inverseMarkup).not.toContain("data-cmm-family-header=");
  });
});
