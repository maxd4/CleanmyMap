import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ActionCreationShell } from "./action-creation-shell";

const entryFlowPropsMock = vi.hoisted(() => vi.fn());

vi.mock("./action-declaration-entry-flow", () => ({
  ActionDeclarationEntryFlow: (props: Record<string, unknown>) => {
    entryFlowPropsMock(props);
    return <div data-testid="pre-formulaire-engine" />;
  },
}));
vi.mock("./action-creation-legal-panel", () => ({
  ActionCreationLegalPanel: ({ actionId }: { actionId?: string | null }) => (
    <div data-testid="formalities-action-id">{actionId ?? "none"}</div>
  ),
}));
vi.mock("@/components/sections/rubriques/route", () => ({
  RouteSection: () => <div data-testid="route-engine" />,
}));
vi.mock("@/components/sections/rubriques/weather-section", () => ({
  WeatherSection: () => <div data-testid="weather-engine" />,
}));

describe("ActionCreationShell", () => {
  it("passes the persistence callback to the pre-form engine", () => {
    renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(entryFlowPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onBeforeActionPersisted: expect.any(Function),
      }),
    );
  });

  it("initializes the Formalités panel with the existing action id", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "formalites",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('data-testid="formalities-action-id">action-42</div>');
  });

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
