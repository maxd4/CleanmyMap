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
      preparationState: "pret_a_partager" as const,
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
    expect(snapshot?.form.preparationState).toBe("pret_a_partager");
    expect(snapshot?.form.wasteKg).toBe("12");
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

  it("clears both the draft payload and its timestamp", () => {
    const { store } = installLocalStorage();
    store.set(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify(createInitialFormState("Alice")));
    store.set(ACTION_DECLARATION_DRAFT_DATE_KEY, "2026-05-13T10:45:00.000Z");

    clearDraft();

    expect(store.has(ACTION_DECLARATION_DRAFT_KEY)).toBe(false);
    expect(store.has(ACTION_DECLARATION_DRAFT_DATE_KEY)).toBe(false);
  });

  it("ignores malformed stored drafts instead of restoring fallback silently", () => {
    const { store } = installLocalStorage();
    store.set(ACTION_DECLARATION_DRAFT_KEY, "{not-json");

    expect(loadDraftSnapshot(createInitialFormState("Alice"))).toBeNull();
  });
});
