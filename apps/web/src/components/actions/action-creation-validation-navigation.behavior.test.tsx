// @vitest-environment jsdom
import { useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "./action-declaration/payload";
import { INACTIVE_LOCAL_DEV_AUTH } from "@/lib/auth/effective-auth-contract";
import { ActionCreationSectionContent } from "./action-creation-shell-sections";
import type { ActionCreationPanelId, ActionCreationSectionId } from "@/lib/actions/action-creation-routes";
import type { ActionPreparationContext } from "@/lib/actions/action-preparation-context";
import type { ActionCreationSectionFormProps } from "./action-creation-shell.types";
import type { FormState } from "./action-declaration/model";

const beforeFormState = vi.hoisted(() => ({
  form: null as FormState | null,
  validationIssues: [] as string[],
  validationIssueFields: [] as string[],
}));

vi.mock("./action-declaration/before/use-before-action-form", () => ({
  useBeforeActionForm: () => ({
    form: beforeFormState.form,
    submissionState: "error",
    errorMessage: "Corrigez le champ indiqué.",
    createdId: null,
    publishedAction: null,
    invitationStatuses: [],
    terminalActionStatus: null,
    publishedAt: null,
    publicationState: "idle",
    publicationError: null,
    publicationConfirmationOpen: false,
    isHydratingAction: false,
    validationIssues: beforeFormState.validationIssues,
    validationIssueFields: beforeFormState.validationIssueFields,
    showGroupJoinHelp: false,
    setShowGroupJoinHelp: vi.fn(),
    updateField: vi.fn(),
    updateFields: vi.fn(),
    handleSubmit: vi.fn(),
    requestPublish: vi.fn(),
    cancelPublication: vi.fn(),
    confirmPublish: vi.fn(),
    onContinueComplete: vi.fn(),
    persistenceStatus: "clean",
    retryDraftPersistence: vi.fn(),
  }),
}));

vi.mock("@/components/sections/rubriques/route", () => ({ RouteSection: () => <div /> }));
vi.mock("@/components/sections/rubriques/weather/weather-section", () => ({
  WeatherSection: ({ onEditActionContext }: { onEditActionContext: () => void }) => (
    <button type="button" data-testid="weather-edit-action" onClick={onEditActionContext}>Modifier</button>
  ),
}));
vi.mock("./action-creation-legal-panel", () => ({ ActionCreationLegalPanel: () => <div /> }));
vi.mock("./use-action-preparation-weather", () => ({
  createActionPreparationWeatherRequest: () => null,
  useActionPreparationWeather: () => ({
    weatherContext: null,
    weatherRequest: null,
    weatherState: "unavailable",
    requestWeather: vi.fn(),
  }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const scenarios = [
  { field: "departureLocationLabel", label: "Rendez-vous", targetSection: "definir", targetId: "before-departure-location", value: "Place de départ" },
  { field: "meetingTime", label: "Heure de rendez-vous", targetSection: "definir", targetId: "before-meeting-time", value: "09:00" },
  { field: "arrivalLocationLabel", label: "Arrivée", targetSection: "preparer", targetId: "before-arrival-location", value: "" },
] as const;

describe("action creation validation navigation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let animationFrames: FrameRequestCallback[];
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    animationFrames = [];
    originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    };
  });

  async function flushAnimationFrames() {
    while (animationFrames.length > 0) {
      const callback = animationFrames.shift()!;
      await act(async () => callback(0));
    }
  }

  async function renderScenario(field: string) {
    const form = createInitialFormState("Équipe test", "action");
    form.actionTitle = "Action à corriger";
    form.actionDate = "2026-12-04";
    form.associationName = "Action spontanée";
    form.organizerType = "spontaneous";
    form.departureLocationLabel = "Place de départ";
    form.meetingTime = "09:00";
    form.interventionMode = { version: "intervention-mode-v1", mode: "itinerary" };
    form.routeTopology = "point_to_point";
    form.arrivalLocationLabel = "";
    beforeFormState.form = form;
    beforeFormState.validationIssues = ["Corrigez le champ indiqué."];
    beforeFormState.validationIssueFields = [field];

    const formProps: ActionCreationSectionFormProps = {
      actorNameOptions: ["Équipe test"],
      defaultActorName: "Équipe test",
      isAuthenticated: true,
      userMetadata: { userId: "test-user" },
    };
    const preparationContext = {
      actionId: null,
      actionDate: "2026-12-04",
      departureTime: "09:00",
      locationLabel: "Place de départ",
      latitude: "",
      longitude: "",
      preparationChecklist: [],
      suggestedMaterials: [],
      materialsProvided: "",
      recommendedMaterials: "",
    } as unknown as ActionPreparationContext;
    const navigateSection = vi.fn((section: ActionCreationSectionId) => setActiveSection(section));
    let setActiveSection!: (section: ActionCreationSectionId) => void;

    function Harness() {
      const [activeSection, updateActiveSection] = useState<ActionCreationSectionId>("preparer");
      setActiveSection = updateActiveSection;
      return (
        <>
          <output data-testid="active-section">{activeSection}</output>
          <ActionCreationSectionContent
            currentActionId={null}
            draftContext={{}}
            preparationContext={preparationContext}
            formalitiesReadiness="unknown"
            formProps={formProps}
            localDevAuth={INACTIVE_LOCAL_DEV_AUTH}
            actionBar={{
              actionId: null,
              onConfirmDiscard: vi.fn(() => true),
              onPrevious: vi.fn(),
              previousDisabled: false,
              onNext: vi.fn(),
              isFinalStep: false,
              isAuthenticated: true,
            }}
            draftResetVersion={0}
            preparationPersistenceStatus="saved"
            onActionPersisted={vi.fn()}
            onFormChange={vi.fn()}
            onFormalitiesReadiness={vi.fn()}
            onPassToComplete={vi.fn()}
            onPreparationValidated={vi.fn()}
            onPreparationSelection={() => ({ status: "applied", context: preparationContext, conflicts: [] })}
            onPreparationContextChange={vi.fn()}
            activeSection={activeSection}
            initialSubsection="route"
            formSnapshot={form}
            initialPanel={"itineraire" as ActionCreationPanelId}
            onNavigateSection={navigateSection}
          />
        </>
      );
    }

    await act(async () => root.render(<Harness />));
    await flushAnimationFrames();
    return { navigateSection };
  }

  it.each(scenarios)("routes $field from keyboard-accessible correction to $targetSection and focuses its control", async ({ field, label, targetSection, targetId, value }) => {
    const { navigateSection } = await renderScenario(field);

    const correctionButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === label);
    expect(correctionButton).toBeDefined();
    expect(correctionButton?.type).toBe("button");
    expect(correctionButton?.tabIndex).toBe(0);
    correctionButton?.focus();
    expect(document.activeElement).toBe(correctionButton);

    await act(async () => {
      correctionButton?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      correctionButton?.click();
    });
    await flushAnimationFrames();

    expect(container.querySelector('[data-testid="active-section"]')?.textContent).toBe(targetSection);
    const target = container.querySelector(`#${targetId}`) as HTMLInputElement | null;
    expect(document.activeElement).toBe(target);
    expect(target?.value).toBe(value);
    if (targetSection === "preparer") {
      expect(navigateSection).not.toHaveBeenCalled();
    } else {
      expect(navigateSection).toHaveBeenCalledExactlyOnceWith(targetSection);
    }
  });

  it("keeps the rendez-vous Modifier button pointed at Define", async () => {
    const { navigateSection } = await renderScenario("arrivalLocationLabel");
    const button = container.querySelector('[data-testid="terrain-map-panel"] button') as HTMLButtonElement | null;

    expect(button?.textContent?.trim()).toBe("Modifier");
    await act(async () => button?.click());

    expect(navigateSection).toHaveBeenCalledExactlyOnceWith("definir");
    expect(container.querySelector('[data-testid="active-section"]')?.textContent).toBe("definir");
  });

  it("keeps the weather Modifier button pointed at Define", async () => {
    const { navigateSection } = await renderScenario("arrivalLocationLabel");
    const button = container.querySelector('[data-testid="weather-edit-action"]') as HTMLButtonElement | null;

    expect(button?.textContent?.trim()).toBe("Modifier");
    await act(async () => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(navigateSection).toHaveBeenCalledExactlyOnceWith("definir");
    expect(container.querySelector('[data-testid="active-section"]')?.textContent).toBe("definir");
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    window.requestAnimationFrame = originalRequestAnimationFrame;
    container.remove();
  });
});
