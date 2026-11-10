import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(new URL("./spogomi-preparation-workspace.tsx", import.meta.url), "utf8");
const view = readFileSync(new URL("./spogomi-preparation-workspace-view.tsx", import.meta.url), "utf8");
const contract = readFileSync(new URL("./spogomi-preparation-workspace-contract.ts", import.meta.url), "utf8");
const spacePage = readFileSync(new URL("../../app/(app)/spogomi/[eventSlug]/espace/page.tsx", import.meta.url), "utf8");

describe("SPOGOMI organizer team editor STATIC_CONTRACT", () => {
  it("keeps local draft editing separate from the grouped server save", () => {
    expect(component).toContain("createSpogomiCompositionDraft");
    expect(contract).toContain("WorkspaceData");
    expect(component).toContain("serializeSpogomiCompositionDraft");
    expect(component).toContain("/teams/draft");
    expect(component).toContain("beforeunload");
    expect(view).toContain("Enregistrer les modifications");
    expect(view).toContain("Annuler les modifications");
    expect(view).toContain("draftStatus");
    expect(view).toContain("onRenameTeam");
    expect(component).not.toContain("expectedPublicName");
    expect(component).not.toContain("/teams/${team.id}");
    expect(component).toContain("maxLength={60}");
  });

  it("keeps explicit returns to the organizer space and public index", () => {
    expect(spacePage).toContain('href="/spogomi/mes-evenements"');
    expect(spacePage).toContain('href="/spogomi/nouveau"');
    expect(spacePage).toContain('href="/spogomi"');
  });
});
