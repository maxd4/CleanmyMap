import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmSkeleton } from "./cmm-skeleton";

const css = [
  readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8"),
  readFileSync(new URL("../../styles/states-feedback.css", import.meta.url), "utf8"),
].join("\n");
const source = readFileSync(new URL("./cmm-skeleton.tsx", import.meta.url), "utf8");

describe("canonical skeletons", () => {
  it("preserves variants, animations and consumer sizing classes", () => {
    const markup = renderToStaticMarkup(
      <CmmSkeleton variant="title" animation="shimmer" className="w-40" aria-label="Chargement" />,
    );

    expect(markup).toContain('class="cmm-skeleton w-40"');
    expect(markup).toContain('data-skeleton-variant="title"');
    expect(markup).toContain('data-skeleton-animation="shimmer"');
    expect(markup).toContain('aria-label="Chargement"');
  });

  it("keeps all visual recipes in the canonical skeleton CSS", () => {
    expect(source).not.toContain("cmm-shimmer");
    expect(source).not.toContain("animate-pulse");
    expect(source).not.toContain("bg-slate");
    expect(source).toContain('data-skeleton-variant={variant}');
    expect(source).toContain('data-skeleton-animation={animation}');

    for (const token of [
      ".cmm-skeleton",
      "cmm-skeleton-shimmer",
      "cmm-skeleton-pulse",
      '[data-display-mode="minimaliste"] .cmm-skeleton',
      '[data-display-mode="sobre"] .cmm-skeleton',
      "@media (prefers-reduced-motion: reduce)",
    ]) {
      expect(css).toContain(token);
    }
  });
});
