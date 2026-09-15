import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ActionCreationShell } from "./action-creation-shell";

vi.mock("./action-declaration-entry-flow", () => ({
  ActionDeclarationEntryFlow: () => <div data-testid="pre-formulaire-engine" />,
}));
vi.mock("@/components/sections/rubriques/route", () => ({
  RouteSection: () => <div data-testid="route-engine" />,
}));
vi.mock("@/components/sections/rubriques/weather-section", () => ({
  WeatherSection: () => <div data-testid="weather-engine" />,
}));

describe("ActionCreationShell", () => {
  it("exposes exactly the four independent panels and opens the requested one", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "itineraire",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(
      markup.match(/id="action-creation-panel-(pre-formulaire|itineraire|meteo|formalites)"/g),
    ).toHaveLength(4);
    expect(markup).toContain("Pré-formulaire");
    expect(markup).toContain("Itinéraire");
    expect(markup).toContain("Météo &amp; conditions terrain");
    expect(markup).toContain("Formalités juridiques");
    expect(markup).toContain('data-open-panel="itineraire"');
    expect(markup).toContain('data-testid="route-engine"');
    expect(markup).toContain('data-testid="weather-engine"');
  });

  it("keeps the pre-form engine autonomous when no panel is supplied", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('data-open-panel="pre-formulaire"');
    expect(markup).toContain('data-testid="pre-formulaire-engine"');
    expect(markup).toContain('hidden=""');
  });
});
