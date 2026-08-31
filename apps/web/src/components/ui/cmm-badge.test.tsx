import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmBadge } from "./cmm-badge";

const indicatorsCss = readFileSync(
  new URL("../../styles/indicators.css", import.meta.url),
  "utf8",
);

const tones = [
  "slate",
  "emerald",
  "sky",
  "amber",
  "violet",
  "indigo",
  "rose",
  "muted",
] as const;

describe("CmmBadge", () => {
  it("renders a non-interactive static badge without an implicit status role", () => {
    const markup = renderToStaticMarkup(<CmmBadge>Source complète</CmmBadge>);

    expect(markup).toContain('<span class="cmm-badge"');
    expect(markup).toContain('data-badge-tone="slate"');
    expect(markup).toContain('data-badge-size="sm"');
    expect(markup).toContain('data-badge-shape="rounded"');
    expect(markup).not.toContain('role="status"');
    expect(markup).not.toContain("tabindex");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("<a ");
  });

  it("supports every canonical tone", () => {
    for (const tone of tones) {
      const markup = renderToStaticMarkup(<CmmBadge tone={tone}>{tone}</CmmBadge>);

      expect(markup).toContain(`data-badge-tone="${tone}"`);
    }
  });

  it("supports both sizes and shapes", () => {
    const markup = renderToStaticMarkup(
      <>
        <CmmBadge size="sm" shape="rounded">
          Petit
        </CmmBadge>
        <CmmBadge size="md" shape="pill">
          Capsule
        </CmmBadge>
      </>,
    );

    expect(markup).toContain('data-badge-size="sm"');
    expect(markup).toContain('data-badge-size="md"');
    expect(markup).toContain('data-badge-shape="rounded"');
    expect(markup).toContain('data-badge-shape="pill"');
  });

  it("preserves custom classes and lightweight rich content", () => {
    const markup = renderToStaticMarkup(
      <CmmBadge className="custom-badge" tone="indigo">
        <strong>Partenaire</strong>
        <span aria-hidden="true">·</span>
        <span>vérifié</span>
      </CmmBadge>,
    );

    expect(markup).toContain("custom-badge");
    expect(markup).toContain("<strong>Partenaire</strong>");
    expect(markup).toContain("vérifié");
  });

  it("keeps the canonical CSS-only indicator contract", () => {
    for (const marker of [
      ".cmm-badge",
      "data-badge-tone",
      "data-badge-size",
      "data-badge-shape",
      '[data-display-mode="exhaustif"]',
      '[data-display-mode="minimaliste"]',
      '[data-display-mode="sobre"]',
      'html[data-theme="dark"]',
      "background-image: none",
    ]) {
      expect(indicatorsCss).toContain(marker);
    }
  });
});
