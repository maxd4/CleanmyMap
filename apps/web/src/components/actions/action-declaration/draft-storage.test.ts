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
    const draft = { ...fallback, locationLabel: "Place de la Republique", wasteKg: "12" };

    expect(saveDraft(draft, savedAt)).toBe(savedAt);

    const snapshot = loadDraftSnapshot(createInitialFormState("Fallback"));

    expect(snapshot?.savedAt).toBe(savedAt);
    expect(snapshot?.form.actorName).toBe("Alice");
    expect(snapshot?.form.locationLabel).toBe("Place de la Republique");
    expect(snapshot?.form.wasteKg).toBe("12");
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
