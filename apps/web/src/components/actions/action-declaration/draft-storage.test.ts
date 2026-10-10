import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "./payload";
import {
  ACTION_DECLARATION_DRAFT_DATE_KEY,
  ACTION_DECLARATION_DRAFT_KEY,
  clearDraft,
  loadDraftSnapshot,
  saveDraft,
} from "./draft-storage";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  vi.stubGlobal("window", { localStorage });

  return { store, localStorage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("action declaration draft storage", () => {
  it("saves a dated draft and reloads the stored form fields", () => {
    installLocalStorage();
    const savedAt = "2026-05-13T10:45:00.000Z";
    const fallback = createInitialFormState("Alice");
    const draft = {
      ...fallback,
      actionTitle: "Nettoyage test",
      shortDescription: "Préparation avant action",
      locationLabel: "Place de la Republique",
      meetingTime: "09:15",
      organizerType: "spontaneous" as const,
      organizerId: null,
      organizerName: "Alice",
      wasteKg: "12",
    };

    expect(saveDraft(draft, savedAt)).toBe(savedAt);

    const snapshot = loadDraftSnapshot(createInitialFormState("Fallback"));

    expect(snapshot?.savedAt).toBe(savedAt);
    expect(snapshot?.form.actorName).toBe("Alice");
    expect(snapshot?.form.actionTitle).toBe("Nettoyage test");
    expect(snapshot?.form.shortDescription).toBe("Préparation avant action");
    expect(snapshot?.form.locationLabel).toBe("Place de la Republique");
    expect(snapshot?.form.meetingTime).toBe("09:15");
    expect(snapshot?.form.organizerType).toBe("spontaneous");
    expect(snapshot?.form.organizerId).toBeNull();
    expect(snapshot?.form.organizerName).toBe("Alice");
    expect(snapshot?.form).not.toHaveProperty("preparationState");
    expect(snapshot?.form.wasteKg).toBe("12");
  });

  it("keeps persisted-action drafts isolated by action id", () => {
    installLocalStorage();
    const actionDraft = createInitialFormState("Alice");
    actionDraft.materialsProvided = "Pinces pour l’action A";
    const otherActionDraft = createInitialFormState("Alice");
    otherActionDraft.materialsProvided = "Pinces pour l’action B";

    saveDraft(actionDraft, "2026-05-13T10:45:00.000Z", null, "action-a");
    saveDraft(otherActionDraft, "2026-05-13T10:46:00.000Z", null, "action-b");

    expect(loadDraftSnapshot(createInitialFormState("Fallback"), "action", "action-a")?.form.materialsProvided).toBe("Pinces pour l’action A");
    expect(loadDraftSnapshot(createInitialFormState("Fallback"), "action", "action-b")?.form.materialsProvided).toBe("Pinces pour l’action B");
    expect(loadDraftSnapshot(createInitialFormState("Fallback"), "action")?.form.materialsProvided).toBeUndefined();
  });

  it("persists accessibility, material distinctions, suggestions and checklist state", () => {
    installLocalStorage();
    const draft = createInitialFormState("Alice");
    draft.accessibilityStatus = "obstacles_identified";
    draft.accessibility = "Accès par la rampe nord.";
    draft.materialsProvided = "Pinces disponibles.";
    draft.suggestedMaterials = ["gloves", "bags"];
    draft.preparationChecklist[0].checked = true;

    saveDraft(draft, "2026-05-13T10:45:00.000Z");

    const restored = loadDraftSnapshot(createInitialFormState("Fallback"))?.form;
    expect(restored?.accessibilityStatus).toBe("obstacles_identified");
    expect(restored?.materialsProvided).toBe("Pinces disponibles.");
    expect(restored?.suggestedMaterials).toEqual(["gloves", "bags"]);
    expect(restored?.preparationChecklist[0]).toMatchObject({ key: "materials_checked", checked: true });
  });

  it("keeps legacy checklist prose without marking a structured item", () => {
    const { store } = installLocalStorage();
    store.set(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify({
      ...createInitialFormState("Alice"),
      checklistBeforeDeparture: "Matériel vérifié par téléphone",
      preparationChecklist: undefined,
    }));

    const restored = loadDraftSnapshot(createInitialFormState("Fallback"))?.form;
    expect(restored?.checklistBeforeDeparture).toBe("Matériel vérifié par téléphone");
    expect(restored?.preparationChecklist.every((item) => !item.checked)).toBe(true);
  });

  it("does not persist or hydrate the removed manual vision fields", () => {
    const { store } = installLocalStorage();
    const draft = createInitialFormState("Alice");

    saveDraft(draft, "2026-05-13T10:45:00.000Z");

    const stored = JSON.parse(store.get(ACTION_DECLARATION_DRAFT_KEY) ?? "{}") as Record<string, unknown>;
    expect(stored).not.toHaveProperty("visionBagsCount");
    expect(stored).not.toHaveProperty("visionFillLevel");
    expect(stored).not.toHaveProperty("visionDensity");

    const snapshot = loadDraftSnapshot(createInitialFormState("Fallback"));
    expect(snapshot?.form).not.toHaveProperty("visionBagsCount");
    expect(snapshot?.form).not.toHaveProperty("visionFillLevel");
    expect(snapshot?.form).not.toHaveProperty("visionDensity");
  });

  it("returns a stable snapshot reference while the stored draft stays unchanged", () => {
    installLocalStorage();
    const savedAt = "2026-05-13T10:45:00.000Z";
    const draft = createInitialFormState("Alice");

    expect(saveDraft(draft, savedAt)).toBe(savedAt);

    const first = loadDraftSnapshot(createInitialFormState("Fallback"), "clean_place");
    const second = loadDraftSnapshot(createInitialFormState("Fallback"), "clean_place");

    expect(first).toBe(second);
    expect(first?.form.recordType).toBe("clean_place");
  });

  it("keeps a clean-place complement when applying the record-type override", () => {
    installLocalStorage();
    const draft = createInitialFormState("Alice");
    draft.recordType = "action";
    draft.routeTopology = "point_to_point";
    draft.arrivalLocationLabel = "Complément du lieu";
    saveDraft(draft, "2026-05-13T10:45:00.000Z");

    const snapshot = loadDraftSnapshot(createInitialFormState("Fallback"), "clean_place");

    expect(snapshot?.form.recordType).toBe("clean_place");
    expect(snapshot?.form.routeTopology).toBe("loop");
    expect(snapshot?.form.arrivalLocationLabel).toBe("Complément du lieu");
  });

  it("saves and reloads a GPX drawing with its provenance and endpoint coordinates", () => {
    installLocalStorage();
    const draft = createInitialFormState("Alice");
    const gpxDrawing = {
      kind: "polyline" as const,
      coordinates: [[48.85, 2.35], [48.86, 2.36]] as [number, number][],
    };
    draft.gpxImport = {
      source: "gpx_import",
      observedDistanceKm: 1.2,
      pointCount: 2,
      inferredTopology: "point_to_point",
      fileName: "terrain.gpx",
    };
    draft.midRouteCoordinates = { latitude: 48.855, longitude: 2.355 };
    draft.arrivalCoordinates = { latitude: 48.86, longitude: 2.36 };

    saveDraft(draft, "2026-05-13T10:45:00.000Z", {
      drawing: gpxDrawing,
      source: "gpx_import",
    });

    const snapshot = loadDraftSnapshot(createInitialFormState("Fallback"));

    expect(snapshot?.form.gpxImport).toEqual(draft.gpxImport);
    expect(snapshot?.manualDrawing).toEqual(gpxDrawing);
    expect(snapshot?.manualDrawingSource).toBe("gpx_import");
    expect(snapshot?.form.midRouteCoordinates).toEqual(draft.midRouteCoordinates);
    expect(snapshot?.form.arrivalCoordinates).toEqual(draft.arrivalCoordinates);
  });

  it("drops orphaned GPX provenance and geometry on reload", () => {
    const { store } = installLocalStorage();
    store.set(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify({
      ...createInitialFormState("Alice"),
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1,
        pointCount: 2,
        inferredTopology: "loop",
      },
    }));

    const snapshot = loadDraftSnapshot(createInitialFormState("Fallback"));

    expect(snapshot?.form.gpxImport).toBeNull();
    expect(snapshot?.manualDrawing).toBeUndefined();
  });

  it("clears both the draft payload and its timestamp", () => {
    const { store } = installLocalStorage();
    store.set(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify(createInitialFormState("Alice")));
    store.set(ACTION_DECLARATION_DRAFT_DATE_KEY, "2026-05-13T10:45:00.000Z");

    clearDraft();

    expect(store.has(ACTION_DECLARATION_DRAFT_KEY)).toBe(false);
    expect(store.has(ACTION_DECLARATION_DRAFT_DATE_KEY)).toBe(false);
  });

  it("does not throw when local storage refuses to clear a draft", () => {
    vi.stubGlobal("window", {
      localStorage: {
        removeItem: () => {
          throw new Error("storage unavailable");
        },
      },
    });

    expect(() => clearDraft()).not.toThrow();
  });

  it("ignores malformed stored drafts instead of restoring fallback silently", () => {
    const { store } = installLocalStorage();
    store.set(ACTION_DECLARATION_DRAFT_KEY, "{not-json");

    expect(loadDraftSnapshot(createInitialFormState("Alice"))).toBeNull();
  });
});
