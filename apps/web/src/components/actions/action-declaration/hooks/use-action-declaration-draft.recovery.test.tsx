import { useCallback, useEffect, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionDrawing, ActionGeometrySource, CreateActionPayload } from "@/lib/actions/types";
import { buildCreateActionPayload, createInitialFormState } from "../payload";
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

const resumedGpxDrawing: ActionDrawing = {
  kind: "polyline",
  coordinates: [
    [48.8566, 2.3522],
    [48.8576, 2.3532],
  ],
};

const resumedGpxImport = {
  source: "gpx_import" as const,
  observedDistanceKm: 0.15,
  pointCount: resumedGpxDrawing.coordinates.length,
  inferredTopology: "point_to_point" as const,
  intent: "observed" as const,
  provenance: "unknown" as const,
};

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
    latitude: "48.8571",
    longitude: "2.3527",
    wasteKg: "0",
    cigaretteButtsCount: "0",
    volunteersCount: "1",
    childrenCount: "0",
    adultCount: "1",
    retiredCount: "0",
    geometryMethod: "gpx_import",
    gpxImport: resumedGpxImport,
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
  const payload = buildCreateActionPayload({
    form,
    declarationMode: "complete",
    effectiveManualDrawingEnabled: true,
    drawingIsValid: manualDrawing !== null,
    manualDrawing,
    manualDrawingSource,
    isEntrepriseMode: false,
    linkedEventId: undefined,
    photos: [],
    visionEstimate: null,
    userMetadata: { userId: "user-1" },
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
    drawingIsValid: manualDrawing !== null,
    effectiveRoutePreviewDrawing: null,
    routePreviewSource: null,
    hasValidDrawing: manualDrawing !== null,
    hasServerRouteInput: false,
    isCleanPlaceMode: false,
    payload: payload as CreateActionPayload,
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
    saveDraft(
      buildResumableForm(),
      "2026-10-17T09:00:00.000Z",
      { drawing: resumedGpxDrawing, source: "gpx_import" },
      null,
      creationRequestId,
    );

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
    latest.draft.saveDraftIfAllowed(editedForm, { drawing: resumedGpxDrawing, source: "gpx_import" });
    expect(JSON.parse(store.get(ACTION_DECLARATION_DRAFT_KEY) ?? "{}").actionTitle).toBe("Modification après reprise");

    createActionMock.mockRejectedValueOnce(new Error("network response lost"));
    await act(async () => {
      await latest.submission.handleConfirmSubmit();
    });

    expect(createActionMock).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: creationRequestId });
    expect(store.has(ACTION_DECLARATION_DRAFT_KEY)).toBe(true);
    act(() => {
      renderer.unmount();
    });

    let remounted!: HookHarnessValue;
    const remountedRenderer = mountHarness((value) => { remounted = value; });
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
    act(() => {
      remountedRenderer.unmount();
    });
  });

  it("tracks repeated form-start calls only once", () => {
    let latest!: HookHarnessValue;
    const renderer = mountHarness((value) => { latest = value; });

    act(() => {
      latest.submission.trackFormStart();
      latest.submission.trackFormStart();
    });

    expect(trackFunnelMock).toHaveBeenCalledTimes(1);
    expect(trackFunnelMock).toHaveBeenCalledWith(
      "start_form",
      "complete",
      expect.objectContaining({ source: "action_declaration_form" }),
    );
    act(() => {
      renderer.unmount();
    });
  });
});
