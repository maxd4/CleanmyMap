import { readFileSync } from "node:fs";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CmmButton } from "./cmm-button";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const source = readFileSync(new URL("./cmm-button.tsx", import.meta.url), "utf8");

describe("CmmButton", () => {
  it("exposes the canonical tone, size and variant contract", () => {
    const tones = ["primary", "secondary", "tertiary", "destructive"] as const;
    const sizes = ["sm", "md", "lg"] as const;
    const variants = ["default", "pill", "ghost"] as const;

    for (const tone of tones) {
      for (const size of sizes) {
        for (const variant of variants) {
          const markup = renderToStaticMarkup(
            <CmmButton tone={tone} size={size} variant={variant}>
              Action
            </CmmButton>,
          );

          expect(markup).toContain('class="cmm-button"');
          expect(markup).toContain(`data-cmm-button-tone="${tone}"`);
          expect(markup).toContain(`data-cmm-button-size="${size}"`);
          expect(markup).toContain(`data-cmm-button-variant="${variant}"`);
        }
      }
    }
  });

  it("renders a native button with its preserved attributes", () => {
    const markup = renderToStaticMarkup(
      <CmmButton
        ariaLabel="Enregistrer"
        title="Enregistrer les modifications"
        type="submit"
        onClick={() => undefined}
      >
        Enregistrer
      </CmmButton>,
    );

    expect(markup).toMatch(/^<button type="submit"/);
    expect(markup).toContain('aria-label="Enregistrer"');
    expect(markup).toContain('title="Enregistrer les modifications"');
    expect(markup).toContain(">Enregistrer</button>");
  });

  it("keeps links accessible and blocked when disabled", () => {
    const markup = renderToStaticMarkup(
      <CmmButton href="/actions" prefetch tone="secondary" disabled>
        Voir les actions
      </CmmButton>,
    );

    expect(markup).toContain('href="/actions"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('data-cmm-button-disabled="true"');
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("event.stopPropagation()");
  });

  it("marks loading controls busy without replacing their label", () => {
    const markup = renderToStaticMarkup(
      <CmmButton loading tone="primary">
        Publier le signalement
      </CmmButton>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('data-cmm-button-loading="true"');
    expect(markup).toContain(">Publier le signalement</button>");
  });

  it("composes asChild while preserving the child element", () => {
    const markup = renderToStaticMarkup(
      <CmmButton asChild tone="tertiary" ariaLabel="Ouvrir le profil">
        <Link href="/profil">Profil</Link>
      </CmmButton>,
    );

    expect(markup).toContain('href="/profil"');
    expect(markup).toContain('class="cmm-button"');
    expect(markup).toContain('aria-label="Ouvrir le profil"');
    expect(markup).toContain('data-cmm-button-tone="tertiary"');
    expect(markup).toContain(">Profil</a>");
  });

  it("defines dimensions, states, modes and reduced-motion behavior in CSS", () => {
    for (const token of [
      "--cmm-button-height-sm: 2.5rem",
      "--cmm-button-height-md: 2.75rem",
      "--cmm-button-height-lg: 3rem",
      "--cmm-button-padding-x-sm: 0.75rem",
      "--cmm-button-padding-x-md: 1rem",
      "--cmm-button-padding-x-lg: 1.25rem",
      "--cmm-button-gap: 0.5rem",
      "--cmm-button-shadow",
      "--cmm-button-transition",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain("--cmm-button-radius: var(--radius-sm);");
    expect(css).toContain("--cmm-button-radius: var(--radius-full);");
    expect(css).toContain('[data-display-mode="minimaliste"] .cmm-button');
    expect(css).toContain('[data-display-mode="sobre"] .cmm-button');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).not.toContain('tone?: ButtonTone | "muted"');
    expect(source).not.toContain("cmm-interactive");
  });
});
