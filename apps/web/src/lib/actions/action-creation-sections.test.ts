import { describe, expect, it } from "vitest";
import {
  ACTION_CREATION_SECTIONS,
  ACTION_CREATION_SECTION_STATUS_LABELS,
  createActionCreationSectionState,
  setActionCreationSectionStatus,
} from "./action-creation-sections";

describe("action creation sections contract", () => {
  it("keeps the four sections stable and freely navigable", () => {
    const state = createActionCreationSectionState("action-42", "verification");

    expect(ACTION_CREATION_SECTIONS).toEqual([
      "essentiel",
      "terrain",
      "equipe",
      "verification",
    ]);
    expect(state.activeSection).toBe("verification");
    expect(Object.values(state.statuses)).toEqual(["todo", "todo", "todo", "todo"]);
  });

  it("exposes only derived UX labels and keeps incomplete sections non-blocking", () => {
    const state = createActionCreationSectionState(null, "essentiel");
    const reviewed = setActionCreationSectionStatus(state, "verification", "review");
    const complete = setActionCreationSectionStatus(reviewed, "essentiel", "done");

    expect(ACTION_CREATION_SECTION_STATUS_LABELS.todo.fr).toBe("À compléter");
    expect(ACTION_CREATION_SECTION_STATUS_LABELS.review.fr).toBe("À vérifier");
    expect(ACTION_CREATION_SECTION_STATUS_LABELS.done.fr).toBe("Complet");
    expect(complete.activeSection).toBe("essentiel");
    expect(complete.statuses.terrain).toBe("todo");
    expect(complete.statuses.verification).toBe("review");
  });
});
