import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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

  it("limits align variation to the page-header position classes", () => {
    const leftMarkup = renderHeader({ align: "left" });
    const centerMarkup = renderHeader({ align: "center" });

    expect(leftMarkup).toContain("cmm-page-header--left");
    expect(centerMarkup).toContain("cmm-page-header--center");
    expect(classFor(leftMarkup, "h1")).toBe(classFor(centerMarkup, "h1"));
    expect(classFor(leftMarkup, "p")).toBe(classFor(centerMarkup, "p"));
  });

  it("does not expose page-specific typography or legacy header variants", () => {
    const source = readFileSync(new URL("./page-header.tsx", import.meta.url), "utf8");

    expect(source).not.toMatch(/titleSize|eyebrow\??:|badges\??:|badge\??:/);
    expect(source).toContain('"cmm-page-header-title"');
    expect(source).toContain('"cmm-page-header-subtitle"');
  });
});
