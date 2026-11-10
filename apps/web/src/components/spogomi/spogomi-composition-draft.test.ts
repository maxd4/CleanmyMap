import { describe, expect, it } from "vitest";
import { applySpogomiCompositionDraft, createSpogomiCompositionDraft, isSpogomiCompositionDraftDirty, serializeSpogomiCompositionDraft } from "./spogomi-composition-draft";
import type { WorkspaceData } from "./spogomi-preparation-workspace-contract";

function workspaceData(): WorkspaceData {
  return {
    event: { id: "event-1", action_id: "action-1", event_slug: "event", public_visibility: "private", public_results_visibility: "hidden", name: "Édition", location_label: "Paris", mode: "casual", state: "draft", starts_at: "2026-01-01", ends_at: null, composition_revision: 4 },
    divisions: [], participants: [
      { id: "registered", division_id: "division-1", display_name: "Place active", registration_status: "registered", external_reference: "T-1", group_preference: null, team_id: null, attendance_status: "unknown", account_link_status: "unlinked", composition_eligible: true },
      { id: "withdrawn", division_id: "division-1", display_name: "Historique retiré", registration_status: "withdrawn", external_reference: "T-2", group_preference: null, team_id: null, attendance_status: "unknown", account_link_status: "unlinked", composition_eligible: false },
    ], teams: [{ id: "team-1", division_id: "division-1", team_number: 1, public_name: "Équipe 1", composition_state: "draft" }], route: null, routes: [], categoryRules: [], environmentMappings: [], eventAccess: [],
  };
}

describe("SPOGOMI composition draft editable-place boundary", () => {
  it("keeps withdrawn history visible but excludes it from the editable draft and payload", () => {
    const data = workspaceData();
    const draft = createSpogomiCompositionDraft(data, "division-1");
    const changed = { ...draft, teams: draft.teams.map((team) => ({ ...team, public_name: "Équipe modifiée" })) };
    const applied = applySpogomiCompositionDraft(data, changed);
    const payload = serializeSpogomiCompositionDraft(changed);

    expect(draft.participants.map((participant) => participant.id)).toEqual(["registered"]);
    expect(applied.participants.map((participant) => participant.id)).toEqual(["withdrawn", "registered"]);
    expect(payload.participants.map((participant) => participant.id)).toEqual(["registered"]);
    expect(isSpogomiCompositionDraftDirty(data, changed)).toBe(true);
    expect(isSpogomiCompositionDraftDirty(data, { ...draft, participants: [...draft.participants] })).toBe(false);
  });
});
