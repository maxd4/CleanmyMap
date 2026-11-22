import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionCreationShell } from "./action-creation-shell";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const beforeFormPropsMock = vi.hoisted(() => vi.fn());
const completeFormPropsMock = vi.hoisted(() => vi.fn());
const updateActionMock = vi.hoisted(() => vi.fn(() => Promise.resolve({ id: "action-42" })));
const routerReplaceMock = vi.hoisted(() => vi.fn());
const weatherSectionPropsMock = vi.hoisted(() => vi.fn());
const draftStorageMocks = vi.hoisted(() => ({
  load: vi.fn(() => ({ snapshot: null, readError: false })),
  clear: vi.fn(() => true),
}));
const preparationContextHookMock = vi.hoisted(() => vi.fn(({ actionId }: { actionId: string | null }) => ({
  preparationContext: {
    actionId,
    actionDate: "",
    departureTime: "",
    locationLabel: "",
    latitude: "",
    longitude: "",
    preparationChecklist: [],
    suggestedMaterials: [],
    materialsProvided: "",
    recommendedMaterials: "",
  },
  setPreparationContext: vi.fn(),
  preparationContextReady: true,
  preparationPersistenceStatus: "saved",
  markPreparationPersisted: vi.fn(),
  resetPreparationContext: vi.fn(),
})));

vi.mock("./action-declaration/before/form", () => ({
  ActionBeforeDeclarationForm: (props: Record<string, unknown>) => {
    beforeFormPropsMock(props);
    return <div data-testid="pre-formulaire-engine" />;
  },
}));
vi.mock("./action-declaration/action-declaration-form", () => ({
  ActionDeclarationForm: (props: Record<string, unknown>) => {
    completeFormPropsMock(props);
    return <div data-testid="formulaire-engine" />;
  },
}));
vi.mock("@/lib/actions/http", () => ({ updateAction: updateActionMock }));
vi.mock("./action-declaration/draft-storage", async (importOriginal) => ({
  ...await importOriginal<typeof import("./action-declaration/draft-storage")>(),
  loadDraftSnapshotResult: draftStorageMocks.load,
  clearDraft: draftStorageMocks.clear,
}));
vi.mock("@/lib/route/route-action-handoff", () => ({
  clearPlannerActionHandoff: vi.fn(() => true),
  peekPlannerActionHandoff: vi.fn(() => null),
  writePlannerActionHandoff: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  usePathname: () => "/actions/new",
}));
vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));
vi.mock("./action-preparation-context-hook", () => ({
  useActionPreparationContext: preparationContextHookMock,
}));
vi.mock("./action-creation-legal-panel", () => ({
  ActionCreationLegalPanel: ({ actionId }: { actionId?: string | null }) => (
    <div data-testid="formalities-action-id">{actionId ?? "none"}</div>
  ),
}));
vi.mock("@/components/sections/rubriques/route", () => ({
  RouteSection: () => <div data-testid="route-engine" />,
}));
vi.mock("@/components/sections/rubriques/weather/weather-section", () => ({
  WeatherSection: (props: Record<string, unknown>) => {
    weatherSectionPropsMock(props);
    return <div data-testid="weather-engine" />;
  },
}));

describe("ActionCreationShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateActionMock.mockResolvedValue({ id: "action-42" });
    draftStorageMocks.load.mockReturnValue({ snapshot: null, readError: false });
    draftStorageMocks.clear.mockReturnValue(true);
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
      "/actions/new?space=bilan&actionId=action-42",
    );
  });

  it("makes the first persisted action resumable before publication", () => {
    renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    const beforeProps = beforeFormPropsMock.mock.lastCall?.[0] as {
      onActionPersisted: (actionId: string) => void;
    };
    beforeProps.onActionPersisted("action-created");

    expect(routerReplaceMock).toHaveBeenCalledWith(
      "/actions/new?section=definir&actionId=action-created",
    );
  });

  it("replaces historical stage links with the two-stage URL while preserving the action identity", async () => {
    await act(async () => {
      create(React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "formalites",
        initialSection: "preparer",
        tabSearchParams: { step: "paris", panel: "formalites", subsection: "formalites", actionId: "action-42", from: "planner" },
      } as ComponentProps<typeof ActionCreationShell>));
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/actions/new?section=preparer&actionId=action-42&from=planner");
  });

  it("switches the form and section identity when the resource changes", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(ActionCreationShell, {
            actorNameOptions: ["Test"],
            defaultActorName: "Test",
            isAuthenticated: false,
            userMetadata: { userId: "test" },
            initialActionId: "action-a",
            initialPanel: "pre-formulaire",
            initialSection: "preparer",
          } as ComponentProps<typeof ActionCreationShell>),
        ),
      );
    });

    await act(async () => {
      renderer.update(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(ActionCreationShell, {
            actorNameOptions: ["Test"],
            defaultActorName: "Test",
            isAuthenticated: false,
            userMetadata: { userId: "test" },
            initialActionId: "action-b",
            initialPanel: "pre-formulaire",
            initialSection: "definir",
          } as ComponentProps<typeof ActionCreationShell>),
        ),
      );
    });

    expect(beforeFormPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialActionId: "action-b", activeSection: "definir" }),
    );
    expect(preparationContextHookMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ actionId: "action-b" }),
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

  it("deletes only the local draft after a readable check and resets navigation without changing the server action id", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "pre-formulaire",
        initialSection: "preparer",
      } as ComponentProps<typeof ActionCreationShell>));
    });

    const formProps = beforeFormPropsMock.mock.lastCall?.[0] as {
      actionBar: { onConfirmDiscard: () => boolean };
      initialActionId: string;
    };
    expect(formProps.initialActionId).toBe("action-42");
    let cleared = false;
    await act(async () => {
      cleared = formProps.actionBar.onConfirmDiscard();
    });

    expect(cleared).toBe(true);
    expect(draftStorageMocks.load).toHaveBeenCalledWith(expect.any(Object), "action", "action-42");
    expect(draftStorageMocks.clear).toHaveBeenCalledWith("action-42");
    expect(routerReplaceMock).toHaveBeenCalledWith("/actions/new?section=definir&actionId=action-42");
    expect(beforeFormPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({ initialActionId: "action-42" }));
    await act(async () => renderer.unmount());
  });

  it("blocks discard when local storage cannot be read", async () => {
    draftStorageMocks.load.mockReturnValue({ snapshot: null, readError: true });
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
      } as ComponentProps<typeof ActionCreationShell>));
    });

    const formProps = beforeFormPropsMock.mock.lastCall?.[0] as {
      actionBar: { onConfirmDiscard: () => boolean };
    };
    let cleared = true;
    await act(async () => {
      cleared = formProps.actionBar.onConfirmDiscard();
    });

    expect(cleared).toBe(false);
    expect(draftStorageMocks.clear).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it("opens the Formalités locales step with the existing action id", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialActionId: "action-42",
        initialPanel: "formalites",
        initialSection: "preparer",
        tabSearchParams: { step: "paris" },
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('data-testid="pre-formulaire-engine"');
    expect(beforeFormPropsMock).toHaveBeenCalledWith(expect.objectContaining({ activeSection: "preparer", initialActionId: "action-42" }));
  });

  it("exposes the two new stages and opens the requested preparation stage", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "itineraire",
        initialSection: "preparer",
        tabSearchParams: { step: "itineraire" },
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('data-testid="action-creation-section-nav"');
    expect(markup).toContain("Définir l&#x27;action");
    expect(markup).toContain("Organiser une action");
    expect(markup).toContain("Préparer et publier");
    expect(markup).toContain('data-workflow-section="preparer"');
    expect(markup).not.toContain('data-testid="route-engine"');
    expect(markup).toContain('data-testid="fixed-area-route-state"');
    expect(beforeFormPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      actionBar: expect.objectContaining({ isFinalStep: true, previousDisabled: false }),
    }));
    expect(markup).toContain('data-testid="weather-engine"');
    expect(weatherSectionPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      canonicalActionContext: true,
      compactSummary: true,
      onEditActionContext: expect.any(Function),
    }));
    const mainEnd = markup.indexOf("</main>");
    const preview = markup.indexOf('data-testid="action-creation-context-preview"');
    expect(preview).toBeGreaterThan(mainEnd);
    expect(markup).toContain('data-testid="pre-formulaire-engine"');
    expect(beforeFormPropsMock).toHaveBeenCalledTimes(1);
    expect(beforeFormPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSection: "preparer",
        guidedWorkflow: true,
      }),
    );
  });

  it("shows the contextual preview below the form only in the preparation stage", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
        initialSection: "preparer",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    const mainEnd = markup.indexOf("</main>");
    const preview = markup.indexOf('data-testid="action-creation-context-preview"');
    expect(mainEnd).toBeGreaterThan(-1);
    expect(preview).toBeGreaterThan(mainEnd);
  });

  it.each([
    { label: "section parcours", sectionsEnabled: true, initialPanel: "meteo" as const, initialSection: "preparer" as const, tabSearchParams: undefined },
    { label: "workflow parcours", sectionsEnabled: false, initialPanel: "meteo" as const, initialSection: undefined, tabSearchParams: { step: "preparation" } },
  ])("transmits the server territory preference through the $label", ({ sectionsEnabled, initialPanel, initialSection, tabSearchParams }) => {
    const preference = {
      country: "SN",
      level: "country",
      label: "Sénégal",
      subtitle: "Dakar",
      arrondissement: null,
      arrondissementCity: null,
      locationType: "residence",
    } as const;

    renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel,
        initialSection,
        sectionsEnabled,
        tabSearchParams,
        territoryPreference: preference,
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(weatherSectionPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({ territoryPreference: preference }));
  });

  it.each([
    { label: "section parcours", sectionsEnabled: true, initialPanel: "meteo" as const, initialSection: "preparer" as const, tabSearchParams: undefined },
    { label: "workflow parcours", sectionsEnabled: false, initialPanel: "meteo" as const, initialSection: undefined, tabSearchParams: { step: "preparation" } },
  ])("preserves an explicit empty or absent preference in the $label", ({ sectionsEnabled, initialPanel, initialSection, tabSearchParams }) => {
    renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel,
        initialSection,
        sectionsEnabled,
        tabSearchParams,
        territoryPreference: null,
      } as ComponentProps<typeof ActionCreationShell>),
    );
    expect(weatherSectionPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({ territoryPreference: null }));

    renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel,
        initialSection,
        sectionsEnabled,
        tabSearchParams,
      } as ComponentProps<typeof ActionCreationShell>),
    );
    expect(weatherSectionPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({ territoryPreference: undefined }));
  });

  it("starts a new guided preparation on the route step", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
        initialSection: "preparer",
        initialSubsection: "route",
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).toContain('data-workflow-section="preparer"');
    expect(markup).not.toContain('data-testid="route-engine"');
    expect(markup).toContain('data-testid="fixed-area-route-state"');
  });

  it("keeps the legacy guided journey available behind the migration flag", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: false,
        userMetadata: { userId: "test" },
        initialPanel: "itineraire",
        sectionsEnabled: false,
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).not.toContain('data-testid="action-creation-section-nav"');
    expect(markup).toContain("Itinéraire");
    expect(markup).toContain('data-testid="route-engine"');
    expect(markup.match(/data-testid="action-creation-action-bar"/g)).toHaveLength(1);
    expect(markup).toContain("Supprimer le brouillon");
    expect(markup).toContain("Suivant");
  });

  it("uses the form-owned action bar on the legacy final step without a duplicate shell bar", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationShell, {
        actorNameOptions: ["Test"],
        defaultActorName: "Test",
        isAuthenticated: true,
        userMetadata: { userId: "test" },
        initialPanel: "pre-formulaire",
        sectionsEnabled: false,
        tabSearchParams: { step: "preformulaire" },
      } as ComponentProps<typeof ActionCreationShell>),
    );

    expect(markup).not.toContain('data-testid="action-creation-action-bar"');
    expect(beforeFormPropsMock).toHaveBeenLastCalledWith(expect.objectContaining({
      actionBar: expect.objectContaining({ isFinalStep: true, onNext: expect.any(Function) }),
    }));
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
    expect(markup).toContain('id="action-creation-space-prepare"');
    expect(markup).toContain('id="action-creation-space-day"');
    expect(markup).toContain('id="action-creation-space-bilan"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-labelledby="action-creation-space-bilan"');
    expect(markup).toContain(
      "/actions/new?space=prepare&amp;tab=before&amp;panel=meteo&amp;actionId=action-42&amp;tag=terrain&amp;tag=safety",
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
