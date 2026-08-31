import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GamificationStatePill, getGamificationBadgeState } from "./badge-ui";

describe("gamification badge ui helpers", () => {
  it("maps zero progress to vide", () => {
    expect(getGamificationBadgeState(0, 3)).toBe("vide");
  });

  it("maps a threshold hit to debloque", () => {
    expect(getGamificationBadgeState(3, 3)).toBe("debloque");
  });

  it("maps in-between progress to actif", () => {
    expect(getGamificationBadgeState(4, 3)).toBe("actif");
  });

  it("renders the state pill through the canonical static badge", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(GamificationStatePill, { state: "vide" }),
        React.createElement(GamificationStatePill, { state: "actif" }),
        React.createElement(GamificationStatePill, { state: "debloque" }),
      ),
    );

    expect(markup.match(/class="cmm-badge cmm-badge--on-dark"/g)).toHaveLength(3);
    expect(markup).toContain('data-badge-tone="muted"');
    expect(markup).toContain('data-badge-tone="sky"');
    expect(markup).toContain('data-badge-tone="emerald"');
    expect(markup.match(/data-badge-shape="pill"/g)).toHaveLength(3);
    expect(markup).toContain("Vide");
    expect(markup).toContain("Actif");
    expect(markup).toContain("Débloqué");
    expect(markup).not.toContain('role="status"');
  });
});
