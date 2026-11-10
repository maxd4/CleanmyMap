import * as React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button> }));

import { SpogomiManualTeamEditor } from "./spogomi-manual-team-editor";
import type { SpogomiCompositionDraft } from "./spogomi-composition-draft";

type EditorProps = React.ComponentProps<typeof SpogomiManualTeamEditor>;

const data: EditorProps["data"] = {
  event: { id: "event-1", action_id: "action-1", event_slug: "event", public_visibility: "private", public_results_visibility: "hidden", name: "Édition", location_label: "Paris", mode: "casual", state: "draft", starts_at: "2026-01-01", ends_at: null, team_size_config: { casual: { minMembers: 1, maxMembers: 3 } } },
  divisions: [{ id: "division-1", event_id: "event-1", division_type: "casual", division_key: "casual", team_size_config: { casual: { minMembers: 1, maxMembers: 3 } } }], participants: [], teams: [], route: null, routes: [], categoryRules: [], environmentMappings: [], eventAccess: [],
} as EditorProps["data"];

const draft: SpogomiCompositionDraft = { divisionId: "division-1", baseRevision: 1, teams: [{ id: "team-1", division_id: "division-1", team_number: 1, public_name: "Alpha", composition_state: "draft" }], participants: [{ id: "participant-1", division_id: "division-1", display_name: "Ada", registration_status: "registered", external_reference: null, group_preference: null, team_id: "team-1", attendance_status: "unknown", account_link_status: "unlinked", composition_eligible: true }] };

function props(overrides: Partial<EditorProps> = {}): EditorProps {
  return {
    data, draft, activeDivisionId: "division-1", divisionType: "casual", busy: false, compositionEditable: true, compositionEligibilityWarning: "Billet annulé", identityCodes: {}, issueIdentityCode: vi.fn(), onCreateTeam: vi.fn(), onCreatePlace: vi.fn(), onRenameTeam: vi.fn(), onChangePrivateLabel: vi.fn(), onAssignParticipant: vi.fn(), ...overrides,
  } as EditorProps;
}

describe("SpogomiManualTeamEditor local fields", () => {
  it("resets team and place fields when the parent draft is replaced", async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiManualTeamEditor {...props()} />); });
    const rename = renderer.root.findAllByType("button").find((button) => button.props.children === "Renommer");
    const editPlace = renderer.root.findAllByType("button").find((button) => button.props.children === "Modifier la place");
    act(() => { rename?.props.onClick(); editPlace?.props.onClick(); });
    const inputs = renderer.root.findAllByType("input");
    act(() => { inputs[0]?.props.onChange({ target: { value: "Brouillon abandonné" } }); inputs[1]?.props.onChange({ target: { value: "Ancienne place" } }); });

    await act(async () => { renderer.update(<SpogomiManualTeamEditor {...props({ draft: { ...draft, teams: [{ ...draft.teams[0], public_name: "Serveur" }], participants: [{ ...draft.participants[0], display_name: "Berthe" }] } })} />); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const currentRename = renderer.root.findAllByType("button").find((button) => button.props.children === "Renommer");
    const currentEditPlace = renderer.root.findAllByType("button").find((button) => button.props.children === "Modifier la place");
    act(() => { currentRename?.props.onClick(); currentEditPlace?.props.onClick(); });
    expect(renderer.root.findByProps({ "aria-label": "Nom public de l’équipe 1" }).props.value).toBe("Serveur");
    expect(renderer.root.findByProps({ "aria-label": "Libellé privé de Berthe" }).props.value).toBe("Berthe");
    renderer.unmount();
  });
});
