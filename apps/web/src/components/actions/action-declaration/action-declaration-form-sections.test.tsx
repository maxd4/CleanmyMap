import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildCreateActionPayload, createInitialFormState } from "./payload";
import { useActionDeclarationSubmission } from "./hooks/use-action-declaration-submission";
import { ActionDeclarationFormSections, ActionDeclarationValidationSummary } from "./action-declaration-form-sections";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const createActionMock = vi.hoisted(() => vi.fn());
const updateActionMock = vi.hoisted(() => vi.fn());
const fetchActionByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/http", () => ({
  createAction: createActionMock,
  updateAction: updateActionMock,
  fetchActionById: fetchActionByIdMock,
}));

vi.mock("./steps/action-step-identity.collection", () => ({
  ActionCollectionSection: () => <div>environment fields</div>,
}));
vi.mock("./steps/action-step-identity.organizer", () => ({
  ActionOrganizerSection: () => <div>organizer fields</div>,
}));
vi.mock("./steps/action-step-identity.participants", () => ({
  ActionParticipantSection: () => <div>participant fields</div>,
}));
vi.mock("./steps/action-step-identity.time", () => ({
  ActionTimeSection: () => <div>time fields</div>,
}));
vi.mock("./steps/ActionStepHarvest", () => ({
  ActionStepHarvest: () => <div>harvest fields and photos</div>,
}));
vi.mock("./steps/ActionStepIdentity", () => ({
  ActionStepIdentity: () => <div>identity fields</div>,
}));
vi.mock("./steps/ActionStepLocation", () => ({
  ActionStepLocation: () => <div>location and geometry fields</div>,
}));

describe("ActionDeclarationValidationSummary", () => {
  it("keeps simultaneous issues inside the form and links them to their controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionDeclarationValidationSummary, {
        validationIssues: [
          { field: "organizerType", message: "Choisissez un type." },
          { field: "wasteKg", message: "Renseignez une mesure." },
          { field: "manualDrawing", message: "Ajoutez une localisation." },
        ],
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain('href="#action-organizer-type"');
    expect(markup).toContain('href="#harvest-waste-kg"');
    expect(markup).toContain('href="#action-location-geometry"');
    expect(markup).toContain("Choisissez un type.");
    expect(markup).toContain("Renseignez une mesure.");
    expect(markup).toContain("Ajoutez une localisation.");
  });

  it("renders the five groups once and keeps the primary CTA unique", () => {
    const form = createInitialFormState("Alice", "action");
    const markup = renderToStaticMarkup(
      <ActionDeclarationFormSections
        form={form}
        identity={{
          form,
          updateField: vi.fn(),
          updateFields: vi.fn(),
          userMetadata: { userId: "user-1" },
          recordType: "action",
          hasAttemptedSubmit: false,
        }}
        harvest={{} as never}
        location={{} as never}
        showPreparationSummary
        hasAttemptedSubmit={false}
        validationIssues={[]}
        submissionState="idle"
        validationStatus="not_attempted"
        errorMessage={null}
        onOpenExport={() => undefined}
      />,
    );

    expect(markup.indexOf('id="action-declaration-identify"')).toBeGreaterThan(-1);
    expect(markup.indexOf('id="action-declaration-participants"')).toBeGreaterThan(markup.indexOf('id="action-declaration-identify"'));
    expect(markup.indexOf('id="action-declaration-results"')).toBeGreaterThan(markup.indexOf('id="action-declaration-participants"'));
    expect(markup.indexOf('id="action-declaration-terrain"')).toBeGreaterThan(markup.indexOf('id="action-declaration-results"'));
    expect(markup.indexOf('id="action-declaration-review"')).toBeGreaterThan(markup.indexOf('id="action-declaration-terrain"'));
    expect(markup.match(/Vérifier et envoyer/g)).toHaveLength(1);
    expect(markup).not.toContain("action-disclosure-");
    expect(markup).toContain("Exporter le récapitulatif");
  });
});

function buildValidReviewForm() {
  const form = createInitialFormState("Test", "action");
  form.organizerType = "spontaneous";
  form.organizerAccounts = "user-1";
  form.associationName = "Action spontanée";
  form.actionDate = "2026-10-01";
  form.locationLabel = "Quai de test";
  form.departureLocationLabel = "Quai de test";
  form.volunteersCount = "1";
  form.childrenCount = "0";
  form.retiredCount = "0";
  form.wasteKg = "1";
  form.durationMinutes = "60";
  return form;
}

function ReviewSubmissionHarness({
  draftStorageReadError = false,
  photoPreparationPending = false,
  valid = false,
  onSubmission,
}: {
  draftStorageReadError?: boolean;
  photoPreparationPending?: boolean;
  valid?: boolean;
  onSubmission?: (submission: ReturnType<typeof useActionDeclarationSubmission>) => void;
}) {
  const [form] = useState(() => valid ? buildValidReviewForm() : createInitialFormState("Test", "action"));
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const submission = useActionDeclarationSubmission({
    form,
    declarationMode: "complete",
    isAuthenticated: true,
    draftStorageReadError,
    initialActionId: null,
    loadedActionPhase: null,
    manualDrawingEnabled: false,
    manualDrawing: null,
    manualDrawingSource: null,
    drawingIsValid: false,
    effectiveRoutePreviewDrawing: null,
    routePreviewSource: null,
    hasValidDrawing: valid,
    hasServerRouteInput: false,
    isCleanPlaceMode: false,
    payload: buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: valid,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    }),
    photoAssets: [],
    photoPreparationPending,
    visionEstimate: null,
    userMetadata: { userId: "user-1" },
    clearDraft: vi.fn(),
    creationRequestId: "review-state-test",
    setLoadedActionPhase: vi.fn(),
    setHasAttemptedSubmit,
  });

  onSubmission?.(submission);

  return (
    <ActionDeclarationFormSections
      form={form}
      identity={{
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        userMetadata: { userId: "user-1" },
        recordType: "action",
        hasAttemptedSubmit,
      }}
      harvest={{} as never}
      location={{} as never}
      showPreparationSummary={false}
      hasAttemptedSubmit={hasAttemptedSubmit}
      validationIssues={submission.validationIssues}
      submissionState={submission.submissionState}
      validationStatus={submission.validationStatus}
      errorMessage={submission.errorMessage}
      onOpenExport={() => undefined}
    />
  );
}

function renderReviewSubmissionHarness(options?: React.ComponentProps<typeof ReviewSubmissionHarness>) {
  let renderer!: ReactTestRenderer;
  let latest!: ReturnType<typeof useActionDeclarationSubmission>;
  act(() => {
    renderer = create(<ReviewSubmissionHarness {...options} onSubmission={(submission) => { latest = submission; }} />);
  });
  return { renderer, getLatest: () => latest };
}

function reviewMarkup(rendered: ReturnType<typeof renderReviewSubmissionHarness>) {
  return JSON.stringify(rendered.renderer.toJSON());
}

describe("ActionDeclarationReviewSummary submission state", () => {
  it("keeps the unverified form neutral", () => {
    const rendered = renderReviewSubmissionHarness();
    const markup = reviewMarkup(rendered);

    expect(markup).toContain("La validation complète sera lancée");
    expect(markup).not.toContain("Validation locale réussie");
  });

  it("shows field errors without a success state after validateBeforeConfirmation", () => {
    const rendered = renderReviewSubmissionHarness();

    act(() => {
      rendered.getLatest().validateBeforeConfirmation();
    });

    const markup = reviewMarkup(rendered);
    expect(markup).toContain("reste");
    expect(markup).not.toContain("Validation locale réussie");
    expect(markup).toContain("border-rose-200 bg-rose-50");
  });

  it.each([
    ["photos en préparation", { photoPreparationPending: true }, "préparation des photos"],
    ["lecture du brouillon en erreur", { draftStorageReadError: true }, "lecture du brouillon"],
  ])("shows an operational blocker for %s", (_label, options, expectedMessage) => {
    const rendered = renderReviewSubmissionHarness(options);

    act(() => {
      rendered.getLatest().validateBeforeConfirmation();
    });

    const markup = reviewMarkup(rendered);
    expect(markup).toContain("Vérification bloquée");
    expect(markup).toContain(expectedMessage);
    expect(markup).not.toContain("Validation locale réussie");
    expect(markup).toContain("border-rose-200 bg-rose-50");
  });

  it("shows local validation success only after a complete validation", () => {
    const rendered = renderReviewSubmissionHarness({ valid: true });
    let accepted = false;

    act(() => {
      accepted = rendered.getLatest().validateBeforeConfirmation();
    });

    const markup = reviewMarkup(rendered);
    expect(accepted).toBe(true);
    expect(markup).toContain("Validation locale réussie : le récapitulatif peut être confirmé.");
    expect(markup).toContain("border-emerald-200 bg-emerald-50");
  });

  it("shows a transmission error after successful validation and recovers on retry", async () => {
    createActionMock.mockRejectedValueOnce(new Error("Serveur indisponible"));
    createActionMock.mockResolvedValueOnce({ id: "action-retry-1" });
    fetchActionByIdMock.mockResolvedValue(null);
    const rendered = renderReviewSubmissionHarness({ valid: true });

    act(() => {
      rendered.getLatest().validateBeforeConfirmation();
    });
    await act(async () => {
      await rendered.getLatest().handleConfirmSubmit();
    });

    let markup = reviewMarkup(rendered);
    expect(markup).toContain("Transmission impossible : Serveur indisponible");
    expect(markup).not.toContain("Validation locale réussie");

    await act(async () => {
      await rendered.getLatest().handleConfirmSubmit();
    });

    markup = reviewMarkup(rendered);
    expect(markup).toContain("Transmission réussie.");
    expect(markup).not.toContain("Transmission impossible");
  });
});
