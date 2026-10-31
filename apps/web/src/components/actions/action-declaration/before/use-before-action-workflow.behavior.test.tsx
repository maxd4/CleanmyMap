import { useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { FormState } from "../model";
import type { BeforeValidationField } from "./form-logic";
import { buildBeforeActionFallbackForm } from "./before-action-form-conversions";
import {
  persistBeforeAction,
  useBeforeActionFieldUpdates,
  useBeforeActionPublication,
  useBeforeActionSubmission,
} from "./use-before-action-workflow";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const createActionMock = vi.hoisted(() => vi.fn());
const updateActionMock = vi.hoisted(() => vi.fn());
const fetchActionByIdMock = vi.hoisted(() => vi.fn());
const publishActionMock = vi.hoisted(() => vi.fn());
const trackFunnelMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const saveDraftMock = vi.hoisted(() => vi.fn());
const clearDraftMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/http", () => ({
  createAction: createActionMock,
  updateAction: updateActionMock,
  fetchActionById: fetchActionByIdMock,
  publishAction: publishActionMock,
}));
vi.mock("@/lib/analytics/funnel-client", () => ({ trackFunnel: trackFunnelMock }));
vi.mock("../draft-storage", () => ({
  saveDraft: saveDraftMock,
  clearDraft: clearDraftMock,
  loadDraftSnapshot: vi.fn(() => null),
}));
vi.mock("@/lib/route/route-action-handoff", () => ({ consumePlannerActionHandoff: vi.fn(() => null) }));

function validForm(): FormState {
  return {
    ...buildBeforeActionFallbackForm(["Test"], "Test", "action"),
    actionTitle: "Collecte locale",
    actionDate: "2999-10-17",
    associationName: "Action spontanée",
    organizerType: "spontaneous",
    departureLocationLabel: "Parc central",
    locationLabel: "Parc central",
    meetingTime: "09:00",
    departureTime: "09:00",
    eventStartTime: "09:00",
    eventEndTime: "10:00",
    durationMinutes: "60",
    volunteersCount: "1",
  };
}

function stateSetter<T>(initial: T) {
  let value = initial;
  const setter = (next: T | ((current: T) => T)) => {
    value = typeof next === "function" ? (next as (current: T) => T)(value) : next;
  };
  return { get: () => value, setter };
}

describe("before-action workflow behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraftMock.mockReturnValue("2026-10-01T10:00:00.000Z");
    createActionMock.mockResolvedValue({ id: "action-created" });
    updateActionMock.mockResolvedValue({ actionId: "action-existing" });
    fetchActionByIdMock.mockResolvedValue({
      id: "action-existing",
      actionPhase: "pre_action",
      status: "approved",
      publishedAt: "2999-10-01T10:00:00.000Z",
      preparationData: {},
    });
    publishActionMock.mockResolvedValue({ id: "action-existing", publishedAt: "2999-10-02T10:00:00.000Z" });
  });

  it("uses the plain create path when no idempotency key is available and accepts both response id shapes", async () => {
    const create = vi.fn().mockResolvedValue({ actionId: "created-from-action-id" });
    const update = vi.fn();
    await expect(persistBeforeAction(null, { actionTitle: "new" } as never, { create, update }))
      .resolves.toEqual({ actionId: "created-from-action-id", created: true });
    expect(create).toHaveBeenCalledWith({ actionTitle: "new" });
    expect(update).not.toHaveBeenCalled();
  });

  it("normalizes route updates, clears a previous validation error and preserves a read-error status", async () => {
    let latest!: ReturnType<typeof useBeforeActionFieldUpdates>;
    let observedForm!: FormState;
    let observedSubmissionState = "error";
    let observedPersistenceStatus = "read-error";
    let observedError: string | null = "validation";
    let observedIssues: string[] = ["invalid"];
    function Harness() {
      const [form, setForm] = useState(validForm());
      const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("error");
      const [persistenceStatus, setPersistenceStatus] = useState<"clean" | "local" | "account" | "unsaved" | "read-error" | "error">("read-error");
      const [errorMessage, setErrorMessage] = useState<string | null>("validation");
      const [validationIssues, setValidationIssues] = useState(["invalid"]);
      const [, setValidationIssueFields] = useState<BeforeValidationField[]>(["actionTitle"]);
      observedForm = form;
      observedSubmissionState = submissionState;
      observedPersistenceStatus = persistenceStatus;
      observedError = errorMessage;
      observedIssues = validationIssues;
      latest = useBeforeActionFieldUpdates({
        form,
        draftActionId: "action-existing",
        creationRequestId: "creation-1",
        linkedEventId: "event-1",
        submissionState,
        persistenceStatus,
        isAuthenticated: true,
        setForm,
        setPersistenceStatus,
        setSubmissionState,
        setErrorMessage,
        setValidationIssues,
        setValidationIssueFields,
      });
      return null;
    }

    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<Harness />); });
    await act(async () => {
      latest.updateFields({ routeStyle: "direct", routeTopology: "loop", arrivalLocationLabel: "Should clear" });
    });

    expect(saveDraftMock).toHaveBeenCalled();
    expect(observedForm.routeStyle).toBe("souple");
    expect(observedForm.arrivalLocationLabel).toBe("");
    expect(observedSubmissionState).toBe("idle");
    expect(observedPersistenceStatus).toBe("read-error");
    expect(observedError).toBeNull();
    expect(observedIssues).toEqual([]);
    renderer.unmount();
  });

  it("keeps the pending submission lock, reports validation and recovers from a persistence error", async () => {
    const setters = {
      submission: stateSetter<"idle" | "pending" | "success" | "error">("idle"),
      persistence: stateSetter<"clean" | "local" | "account" | "unsaved" | "read-error" | "error">("clean"),
      error: stateSetter<string | null>(null),
      issues: stateSetter<string[]>([]),
      fields: stateSetter<BeforeValidationField[]>([]),
      id: stateSetter<string | null>(null),
      published: stateSetter<ActionEditorRecord | null>(null),
      publishedAt: stateSetter<string | null>(null),
    };
    const submit = useBeforeActionSubmission({
      form: { ...validForm(), actionTitle: "" },
      submissionState: "idle",
      actionId: null,
      creationRequestId: "creation-1",
      userMetadata: { userId: "user-1" },
      isAuthenticated: false,
      persistenceStatus: "clean",
      setSubmissionState: setters.submission.setter,
      setPersistenceStatus: setters.persistence.setter,
      setErrorMessage: setters.error.setter,
      setValidationIssues: setters.issues.setter,
      setValidationIssueFields: setters.fields.setter,
      setCreatedId: setters.id.setter,
      setPublishedAction: setters.published.setter,
      setPublishedAt: setters.publishedAt.setter,
    });
    await submit();
    expect(createActionMock).not.toHaveBeenCalled();
    expect(setters.submission.get()).toBe("error");
    expect(setters.issues.get().length).toBeGreaterThan(0);

    const locked = useBeforeActionSubmission({
      form: validForm(),
      submissionState: "pending",
      actionId: null,
      creationRequestId: "creation-1",
      userMetadata: { userId: "user-1" },
      isAuthenticated: true,
      persistenceStatus: "clean",
      ...{
        setSubmissionState: vi.fn(), setPersistenceStatus: vi.fn(), setErrorMessage: vi.fn(),
        setValidationIssues: vi.fn(), setValidationIssueFields: vi.fn(), setCreatedId: vi.fn(),
        setPublishedAction: vi.fn(), setPublishedAt: vi.fn(),
      },
    });
    await locked();
    expect(createActionMock).not.toHaveBeenCalled();

    createActionMock.mockRejectedValueOnce(new Error("write failed"));
    const failing = useBeforeActionSubmission({
      form: validForm(), submissionState: "idle", actionId: null, creationRequestId: null,
      userMetadata: { userId: "user-1" }, isAuthenticated: true, persistenceStatus: "clean",
      setSubmissionState: setters.submission.setter, setPersistenceStatus: setters.persistence.setter,
      setErrorMessage: setters.error.setter, setValidationIssues: setters.issues.setter,
      setValidationIssueFields: setters.fields.setter, setCreatedId: setters.id.setter,
      setPublishedAction: setters.published.setter, setPublishedAt: setters.publishedAt.setter,
    });
    await failing();
    expect(setters.submission.get()).toBe("error");
    expect(setters.persistence.get()).toBe("error");
    expect(setters.error.get()).toBe("write failed");
  });

  it("persists a new action, clears its draft and reports the canonical success", async () => {
    const setters = {
      submission: stateSetter<"idle" | "pending" | "success" | "error">("idle"),
      persistence: stateSetter<"clean" | "local" | "account" | "unsaved" | "read-error" | "error">("clean"),
      error: stateSetter<string | null>("old error"), issues: stateSetter<string[]>(["old"]), fields: stateSetter<BeforeValidationField[]>(["actionTitle"]),
      id: stateSetter<string | null>(null), published: stateSetter<ActionEditorRecord | null>(null), publishedAt: stateSetter<string | null>(null),
    };
    const onPersisted = vi.fn();
    const submit = useBeforeActionSubmission({
      form: validForm(), submissionState: "idle", actionId: null, creationRequestId: "creation-1",
      linkedEventId: "event-1", userMetadata: { userId: "user-1" }, isAuthenticated: true, persistenceStatus: "local",
      setSubmissionState: setters.submission.setter, setPersistenceStatus: setters.persistence.setter, setErrorMessage: setters.error.setter,
      setValidationIssues: setters.issues.setter, setValidationIssueFields: setters.fields.setter, setCreatedId: setters.id.setter,
      setPublishedAction: setters.published.setter, setPublishedAt: setters.publishedAt.setter, onActionPersisted: onPersisted,
    });
    await submit();
    expect(createActionMock).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: "creation-1" });
    expect(onPersisted).toHaveBeenCalledWith("action-created");
    expect(setters.id.get()).toBe("action-created");
    expect(setters.submission.get()).toBe("success");
    expect(setters.persistence.get()).toBe("account");
    expect(clearDraftMock).toHaveBeenCalledWith(null);
    expect(trackFunnelMock).toHaveBeenCalledWith("submit_success", "quick", expect.objectContaining({ createdId: "action-created" }));
  });

  it("requires explicit publication confirmation and handles success, mismatch and provider failures", async () => {
    const formState = stateSetter(validForm());
    const publishedState = stateSetter<ActionEditorRecord | null>(null);
    const createdState = stateSetter<string | null>("action-existing");
    const publishedAtState = stateSetter<string | null>(null);
    const publicationState = stateSetter<"idle" | "pending" | "success" | "error">("idle");
    const publicationError = stateSetter<string | null>(null);
    const confirmation = stateSetter(false);
    const workflow = useBeforeActionPublication({
      createdId: createdState.get(), publishedAt: publishedAtState.get(), publicationState: publicationState.get(),
      setForm: formState.setter, setPublishedAction: publishedState.setter, setCreatedId: createdState.setter,
      setPublishedAt: publishedAtState.setter, setPublicationState: publicationState.setter, setPublicationError: publicationError.setter,
      setPublicationConfirmationOpen: confirmation.setter,
    });
    workflow.requestPublish();
    expect(confirmation.get()).toBe(true);
    workflow.cancelPublication();
    expect(confirmation.get()).toBe(false);
    await workflow.confirmPublish();
    expect(publishActionMock).toHaveBeenCalledWith("action-existing");
    expect(fetchActionByIdMock).toHaveBeenCalledWith("action-existing");
    expect(publicationState.get()).toBe("success");
    expect(publishedAtState.get()).toBe("2999-10-01T10:00:00.000Z");

    publishActionMock.mockResolvedValueOnce({ id: "different-action", publishedAt: null });
    const mismatch = useBeforeActionPublication({
      createdId: "action-existing", publishedAt: null, publicationState: "idle", setForm: vi.fn(), setPublishedAction: vi.fn(),
      setCreatedId: vi.fn(), setPublishedAt: vi.fn(), setPublicationState: publicationState.setter,
      setPublicationError: publicationError.setter, setPublicationConfirmationOpen: confirmation.setter,
    });
    await mismatch.confirmPublish();
    expect(publicationState.get()).toBe("error");
    expect(publicationError.get()).toContain("différente");

    publishActionMock.mockRejectedValueOnce(new Error("publication failed"));
    const failure = useBeforeActionPublication({
      createdId: "action-existing", publishedAt: null, publicationState: "idle", setForm: vi.fn(), setPublishedAction: vi.fn(),
      setCreatedId: vi.fn(), setPublishedAt: vi.fn(), setPublicationState: publicationState.setter,
      setPublicationError: publicationError.setter, setPublicationConfirmationOpen: confirmation.setter,
    });
    await failure.confirmPublish();
    expect(publicationError.get()).toBe("publication failed");
  });
});
