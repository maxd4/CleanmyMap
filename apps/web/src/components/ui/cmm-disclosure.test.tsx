import { readFileSync } from "node:fs";
import type { ReactElement, ReactEventHandler, SyntheticEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CmmDisclosure } from "./cmm-disclosure";

const css = [
  readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8"),
  readFileSync(new URL("../../styles/disclosure.css", import.meta.url), "utf8"),
  readFileSync(new URL("../../styles/display-modes.css", import.meta.url), "utf8"),
].join("\n");
const source = readFileSync(new URL("./cmm-disclosure.tsx", import.meta.url), "utf8");

describe("CmmDisclosure", () => {
  it("renders the native details and summary elements", () => {
    const markup = renderToStaticMarkup(
      <CmmDisclosure id="disclosure-example" summary="Résumé">
        Contenu métier
      </CmmDisclosure>,
    );

    expect(markup).toMatch(/^<details id="disclosure-example"/);
    expect(markup).toContain('<summary class="cmm-disclosure__summary">');
    expect(markup).toContain(">Résumé</div>");
    expect(markup).toContain(">Contenu métier</div>");
    expect(markup).toContain('data-disclosure-tone="slate"');
    expect(markup).toContain('data-disclosure-size="md"');
  });

  it("keeps the disclosure closed by default and opens with defaultOpen", () => {
    const closedMarkup = renderToStaticMarkup(
      <CmmDisclosure summary="Fermé">Contenu</CmmDisclosure>,
    );
    const openMarkup = renderToStaticMarkup(
      <CmmDisclosure summary="Ouvert" defaultOpen>
        Contenu
      </CmmDisclosure>,
    );

    expect(closedMarkup).not.toMatch(/^<details open/);
    expect(openMarkup).toMatch(/^<details open/);
  });

  it("honors the controlled open contract", () => {
    const openMarkup = renderToStaticMarkup(
      <CmmDisclosure summary="Contrôlé" open>
        Contenu
      </CmmDisclosure>,
    );
    const closedMarkup = renderToStaticMarkup(
      <CmmDisclosure summary="Contrôlé" open={false}>
        Contenu
      </CmmDisclosure>,
    );

    expect(openMarkup).toMatch(/^<details open/);
    expect(closedMarkup).not.toMatch(/^<details open/);
  });

  it("forwards the native toggle state to onToggle", () => {
    const onToggle = vi.fn<(open: boolean) => void>();
    const element = CmmDisclosure({ summary: "Résumé", children: "Contenu", onToggle });
    const details = element as ReactElement<{
      onToggle?: ReactEventHandler<HTMLDetailsElement>;
    }>;

    details.props.onToggle?.({
      currentTarget: { open: true },
    } as unknown as SyntheticEvent<HTMLDetailsElement>);

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("allows a rich summary without adding accessible indicator text", () => {
    const markup = renderToStaticMarkup(
      <CmmDisclosure
        summary={
          <>
            <strong>Résumé riche</strong>
            <span data-summary-meta>3 éléments</span>
          </>
        }
      >
        Contenu
      </CmmDisclosure>,
    );

    expect(markup).toContain("<strong>Résumé riche</strong>");
    expect(markup).toContain('data-summary-meta="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("ChevronDown");
  });

  it("exposes all canonical tones and sizes through data attributes", () => {
    const tones = ["slate", "emerald", "sky", "amber", "rose", "indigo"] as const;
    const sizes = ["sm", "md", "lg"] as const;

    for (const tone of tones) {
      for (const size of sizes) {
        const markup = renderToStaticMarkup(
          <CmmDisclosure tone={tone} size={size} summary="Résumé">
            Contenu
          </CmmDisclosure>,
        );

        expect(markup).toContain(`data-disclosure-tone="${tone}"`);
        expect(markup).toContain(`data-disclosure-size="${size}"`);
      }
    }
  });

  it("keeps neighboring disclosures independently open", () => {
    const markup = renderToStaticMarkup(
      <>
        <CmmDisclosure defaultOpen summary="Premier">
          Un
        </CmmDisclosure>
        <CmmDisclosure defaultOpen summary="Second">
          Deux
        </CmmDisclosure>
      </>,
    );

    expect(markup.match(/<details open/g)).toHaveLength(2);
  });

  it("keeps visual decisions in disclosure.css with mode and motion contracts", () => {
    for (const token of [
      "--cmm-disclosure-background",
      "--cmm-disclosure-border",
      "--cmm-disclosure-radius",
      "--cmm-disclosure-shadow",
      "--cmm-disclosure-summary-min-height",
      "--cmm-disclosure-icon-transition",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('[data-display-mode="minimaliste"] .cmm-disclosure');
    expect(css).toContain('[data-display-mode="sobre"] .cmm-disclosure');
    expect(css).toContain("--cmm-disclosure-transition: none;");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).not.toMatch(/(?:bg-|border-|shadow-|rounded-|p-|px-|py-|transition)/);
  });
});
