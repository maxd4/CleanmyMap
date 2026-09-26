import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import { ActionBeforeDeclarationForm } from "./form";

const useBeforeActionFormMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("./use-before-action-form", () => ({
  useBeforeActionForm: useBeforeActionFormMock,
}));

function buildHookState(overrides: Record<string, unknown> = {}) {
  const form = createInitialFormState("Maxence", "action");
  form.actionTitle = "Nettoyage du canal";
  form.actionDate = "2026-09-20";
  form.eventStartTime = "09:00";
  form.eventEndTime = "11:00";
  form.departureLocationLabel = "Paris 15e";
  form.arrivalLocationLabel = "Quai de Seine";
  form.volunteersCount = "8";
  form.preparationState = "pret_a_partager";
  form.safetyInstructions = "Rester en groupe.";

  return {
    form,
    submissionState: "success",
    errorMessage: null,
    createdId: "action-42",
    publishedAction: {
      id: "action-42",
      actionPhase: "pre_action",
      publishedAt: "2026-09-15T10:00:00.000Z",
      actionDate: "2026-09-20",
      eventStartTime: "09:00",
      eventEndTime: "11:00",
      locationLabel: "Paris 15e",
      departureLocationLabel: "Paris 15e",
      arrivalLocationLabel: "Quai de Seine",
      volunteersCount: 8,
      preparationData: {
        preparationState: "pret_a_partager",
        safetyInstructions: "Rester en groupe.",
      },
    },
    publishedAt: "2026-09-15T10:00:00.000Z",
    publicationState: "success",
    publicationError: null,
    publicationConfirmationOpen: false,
    isHydratingAction: false,
    validationIssues: [],
    showGroupJoinHelp: false,
    setShowGroupJoinHelp: vi.fn(),
    updateField: vi.fn(),
    handleSubmit: vi.fn(),
    requestPublish: vi.fn(),
    cancelPublication: vi.fn(),
    confirmPublish: vi.fn(),
    onContinueComplete: vi.fn(),
    ...overrides,
  };
}

const props = {
  actorNameOptions: ["Maxence"],
  defaultActorName: "Maxence",
  isAuthenticated: true,
  userMetadata: { userId: "user-1", displayName: "Maxence" },
  onPassToComplete: vi.fn(),
};

describe("ActionBeforeDeclarationForm publication flow", () => {
  beforeEach(() => {
    useBeforeActionFormMock.mockReset();
  });

  it("renders the final published state with existing view, share and join handoffs", () => {
    useBeforeActionFormMock.mockReturnValue(buildHookState());

    const html = renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, props),
    );

    expect(html).toContain("Action prête et publiée");
    expect(html).toContain("Synthèse de l&#x27;action publiée");
    expect(html).toContain("Voir l&#x27;action");
    expect(html).toContain("Partager dans la messagerie");
    expect(html).toContain("Rejoindre une action");
    expect(html).toContain("/actions/map?actionId=action-42");
    expect(html).toContain("/sections/rejoindre-une-action?actionId=action-42");
    expect(html).not.toContain("Publier cette action");
  });

  it("forwards the persisted-action callback to the form hook", () => {
    useBeforeActionFormMock.mockReturnValue(buildHookState());
    const onActionPersisted = vi.fn();

    renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, {
        ...props,
        onActionPersisted,
      }),
    );

    expect(useBeforeActionFormMock).toHaveBeenCalledWith(
      expect.objectContaining({ onActionPersisted }),
    );
  });

  it("renders publication confirmation without publishing before explicit confirmation", () => {
    useBeforeActionFormMock.mockReturnValue(
      buildHookState({
        publishedAction: null,
        publishedAt: null,
        publicationState: "idle",
        publicationConfirmationOpen: true,
      }),
    );

    const html = renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, props),
    );

    expect(html).toContain("Confirmer la publication");
    expect(html).toContain("Confirmer et publier");
    expect(html).toContain("Annuler");
  });

  it("keeps the guided workflow at a pre-action recap without publication or recruitment controls", () => {
    useBeforeActionFormMock.mockReturnValue(buildHookState({ publishedAt: null, publicationState: "idle" }));

    const html = renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, {
        ...props,
        guidedWorkflow: true,
        guidedReadiness: "ready",
      }),
    );

    expect(html).toContain("Préformulaire prêt à publier");
    expect(html).not.toContain("Publier cette action");
    expect(html).not.toContain("Partager dans la messagerie");
    expect(html).not.toContain("Rejoindre une action");
  });

  it.each([
    ["rejected", "Pré-action rejetée"],
    ["cancelled", "Action annulée"],
  ] as const)("renders %s as a terminal non-publishable state", (status, title) => {
    useBeforeActionFormMock.mockReturnValue(
      buildHookState({
        terminalActionStatus: status,
        publishedAt: null,
        publishedAction: { ...buildHookState().publishedAction, status },
      }),
    );

    const html = renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, props),
    );

    expect(html).toContain(title);
    expect(html).toContain("État terminal");
    expect(html).not.toContain("Action prête et publiée");
    expect(html).not.toContain("Publier cette action");
  });
});
