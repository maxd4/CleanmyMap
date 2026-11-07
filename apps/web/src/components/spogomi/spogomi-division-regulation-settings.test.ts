import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import {
  SpogomiDivisionRegulationSettings,
  draftFromProps,
  moveTiebreaker,
  orderedTiebreakers,
} from "./spogomi-division-regulation-settings";

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
    await act(async () => saveButton().props.onClick());

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1][0].expectedRevision).toBe(8);
  });
});
