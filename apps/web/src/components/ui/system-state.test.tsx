import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "./system-state";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const source = readFileSync(new URL("./system-state.tsx", import.meta.url), "utf8");

describe("canonical system states", () => {
  it("keeps the existing compound API and exposes one variant contract", () => {
    const markup = renderToStaticMarkup(
      <SystemStateLayout variant="offline">
        <SystemStateIcon variant="offline">!</SystemStateIcon>
        <SystemStateTitle variant="offline">Service indisponible</SystemStateTitle>
        <SystemStateDescription variant="offline">Réessayez plus tard.</SystemStateDescription>
        <SystemStateMeta variant="offline" label="Contexte">
          Réseau hors ligne
        </SystemStateMeta>
        <SystemStateAction>Réessayer</SystemStateAction>
      </SystemStateLayout>,
    );

    expect(markup).toContain('class="cmm-system-state"');
    expect(markup).toContain('data-state-variant="offline"');
    expect(markup).toContain('class="cmm-system-state-shell"');
    expect(markup).toContain('class="cmm-system-state-content"');
    expect(markup).toContain('class="cmm-system-state-icon"');
    expect(markup).toContain('class="cmm-page-header-title cmm-system-state-title text-balance"');
    expect(markup).toContain("<h1");
    expect(markup).toContain("cmm-page-header-subtitle cmm-system-state-description");
    expect(markup).toContain('class="cmm-system-state-meta"');
    expect(markup).toContain('class="cmm-system-state-action"');
  });

  it("centralizes visual variants in CSS instead of variant recipes in TSX", () => {
    expect(source).not.toContain("SYSTEM_STATE_STYLES");
    expect(source).not.toContain("linear-gradient");
    expect(source).not.toContain("backdrop-blur");
    expect(source).not.toContain("shadow-");
    expect(source).not.toContain("text-rose");
    expect(source).not.toContain("text-amber");

    for (const variant of ["error", "warning", "empty", "loading", "forbidden", "offline"]) {
      expect(css).toContain(`data-state-variant="${variant}"`);
    }

    for (const token of [
      "--cmm-system-state-background",
      "--cmm-system-state-border",
      "--cmm-system-state-shadow",
      "--cmm-system-state-blur",
      "--cmm-system-state-icon-radius",
      ".cmm-system-state-shell",
      ".cmm-system-state-meta",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain('[data-display-mode="minimaliste"]');
    expect(css).toContain('[data-display-mode="sobre"]');
  });
});
