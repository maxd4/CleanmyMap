import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildPersistedNotes as buildPersistedNotesFromFacade,
  createAction as createActionFromFacade,
  fetchActions as fetchActionsFromFacade,
} from "./store";
import { qualifyActionFormalities } from "./formalities/qualification";
import { validateActionFormalitiesForPublication } from "./formalities/publication-validation";
import { buildPersistedNotes } from "./persistence/notes";
import { createAction } from "./persistence/create";
import { fetchActions } from "./persistence/queries";

const actionsRoot = path.dirname(fileURLToPath(import.meta.url));

describe("Actions subdomain boundaries", () => {
  it("keeps formalities and persistence under one owner while preserving the store facade", () => {
    expect(fs.existsSync(path.join(actionsRoot, "formalities", "qualification.ts"))).toBe(true);
    expect(fs.existsSync(path.join(actionsRoot, "formalities", "publication-validation.ts"))).toBe(true);
    expect(fs.existsSync(path.join(actionsRoot, "persistence", "create.ts"))).toBe(true);
    expect(fs.existsSync(path.join(actionsRoot, "persistence", "queries.ts"))).toBe(true);
    expect(fs.existsSync(path.join(actionsRoot, "store.ts"))).toBe(true);
    expect(fs.existsSync(path.join(actionsRoot, "formalities-qualification.ts"))).toBe(false);
    expect(fs.existsSync(path.join(actionsRoot, "store-create.ts"))).toBe(false);
  });

  it("keeps the existing store facade on the canonical persistence implementations", () => {
    expect(createActionFromFacade).toBe(createAction);
    expect(fetchActionsFromFacade).toBe(fetchActions);
    expect(buildPersistedNotesFromFacade).toBe(buildPersistedNotes);
    expect(typeof qualifyActionFormalities).toBe("function");
    expect(typeof validateActionFormalitiesForPublication).toBe("function");
  });
});
