import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionCreationShell } from "./action-creation-shell";

const beforeFormPropsMock = vi.hoisted(() => vi.fn());
const completeFormPropsMock = vi.hoisted(() => vi.fn());
const updateActionMock = vi.hoisted(() => vi.fn(() => Promise.resolve({ id: "action-42" })));
const routerReplaceMock = vi.hoisted(() => vi.fn());

vi.mock("./action-declaration/before/form", () => ({
  ActionBeforeDeclarationForm: (props: Record<string, unknown>) => {
    beforeFormPropsMock(props);
    return <div data-testid="pre-formulaire-engine" />;
  },
}));
vi.mock("./action-declaration/form/action-declaration-form", () => ({
  ActionDeclarationForm: (props: Record<string, unknown>) => {
    completeFormPropsMock(props);
    return <div data-testid="formulaire-engine" />;
  },
}));
vi.mock("@/lib/actions/http", () => ({ updateAction: updateActionMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    updateActionMock.mockResolvedValue({ id: "action-42" });
  });

  it("renders the direct pre-form and keeps the transition on the same action", async () => {
    renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "pre-formulaire",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(beforeFormPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onActionPersisted: expect.any(Function),
        onPassToComplete: expect.any(Function),
      }),
    );

    const beforeProps = beforeFormPropsMock.mock.lastCall?.[0] as {
      onPassToComplete: (actionId: string) => Promise<void>;
    };
    await beforeProps.onPassToComplete("action-42");
    expect(updateActionMock).toHaveBeenCalledWith("action-42", {
      actionPhase: "post_action_draft",
    });
    expect(routerReplaceMock).toHaveBeenCalledWith(
      "/actions/new?tab=after&actionId=action-42",
    );
  });

  it("renders the complete form directly on the Formulaire tab without creating an action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: true,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "pre-formulaire",
        initialTab: "after",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('data-testid="formulaire-engine"');
    expect(markup).not.toContain('data-testid="pre-formulaire-engine"');
    expect(updateActionMock).not.toHaveBeenCalled();
    expect(completeFormPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialActionId: "action-42" }),
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
    expect(markup).toContain("<h1 class=\"text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950\">Créer une action</h1>");
    expect(markup).toContain("Itinéraire");
    expect(markup).toContain("Météo &amp; conditions terrain");
    expect(markup).toContain("Formalités &amp; autorisations locales");
    expect(markup).toContain('data-open-panel="itineraire"');
    expect(markup).toContain('data-testid="route-engine"');
    expect(markup).not.toContain('data-testid="weather-engine"');
    expect(markup).not.toContain('data-testid="pre-formulaire-engine"');
    expect(markup).not.toContain('data-testid="formalities-action-id"');
  });

  it("keeps the pre-form direct when no panel is supplied", () => {
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
    expect(markup).not.toContain('data-testid="route-engine"');
    expect(markup).not.toContain('data-testid="weather-engine"');
    expect(markup).toContain('hidden=""');
  });

  it("renders the shared before/after tabs with an independent panel query", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "pre-formulaire",
        initialTab: "after",
        tabSearchParams: {
          tab: "before",
          panel: "meteo",
          actionId: "action-42",
          tag: ["terrain", "safety"],
        },
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('id="action-creation-tab-before"');
    expect(markup).toContain('id="action-creation-tab-after"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-labelledby="action-creation-tab-after"');
    expect(markup).toContain(
      "/actions/new?tab=before&amp;panel=meteo&amp;actionId=action-42&amp;tag=terrain&amp;tag=safety",
    );
    expect(markup).not.toContain('id="action-creation-panel-itineraire"');
    expect(markup).not.toContain('id="action-creation-panel-meteo"');
    expect(markup).not.toContain('id="action-creation-panel-formalites"');
    expect(markup).not.toContain('data-testid="weather-engine"');
    expect(completeFormPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialActionId: "action-42" }),
    );
  });
});
