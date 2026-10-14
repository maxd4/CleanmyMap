import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(new URL("./spogomi-preparation-workspace.tsx", import.meta.url), "utf8");
const spacePage = readFileSync(new URL("../../app/(app)/spogomi/[eventSlug]/espace/page.tsx", import.meta.url), "utf8");

describe("SPOGOMI organizer team-name editor STATIC_CONTRACT", () => {
  it("edits the canonical public name without exposing composition controls", () => {
    expect(component).toContain("public_name");
    expect(component).toContain("Équipe {team.team_number} — {team.public_name}");
    expect(component).toContain("expectedPublicName");
    expect(component).toContain("/teams/${team.id}");
    expect(component).toContain("Modifier");
    expect(component).toContain("Enregistrer");
    expect(component).toContain("Annuler");
    expect(component).toContain("maxLength={60}");
    expect(component).not.toContain("setTeamNameDraft(\"Équipe\")");
  });

  it("keeps explicit returns to the organizer space and public index", () => {
    expect(spacePage).toContain('href="/spogomi/mes-evenements"');
    expect(spacePage).toContain('href="/spogomi/nouveau"');
    expect(spacePage).toContain('href="/spogomi"');
  });
});
