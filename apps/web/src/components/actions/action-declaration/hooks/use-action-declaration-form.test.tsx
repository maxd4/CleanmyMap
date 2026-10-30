import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { buildCreateActionPayload, createInitialFormState } from "../payload";
import { useActionDeclarationForm } from "./use-action-declaration-form";
import { useActionDeclarationFormUpdates } from "./use-action-declaration-form-updates";
import { useActionDeclarationSubmission } from "./use-action-declaration-submission";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function HookProbe() {
  const value = useActionDeclarationForm({
    actorNameOptions: ["Alex"],
    defaultActorName: "Alex",
    isAuthenticated: true,
    userMetadata: { userId: "user-42" },
  });

  return React.createElement(
    "output",
    {
      "data-form-record-type": value.form.recordType,
      "data-submission-state": value.submissionState,
      "data-draft-banner": String(value.showDraftBanner),
      "data-handler-contract": String(
        typeof value.handleConfirmSubmit === "function" &&
          typeof value.handleGpxImport === "function" &&
          typeof value.handleResumeDraft === "function" &&
          typeof value.resetForm === "function",
      ),
    },
    value.form.associationName,
  );
}

describe("useActionDeclarationForm public facade", () => {
  it("keeps the public form, state and handler contract usable on the server boundary", () => {
    const markup = renderToStaticMarkup(React.createElement(HookProbe));

    expect(markup).toContain('data-form-record-type="action"');
    expect(markup).toContain('data-submission-state="idle"');
    expect(markup).toContain('data-draft-banner="false"');
    expect(markup).toContain('data-handler-contract="true"');
    expect(markup).toContain("Action spontanée");
  });

  it("invalidates a successful local validation when a business field changes", () => {
    const form = createInitialFormState("Alex");
    Object.assign(form, {
      organizerType: "spontaneous",
      organizerAccounts: "user-42",
      associationName: "Action spontanée",
      actionDate: "2026-10-01",
      locationLabel: "Quai de test",
      departureLocationLabel: "Quai de test",
      routeTopology: "loop",
      volunteersCount: "1",
      childrenCount: "0",
      retiredCount: "0",
      wasteKg: "1",
      durationMinutes: "60",
    });
    let latest!: {
      submission: ReturnType<typeof useActionDeclarationSubmission>;
      updateField: ReturnType<typeof useActionDeclarationFormUpdates>["updateField"];
    };
    let renderer!: ReactTestRenderer;
    function Harness({ onSnapshot }: { onSnapshot: (value: typeof latest) => void }) {
      const [currentForm, setForm] = React.useState(form);
      const [, setHasAttemptedSubmit] = React.useState(false);
      const payload = buildCreateActionPayload({
        form: currentForm,
        declarationMode: "complete",
        effectiveManualDrawingEnabled: false,
        drawingIsValid: false,
        manualDrawing: null,
        isEntrepriseMode: false,
        linkedEventId: undefined,
        userMetadata: { userId: "user-42" },
      });
      const submission = useActionDeclarationSubmission({
        form: currentForm,
        declarationMode: "complete",
        isAuthenticated: true,
        draftStorageReadError: false,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: false,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: true,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload,
        photoAssets: [],
        photoPreparationPending: false,
        visionEstimate: null,
        userMetadata: { userId: "user-42" },
        clearDraft: () => undefined,
        creationRequestId: "action-test",
        setLoadedActionPhase: () => undefined,
        setHasAttemptedSubmit,
      });
      const updates = useActionDeclarationFormUpdates({
        form: currentForm,
        setForm,
        manualDrawing: null,
        manualDrawingSource: null,
        persistedDrawing: null,
        setPersistedDrawing: () => undefined,
        setPersistedDrawingSource: () => undefined,
        setManualDrawingState: () => undefined,
        setManualDrawingSource: () => undefined,
        setGpxError: () => undefined,
        setHasAttemptedSubmit,
        invalidateValidation: submission.invalidateValidation,
        saveDraftIfAllowed: () => undefined,
        shouldSaveDraft: false,
        trackFormStart: () => undefined,
      });
      onSnapshot({ submission, updateField: updates.updateField });
      return null;
    }

    act(() => { renderer = create(React.createElement(Harness, { onSnapshot: (value) => { latest = value; } })); });
    let accepted = false;
    act(() => { accepted = latest.submission.validateBeforeConfirmation(); });

    expect(accepted).toBe(true);
    expect(latest.submission.validationStatus).toBe("validated");

    act(() => { latest.updateField("wasteKg", "2"); });

    expect(latest.submission.validationStatus).toBe("not_attempted");
    renderer.unmount();
  });

  it("resets submission feedback and geometry for a new declaration", () => {
    let latest!: ReturnType<typeof useActionDeclarationSubmission>;
    let renderer!: ReactTestRenderer;
    function Harness({ onSnapshot }: { onSnapshot: (value: ReturnType<typeof useActionDeclarationSubmission>) => void }) {
      const submission = useActionDeclarationSubmission({
        form: createInitialFormState("Alex"),
        declarationMode: "complete",
        isAuthenticated: true,
        draftStorageReadError: false,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: false,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: true,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload: {} as never,
        photoAssets: [],
        photoPreparationPending: false,
        visionEstimate: null,
        userMetadata: { userId: "user-42" },
        clearDraft: () => undefined,
        creationRequestId: "action-reset",
        setLoadedActionPhase: () => undefined,
        setHasAttemptedSubmit: () => undefined,
      });
      onSnapshot(submission);
      return null;
    }

    act(() => { renderer = create(React.createElement(Harness, { onSnapshot: (value) => { latest = value; } })); });
    act(() => { latest.resetSubmission(); });

    expect(latest.validationStatus).toBe("not_attempted");
    expect(latest.submissionState).toBe("idle");
    expect(latest.createdId).toBeNull();
    renderer.unmount();
  });
});
