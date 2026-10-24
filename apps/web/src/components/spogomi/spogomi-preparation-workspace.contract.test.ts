import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(new URL("./spogomi-preparation-workspace.tsx", import.meta.url), "utf8");
const view = readFileSync(new URL("./spogomi-preparation-workspace-view.tsx", import.meta.url), "utf8");
const contract = readFileSync(new URL("./spogomi-preparation-workspace-contract.ts", import.meta.url), "utf8");
const spacePage = readFileSync(new URL("../../app/(app)/spogomi/[eventSlug]/espace/page.tsx", import.meta.url), "utf8");

describe("SPOGOMI organizer team-name editor STATIC_CONTRACT", () => {
  it("edits the canonical public name without exposing composition controls", () => {
    expect(component).toContain("public_name");
    expect(contract).toContain("Équipe {team.team_number} — {team.public_name}");
    expect(view).toContain("publicTeamNameTemplate.replace");
    expect(component).toContain("expectedPublicName");
    expect(component).toContain("/teams/${team.id}");
    expect(view).toContain("teamEditorLabels.edit");
    expect(view).toContain("teamEditorLabels.save");
    expect(view).toContain("teamEditorLabels.cancel");
    expect(component).toContain("maxLength={60}");
    expect(component).not.toContain("setTeamNameDraft(\"Équipe\")");
  });

  it("keeps explicit returns to the organizer space and public index", () => {
    expect(spacePage).toContain('href="/spogomi/mes-evenements"');
    expect(spacePage).toContain('href="/spogomi/nouveau"');
    expect(spacePage).toContain('href="/spogomi"');
  });
});
