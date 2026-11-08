import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import {
  SpogomiDivisionRegulationSettings,
  draftFromProps,
  moveTiebreaker,
  orderedTiebreakers,
} from "./spogomi-division-regulation-settings";
import type { DivisionRegulationInput } from "@/lib/spogomi/division-regulation-service";

describe("SPOGOMI division regulation settings", () => {
  it("preserves persisted null calculation settings until an explicit edit", () => {
    const draft = draftFromProps({
      activeDivision: {
        id: "division-1",
        division_type: "casual",
        regulation_config: { rounding: null, eligibility: null, penalties: [], tiebreakers: [] },
        team_size_config: { casual: { minMembers: null, maxMembers: null } },
        regulation_version: "pending",
        regulation_status: "incomplete",
        regulation_source_reference: null,
      } as never,
      categories: [],
      mappings: [],
      expectedRevision: 7,
    });

    expect(draft.rounding).toBeNull();
    expect(draft.eligibility).toBeNull();
  });

  it("renders and moves selected tiebreakers in their persisted order", () => {
    const selected = ["mass_grams", "sporting_score"] as const;
    expect(orderedTiebreakers([...selected])).toEqual(["mass_grams", "sporting_score", "counted_objects"]);
    expect(moveTiebreaker([...selected], "sporting_score", "up")).toEqual(["sporting_score", "mass_grams"]);
    expect(moveTiebreaker([...selected], "mass_grams", "down")).toEqual(["sporting_score", "mass_grams"]);
    expect(moveTiebreaker([...selected], "mass_grams", "up")).toEqual([...selected]);
  });

  it("uses the refreshed server revision for a second save", async () => {
    const activeDivision = {
      id: "division-1",
      division_type: "casual",
      regulation_config: { rounding: null, eligibility: null, penalties: [], tiebreakers: [] },
      team_size_config: { casual: { minMembers: null, maxMembers: null } },
      regulation_version: "pending",
      regulation_status: "incomplete",
      regulation_source_reference: null,
    } as never;
    const savedDivision = {
      id: "division-1",
      division_type: "casual",
      regulation_config: { rounding: null, eligibility: null, penalties: [], tiebreakers: [] },
      regulation_version: "casual-test-v1",
      regulation_status: "incomplete",
      team_size_config: { casual: { minMembers: 2, maxMembers: 4 } },
    } as never;
    const savedData = {
      event: { composition_revision: 8 },
      divisions: [savedDivision],
      categoryRules: [],
      environmentMappings: [],
    } as never;
    const onSave = vi.fn().mockResolvedValue(savedData);
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(SpogomiDivisionRegulationSettings, {
        activeDivision,
        categories: [],
        mappings: [],
        expectedRevision: 7,
        busy: false,
        onSave,
      }));
    });
    const saveButton = () => renderer.root.findAll((node) => node.type === "button" && node.children.includes("Enregistrer comme incomplet"))[0];

    await act(async () => saveButton().props.onClick());
    expect(renderer.root.findAll((node) => node.type === "input" && node.props.value === 2)).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.type === "input" && node.props.value === 4)).toHaveLength(1);
    await act(async () => saveButton().props.onClick());

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1][0].expectedRevision).toBe(8);
  });

  it("preserves a change made while saving and uses the saved revision on the next save", async () => {
    const activeDivision = {
      id: "division-1",
      division_type: "casual",
      regulation_config: { rounding: null, eligibility: null, penalties: [], tiebreakers: [] },
      team_size_config: { casual: { minMembers: null, maxMembers: null } },
      regulation_version: "pending",
      regulation_status: "incomplete",
      regulation_source_reference: null,
    } as never;
    const savedData = {
      event: { composition_revision: 8 },
      divisions: [{ id: "division-1", division_type: "casual", regulation_config: { rounding: null, eligibility: null, penalties: [], tiebreakers: [] }, team_size_config: { casual: { minMembers: null, maxMembers: null } }, regulation_version: "saved-v1", regulation_status: "incomplete", regulation_source_reference: null }],
      categoryRules: [],
      environmentMappings: [],
    } as never;
    let resolveSave!: (value: typeof savedData) => void;
    const submittedInputs: DivisionRegulationInput[] = [];
    const onSave = vi.fn((input: DivisionRegulationInput) => { submittedInputs.push(input); return new Promise<typeof savedData>((resolve) => { resolveSave = resolve; }); });
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(SpogomiDivisionRegulationSettings, { activeDivision, categories: [], mappings: [], expectedRevision: 7, busy: false, onSave }));
    });
    const saveButton = () => renderer.root.findAll((node) => node.type === "button" && node.children.includes("Enregistrer comme incomplet"))[0];

    await act(async () => saveButton().props.onClick());
    const versionInput = () => renderer.root.findAll((node) => node.type === "input" && node.props.value === "pending")[0];
    await act(async () => versionInput().props.onChange({ target: { value: "local-after-click" } }));
    await act(async () => resolveSave(savedData));

    expect(renderer.root.findAll((node) => node.type === "input" && node.props.value === "local-after-click")).toHaveLength(1);
    await act(async () => saveButton().props.onClick());
    expect(submittedInputs[1]).toEqual(expect.objectContaining({ regulationVersion: "local-after-click", expectedRevision: 8 }));
  });

  it("preserves the draft when the workspace reports a failed save", async () => {
    const activeDivision = {
      id: "division-1",
      division_type: "casual",
      regulation_config: { rounding: null, eligibility: null, penalties: [], tiebreakers: [] },
      team_size_config: { casual: { minMembers: null, maxMembers: null } },
      regulation_version: "pending",
      regulation_status: "incomplete",
      regulation_source_reference: null,
    } as never;
    const onSave = vi.fn().mockResolvedValue(null);
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(SpogomiDivisionRegulationSettings, { activeDivision, categories: [], mappings: [], expectedRevision: 7, busy: false, onSave }));
    });
    const versionInput = () => renderer.root.findAll((node) => node.type === "input" && node.props.value === "pending")[0];
    await act(async () => versionInput().props.onChange({ target: { value: "draft-kept" } }));
    const saveButton = () => renderer.root.findAll((node) => node.type === "button" && node.children.includes("Enregistrer comme incomplet"))[0];
    await act(async () => saveButton().props.onClick());

    expect(renderer.root.findAll((node) => node.type === "input" && node.props.value === "draft-kept")).toHaveLength(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
