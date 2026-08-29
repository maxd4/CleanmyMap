import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmCard } from "./cmm-card";
import { CmmBlockCard } from "./cmm-block-accent";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const cardSource = readFileSync(new URL("./cmm-card.tsx", import.meta.url), "utf8");

describe("canonical surface cards", () => {
  it("keeps the accessible interactive card contract and canonical data attributes", () => {
    const markup = renderToStaticMarkup(
      <CmmCard
        tone="emerald"
        variant="elevated"
        size="lg"
        clickable
        ariaLabel="Ouvrir la carte"
        onClick={() => undefined}
      >
        Contenu
      </CmmCard>,
    );

    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-label="Ouvrir la carte"');
    expect(markup).toContain('class="cmm-card cmm-card--interactive"');
    expect(markup).toContain('data-cmm-card-tone="emerald"');
    expect(markup).toContain('data-cmm-card-variant="elevated"');
    expect(markup).toContain('data-cmm-card-size="lg"');
  });

  it("does not embed surface effects or interactive motion in the component", () => {
    for (const forbidden of ["ring-cyan", "backdrop-blur", "shadow-[", "whileHover", "whileTap"]) {
      expect(cardSource).not.toContain(forbidden);
    }
  });

  it("keeps tone, variant and size as semantic selectors without local style props", () => {
    const markup = renderToStaticMarkup(
      <CmmCard tone="pink" variant="outlined" size="sm">
        Contenu
      </CmmCard>,
    );

    expect(markup).toContain('data-cmm-card-tone="pink"');
    expect(markup).toContain('data-cmm-card-variant="outlined"');
    expect(markup).toContain('data-cmm-card-size="sm"');
    expect(cardSource).not.toMatch(/(?:bg-|border-|shadow-|backdrop-blur|ring-|rounded-)/);
  });

  it("composes block accents on the same canonical card shell", () => {
    const markup = renderToStaticMarkup(
      <CmmBlockCard blockId="visualize" accentType="bar">
        Contenu
      </CmmBlockCard>,
    );

    expect(markup).toContain('class="cmm-card cmm-block-card group relative"');
    expect(markup).toContain('data-cmm-card-tone="sky"');
    expect(markup).toContain("cmm-block-accent--bar");
  });

  it("defines the surface contract for all display modes and reduced motion", () => {
    for (const token of [
      "--cmm-card-background",
      "--cmm-card-border",
      "--cmm-card-shadow",
      "--cmm-card-blur",
      "--cmm-card-radius",
      "--cmm-card-focus-ring",
      "--cmm-card-transition",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('[data-display-mode="minimaliste"] .cmm-card');
    expect(css).toContain('[data-display-mode="sobre"] .cmm-card');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".cmm-card--interactive:not([aria-disabled=\"true\"]):hover");
    expect(css).toContain("--cmm-surface-blur: blur(10px);");
    expect(css).toContain("--cmm-surface-hover-translate: -2px;");
    expect(css).toContain("--cmm-surface-hover-scale: 1.01;");
    expect(css).toContain("--cmm-surface-active-scale: 0.99;");
    expect(css).toContain("--cmm-surface-transition-duration: 180ms;");
    expect(css).toContain("--cmm-surface-shadow: none;");
    expect(css).toContain("--cmm-surface-shadow-elevated: var(--shadow-soft);");
    expect(css).toContain("--cmm-surface-transition-duration: 150ms;");
    expect(css).toContain("--cmm-surface-transition-duration: 0ms;");
    expect(css).toContain("background-image: none;");
  });
});
