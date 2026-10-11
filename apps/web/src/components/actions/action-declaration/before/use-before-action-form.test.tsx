import { StrictMode, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionDuplicatePrefill } from "@/lib/actions/action-duplication";
import type { FormState } from "../model";
import { useBeforeActionForm } from "./use-before-action-form";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const fetchActionDuplicatePrefillMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/http-action-editor", () => ({
  fetchActionDuplicatePrefill: fetchActionDuplicatePrefillMock,
}));

const duplicatePrefill = {
  title: "Action distante",
  shortDescription: "Description distante",
  locationLabel: "Parc distant",
  communeZoneLabel: "Paris",
  meetingPoint: "Entrée nord",
  departureLocationLabel: "Entrée nord",
  midRouteLocationLabel: "",
  arrivalLocationLabel: "",
  latitude: 48.8,
  longitude: 2.3,
  arrivalCoordinates: null,
  midRouteCoordinates: null,
  interventionMode: { mode: "fixed_area", version: "intervention-mode-v1" },
  routeTopology: undefined,
  routeTargetDistanceKm: null,
  routeTargetDistanceSource: undefined,
  plannedObjective: "nettoyage",
  placeType: "parc",
  estimatedDifficulty: "facile",
  accessibility: "Accès plat",
  accessibilityStatus: "conditions_reported",
  safetyInstructions: "Rester en binôme",
  recommendedMaterials: "Gants",
  materialsProvided: "Sacs",
  suggestedMaterials: ["gloves"],
  participantMessage: "Rendez-vous visible",
  logisticsNotes: "Note logistique",
  expectedWasteCategories: ["plastic"],
  operationalRoute: null,
  routeCalibrationContext: null,
  organizerType: "association",
  organizerId: "org-1",
  organizerName: "Association",
  associationName: "Association",
} as unknown as ActionDuplicatePrefill;

type HookResult = ReturnType<typeof useBeforeActionForm>;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createHookCapture() {
  const latest: { current: HookResult | null } = { current: null };
  return {
    latest,
    onReady: (result: HookResult) => { latest.current = result; },
  };
}

function HookHarness({
  duplicateFromActionId,
  onFormChange,
  onReady,
}: {
  duplicateFromActionId?: string | null;
  onFormChange: (form: FormState) => void;
  onReady: (result: HookResult) => void;
}) {
  const result = useBeforeActionForm({
    actorNameOptions: ["Test"],
    defaultActorName: "Test",
    isAuthenticated: false,
    userMetadata: { userId: "user-1" },
    duplicateFromActionId,
    onFormChange,
    onPassToComplete: vi.fn(),
  });
  useEffect(() => onReady(result), [onReady, result]);
  return null;
}

function renderHarness(
  duplicateFromActionId: string | null,
  onFormChange: (form: FormState) => void,
  onReady: (result: HookResult) => void,
): ReactTestRenderer {
  return create(
    <StrictMode>
      <HookHarness duplicateFromActionId={duplicateFromActionId} onFormChange={onFormChange} onReady={onReady} />
    </StrictMode>,
  );
}

async function updateHarness(
  renderer: ReactTestRenderer,
  duplicateFromActionId: string,
  onFormChange: (form: FormState) => void,
  onReady: (result: HookResult) => void,
): Promise<void> {
  await act(async () => {
    renderer.update(
      <StrictMode>
        <HookHarness duplicateFromActionId={duplicateFromActionId} onFormChange={onFormChange} onReady={onReady} />
      </StrictMode>,
    );
  });
}

async function mountHarness(
  duplicateFromActionId: string,
  onFormChange: (form: FormState) => void,
  onReady: (result: HookResult) => void,
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = renderHarness(duplicateFromActionId, onFormChange, onReady);
  });
  return renderer;
}

describe("useBeforeActionForm duplicate hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads one source once under Strict Mode and preserves a concurrent local edit", async () => {
    const prefillRequest = createDeferred<ActionDuplicatePrefill>();
    fetchActionDuplicatePrefillMock.mockReturnValue(prefillRequest.promise);
    const onFormChange = vi.fn();
    const changedOnFormChange = vi.fn();
    const capture = createHookCapture();
    const renderer = await mountHarness("source-a", onFormChange, capture.onReady);
    expect(fetchActionDuplicatePrefillMock).toHaveBeenCalledTimes(1);

    await updateHarness(renderer, "source-a", changedOnFormChange, capture.onReady);
    await act(async () => {
      capture.latest.current?.updateField("actionTitle", "Saisie locale");
    });
    expect(fetchActionDuplicatePrefillMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      prefillRequest.resolve(duplicatePrefill);
    });

    expect(capture.latest.current?.form.actionTitle).toBe("Saisie locale");
    expect(capture.latest.current?.form.communeZoneLabel).toBe("Paris");
    expect(capture.latest.current?.form.departureLocationLabel).toBe("Entrée nord");
    expect(changedOnFormChange).toHaveBeenLastCalledWith(expect.objectContaining({ actionTitle: "Saisie locale" }));
  });

  it("ignores a late response from the previous duplicate source", async () => {
    const requestA = createDeferred<ActionDuplicatePrefill>();
    const requestB = createDeferred<ActionDuplicatePrefill>();
    fetchActionDuplicatePrefillMock
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise);
    const onFormChange = vi.fn();
    const capture = createHookCapture();
    const renderer = await mountHarness("source-a", onFormChange, capture.onReady);
    await updateHarness(renderer, "source-b", onFormChange, capture.onReady);
    await act(async () => {
      requestA.resolve(duplicatePrefill);
    });
    expect(fetchActionDuplicatePrefillMock).toHaveBeenCalledTimes(2);
    expect(capture.latest.current?.form.actionTitle).not.toBe("Action distante");

    await act(async () => {
      requestB.resolve({ ...duplicatePrefill, title: "Action B" });
    });
    expect(capture.latest.current?.form.actionTitle).toBe("Action B");
  });
});
