import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTION_CREATION_SECTIONS,
  ACTION_CREATION_SECTION_STATUS_LABELS,
  createActionCreationSectionState,
  loadActionCreationSectionState,
  migrateLegacyActionWorkflowState,
  migrateV1ActionCreationSectionState,
  saveActionCreationSectionState,
  setActionCreationSectionStatus,
} from "./action-creation-sections";

describe("action creation stages contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exposes exactly the two navigable stages", () => {
    const state = createActionCreationSectionState("action-42", "preparer");

    expect(ACTION_CREATION_SECTIONS).toEqual(["definir", "preparer"]);
    expect(state.activeSection).toBe("preparer");
    expect(Object.values(state.statuses)).toEqual(["todo", "todo"]);
  });

  it("keeps stage status derived and formalities do not complete preparation", () => {
    const state = createActionCreationSectionState(null, "definir");
    const reviewed = setActionCreationSectionStatus(state, "preparer", "review");
    const complete = setActionCreationSectionStatus(reviewed, "definir", "done");

    expect(ACTION_CREATION_SECTION_STATUS_LABELS.todo.fr).toBe("À compléter");
    expect(ACTION_CREATION_SECTION_STATUS_LABELS.review.fr).toBe("À vérifier");
    expect(ACTION_CREATION_SECTION_STATUS_LABELS.done.fr).toBe("Complet");
    expect(complete.statuses.preparer).toBe("review");
  });

  it("migrates v1 active steps and statuses to v2 without losing the action id", () => {
    const migrated = migrateV1ActionCreationSectionState({
      schemaVersion: "action-creation-sections-v1",
      actionId: "action-42",
      activeSection: "verification",
      statuses: { essentiel: "done", terrain: "done", equipe: "todo", verification: "done" },
    });

    expect(migrated).toEqual({
      schemaVersion: "action-creation-sections-v2",
      actionId: "action-42",
      activeSection: "preparer",
      statuses: { definir: "done", preparer: "todo" },
    });
  });

  it("migrates v1 from localStorage and writes the v2 key", () => {
    const values = new Map<string, string>([["cleanmymap.action-creation-sections.v1", JSON.stringify({
      schemaVersion: "action-creation-sections-v1",
      actionId: "action-42",
      activeSection: "essentiel",
      statuses: { essentiel: "review", terrain: "review", equipe: "todo", verification: "done" },
    })]]);
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });

    expect(loadActionCreationSectionState()).toMatchObject({ actionId: "action-42", activeSection: "definir", schemaVersion: "action-creation-sections-v2" });
    expect(JSON.parse(values.get("cleanmymap.action-creation-sections.v2") ?? "{}")).toMatchObject({ actionId: "action-42", statuses: { preparer: "review" } });
  });

  it("migrates legacy workflow formalities without treating them as complete", () => {
    const migrated = migrateLegacyActionWorkflowState({
      actionId: "action-42",
      activeStep: "paris",
      statuses: { itineraire: "done", preparation: "done", paris: "done", preformulaire: "done" },
    });

    expect(migrated.activeSection).toBe("preparer");
    expect(migrated.statuses).toEqual({ definir: "done", preparer: "todo" });
  });

  it("writes a v2 local state without changing server-side draft contracts", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    const state = createActionCreationSectionState("action-9", "preparer");
    saveActionCreationSectionState(state);
    expect(JSON.parse(values.get("cleanmymap.action-creation-sections.v2") ?? "{}")).toEqual(state);
  });
});
