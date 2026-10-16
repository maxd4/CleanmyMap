import { useCallback, useEffect, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionDrawing, ActionGeometrySource, CreateActionPayload } from "@/lib/actions/types";
import { createInitialFormState } from "../payload";
import { ACTION_DECLARATION_DRAFT_KEY, saveDraft } from "../draft-storage";
import type { FormState } from "../model";
import type { LoadedActionPhase } from "../utils/action-declaration-hydration.model";
import { useActionDeclarationDraft } from "./use-action-declaration-draft";
import { useActionDeclarationSubmission } from "./use-action-declaration-submission";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const createActionMock = vi.hoisted(() => vi.fn());
const fetchActionByIdMock = vi.hoisted(() => vi.fn());
const trackFunnelMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/actions/http", () => ({
  createAction: createActionMock,
  fetchActionById: fetchActionByIdMock,
}));

vi.mock("@/lib/analytics/funnel-client", () => ({
  trackFunnel: trackFunnelMock,
}));

type DraftHook = ReturnType<typeof useActionDeclarationDraft>;
type SubmissionHook = ReturnType<typeof useActionDeclarationSubmission>;
type HookHarnessValue = { draft: DraftHook; submission: SubmissionHook; setForm: (form: FormState) => void };

function installLocalStorage() {
  const store = new Map<string, string>();
  const listeners = new Set<() => void>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  vi.stubGlobal("window", {
    localStorage,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
    location: { pathname: "/actions/new" },
  });
  return { store };
}

function buildResumableForm(): FormState {
  return {
    ...createInitialFormState("Test"),
    actionTitle: "Action reprise",
    actionDate: "2026-10-17",
    organizerType: "association",
    organizerId: "org-1",
    organizerName: "Association Test",
    associationName: "Association Test",
    locationLabel: "Parc central",
    departureLocationLabel: "Parc central",
    eventStartTime: "09:00",
    eventEndTime: "10:00",
    durationMinutes: "60",
  };
}

function HookHarness({
  onReady,
}: {
  onReady: (value: HookHarnessValue) => void;
}) {
  const [form, setForm] = useState(() => createInitialFormState("Test"));
  const [manualDrawing, setManualDrawing] = useState<ActionDrawing | null>(null);
  const [manualDrawingSource, setManualDrawingSource] = useState<ActionGeometrySource | null>(null);
  const [loadedActionPhase, setLoadedActionPhase] = useState<LoadedActionPhase>(null);
  const [, setHasAttemptedSubmit] = useState(false);
  const createCleanForm = useCallback(() => createInitialFormState("Test"), []);
  const draft = useActionDeclarationDraft({
    createCleanForm,
    setForm,
    setManualDrawingState: setManualDrawing,
    setManualDrawingSource: setManualDrawingSource,
    setHasAttemptedSubmit,
  });
  const submission = useActionDeclarationSubmission({
    form,
    declarationMode: "complete",
    isAuthenticated: true,
    draftStorageReadError: draft.draftStorageReadError,
    initialActionId: null,
    loadedActionPhase,
    manualDrawingEnabled: true,
    manualDrawing,
    manualDrawingSource,
    drawingIsValid: false,
    effectiveRoutePreviewDrawing: null,
    routePreviewSource: null,
    hasValidDrawing: false,
    hasServerRouteInput: true,
    isCleanPlaceMode: false,
    payload: {
      recordType: "action",
      submissionMode: "quick",
      volunteersCount: 1,
    } as CreateActionPayload,
    linkedEventId: undefined,
    photoAssets: [],
    visionEstimate: null,
    userMetadata: { userId: "user-1" },
    clearDraft: draft.clearDraft,
    creationRequestId: draft.creationRequestId,
    setLoadedActionPhase,
    setHasAttemptedSubmit,
  });
  useEffect(() => onReady({ draft, submission, setForm }), [draft, onReady, setForm, submission]);
  return null;
}

function mountHarness(onReady: (value: HookHarnessValue) => void): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<HookHarness onReady={onReady} />);
  });
  return renderer;
}

describe("action declaration resumed draft durability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActionByIdMock.mockResolvedValue({ id: "action-created" });
  });

  it("keeps the resumed draft and idempotency key across a lost response and remount", async () => {
    const { store } = installLocalStorage();
    const creationRequestId = "action-create-resume-42";
    saveDraft(buildResumableForm(), "2026-10-17T09:00:00.000Z", null, null, creationRequestId);

    let latest!: HookHarnessValue;
    const renderer = mountHarness((value) => { latest = value; });
    await act(async () => {
      latest.draft.handleResumeDraft();
    });

    expect(latest.draft.isDraftResumed).toBe(true);
    expect(JSON.parse(store.get(ACTION_DECLARATION_DRAFT_KEY) ?? "{}").creationRequestId).toBe(creationRequestId);

    const editedForm = { ...buildResumableForm(), actionTitle: "Modification après reprise" };
    await act(async () => {
      latest.setForm(editedForm);
    });
    latest.draft.saveDraftIfAllowed(editedForm);
    expect(JSON.parse(store.get(ACTION_DECLARATION_DRAFT_KEY) ?? "{}").actionTitle).toBe("Modification après reprise");

    createActionMock.mockRejectedValueOnce(new Error("network response lost"));
    await act(async () => {
      await latest.submission.handleConfirmSubmit();
    });

    expect(createActionMock).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: creationRequestId });
    expect(store.has(ACTION_DECLARATION_DRAFT_KEY)).toBe(true);
    renderer.unmount();

    let remounted!: HookHarnessValue;
    mountHarness((value) => { remounted = value; });
    expect(remounted.draft.creationRequestId).toBe(creationRequestId);
    await act(async () => {
      remounted.draft.handleResumeDraft();
    });

    createActionMock.mockResolvedValueOnce({ id: "action-created" });
    await act(async () => {
      await remounted.submission.handleConfirmSubmit();
    });

    expect(createActionMock).toHaveBeenLastCalledWith(expect.anything(), { idempotencyKey: creationRequestId });
    expect(store.has(ACTION_DECLARATION_DRAFT_KEY)).toBe(false);
  });
});
